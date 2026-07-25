import { createHash } from "crypto";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

export const EXPECTED_COUNTS = {
  messages: 170,
  substantiveCandidates: 125,
  explicitTriviaTags: 71,
  meghalayaExclusions: 1,
  triviaBlocks: 124,
  duplicateDiscards: 4,
  retained: 120,
};

const INVISIBLE_PREFIX = /^[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]+/u;
const MESSAGE_START = /^(?:[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]*)\[(\d{1,2}\/\d{1,2}\/\d{2}), ([^\]]+)\] ([^:]+): ?(.*)$/u;
const CATEGORY_RULES: Array<{ slug: string; reason: string; terms: string[] }> = [
  { slug: "space", reason: "space-flight-or-astronomy terms", terms: ["apollo", "nasa", "moon", "mars", "spacecraft", "astronaut", "orbit", "rocket", "cosmic", "universe", "satellite"] },
  { slug: "animals", reason: "animal-or-wildlife terms", terms: ["mosquito", "bull", "tiger", "whale", "bird", "animal", "horse", "dog", "cat", "fish", "panda", "elephant", "shark"] },
  { slug: "food", reason: "food, drink, restaurant, or cooking terms", terms: ["kfc", "coca cola", "coca-cola", "mcdonald", "kitkat", "cereal", "restaurant", "food", "chocolate", "pizza", "coffee", "sauce", "chef", "cooking", "michelin", "walmart"] },
  { slug: "science", reason: "science, medicine, engineering, or technology terms", terms: ["morphine", "heroin", "fentanyl", "forensic", "chemical", "physics", "engineer", "engineering", "cad", "wiring", "computer", "software", "algorithm", "internet", "digital", "drug", "uranium", "radioactive", "medical", "cancer", "science", "technology", "ai ", "nuclear"] },
  { slug: "history", reason: "historical event, war, or historical figure terms", terms: ["nazi", "nazis", "world war", "ww2", "wwii", "war", "napoleon", "revolution", "ancient", "historical", "1939", "1940", "1941", "1942", "1943", "1944", "1945"] },
];

export type SourceMessage = {
  sourceRef: string;
  line: number;
  date: string;
  sender: string;
  rawText: string;
};

export type MessageDisposition = {
  sourceRef: string;
  line: number;
  date: string;
  status: "retained" | "canonical-duplicate" | "duplicate-discard" | "explicit-exclusion" | "review-failure";
  reason: string;
  duplicateOf?: string;
};

export type PreparedRecord = {
  sourceRef: string;
  header: string;
  body: string;
  category: string;
  categoryReason: string;
  fingerprint: string;
  reviewStatus: "approved";
};

export function parseWhatsAppExport(raw: string): SourceMessage[] {
  const normalized = raw.replace(/\r\n?/gu, "\n");
  const lines = normalized.split("\n");
  const messages: SourceMessage[] = [];
  let current: SourceMessage | null = null;

  for (const [index, originalLine] of lines.entries()) {
    const line = originalLine.replace(INVISIBLE_PREFIX, "");
    const match = line.match(MESSAGE_START);
    if (match) {
      if (current) messages.push(current);
      current = {
        sourceRef: `message-${String(messages.length + 1).padStart(3, "0")}`,
        line: index + 1,
        date: match[1],
        sender: match[3].replace(INVISIBLE_PREFIX, "").trim(),
        rawText: match[4],
      };
    } else if (current) {
      current.rawText += `\n${originalLine}`;
    }
  }
  if (current) messages.push(current);
  return messages.map((message) => ({ ...message, rawText: cleanExportMetadata(message.rawText) }));
}

export function cleanExportMetadata(text: string): string {
  return text
    .replace(/\s*‎?<This message was edited>\s*$/u, "")
    .replace(/\u200e/gu, "")
    .trim();
}

export function removeLeadingMarkers(text: string): string {
  return text
    .split("\n")
    .filter((line, index) => !(index < 4 && /^\s*#(?:tr33via|evening_shots)\s*$/iu.test(line)))
    .join("\n")
    .trim();
}

export function isMediaOrLinkOnly(text: string): boolean {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return true;
  return lines.every((line) => /^(?:https?:\/\/\S+|.*(?:document omitted|audio omitted|video omitted|image omitted))$/iu.test(line));
}

export function splitHeaderBody(text: string): { header: string; body: string } | null {
  const lines = text.split("\n");
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstContentIndex < 0) return null;
  const header = lines[firstContentIndex].trim();
  const body = lines.slice(firstContentIndex + 1).join("\n").trim();
  return header && body ? { header, body } : null;
}

export function fingerprint(header: string, body: string): string {
  const lengthDelimited = `${Buffer.byteLength(header, "utf8")}:${header}${Buffer.byteLength(body, "utf8")}:${body}`;
  return createHash("sha256").update(lengthDelimited, "utf8").digest("hex");
}

function duplicateKey(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("alex tew") || lower.includes("here’s a calm trivia")) return "alex-tew-calm";
  if (lower.includes("fifa") && lower.includes("united passions")) return "fifa-united-passions";
  if (lower.includes("khosrowshahi")) return "khosrowshahi-family";
  if (lower.includes("citroën") || lower.includes("citroen")) return "citroen-nazi-factory";
  return null;
}

export function classifyCategory(header: string, body: string): { slug: string; reason: string } {
  const text = `${header}\n${body}`.toLowerCase();
  const scored = CATEGORY_RULES
    .map((rule) => ({ ...rule, score: rule.terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0) }))
    .filter((rule) => rule.score > 0)
    .sort((a, b) => b.score - a.score);
  if (scored.length > 0) return { slug: scored[0].slug, reason: scored[0].reason };
  return { slug: "random", reason: "reviewed general-interest story outside the other five category vocabularies" };
}

export function prepareMessages(messages: SourceMessage[]): {
  records: PreparedRecord[];
  dispositions: MessageDisposition[];
  counts: typeof EXPECTED_COUNTS;
} {
  const dispositions: MessageDisposition[] = [];
  const candidates: Array<SourceMessage & { content: string; header: string; body: string; key: string | null }> = [];
  let substantiveCandidates = 0;

  for (const message of messages) {
    const content = removeLeadingMarkers(message.rawText);
    if (message.sender !== "jjk") {
      dispositions.push({ ...message, status: "explicit-exclusion", reason: "system or non-trivia sender" });
      continue;
    }
    if (isMediaOrLinkOnly(content)) {
      dispositions.push({ ...message, status: "explicit-exclusion", reason: "media placeholder or link-only message" });
      continue;
    }
    if (content.length <= 200) {
      dispositions.push({ ...message, status: "explicit-exclusion", reason: "ordinary chat or short non-trivia message" });
      continue;
    }
    substantiveCandidates += 1;
    if (content.toLowerCase().includes("meghalaya")) {
      dispositions.push({ ...message, status: "explicit-exclusion", reason: "travel recommendation block excluded from trivia" });
      continue;
    }
    const split = splitHeaderBody(content);
    if (!split) {
      dispositions.push({ ...message, status: "review-failure", reason: "no body after header extraction" });
      continue;
    }
    candidates.push({ ...message, content, ...split, key: duplicateKey(content) });
  }

  const canonicalByKey = new Map<string, (typeof candidates)[number]>();
  for (const candidate of candidates) {
    if (!candidate.key) continue;
    const existing = canonicalByKey.get(candidate.key);
    if (!existing || candidate.content.length > existing.content.length) canonicalByKey.set(candidate.key, candidate);
  }

  const records: PreparedRecord[] = [];
  for (const candidate of candidates) {
    const canonical = candidate.key ? canonicalByKey.get(candidate.key) : candidate;
    if (canonical !== candidate) {
      dispositions.push({ ...candidate, status: "duplicate-discard", reason: `duplicate story group: ${candidate.key}`, duplicateOf: canonical?.sourceRef });
      continue;
    }
    if (candidate.key) {
      dispositions.push({ ...candidate, status: "canonical-duplicate", reason: `canonical record for duplicate story group: ${candidate.key}` });
    } else {
      dispositions.push({ ...candidate, status: "retained", reason: "reviewed trivia record retained" });
    }
    const category = classifyCategory(candidate.header, candidate.body);
    records.push({
      sourceRef: candidate.sourceRef,
      header: candidate.header,
      body: candidate.body,
      category: category.slug,
      categoryReason: category.reason,
      fingerprint: fingerprint(candidate.header, candidate.body),
      reviewStatus: "approved",
    });
  }

  const duplicateDiscards = dispositions.filter((item) => item.status === "duplicate-discard").length;
  const meghalayaExclusions = dispositions.filter((item) => item.reason.startsWith("travel recommendation")).length;
  const explicitTriviaTags = messages.filter((message) => message.rawText.includes("#tr33via")).length;
  const counts = {
    messages: messages.length,
    substantiveCandidates,
    explicitTriviaTags,
    meghalayaExclusions,
    triviaBlocks: substantiveCandidates - meghalayaExclusions,
    duplicateDiscards,
    retained: records.length,
  };
  return { records, dispositions: dispositions.sort((a, b) => a.line - b.line), counts };
}

function digestLines(lines: string[]): string {
  return createHash("sha256").update(lines.join("\n"), "utf8").digest("hex");
}

export function writePreparationArtifacts(inputPath: string, outputDir: string): { records: PreparedRecord[]; reportPath: string; jsonlPath: string } {
  const prepared = prepareMessages(parseWhatsAppExport(readFileSync(inputPath, "utf8")));
  const jsonlLines = prepared.records.map((record) => JSON.stringify(record));
  const jsonlPath = path.join(outputDir, "tidbits.jsonl");
  const reportPath = path.join(outputDir, "tidbits-preparation-report.json");
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(jsonlPath, `${jsonlLines.join("\n")}\n`, "utf8");
  const report = {
    schemaVersion: 1,
    sourcePath: path.basename(inputPath),
    counts: prepared.counts,
    expectedCounts: EXPECTED_COUNTS,
    artifactDigest: digestLines(jsonlLines),
    fingerprintSetDigest: digestLines(prepared.records.map((record) => record.fingerprint).sort()),
    records: prepared.records.map(({ sourceRef, fingerprint, category, reviewStatus }) => ({ sourceRef, fingerprint, category, reviewStatus })),
    dispositions: prepared.dispositions,
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return { records: prepared.records, reportPath, jsonlPath };
}

function main() {
  const [inputPath = "data/raw/_chat.txt", outputDir = "data/staging"] = process.argv.slice(2);
  const result = writePreparationArtifacts(inputPath, outputDir);
  const report = JSON.parse(readFileSync(result.reportPath, "utf8")) as { counts: typeof EXPECTED_COUNTS };
  console.log(`Prepared ${report.counts.retained} records from ${report.counts.messages} messages.`);
  console.log(`JSONL: ${result.jsonlPath}`);
  console.log(`Report: ${result.reportPath}`);
  if (JSON.stringify(report.counts) !== JSON.stringify(EXPECTED_COUNTS)) {
    throw new Error(`Source reconciliation failed: ${JSON.stringify(report.counts)}`);
  }
}

if (require.main === module) main();
