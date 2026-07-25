import { createHmac, timingSafeEqual } from "crypto";

export function getCookieSecret(): string {
  const secret = process.env.COOKIE_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("COOKIE_SECRET must be set in production.");
  }
  return "dev-only-insecure-secret";
}

export function signValue(value: string): string {
  return createHmac("sha256", getCookieSecret()).update(value).digest("base64url");
}

export function verifySignature(value: string, signature: string): boolean {
  const expected = signValue(value);
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  return expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf);
}

/** Shared shape for both the admin session cookie and the anon-id cookie. */
export function signedCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
