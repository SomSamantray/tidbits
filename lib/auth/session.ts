import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "tidbits_admin_session";
const SESSION_TTL_SECONDS = 4 * 60 * 60; // a few hours, per plan (U3)

function getSecret(): string {
  const secret = process.env.COOKIE_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("COOKIE_SECRET must be set in production.");
  }
  return "dev-only-insecure-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** Signed session token: base64url(payload).signature */
export function createSessionToken(): string {
  const payload = JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function sessionCookieMaxAge(): number {
  return SESSION_TTL_SECONDS;
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;

  const expected = sign(encoded);
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return typeof payload.exp === "number" && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
