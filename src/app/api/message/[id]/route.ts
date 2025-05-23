import { prismaClient } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// PUT - Update message
export async function PUT(
  request: NextRequest,
  { params: routeParams }: { params: Promise<{ id: string }> } // Renamed for clarity
) {
  try {
    const params = await routeParams;

    const { content, toolCalls = [] } = await request.json();

    // Delete existing tool calls
    await prismaClient.openAIToolCall.deleteMany({
      where: { messageId: params.id },
    });

    // Update message with new tool calls
    const message = await prismaClient.message.update({
      where: { id: params.id },
      data: {
        content,
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
      { error: "Failed to update message" },
      { status: 500 }
    );
  }
}

// DELETE - Delete message
export async function DELETE(
  request: NextRequest,
  { params: routeParams }: { params: Promise<{ id: string }> } // Renamed for clarity
) {
  const params = await routeParams;

  try {
    await prismaClient.message.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}
