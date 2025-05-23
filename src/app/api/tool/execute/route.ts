import { prismaClient } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toolId, args } = body;

    if (!toolId || !args) {
      return NextResponse.json(
        { error: "toolId and args are required" },
        { status: 400 }
      );
    }

    const tool = await prismaClient.tool.findUnique({
      where: { id: toolId },
    });

    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    if (!tool.apiUrl) {
      return NextResponse.json(
        { error: "Tool does not have an API URL configured" },
        { status: 400 }
      );
    }

    // Basic execution example (needs more robust handling)
    // Assuming POST with JSON for now, extend as needed for GET, other formats, methods
    const externalApiResponse = await fetch(tool.apiUrl, {
      method: "POST", // Or tool.httpMethod if you add that field
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });

    if (!externalApiResponse.ok) {
      const errorText = await externalApiResponse.text();
      return NextResponse.json(
        {
          error: `External API Error: ${externalApiResponse.status} ${errorText}`,
        },
        { status: 502 }
      ); // Bad Gateway
    }

    const responseData = await externalApiResponse.json();
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Tool execution error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to execute tool";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
