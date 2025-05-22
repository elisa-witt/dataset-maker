import { getUserFromIpAddress } from "@/lib/cred";
import { prismaClient } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Helper function for creating standardized error responses
function createErrorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { dataset_id } = body;

    if (
      !dataset_id ||
      typeof dataset_id !== "string" ||
      dataset_id.trim() === ""
    ) {
      return createErrorResponse(
        "Dataset ID is required and must be a non-empty string.",
        400
      );
    }

    const user = await getUserFromIpAddress(request);

    if (!user || !user.id) {
      return createErrorResponse(
        "User not found or unauthorized to delete a dataset.",
        401
      );
    }

    // Find dataset and verify user has access through workspace ownership
    const dataset = await prismaClient.dataset.findFirst({
      where: {
        OR: [
          { datasetId: dataset_id }, // Support both datasetId
          { id: dataset_id }, // and internal id
        ],
        Workspace: {
          userId: user.id, // Ensure user owns the workspace
        },
      },
      include: {
        Workspace: {
          select: {
            workspaceName: true,
            workspaceId: true,
          },
        },
        // Include counts for confirmation
        _count: {
          select: {
            conversations: true,
            trainingConversations: true,
          },
        },
      },
    });

    if (!dataset) {
      return createErrorResponse(
        "Dataset not found or you don't have permission to delete it.",
        404
      );
    }

    // Store dataset info for response before deletion
    const datasetInfo = {
      id: dataset.id,
      datasetId: dataset.datasetId,
      name: dataset.name,
      workspace: dataset.Workspace,
      conversationsDeleted:
        dataset._count.conversations + dataset._count.trainingConversations,
    };

    // Delete the dataset (cascading deletes will handle related records)
    await prismaClient.dataset.delete({
      where: {
        id: dataset.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Dataset deleted successfully.",
        deletedDataset: datasetInfo,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[API_ERROR] /api/dataset/delete-dataset:", error);

    // Handle Prisma-specific errors
    if (error instanceof Error) {
      if (error.message.includes("Record to delete does not exist")) {
        return createErrorResponse("Dataset not found.", 404);
      }
      if (error.message.includes("Foreign key constraint")) {
        return createErrorResponse(
          "Cannot delete dataset due to related records.",
          409
        );
      }
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while deleting the dataset.";
    return createErrorResponse(errorMessage, 500);
  }
}

// api/dataset/get-datasets/route.ts (Bonus: List datasets for a workspace)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace_id = searchParams.get("workspace_id");

    if (
      !workspace_id ||
      typeof workspace_id !== "string" ||
      workspace_id.trim() === ""
    ) {
      return createErrorResponse(
        "Workspace ID is required as a query parameter.",
        400
      );
    }

    const user = await getUserFromIpAddress(request);

    if (!user || !user.id) {
      return createErrorResponse(
        "User not found or unauthorized to access datasets.",
        401
      );
    }

    // Get all datasets for the workspace
    const datasets = await prismaClient.dataset.findMany({
      where: {
        Workspace: {
          workspaceId: workspace_id,
          userId: user.id, // Ensure user owns the workspace
        },
      },
      include: {
        _count: {
          select: {
            conversations: true,
            trainingConversations: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      {
        success: true,
        datasets: datasets.map((dataset) => ({
          id: dataset.id,
          datasetId: dataset.datasetId,
          name: dataset.name,
          description: dataset.description,
          status: dataset.status,
          purpose: dataset.purpose,
          totalConversations:
            dataset._count.conversations + dataset._count.trainingConversations,
          legacyConversations: dataset._count.conversations,
          trainingConversations: dataset._count.trainingConversations,
          lastExportAt: dataset.lastExportAt,
          exportCount: dataset.exportCount,
          createdAt: dataset.createdAt,
          updatedAt: dataset.updatedAt,
        })),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[API_ERROR] /api/dataset/get-datasets:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while fetching datasets.";
    return createErrorResponse(errorMessage, 500);
  }
}
