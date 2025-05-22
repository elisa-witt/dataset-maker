import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "@/lib/prisma";

// GET - List all training conversations in a dataset
export async function GET(
  request: NextRequest,
  { params: waitParams }: { params: { id: string } }
) {
  const params = await waitParams;

  try {
    const conversations = await prismaClient.trainingConversation.findMany({
      where: { datasetId: params.id },
      include: {
        messages: {
          include: { toolCalls: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

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
  { params: waitParams }: { params: { id: string } }
) {
  const params = await waitParams;

  try {
    const { title, description, tags = [] } = await request.json();

    const conversation = await prismaClient.trainingConversation.create({
      data: {
        datasetId: params.id,
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
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
