import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "@/lib/prisma";
import { PrismaClientKnownRequestError } from "@/generated/prisma/runtime/library";

// GET - List all training conversations in a dataset
export async function GET(
  request: NextRequest,
  { params: routeParams }: { params: Promise<{ id: string }> } // Renamed for clarity
) {
  const params = await routeParams;

  try {
    // 1. Check if the Dataset exists
    const dataset = await prismaClient.dataset.findUnique({
      where: { datasetId: params.id },
    });

    if (!dataset) {
      return NextResponse.json(
        { error: `Dataset with ID ${params.id} not found.` },
        { status: 404 } // Not Found
      );
    }

    const conversations = await prismaClient.trainingConversation.findMany({
      where: { datasetId: dataset.id },
      include: {
        messages: {
          include: { toolCalls: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    console.log({ conversations });

    return NextResponse.json(conversations);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// POST - Create new training conversation
export async function POST(
  request: NextRequest,
  { params: routeParams }: { params: Promise<{ id: string }> } // Renamed for clarity
) {
  try {
    const { title, description, tags = [] } = await request.json();
    const datasetIdFromUrl = (await routeParams).id;

    // 1. Check if the Dataset exists
    const dataset = await prismaClient.dataset.findUnique({
      where: { datasetId: datasetIdFromUrl },
    });

    if (!dataset) {
      return NextResponse.json(
        { error: `Dataset with ID ${datasetIdFromUrl} not found.` },
        { status: 404 } // Not Found
      );
    }

    // 2. Create the TrainingConversation
    const conversation = await prismaClient.trainingConversation.create({
      data: {
        datasetId: dataset.id,
        title: title || `Conversation ${Date.now()}`,
        description,
        tags,
      },
      include: {
        messages: {
          include: { toolCalls: true },
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(conversation);
  } catch (error: unknown) {
    console.log(error);

    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      const fieldName = error.meta?.field_name || "unknown_field";
      return NextResponse.json(
        {
          error: `Failed to create conversation. A foreign key constraint was violated on the '${fieldName}' field. Ensure the referenced dataset exists.`,
        },
        { status: 400 } // Bad Request, as input data is problematic
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create conversation due to an internal server error.",
      },
      { status: 500 }
    );
  }
}
