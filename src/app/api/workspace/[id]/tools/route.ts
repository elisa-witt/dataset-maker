import { prismaClient } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params: routeParams }: { params: Promise<{ id: string }> }
) {
  const params = await routeParams;

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
  { params: routeParams }: { params: Promise<{ id: string }> }
) {
  const params = await routeParams;

  try {
    const { toolName, description, parameters, apiUrl } = await request.json();

    const workspace = await prismaClient.workspace.findFirst({
      where: {
        workspaceId: params.id,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Failed to find workspace" },
        { status: 500 }
      );
    }

    const tool = await prismaClient.tool.create({
      data: {
        workspaceId: workspace.id,
        toolName,
        description,
        parameters: JSON.stringify(parameters),
        apiUrl,
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
