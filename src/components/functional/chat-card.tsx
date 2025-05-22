"use client";

import React, { useState, useEffect, FormEventHandler } from "react";
import { Plus, MessageSquare, Send, Loader2 } from "lucide-react";
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

interface ToolCall {
  id: string;
  toolCallId: string;
  type: string;
  functionName: string;
  functionArguments: string;
  description?: string;
}

interface ChatCardProps {
  datasetId: string;
}

export function ChatCard({ datasetId }: ChatCardProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<
    "user" | "assistant" | "tool" | "system"
  >("user");

  useEffect(() => {
    if (datasetId) {
      fetchConversations();
    }
  }, [datasetId]);

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
          description: "Training conversation",
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
                  {conversation.description && (
                    <div className="text-xs truncate">
                      {conversation.description}
                    </div>
                  )}
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
                {selectedConversation.description && (
                  <p className="mb-3">{selectedConversation.description}</p>
                )}
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
                    <div className="flex items-center justify-center h-96">
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
                      <div className="mb-4">
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
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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
