import { getUserFromIpAddress } from "@/lib/cred";
import { prismaClient } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Helper function for creating standardized error responses
function createErrorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromIpAddress(request); // Assumes getUserFromIpAddress handles its own errors or returns null

    if (!user || !user.id) {
      return createErrorResponse(
        "User not found or unauthorized to get all workspace.",
        404
      );
    }

    const workspaces = await prismaClient.workspace.findMany({
      include: {
        _count: true,
      },
    });

    if (workspaces.length === 0) {
      return createErrorResponse("Workspaces is empty.", 404);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Workspace created successfully.",
        workspaces: workspaces,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[API_ERROR] /api/workspace/get-all-workspaces:", error);
    // Add more specific error handling if needed (e.g., Prisma errors)
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while getting the workspace.";
    return createErrorResponse(errorMessage, 500);
  }
}
