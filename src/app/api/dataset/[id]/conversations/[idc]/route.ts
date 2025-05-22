import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "@/lib/prisma";
import { PrismaClientKnownRequestError } from "@/generated/prisma/runtime/library";

// DELETE - Delete training conversation
export async function DELETE(
  request: NextRequest,
  { params: routeParams }: { params: Promise<{ idc: string }> } // Renamed for clarity
) {
  try {
    const conversationId = (await routeParams).idc;

    // 2. Create the TrainingConversation
    const conversation = await prismaClient.trainingConversation.delete({
      where: {
        id: conversationId,
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
          error: `Failed to delete conversation. A foreign key constraint was violated on the '${fieldName}' field. Ensure the referenced dataset exists.`,
        },
        { status: 400 } // Bad Request, as input data is problematic
      );
    }

    return NextResponse.json(
      {
        error: "Failed to delete conversation due to an internal server error.",
      },
      { status: 500 }
    );
  }
}
