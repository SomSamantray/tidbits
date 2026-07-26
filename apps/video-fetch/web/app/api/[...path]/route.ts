import type { NextRequest } from "next/server";

const workerUrl = process.env.WORKER_URL || "http://localhost:8000";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, context, "GET");
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, context, "POST");
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
  method: "GET" | "POST",
) {
  const { path } = await context.params;
  const target = `${workerUrl}/${path.join("/")}${request.nextUrl.search}`;

  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": request.headers.get("x-forwarded-for") || "",
    },
    cache: "no-store",
  };

  if (method === "POST") {
    init.body = await request.text();
  }

  const res = await fetch(target, init);
  const contentType = res.headers.get("Content-Type") || "";

  if (contentType.includes("application/json")) {
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { "Content-Type": contentType },
    });
  }

  const body = await res.arrayBuffer();
  const headers = new Headers();
  if (contentType) headers.set("Content-Type", contentType);
  const disposition = res.headers.get("Content-Disposition");
  if (disposition) headers.set("Content-Disposition", disposition);

  return new Response(body, {
    status: res.status,
    headers,
  });
}
