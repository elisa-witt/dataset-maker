/* eslint-disable @typescript-eslint/no-explicit-any */
import { prismaClient } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Helper function for creating standardized error responses
function createErrorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function PUT(
  request: NextRequest,
  { params: routeParams }: { params: Promise<{ toolId: string }> }
) {
  const params = await routeParams;

  try {
    if (!params.toolId) {
      return createErrorResponse("Tool ID is required in the URL path.", 400);
    }

    const body = await request.json();
    const { toolName, description, parameters, apiUrl } = body; // 'parameters' is the JSON string schema

    // Basic validation
    if (!toolName || typeof toolName !== "string" || toolName.trim() === "") {
      return createErrorResponse("Tool name is required.", 400);
    }

    // Ensure parameters is a string (JSON schema) or null
    if (parameters !== null && typeof parameters !== "string") {
      return createErrorResponse(
        "Parameters must be a JSON string or null.",
        400
      );
    }
    if (apiUrl !== null && typeof apiUrl !== "string") {
      return createErrorResponse("API URL must be a string or null.", 400);
    }
    if (description !== null && typeof description !== "string") {
      return createErrorResponse("Description must be a string or null.", 400);
    }

    const updatedTool = await prismaClient.tool.update({
      where: { id: params.toolId },
      data: {
        toolName: toolName.trim(),
        description: description || null,
        parameters: parameters, // Store the JSON string directly
        apiUrl: apiUrl || null,
        updatedAt: new Date(), // Explicitly set updatedAt
      },
    });

    return NextResponse.json(
      { success: true, tool: updatedTool },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(`[API_ERROR] /api/tool/${params.toolId}:`, error);
    if (error instanceof Error && (error as any).code === "P2025") {
      // Prisma code for record not found
      return createErrorResponse("Tool not found for updating.", 404);
    }
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while updating the tool.";
    return createErrorResponse(errorMessage, 500);
  }
}
