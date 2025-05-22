import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const id = request.headers.get("x-forward-ip");

  return new Response(JSON.stringify({ id, name: `User ${id}` }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
