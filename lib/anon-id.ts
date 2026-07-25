import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { signValue, verifySignature } from "@/lib/auth/crypto";

const ANON_ID_COOKIE = "tidbits_anon_id";
const ANON_ID_MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2 years

function parseToken(token: string | undefined): string | null {
  if (!token) return null;
  const [id, signature] = token.split(".");
  if (!id || !signature || !verifySignature(id, signature)) return null;
  return id;
}

/**
 * Only callable from a Server Action or Route Handler (cookies() there is
 * mutable). Reads the existing anon-id cookie, or lazily issues a new one —
 * the feed's Server Component can't set cookies, so this is not called on
 * page load (KTD3).
 */
export async function ensureAnonId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = parseToken(cookieStore.get(ANON_ID_COOKIE)?.value);
  if (existing) return existing;

  const id = randomUUID();
  const token = `${id}.${signValue(id)}`;
  cookieStore.set(ANON_ID_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ANON_ID_MAX_AGE,
  });
  return id;
}
