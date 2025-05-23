import { prismaClient } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params: routeParams }: { params: Promise<{ id: string }> }
) {
  const params = await routeParams;

  try {
    const tools = await prismaClient.tool.findMany({
      where: { workspaceId: params.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tools);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch tools" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params: routeParams }: { params: Promise<{ id: string }> } // workspaceId from path
) {
  const params = await routeParams; // Contains { id: workspaceIdFromPath }
  const workspaceIdFromPath = params.id;

  try {
    const { toolName, description, parameters, apiUrl } = await request.json();
    // 'parameters' received here is already the JSON string of the schema

    if (!toolName || typeof toolName !== "string" || toolName.trim() === "") {
      return NextResponse.json(
        { error: "Tool name is required." },
        { status: 400 }
      );
    }

    const workspace = await prismaClient.workspace.findUnique({
      // Use findUnique if workspaceId is unique ID
      where: {
        // id: workspaceIdFromPath, // If path 'id' is the internal Prisma ID
        workspaceId: workspaceIdFromPath, // If path 'id' is the string workspaceId field
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: `Workspace with ID ${workspaceIdFromPath} not found.` },
        { status: 404 }
      );
    }

    const tool = await prismaClient.tool.create({
      data: {
        workspaceId: workspace.id, // Use the internal Prisma workspace.id
        toolName,
        description: description || null,
        parameters: parameters, // Store the JSON string directly
        apiUrl: apiUrl || null,
      },
    });

    return NextResponse.json(tool); // Or { tool: tool } to match frontend expectation
  } catch (error) {
    console.error("Error creating tool:", error);
    return NextResponse.json(
      {
        error:
          "Failed to create tool. " +
          (error instanceof Error ? error.message : ""),
      },
      { status: 500 }
    );
  }
}
