"use server";

import { ensureAnonId } from "@/lib/anon-id";
import { likeTidbit, shareTidbit } from "@/lib/db/queries";

export async function like(tidbitId: number): Promise<{ incremented: boolean; likeCount: number }> {
  const anonId = await ensureAnonId();
  return likeTidbit(tidbitId, anonId);
}

export async function share(tidbitId: number): Promise<{ shareCount: number }> {
  return shareTidbit(tidbitId);
}
