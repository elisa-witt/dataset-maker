import { getUserFromIpAddress } from "@/lib/cred";
import { prismaClient } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Helper function for creating standardized error responses
function createErrorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function DELETE(request: NextRequest) {
  // Changed to DELETE, or use POST and check a specific action field
  // Typically, DELETE HTTP method is used for deletion. If using POST, you might send an 'action: "delete"' field.
  // For this example, I'll assume you want to use POST and identify the workspace by workspace_id.
  // If this is a DELETE request, the method should be `export async function DELETE(...)`
  // and workspace_id might come from URL params or the body.

  try {
    const body = await request.json();
    const { workspace_id } = body;

    if (!workspace_id || typeof workspace_id !== "string") {
      return createErrorResponse("Workspace ID is required.", 400);
    }

    const user = await getUserFromIpAddress(request);

    if (!user || !user.id) {
      return createErrorResponse("User not found or unauthorized.", 404); // Or 401/403
    }

    // Verify the workspace exists and belongs to the user before deleting
    const workspaceToDelete = await prismaClient.workspace.findUnique({
      where: {
        id: workspace_id,
      },
    });

    if (!workspaceToDelete) {
      return createErrorResponse(
        `Workspace with ID '${workspace_id}' not found.`,
        404
      );
    }

    // Authorization check: Does this workspace belong to the authenticated user?
    if (workspaceToDelete.userId !== user.id) {
      return createErrorResponse(
        "You are not authorized to delete this workspace.",
        403
      ); // 403 Forbidden
    }

    // Delete the workspace
    await prismaClient.workspace.delete({
      where: {
        id: workspace_id,
        // You could also add userId here for an additional layer of security in the delete query itself
        // userId: user.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Workspace with ID '${workspace_id}' deleted successfully.`,
      },
      { status: 200 }
    );
    // Some prefer 204 No Content for successful deletions with no body
    // return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    console.error("[API_ERROR] /api/workspace/delete-workspace:", error);
    // Handle specific Prisma errors, e.g., if the record to delete is not found (P2025)
    // if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    //   return createErrorResponse(`Workspace with ID '${workspace_id}' not found or could not be deleted.`, 404);
    // }
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while deleting the workspace.";
    return createErrorResponse(errorMessage, 500);
  }
}
