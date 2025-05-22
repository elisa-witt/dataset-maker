import { MessageRole } from "@/generated/prisma";
import { prismaClient } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - Get all messages in a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const messages = await prismaClient.message.findMany({
      where: { conversationId: params.id },
      include: { toolCalls: true },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// POST - Add new message to conversation
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const {
      role,
      content,
      toolCalls = [],
      name,
      toolCallId,
    } = await request.json();

    // Get the next order number
    const lastMessage = await prismaClient.message.findFirst({
      where: { conversationId: params.id },
      orderBy: { order: "desc" },
    });
    const nextOrder = (lastMessage?.order ?? -1) + 1;

    const message = await prismaClient.message.create({
      data: {
        conversationId: params.id,
        role: role as MessageRole,
        content,
        name,
        toolCallId,
        order: nextOrder,
        toolCalls: {
          create: toolCalls.map((tc: any) => ({
            toolCallId: tc.id || `call_${Date.now()}`,
            type: tc.type || "function",
            functionName: tc.function.name,
            functionArguments: JSON.stringify(tc.function.arguments),
          })),
        },
      },
      include: { toolCalls: true },
    });

    return NextResponse.json(message);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
