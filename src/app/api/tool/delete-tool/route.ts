import { prismaClient } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params: routeParams }: { params: Promise<{ id: string }> }
) {
  const params = await request.json();

  try {
    const tool = await prismaClient.tool.delete({
      where: {
        id: params.tool_id,
      },
    });

    return NextResponse.json(tool);
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to create tool" },
      { status: 500 }
    );
  }
}
