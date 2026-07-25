import { createHmac, timingSafeEqual } from "crypto";

export function getCookieSecret(): string {
  const secret = process.env.COOKIE_SECRET;
  if (!secret) {
    // Fail fast unconditionally, not just in NODE_ENV==="production" — many
    // real deployments (custom Node servers, Docker, non-Vercel PaaS) never
    // set that literal string, and a silent insecure fallback there would
    // let anyone forge both the admin-session and anon-id cookies.
    throw new Error("COOKIE_SECRET must be set (see .env.local.example).");
  }
  return secret;
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
