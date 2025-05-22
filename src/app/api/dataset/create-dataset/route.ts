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
    const { workspace_id, name, description } = body;

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

    const user = await getUserFromIpAddress(request);

    if (!user || !user.id) {
      return createErrorResponse(
        "User not found or unauthorized to create a dataset.",
        404
      );
    }

    // Verify workspace exists and user has access
    const workspace = await prismaClient.workspace.findFirst({
      where: {
        workspaceId: workspace_id,
        userId: user.id, // Ensure user owns the workspace
      },
    });

    if (!workspace) {
      return createErrorResponse("Workspace not found or access denied.", 404);
    }

    // Create the dataset
    const dataset = await prismaClient.dataset.create({
      data: {
        workspaceId: workspace.id, // Use internal ID, not workspaceId
        name: name || `Dataset ${new Date().toISOString()}`, // Default name if not provided
        description: description || null,
        // OpenAI compliance fields use defaults from schema
        purpose: "fine-tune",
        status: "draft",
      },
      include: {
        Workspace: {
          select: {
            workspaceName: true,
            workspaceId: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Dataset created successfully.",
        dataset: {
          id: dataset.id,
          datasetId: dataset.datasetId,
          name: dataset.name,
          description: dataset.description,
          status: dataset.status,
          purpose: dataset.purpose,
          workspace: dataset.Workspace,
          createdAt: dataset.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[API_ERROR] /api/dataset/create-dataset:", error);

    // Handle Prisma-specific errors
    if (error instanceof Error) {
      if (error.message.includes("Unique constraint")) {
        return createErrorResponse("Dataset with this ID already exists.", 409);
      }
      if (error.message.includes("Foreign key constraint")) {
        return createErrorResponse("Invalid workspace reference.", 400);
      }
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while creating the dataset.";
    return createErrorResponse(errorMessage, 500);
  }
}
