import { describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { auditPreparedArtifact } from "./audit-tidbit-content";
import { writePreparationArtifacts } from "./prepare-whatsapp-trivia";

describe("tidbit content audit", () => {
  it("fails when an artifact drops a source lead or changes a reviewed heading", () => {
    const directory = path.join(tmpdir(), `tidbits-audit-${Date.now()}`);
    mkdirSync(directory, { recursive: true });
    const rawPath = path.join(directory, "_chat.txt");
    const artifactPath = path.join(directory, "tidbits.jsonl");
    writeFileSync(rawPath, `[01/01/24, 1:00:00 PM] jjk: #tr33via\n\n*Source lead*\n\n${"A complete body with enough detail to qualify as trivia and remain in the approved artifact. ".repeat(4)}\n`, "utf8");
    writePreparationArtifacts(rawPath, directory);
    const prepared = JSON.parse(readFileSync(path.join(directory, "tidbits.jsonl"), "utf8")) as { header: string; body: string };
    writeFileSync(artifactPath, JSON.stringify({ ...prepared, header: "Generic heading", body: "A shortened body", fingerprint: "bad" }) + "\n", "utf8");

    const audit = auditPreparedArtifact(rawPath, artifactPath);
    expect(audit.sourceRefsChecked).toBe(1);
    expect(audit.mismatches).toContain("message-001: prepared content differs from source-derived output");
    expect(audit.mismatches).toContain("source reconciliation counts differ from the approved contract");
  });
});
