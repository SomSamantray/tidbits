import { NextRequest, NextResponse } from "next/server";
import { getFeedPage } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const page = await getFeedPage({
    categorySlug: searchParams.get("category"),
    searchTerm: searchParams.get("q"),
    cursor: searchParams.get("cursor"),
  });

  return NextResponse.json(page);
}
