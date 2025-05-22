import { prismaClient } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tools = await prismaClient.tool.findMany({
      where: { workspaceId: params.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tools);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch tools" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { toolName, description, parameters } = await request.json();

    const tool = await prismaClient.tool.create({
      data: {
        workspaceId: params.id,
        toolName,
        description,
        parameters: JSON.stringify(parameters),
      },
    });

    return NextResponse.json(tool);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create tool" },
      { status: 500 }
    );
  }
}
