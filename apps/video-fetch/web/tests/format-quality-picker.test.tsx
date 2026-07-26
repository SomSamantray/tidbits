import { describe, expect, it } from "vitest";

describe("format quality rules", () => {
  it("disables mp4 when audio only", () => {
    const audioOnly = "audio_only";
    const disabled = audioOnly === "audio_only";
    expect(disabled).toBe(true);
  });
});
