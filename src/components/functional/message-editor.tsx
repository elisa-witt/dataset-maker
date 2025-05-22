"use client";

import React, { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";

export default function MessageEditor({
  conversation,
  onUpdate,
}: {
  conversation: any;
  onUpdate: () => void;
}) {
  const [newMessage, setNewMessage] = useState({
    role: "user" as "system" | "user" | "assistant" | "tool",
    content: "",
    toolCalls: [],
  });

  const addMessage = async () => {
    if (!newMessage.content.trim()) return;

    try {
      await fetch(`/api/conversation/${conversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMessage),
      });

      setNewMessage({ role: "user", content: "", toolCalls: [] });
      onUpdate();
    } catch (error) {
      console.error("Failed to add message:", error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await fetch(`/api/message/${messageId}`, { method: "DELETE" });
      onUpdate();
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{conversation.title}</h3>

      {/* Existing Messages */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {conversation.messages?.map((message: any, index: number) => (
          <div
            key={message.id}
            className="border border-gray-200 rounded-lg p-3"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center space-x-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    message.role === "user"
                      ? "bg-blue-100 text-blue-800"
                      : message.role === "assistant"
                      ? "bg-green-100 text-green-800"
                      : message.role === "system"
                      ? "bg-gray-100 text-gray-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {message.role}
                </span>
                <span className="text-sm text-gray-500">#{index + 1}</span>
              </div>
              <button
                onClick={() => deleteMessage(message.id)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="text-gray-700 whitespace-pre-wrap">
              {message.content}
            </div>

            {message.toolCalls?.length > 0 && (
              <div className="mt-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                <div className="text-sm font-medium text-yellow-800">
                  Tool Calls:
                </div>
                {message.toolCalls.map((tc: any, tcIndex: number) => (
                  <div key={tcIndex} className="text-sm text-yellow-700">
                    <strong>{tc.functionName}</strong>: {tc.functionArguments}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add New Message */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        <div className="space-y-3">
          <div className="flex space-x-3">
            <select
              value={newMessage.role}
              onChange={(e) =>
                setNewMessage({
                  ...newMessage,
                  role: e.target.value as any,
                })
              }
              className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="system">System</option>
              <option value="user">User</option>
              <option value="assistant">Assistant</option>
              <option value="tool">Tool</option>
            </select>

            <button
              onClick={addMessage}
              disabled={!newMessage.content.trim()}
              className="flex items-center space-x-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Add Message</span>
            </button>
          </div>

          <textarea
            value={newMessage.content}
            onChange={(e) =>
              setNewMessage({ ...newMessage, content: e.target.value })
            }
            placeholder="Enter message content..."
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 resize-none"
            rows={4}
          />
        </div>
      </div>
    </div>
  );
}
