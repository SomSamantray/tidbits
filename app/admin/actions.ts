"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  ADMIN_SESSION_COOKIE,
  createSessionToken,
  isValidSessionToken,
  sessionCookieMaxAge,
} from "@/lib/auth/session";
import { signedCookieOptions } from "@/lib/auth/crypto";
import { insertTidbit } from "@/lib/db/queries";

export type LoginState = { error: string | null };

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || password !== adminPassword) {
    return { error: "Incorrect password." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, createSessionToken(), signedCookieOptions(sessionCookieMaxAge()));

  return { error: null };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export type AddTidbitState = { error: string | null; success: boolean };

export async function addTidbit(
  _prevState: AddTidbitState,
  formData: FormData,
): Promise<AddTidbitState> {
  const cookieStore = await cookies();
  const isAuthenticated = isValidSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!isAuthenticated) {
    return { error: "Not authenticated.", success: false };
  }

  const header = String(formData.get("header") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const categoryId = Number(formData.get("categoryId"));

  if (!header || !body || !categoryId) {
    return { error: "Header, body, and category are all required.", success: false };
  }

  await insertTidbit({ header, body, categoryId });
  revalidatePath("/");
  revalidatePath("/admin");

  return { error: null, success: true };
}
