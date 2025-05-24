/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, FormEventHandler } from "react";
import { Plus, MessageSquare, Send, Loader2, Play } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";

// Interfaces matching your Prisma schema
interface Conversation {
  id: string;
  conversationId: string;
  title?: string;
  description?: string;
  messages: Message[];
  quality?: number;
  difficulty?: string;
  category?: string;
  tags?: string[];
}

interface Message {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content?: string;
  name?: string;
  order: number;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

interface Tool {
  id: string;
  toolName: string;
  description?: string;
  parameters?: string;
  apiUrl?: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ToolCall {
  id: string;
  toolCallId: string;
  type: string;
  functionName: string;
  functionArguments: string;
  description?: string;
}

interface ToolCallInput {
  id: string; // For OpenAI spec, this is the call_id
  function: {
    name: string;
    arguments: string; // JSON string of arguments
  };
  type: "function";
}

interface ChatCardProps {
  datasetId: string;
  workspaceId: string;
}

export function ChatCard({ datasetId, workspaceId }: ChatCardProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<
    "user" | "assistant" | "tool" | "system"
  >("user");

  const [showToolCallOptions, setShowToolCallOptions] = useState(false);
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [selectedToolToCall, setSelectedToolToCall] = useState<Tool | null>(
    null
  );
  const [toolArguments, setToolArguments] = useState<Record<string, any>>({}); // To store argument inputs
  const [isExecutingTool, setIsExecutingTool] = useState(false);

  useEffect(() => {
    if (datasetId) {
      fetchConversations();
    }
  }, [datasetId]);

  const renderToolArgumentInputs = (tool: Tool) => {
    if (!tool.parameters)
      return (
        <p className="text-xs text-muted-foreground">
          No parameters defined for this tool.
        </p>
      );

    try {
      const schema = JSON.parse(tool.parameters);
      if (schema.type !== "object" || !schema.properties) {
        return (
          <p className="text-xs text-destructive">
            Invalid parameters schema (must be an object with properties).
          </p>
        );
      }

      return Object.entries(schema.properties).map(
        ([key, propSchema]: [string, any]) => {
          // Basic input rendering, extend for different types, enums, descriptions etc.
          const paramDetails = propSchema as {
            type: string;
            description?: string;
            enum?: string[];
          };
          return (
            <div key={key} className="space-y-1">
              <Label htmlFor={`tool-arg-${key}`} className="text-xs">
                {key} ({paramDetails.type})
                {schema.required?.includes(key) && (
                  <span className="text-destructive"> *</span>
                )}
              </Label>
              {paramDetails.description && (
                <p className="text-xs text-muted-foreground">
                  {paramDetails.description}
                </p>
              )}

              {paramDetails.enum ? (
                <Select
                  value={toolArguments[key] || ""}
                  onValueChange={(value) =>
                    setToolArguments((prev) => ({ ...prev, [key]: value }))
                  }
                >
                  <SelectTrigger id={`tool-arg-${key}`}>
                    <SelectValue placeholder={`Select ${key}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {paramDetails.enum.map((enumValue) => (
                      <SelectItem key={enumValue} value={enumValue}>
                        {enumValue}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : paramDetails.type === "boolean" ? (
                <Checkbox
                  id={`tool-arg-${key}`}
                  checked={!!toolArguments[key]}
                  onCheckedChange={(checked) =>
                    setToolArguments((prev) => ({ ...prev, [key]: !!checked }))
                  }
                />
              ) : (
                // Default to text input for string, number etc.
                <Input
                  id={`tool-arg-${key}`}
                  type={paramDetails.type === "number" ? "number" : "text"}
                  value={toolArguments[key] || ""}
                  onChange={(e) =>
                    setToolArguments((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                    }))
                  }
                  placeholder={`Enter ${key}`}
                />
              )}
            </div>
          );
        }
      );
    } catch (e) {
      console.error("Error parsing tool parameters schema:", e);
      return (
        <p className="text-xs text-destructive">
          Error parsing parameters schema.
        </p>
      );
    }
  };

  const handleExecuteToolAndAddMessages = async () => {
    if (
      !selectedToolToCall ||
      !selectedToolToCall.apiUrl ||
      !selectedConversation
    )
      return;

    setIsExecutingTool(true);
    let toolExecutionResult: any;
    const toolCallId = `call_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 10)}`; // Generate a unique call_id

    try {
      // 1. Call your backend to execute the tool
      const executionResponse = await fetch("/api/tool/execute", {
        // Use your actual endpoint
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolId: selectedToolToCall.id,
          args: toolArguments,
        }),
      });

      if (!executionResponse.ok) {
        const errorData = await executionResponse
          .json()
          .catch(() => ({ error: "Failed to execute tool via API" }));
        throw new Error(
          errorData.error ||
            `Tool execution failed: ${executionResponse.statusText}`
        );
      }
      toolExecutionResult = await executionResponse.json();

      // 2. Create the assistant message with the tool_call
      const assistantMessageData = {
        role: "assistant" as const,
        content: null, // Or some precursor text if desired
        order: selectedConversation.messages?.length || 0,
        toolCalls: [
          {
            id: toolCallId,
            type: "function" as const,
            function: {
              name: selectedToolToCall.toolName,
              arguments: JSON.stringify(toolArguments),
            },
          },
        ],
      };

      const addAssistantMsgResponse = await fetch(
        `/api/dataset/${datasetId}/conversations/${selectedConversation.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(assistantMessageData),
        }
      );
      if (!addAssistantMsgResponse.ok)
        throw new Error("Failed to add assistant message");
      const addedAssistantMessage: Message =
        await addAssistantMsgResponse.json();

      // 3. Create the tool message with the execution result
      const toolMessageData = {
        role: "tool" as const,
        content: JSON.stringify(toolExecutionResult), // OpenAI expects content for tool role to be the result
        order: (selectedConversation.messages?.length || 0) + 1,
        toolCallId: toolCallId, // Link to the assistant's tool call
        name: selectedToolToCall.toolName, // Optional: name of the tool that was called
      };

      const addToolMsgResponse = await fetch(
        `/api/dataset/${datasetId}/conversations/${selectedConversation.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toolMessageData),
        }
      );
      if (!addToolMsgResponse.ok) throw new Error("Failed to add tool message");
      const addedToolMessage: Message = await addToolMsgResponse.json();

      // 4. Update frontend state
      setSelectedConversation((prevConv) => {
        if (!prevConv) return null;
        const existingMessages = prevConv.messages || [];
        return {
          ...prevConv,
          messages: [
            ...existingMessages,
            addedAssistantMessage,
            addedToolMessage,
          ].sort((a, b) => a.order - b.order),
        };
      });
      setConversations((prevConvs) =>
        prevConvs.map((conv) =>
          conv.id === selectedConversation.id
            ? {
                ...conv,
                messages: [
                  ...(conv.messages || []),
                  addedAssistantMessage,
                  addedToolMessage,
                ].sort((a, b) => a.order - b.order),
              }
            : conv
        )
      );

      toast.success("Tool executed and messages added successfully!");
      setShowToolCallOptions(false);
      setSelectedToolToCall(null);
      setToolArguments({});
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      console.error("Error executing tool or adding messages:", error);
      toast.error(errorMessage);
    } finally {
      setIsExecutingTool(false);
    }
  };

  useEffect(() => {
    const fetchWorkspaceDetailsAndTools = async () => {
      if (datasetId) {
        if (workspaceId) {
          try {
            const response = await fetch(`/api/workspace/${workspaceId}/tools`);
            if (!response.ok) {
              throw new Error("Failed to fetch tools");
            }
            const toolsData = await response.json();
            setAvailableTools(toolsData || []);
          } catch (error) {
            console.error("Failed to fetch workspace tools:", error);
            toast.error("Failed to load workspace tools.");
          }
        }
      }
    };
    fetchWorkspaceDetailsAndTools();
  }, [datasetId, workspaceId]); // Add dependencies as needed

  const fetchConversations = async () => {
    if (!datasetId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/dataset/${datasetId}/conversations`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setConversations(data || []);

      if (selectedConversation) {
        const updatedSelected = data.find(
          (c: Conversation) => c.id === selectedConversation.id
        );
        setSelectedConversation(updatedSelected || null);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      toast("Failed to fetch conversations.");
    } finally {
      setLoading(false);
    }
  };

  const createConversation = async () => {
    if (!datasetId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/dataset/${datasetId}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Conversation ${conversations.length + 1}`,
          description: "Makesure",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const newConversation = await response.json();
      setConversations((prev) => [newConversation, ...prev]);
      setSelectedConversation(newConversation);
      toast("New conversation created!");
    } catch (error) {
      console.error("Failed to create conversation:", error);
      toast(`Failed to create conversation: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const submitHandler: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const promptContentElement = form.elements.namedItem(
      "promptContent"
    ) as HTMLTextAreaElement;
    const prompt = promptContentElement.value.trim();

    if (!prompt || !selectedConversation) {
      toast("Please select a conversation and type a message.");
      return;
    }

    setMessageLoading(true);

    const newMessageData = {
      role: selectedRole,
      content: prompt,
      order: selectedConversation.messages?.length || 0,
    };

    try {
      const response = await fetch(
        `/api/dataset/${datasetId}/conversations/${selectedConversation.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newMessageData),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to send message" }));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const addedMessage: Message = await response.json();

      // Update messages for the selected conversation
      setSelectedConversation((prevConv) => {
        if (!prevConv) return null;
        const existingMessages = prevConv.messages || [];
        return {
          ...prevConv,
          messages: [...existingMessages, addedMessage].sort(
            (a, b) => a.order - b.order
          ),
        };
      });

      // Update the conversation list
      setConversations((prevConvs) =>
        prevConvs.map((conv) =>
          conv.id === selectedConversation.id
            ? {
                ...conv,
                messages: [...(conv.messages || []), addedMessage].sort(
                  (a, b) => a.order - b.order
                ),
              }
            : conv
        )
      );

      toast("Message added successfully!");
      promptContentElement.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
      toast(`Failed to send message: ${(error as Error).message}`);
    } finally {
      setMessageLoading(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(
        `/api/dataset/${datasetId}/conversations/${conversationId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete conversation");
      }

      setConversations((prev) => prev.filter((c) => c.id !== conversationId));

      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }

      toast("Conversation deleted successfully!");
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      toast(`Failed to delete conversation: ${(error as Error).message}`);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!selectedConversation) return;

    try {
      const response = await fetch(
        `/api/dataset/${datasetId}/conversations/${selectedConversation.conversationId}/messages`,
        {
          method: "DELETE",
          body: JSON.stringify({
            messageId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete message");
      }

      // Update messages for the selected conversation
      setSelectedConversation((prevConv) => {
        if (!prevConv) return null;
        return {
          ...prevConv,
          messages: prevConv.messages.filter((m) => m.id !== messageId),
        };
      });

      // Update the conversation list
      setConversations((prevConvs) =>
        prevConvs.map((conv) =>
          conv.id === selectedConversation.id
            ? {
                ...conv,
                messages: conv.messages.filter((m) => m.id !== messageId),
              }
            : conv
        )
      );

      toast("Message deleted successfully!");
    } catch (error) {
      console.error("Failed to delete message:", error);
      toast(`Failed to delete message: ${(error as Error).message}`);
    }
  };

  return (
    <div className="min-h-screen w-full font-[family-name:var(--font-geist-sans)]">
      {/* Full Page Container */}
      <div className="flex h-screen w-full">
        {/* Conversation List Sidebar */}
        <div className="w-80 border-r p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Training Conversations</h3>
            <Button
              onClick={createConversation}
              disabled={loading || !datasetId}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              New
            </Button>
          </div>

          {loading && !conversations.length ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4" />
                Loading conversations...
              </div>
            </div>
          ) : null}

          {!loading && !conversations.length && datasetId ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No conversations yet</p>
                <p className="text-sm">Create one to get started!</p>
              </div>
            </div>
          ) : null}

          {!datasetId ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-center">
                Please provide a Dataset ID to load conversations.
              </p>
            </div>
          ) : null}

          <div className="space-y-3 overflow-y-auto flex-grow">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group p-4 rounded-xl cursor-pointer border transition-all duration-200 relative ${
                  selectedConversation?.id === conversation.id
                    ? "bg-current/20"
                    : ""
                }`}
              >
                <div onClick={() => setSelectedConversation(conversation)}>
                  <div className="font-semibold truncate pr-8 mb-2">
                    {conversation.title ||
                      `Conversation ${conversation.conversationId.slice(0, 8)}`}
                  </div>
                  <div className="text-sm flex justify-between items-center mb-2">
                    <span>{conversation.messages?.length || 0} messages</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conversation.id);
                  }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="py-6 px-8 border-b">
                <h1 className="text-3xl font-bold mb-2">
                  {selectedConversation.title || "Training Conversation"}
                </h1>

                <div className="flex items-center space-x-6 text-sm">
                  {selectedConversation.quality && (
                    <span className="px-3 py-1 rounded-full">
                      Quality: {selectedConversation.quality}/10
                    </span>
                  )}
                  {selectedConversation.difficulty && (
                    <span className="px-3 py-1 rounded-full">
                      Difficulty: {selectedConversation.difficulty}
                    </span>
                  )}
                  {selectedConversation.category && (
                    <span className="px-3 py-1 rounded-full">
                      Category: {selectedConversation.category}
                    </span>
                  )}
                </div>
              </div>

              {/* Chat Messages Display */}
              <div className="flex-grow overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                  {selectedConversation.messages &&
                  selectedConversation.messages.length > 0 ? (
                    selectedConversation.messages
                      .sort((a, b) => a.order - b.order)
                      .map((msg) => (
                        <ChatSubCard
                          key={msg.id}
                          message={msg}
                          onDelete={() => deleteMessage(msg.id)}
                        />
                      ))
                  ) : (
                    <div className="flex items-center justify-center h-128">
                      <div className="text-center text-muted-foreground">
                        <MessageSquare className="w-16 h-16 mx-auto mb-6" />
                        <p className="text-xl font-medium mb-2">
                          No messages yet
                        </p>
                        <p>
                          Start the conversation by sending a message below.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Message Input Form */}
              <div className="border-t ">
                <form
                  onSubmit={submitHandler}
                  className="max-w-4xl mx-auto p-8"
                >
                  <div className="flex gap-6 items-end">
                    <div className="flex-1">
                      <div className="flex gap-2 mb-4">
                        {/* User Role */}
                        <Select
                          onValueChange={(
                            value: "user" | "assistant" | "tool" | "system"
                          ) => setSelectedRole(value)}
                          defaultValue="user"
                          disabled={messageLoading}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Message Role</SelectLabel>
                              <SelectItem value="system">System</SelectItem>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="assistant">
                                Assistant
                              </SelectItem>
                              <SelectItem value="tool">Tool</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>

                        {/* Tool Pick */}
                        {selectedRole === "assistant" &&
                          !showToolCallOptions && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowToolCallOptions(true)}
                              className="mb-2"
                              disabled={
                                messageLoading || availableTools.length === 0
                              }
                            >
                              Add Tool Call
                            </Button>
                          )}
                        {selectedRole === "assistant" &&
                          showToolCallOptions && (
                            <div className="p-4 border rounded-md mb-4 space-y-3 bg-muted/50">
                              <h4 className="font-medium">
                                Configure Tool Call
                              </h4>
                              <Select
                                onValueChange={(toolId) => {
                                  const tool = availableTools.find(
                                    (t) => t.id === toolId
                                  );
                                  setSelectedToolToCall(tool || null);
                                  setToolArguments({}); // Reset arguments when tool changes
                                }}
                                disabled={isExecutingTool}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select a tool to call" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableTools.map((tool) => (
                                    <SelectItem
                                      key={tool.id}
                                      value={tool.id}
                                      disabled={!tool.apiUrl}
                                    >
                                      {tool.toolName}{" "}
                                      {!tool.apiUrl &&
                                        "(API URL not configured)"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {selectedToolToCall &&
                                selectedToolToCall.parameters && (
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium">
                                      Arguments:
                                    </Label>
                                    {/* Dynamically render input fields based on selectedToolToCall.parameters JSON schema */}
                                    {renderToolArgumentInputs(
                                      selectedToolToCall
                                    )}
                                  </div>
                                )}

                              {selectedToolToCall &&
                                !selectedToolToCall.apiUrl && (
                                  <p className="text-xs text-destructive">
                                    This tool cannot be executed as its API URL
                                    is not configured. You can still add it
                                    manually to the dataset.
                                  </p>
                                )}

                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  onClick={handleExecuteToolAndAddMessages}
                                  disabled={
                                    !selectedToolToCall ||
                                    !selectedToolToCall.apiUrl ||
                                    isExecutingTool
                                  }
                                  size="sm"
                                >
                                  {isExecutingTool ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Play className="mr-2 h-4 w-4" /> // Assuming you have Play icon from lucide-react
                                  )}
                                  Execute & Add to Dataset
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setShowToolCallOptions(false);
                                    setSelectedToolToCall(null);
                                    setToolArguments({});
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                      </div>
                      <Textarea
                        name="promptContent"
                        placeholder="Type your message here..."
                        className="min-h-[120px] resize-none text-base"
                        disabled={messageLoading}
                      />
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      className="px-8 py-4"
                      disabled={messageLoading}
                    >
                      {messageLoading ? (
                        <>
                          <Loader2 className="animate-spin h-5 w-5 mr-2" />
                          Sending
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          Send
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            // Placeholder if no conversation is selected
            <div className="flex-1 p-8 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="w-20 h-20 mx-auto mb-6" />
                <h2 className="text-2xl font-bold mb-2">
                  Select a conversation
                </h2>
                <p className="text-lg">
                  Choose a conversation from the sidebar to view and edit
                  messages,
                </p>
                <p className="text-lg">or create a new one to get started.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Message component with delete functionality
function ChatSubCard({
  message,
  onDelete,
}: {
  message: Message;
  onDelete: () => void;
}) {
  const { role, content, toolCalls } = message;

  return (
    <div
      className={`group flex gap-4 items-start ${
        role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      {role !== "user" && (
        <Avatar className="w-10 h-10 flex-shrink-0">
          {role === "assistant" && (
            <AvatarImage src="/icons/assistant-avatar.png" alt="Assistant" />
          )}
          <AvatarFallback>{role.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
      )}

      {/* Content Bubble */}
      <div
        className={`relative flex flex-col max-w-[75%] p-4 rounded-2xl shadow-sm
        ${
          role === "user"
            ? "bg-blue-500 text-white rounded-tr-none"
            : "bg-gray-100 text-gray-800 rounded-tl-none"
        }
        ${
          role === "system"
            ? "bg-yellow-100 text-yellow-800 w-full text-sm italic text-center p-3"
            : ""
        }
        ${role === "tool" ? "bg-purple-100 text-purple-800 text-sm" : ""}
      `}
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold uppercase tracking-wide opacity-75">
            {role}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-current hover:bg-red-500/20 rounded-full"
          >
            ×
          </Button>
        </div>
        <div className="text-base leading-relaxed whitespace-pre-wrap">
          {content || ""}
        </div>

        {/* Tool Calls Display */}
        {toolCalls && toolCalls.length > 0 && (
          <div className="mt-3 border-t border-current/20 pt-3">
            <p className="text-xs font-semibold mb-2 uppercase tracking-wide">
              Tool Calls:
            </p>
            {toolCalls.map((tc) => (
              <div
                key={tc.id}
                className="text-sm bg-black/10 rounded-lg p-3 mb-2"
              >
                <div className="font-mono text-xs break-all">
                  {tc.functionName}({tc.functionArguments})
                </div>
                {tc.description && (
                  <div className="text-xs opacity-75 mt-2">
                    {tc.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {role === "user" && (
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarImage src="https://github.com/shadcn.png" alt="User" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
