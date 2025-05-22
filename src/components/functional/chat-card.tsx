"use client";

import React, { useState, useEffect, FormEventHandler } from "react";
import { Plus, MessageSquare, Send } from "lucide-react"; // Edit, Trash2 might be needed later for message actions
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"; // Assuming path is correct
import { Button } from "../ui/button"; // Assuming path is correct
import { Textarea } from "../ui/textarea"; // Assuming path is correct
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Assuming path is correct

// Interfaces from ConversationManager (Source)
interface Conversation {
  id: string;
  conversationId: string; // Assuming this is unique and used for API calls
  title: string;
  description?: string;
  messages: Message[];
}

interface Message {
  id: string; // Unique ID for the message
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  order: number; // To maintain message order
  toolCalls?: ToolCall[]; // Made optional if not always present
}

interface ToolCall {
  id: string;
  toolCallId: string;
  functionName: string;
  functionArguments: string;
}

// Props for the main component
interface MergedChatProps {
  datasetId: string;
}

export function ChatCard({ datasetId }: MergedChatProps) {
  // State from ConversationManager
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false); // For conversation creation/loading
  const [messageLoading, setMessageLoading] = useState(false); // For submitting new messages

  // State from original ChatCard
  const [selectedRole, setSelectedRole] = useState<
    "user" | "assistant" | "tool"
  >("user");

  // useEffect from ConversationManager
  useEffect(() => {
    if (datasetId) {
      fetchConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetId]);

  // Function from ConversationManager
  const fetchConversations = async () => {
    if (!datasetId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/dataset/${datasetId}/conversations`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setConversations(data);
      // If a conversation was selected, try to find it in the new list
      if (selectedConversation) {
        const updatedSelected = data.find(
          (c: Conversation) => c.id === selectedConversation.id
        );
        setSelectedConversation(
          updatedSelected || (data.length > 0 ? data[0] : null)
        );
      } else if (data.length > 0) {
        // setSelectedConversation(data[0]); // Optionally select the first conversation
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      toast.error("Failed to fetch conversations.");
    } finally {
      setLoading(false);
    }
  };

  // Function from ConversationManager
  const createConversation = async () => {
    if (!datasetId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/dataset/${datasetId}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `New Conversation ${conversations.length + 1}`,
          description: "Training conversation",
          // Ensure your API can handle creating a conversation potentially without initial messages
          // or with a default system message.
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const newConversation = await response.json();
      setConversations((prev) => [newConversation, ...prev]);
      setSelectedConversation(newConversation);
      toast.success("New conversation created!");
    } catch (error) {
      console.error("Failed to create conversation:", error);
      toast.error("Failed to create conversation.");
    } finally {
      setLoading(false);
    }
  };

  // Adapted submitHandler from original ChatCard
  const submitHandler: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const promptContentElement = form.elements.namedItem(
      "promptContent"
    ) as HTMLTextAreaElement;
    const prompt = promptContentElement.value.trim();

    if (!prompt || !selectedConversation) {
      toast.warning("Please select a conversation and type a message.");
      return;
    }

    setMessageLoading(true);

    // --- THIS IS WHERE MessageEditor's onUpdate LOGIC WOULD BE MIMICKED ---
    // It needs to POST the new message to the selectedConversation
    // For now, we'll optimistically update and then re-fetch (or update from response)

    const newMessageData = {
      role: selectedRole,
      content: prompt,
      // 'order' would typically be handled by the backend or calculated based on existing messages.
      // 'id' and 'toolCalls' would also be backend-generated or handled as needed.
    };

    try {
      // API call to add message to the current conversation
      const response = await fetch(
        `/api/dataset/${datasetId}/conversations/${selectedConversation.conversationId}/messages`, // Assuming endpoint structure
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newMessageData),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Failed to send message" }));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const addedMessage: Message = await response.json(); // Assuming API returns the full message object

      // Update messages for the selected conversation
      setSelectedConversation((prevConv) => {
        if (!prevConv) return null;
        // Ensure messages array exists
        const existingMessages = prevConv.messages || [];
        return {
          ...prevConv,
          messages: [...existingMessages, addedMessage].sort(
            (a, b) => a.order - b.order
          ),
        };
      });

      // Update the conversation list to reflect message count changes or new messages
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

      toast.success("Message Submitted");
      promptContentElement.value = ""; // Clear textarea
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error(`Failed to send message: ${(error as Error).message}`);
    } finally {
      setMessageLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full">
      {/* Conversation List (from ConversationManager) */}
      <div className="w-1/3 min-w-[280px] max-w-[400px] border-r border-gray-200 p-4 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Training Conversations</h3>
          <button
            onClick={createConversation}
            disabled={loading || !datasetId}
            className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>New</span>
          </button>
        </div>

        {loading && !conversations.length ? (
          <p>Loading conversations...</p>
        ) : null}
        {!loading && !conversations.length && datasetId ? (
          <p>No conversations yet. Create one!</p>
        ) : null}
        {!datasetId ? <p>Please provide a Dataset ID.</p> : null}

        <div className="space-y-2 overflow-y-auto flex-grow">
          {conversations &&
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                  selectedConversation?.id === conversation.id
                    ? "bg-blue-50 border-blue-300"
                    : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                }`}
              >
                <div className="font-medium text-gray-900 truncate">
                  {conversation.title}
                </div>
                <div className="text-sm text-gray-500">
                  {conversation.messages?.length || 0} messages
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Message Editor / Chat Area (from ChatCard) */}
      <div className="flex-1 flex flex-col border rounded h-full">
        {" "}
        {/* Target aesthetic: border rounded h-full */}
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="py-4 px-8 border-b">
              <h3 className="scroll-m-20 text-2xl font-bold tracking-tight font-[family-name:var(--font-geist-sans)]">
                {selectedConversation.title || "Chat"}
              </h3>
              {selectedConversation.description && (
                <p className="text-sm text-gray-500">
                  {selectedConversation.description}
                </p>
              )}
            </div>

            {/* Chat Messages Display */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
              {selectedConversation.messages &&
              selectedConversation.messages.length > 0 ? (
                selectedConversation.messages
                  .sort((a, b) => a.order - b.order)
                  .map((msg) => (
                    <ChatSubCard
                      key={msg.id} // Use message ID as key
                      role={msg.role}
                      content={msg.content} // Changed from prompt to content
                      // toolCalls={msg.toolCalls} // Pass if ChatSubCard can display them
                    />
                  ))
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No messages in this conversation yet.</p>
                    <p>Start by sending a message below.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Submitter Form */}
            <form
              onSubmit={submitHandler}
              className="flex gap-4 sm:gap-8 items-start sm:items-center p-4 sm:p-8 border-t mt-auto relative font-[family-name:var(--font-geist-sans)] flex-col sm:flex-row"
            >
              <div className="flex flex-col gap-2 w-full">
                <Select
                  onValueChange={(value: "user" | "assistant" | "tool") =>
                    setSelectedRole(value)
                  }
                  defaultValue="user"
                  disabled={messageLoading}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select a role." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Role</SelectLabel>
                      <SelectItem value="assistant">Assistant</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="tool">Tool</SelectItem>
                      {/* System role is usually not for user input */}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Textarea
                  id="promptContent"
                  placeholder="Type your message here."
                  className="min-h-[80px]"
                  disabled={messageLoading}
                />
              </div>
              <Button
                type="submit"
                variant="default"
                className="cursor-pointer w-full sm:w-auto"
                disabled={messageLoading}
              >
                <Send className="w-5 h-5" />
                <span className="ml-2 sm:hidden">Send</span>
              </Button>
            </form>
          </>
        ) : (
          // Placeholder if no conversation is selected (from ConversationManager)
          <div className="flex-1 p-4 flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Select a conversation to view or edit messages,</p>
              <p>or create a new one.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Adapted ChatSubCard - make sure props match what's passed
function ChatSubCard({
  role,
  content, // Changed from 'prompt'
}: // toolCalls, // Optional: if you want to display tool call info
{
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCall[];
}) {
  return (
    <div
      className={`flex gap-4 items-start ${
        role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      {role !== "user" && ( // Avatar on left for assistant, tool, system
        <Avatar className="w-8 h-8">
          {role === "assistant" && (
            <AvatarImage src="/icons/assistant-avatar.png" alt="Assistant" />
          )}{" "}
          {/* Example avatar */}
          <AvatarFallback>{role.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
      )}

      {/* Content Bubble */}
      <div
        className={`flex flex-col max-w-[70%] p-3 rounded-lg shadow-sm
        ${
          role === "user"
            ? "bg-blue-500 text-white rounded-br-none"
            : "bg-gray-100 text-gray-800 rounded-bl-none"
        }
        ${
          role === "system"
            ? "bg-yellow-100 text-yellow-800 w-full text-xs italic text-center p-2"
            : ""
        }
        ${role === "tool" ? "bg-purple-100 text-purple-800 text-xs" : ""}
      `}
      >
        <h1 className="text-xs font-semibold mb-1">
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </h1>
        <div className="font-[family-name:var(--font-geist-sans)] text-sm whitespace-pre-wrap">
          {content}
        </div>
        {/* Optional: Display tool call information */}
        {/* {toolCalls && toolCalls.length > 0 && (
          <div className="mt-2 border-t border-gray-300 pt-1">
            <p className="text-xs font-semibold">Tool Calls:</p>
            {toolCalls.map(tc => (
              <div key={tc.id || tc.toolCallId} className="text-xs">
                {tc.functionName}({tc.functionArguments})
              </div>
            ))}
          </div>
        )} */}
      </div>

      {role === "user" && ( // Avatar on right for user
        <Avatar className="w-8 h-8">
          <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
