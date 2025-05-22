import { getUserFromIpAddress } from "@/lib/cred";
import { prismaClient } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Helper function for creating standardized error responses
function createErrorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspace_id } = body;

    if (
      !workspace_id ||
      typeof workspace_id !== "string" ||
      workspace_id.trim() === ""
    ) {
      return createErrorResponse(
        "Workspace ID is required and must be a non-empty string.",
        400
      );
    }

    const user = await getUserFromIpAddress(request); // Assumes getUserFromIpAddress handles its own errors or returns null

    if (!user || !user.id) {
      return createErrorResponse(
        "User not found or unauthorized to get a workspace.",
        404
      );
    }

    const workspace = await prismaClient.workspace.findFirst({
      where: {
        workspaceId: workspace_id,
      },
    });

    if (!workspace) {
      return createErrorResponse("Workspace not found.", 404);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Workspace created successfully.",
        workspace: { id: workspace.id, name: workspace.workspaceName },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[API_ERROR] /api/workspace/get-workspace:", error);
    // Add more specific error handling if needed (e.g., Prisma errors)
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while getting the workspace.";
    return createErrorResponse(errorMessage, 500);
  }
}
