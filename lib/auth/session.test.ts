import { describe, expect, it, vi } from "vitest";
import { createSessionToken, isValidSessionToken } from "./session";

describe("admin session token", () => {
  it("validates a freshly created token", () => {
    const token = createSessionToken();
    expect(isValidSessionToken(token)).toBe(true);
  });

  it("rejects a missing token", () => {
    expect(isValidSessionToken(undefined)).toBe(false);
  });

  it("rejects a malformed token", () => {
    expect(isValidSessionToken("not-a-real-token")).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const token = createSessionToken();
    const [encoded] = token.split(".");
    expect(isValidSessionToken(`${encoded}.tampered-signature`)).toBe(false);
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    const token = createSessionToken();
    vi.advanceTimersByTime(5 * 60 * 60 * 1000); // past the 4h TTL
    expect(isValidSessionToken(token)).toBe(false);
    vi.useRealTimers();
  });
});
