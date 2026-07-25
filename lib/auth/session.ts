import { signValue, verifySignature } from "./crypto";

export const ADMIN_SESSION_COOKIE = "tidbits_admin_session";
const SESSION_TTL_SECONDS = 4 * 60 * 60; // a few hours, per plan (U3)

/** Signed session token: base64url(payload).signature */
export function createSessionToken(): string {
  const payload = JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  return `${encoded}.${signValue(encoded)}`;
}

export function sessionCookieMaxAge(): number {
  return SESSION_TTL_SECONDS;
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || !verifySignature(encoded, signature)) return false;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return typeof payload.exp === "number" && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
