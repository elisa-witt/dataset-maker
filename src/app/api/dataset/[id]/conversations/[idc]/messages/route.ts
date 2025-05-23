/* eslint-disable @typescript-eslint/no-unused-vars */
import { MessageRole } from "@/generated/prisma";
import { prismaClient } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - Get all messages in a conversation
export async function GET(
  request: NextRequest,
  { params: routeParams }: { params: Promise<{ idc: string }> }
) {
  try {
    const params = await routeParams;

    const messages = await prismaClient.message.findMany({
      where: { conversationId: params.idc },
      include: { toolCalls: true },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(messages);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// POST - Add new message to conversation
export async function POST(
  request: NextRequest,
  { params: routeParams }: { params: Promise<{ idc: string }> }
) {
  const params = await routeParams;

  try {
    const {
      role,
      content,
      toolCalls = [],
      name,
      toolCallId,
    } = await request.json();

    const conversation = await prismaClient.trainingConversation.findFirst({
      where: {
        id: params.idc,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: `Conversation with ID ${params.idc} not found.` },
        { status: 404 } // Not Found
      );
    }

    // Get the next order number
    const lastMessage = await prismaClient.message.findFirst({
      where: { conversationId: params.idc },
      orderBy: { order: "desc" },
    });
    const nextOrder = (lastMessage?.order ?? -1) + 1;

    const message = await prismaClient.message.create({
      data: {
        conversationId: params.idc,
        role: role as MessageRole,
        content,
        name,
        toolCallId,
        order: nextOrder,
        toolCalls: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: toolCalls.map((tc: any) => ({
            toolCallId: tc.id || `call_${Date.now()}`,
            type: tc.type || "function",
            functionName: tc.function.name,
            // Ensure tc.function.arguments is already a string from the frontend
            // and doesn't need JSON.stringify() again here.
            functionArguments: tc.function.arguments, // If tc.function.arguments is already a string
          })),
        },
      },
      include: { toolCalls: true },
    });

    return NextResponse.json(message);
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}

// DELETE - Delete message in a conversation
export async function DELETE(
  request: NextRequest,
  { params: routeParams }: { params: Promise<{ idc: string }> }
) {
  const { messageId } = await request.json();
  try {
    const messages = await prismaClient.message.delete({
      where: { id: messageId },
    });

    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
