import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const backend =`${process.env.BACKEND_BASE_URL}/generate-report`;
  const apiKey = process.env.BACKEND_API_KEY;

  const res = await fetch(backend!, {
    method: "POST",
    headers: { "X-API-Key": apiKey, accept: "application/json" },
    body: form,
  });

  const json = await res.json();
  return Response.json(json, { status: res.status });
}