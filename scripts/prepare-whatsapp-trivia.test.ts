import { describe, expect, it } from "vitest";
import {
  classifyCategory,
  cleanHeader,
  fingerprint,
  parseWhatsAppExport,
  prepareMessages,
  removeLeadingMarkers,
  splitHeaderBody,
} from "./prepare-whatsapp-trivia";

describe("WhatsApp trivia preparation", () => {
  it("parses message boundaries and continuation lines without flattening paragraphs", () => {
    const messages = parseWhatsAppExport(
      "[01/01/24, 1:00:00 PM] jjk: #tr33via\n\n*Title*\n\nFirst paragraph.\n\nSecond paragraph.\n[02/01/24, 1:00:00 PM] jjk: ordinary",
    );

    expect(messages).toHaveLength(2);
    expect(messages[0].rawText).toContain("First paragraph.\n\nSecond paragraph.");
  });

  it("removes only the leading trivia marker and retains markdown content", () => {
    expect(removeLeadingMarkers("#tr33via\n\n*The title*\n\nBody text.")).toBe("*The title*\n\nBody text.");
  });

  it("splits the first content line into header and preserves body paragraphs", () => {
    expect(splitHeaderBody("*The title*\n\nFirst paragraph.\n\nSecond paragraph.")).toEqual({
      header: "*The title*",
      body: "First paragraph.\n\nSecond paragraph.",
    });
  });

  it("cleans approved headers without changing the body", () => {
    const header = cleanHeader("message-007", "*The Guinness Record Holder who created the KFC Chicken Bucket!*");
    expect(header).toBe("KFC's Chicken Bucket Record");
    expect(header.trim().split(/\s+/u)).toHaveLength(4);
    expect(cleanHeader("message-154", "*The Crazy Irony!*")).toBe("The Crazy Irony!");
  });

  it("uses a length-delimited fingerprint that changes when body whitespace changes", () => {
    expect(fingerprint("Header", "Body\n\ntext")).not.toBe(fingerprint("Header", "Body\ntext"));
    expect(fingerprint("Header", "Body")).toHaveLength(64);
  });

  it("classifies explicit subject matter without requiring the importer to guess", () => {
    expect(classifyCategory("Apollo 11", "The moon mission launched in 1969.").slug).toBe("space");
    expect(classifyCategory("KFC", "A restaurant and food story.").slug).toBe("food");
    expect(classifyCategory("The war", "A story about Nazi history.").slug).toBe("history");
  });

  it("prepares a trivia message with a cleaned header and preserved body", () => {
    const body = `${"First paragraph with enough detail to be treated as a substantive trivia message. ".repeat(4)}\n\nSecond paragraph.`;
    const prepared = prepareMessages([{
      sourceRef: "message-007",
      line: 1,
      date: "01/01/24",
      sender: "jjk",
      rawText: `*The Guinness Record Holder who created the KFC Chicken Bucket!*\n\n${body}`,
    }]);

    expect(prepared.records).toHaveLength(1);
    expect(prepared.records[0]).toMatchObject({ header: "KFC's Chicken Bucket Record", body });
    expect(prepared.records[0].header.split(/\s+/u)).toHaveLength(4);
  });
});
