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
    const { workspace_name } = body;

    if (
      !workspace_name ||
      typeof workspace_name !== "string" ||
      workspace_name.trim() === ""
    ) {
      return createErrorResponse(
        "Workspace name is required and must be a non-empty string.",
        400
      );
    }

    const user = await getUserFromIpAddress(request); // Assumes getUserFromIpAddress handles its own errors or returns null

    if (!user || !user.id) {
      // Check for user and user.id
      // If getUserFromIpAddress can throw, you might want a try-catch around it too,
      // or ensure it consistently returns null on failure.
      return createErrorResponse(
        "User not found or unauthorized to create a workspace.",
        404
      ); // Or 401/403 depending on auth logic
    }

    const newWorkspace = await prismaClient.workspace.create({
      data: {
        workspaceName: workspace_name.trim(),
        userId: user.id, // Ensure user.id is available
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Workspace created successfully.",
        workspace: { id: newWorkspace.id, name: newWorkspace.workspaceName },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[API_ERROR] /api/workspace/create-workspace:", error);
    // Add more specific error handling if needed (e.g., Prisma errors)
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while creating the workspace.";
    return createErrorResponse(errorMessage, 500);
  }
}
