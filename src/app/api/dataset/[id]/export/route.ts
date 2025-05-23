import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "@/lib/prisma";
import { MessageRole } from "@/generated/prisma"; // Ensure this is correctly imported

// Helper function to create standardized error responses
function createErrorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

interface ExportedMessage {
  role: MessageRole | string; // Allow string for flexibility if roles might expand
  content?: string | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string; // JSON string
    };
  }[];
  tool_call_id?: string | null;
  name?: string | null; // For tool role
}

interface ExportedToolFunction {
  name: string;
  description?: string | null;
  parameters: any; // Parsed JSON schema
}

interface ExportedTool {
  type: "function";
  function: ExportedToolFunction;
}

interface ExportedConversationItem {
  messages: ExportedMessage[];
  tools: ExportedTool[];
  parallel_tool_calls: boolean; // Add this
}

export async function GET(
  request: NextRequest,
  { params: routeParams }: { params: Promise<{ id: string }> }
) {
  const datasetId = (await routeParams).id;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json"; // Default to json

  if (!datasetId) {
    return createErrorResponse("Dataset ID is required.", 400);
  }

  if (format !== "json" && format !== "jsonl") {
    return createErrorResponse(
      "Invalid format. Must be 'json' or 'jsonl'.",
      400
    );
  }

  try {
    // 1. Fetch the dataset to get workspaceId
    const dataset = await prismaClient.dataset.findUnique({
      where: { datasetId: datasetId },
      include: {
        Workspace: {
          // To get workspace tools
          include: {
            tools: true,
          },
        },
        trainingConversations: {
          include: {
            messages: {
              include: {
                toolCalls: true, // Prisma relation name for OpenAIToolCall on Message
              },
              orderBy: { order: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!dataset) {
      return createErrorResponse(
        `Dataset with ID ${datasetId} not found.`,
        404
      );
    }

    if (!dataset.Workspace) {
      return createErrorResponse(
        `Dataset -> Workspace with ID ${datasetId} not found.`,
        404
      );
    }

    // 2. Prepare tools data (parse parameters string to JSON object)
    const exportedTools: ExportedTool[] = dataset.Workspace.tools.map(
      (tool) => {
        let parsedParameters = {};
        try {
          if (tool.parameters) {
            parsedParameters = JSON.parse(tool.parameters);
          }
        } catch (e) {
          console.error(`Failed to parse parameters for tool ${tool.id}:`, e);
          // Keep parameters as empty object or handle error as preferred
        }
        return {
          type: "function",
          function: {
            name: tool.toolName,
            description: tool.description,
            parameters: parsedParameters,
          },
        };
      }
    );

    // 3. Prepare conversation data
    const conversationItems: ExportedConversationItem[] =
      dataset.trainingConversations.map((convo) => {
        const exportedMessages: ExportedMessage[] = convo.messages.map(
          (msg) => {
            const messageItem: ExportedMessage = {
              role: msg.role,
              content: msg.content,
            };

            if (
              msg.role === "assistant" &&
              msg.toolCalls &&
              msg.toolCalls.length > 0
            ) {
              messageItem.tool_calls = msg.toolCalls.map((tc) => ({
                id: tc.toolCallId, // This is the 'call_id' from OpenAI spec
                type: "function", // Assuming all are functions for now
                function: {
                  name: tc.functionName,
                  arguments: tc.functionArguments, // Already a JSON string
                },
              }));
            }

            if (msg.role === "tool") {
              messageItem.tool_call_id = msg.toolCallId;
              messageItem.name = msg.name; // Name of the tool that was called
            }
            return messageItem;
          }
        );

        return {
          messages: exportedMessages,
          tools: exportedTools, // Include all workspace tools with each conversation item as per user's initial JSON
          parallel_tool_calls: false,

          // conversationId: convo.conversationId, // Optional
          // title: convo.title,                 // Optional
        };
      });

    // 4. Format and respond
    let responseBody: string;
    let contentType: string;
    const filename = `dataset_${dataset.datasetId
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()}.${format}`;

    if (format === "jsonl") {
      responseBody = conversationItems
        .map((item) => JSON.stringify(item))
        .join("\n");
      contentType = "application/jsonl";
    } else {
      // json
      responseBody = JSON.stringify(conversationItems, null, 2); // For an array of conversation items
      // If you want the exact structure from your first message (single object with 'messages' and 'tools'),
      // and your dataset has only one conversation, you would do:
      // responseBody = JSON.stringify(conversationItems[0], null, 2);
      // For multiple conversations, an array is more standard for a "dataset" export.
      contentType = "application/json";
    }

    // 5. Update dataset export stats
    await prismaClient.dataset.update({
      where: { id: dataset.id },
      data: {
        exportCount: { increment: 1 },
        lastExportAt: new Date(),
      },
    });

    return new NextResponse(responseBody, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error(`[API_ERROR] /api/dataset/${datasetId}/export:`, error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred during export.";
    return createErrorResponse(errorMessage, 500);
  }
}
