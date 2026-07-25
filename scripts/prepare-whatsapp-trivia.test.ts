import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
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

  it("prepares a trivia message with a cleaned header and preserves a displaced source lead", () => {
    const body = `${"First paragraph with enough detail to be treated as a substantive trivia message. ".repeat(4)}\n\nSecond paragraph.`;
    const prepared = prepareMessages([{
      sourceRef: "message-007",
      line: 1,
      date: "01/01/24",
      sender: "jjk",
      rawText: `*The Guinness Record Holder who created the KFC Chicken Bucket!*\n\n${body}`,
    }]);

    expect(prepared.records).toHaveLength(1);
    expect(prepared.records[0]).toMatchObject({
      header: "KFC's Chicken Bucket Record",
      body: `The Guinness Record Holder who created the KFC Chicken Bucket!\n\n${body}`,
    });
    expect(prepared.records[0].header.split(/\s+/u)).toHaveLength(4);
  });

  it("keeps the Nvidia tattoo lead and the ketchup conclusion in the prepared records", () => {
    const source = parseWhatsAppExport(readFileSync("/Users/apple/Downloads/_chat.txt", "utf8"));
    const prepared = prepareMessages(source).records;
    const nvidia = prepared.find((record) => record.sourceRef === "message-082");
    const ketchup = prepared.find((record) => record.sourceRef === "message-110");

    expect(nvidia?.header).toBe("Jensen Huang's Nvidia Tattoo");
    expect(nvidia?.body).toContain("tattoo");
    expect(nvidia?.body).toContain("Nvidia");
    expect(ketchup?.header).toBe("From Fish Sauce to Ketchup");
    expect(ketchup?.body).toContain("tomato sauce");
    expect(ketchup?.body).toContain("Heinz");
  });
});
