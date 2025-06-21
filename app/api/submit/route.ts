import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL + "/submit";

  const res = await fetch(backend, { method: "POST", body: form });
  const json = await res.json();
  return Response.json(json, { status: res.status });
}