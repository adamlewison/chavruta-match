"use client";

import { useState, useEffect, useRef } from "react";
import { Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  senderName: string;
  senderImage: string | null;
}

interface ChatPanelProps {
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
  currentUserImage?: string;
  connectionId: string;
}

export function ChatPanel({
  currentUserId,
  currentUserName,
  currentUserEmail,
  currentUserImage,
  connectionId,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastETagRef = useRef<string | null>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load initial messages
  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/messages/${connectionId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for updates using ETag
  const pollForUpdates = async () => {
    try {
      const headers: HeadersInit = {};
      if (lastETagRef.current) {
        headers["If-None-Match"] = lastETagRef.current;
      }

      const response = await fetch("/api/messages/poll", { headers });

      if (response.status === 304) {
        // No changes, ETag matched
        return;
      }

      if (response.ok) {
        const etag = response.headers.get("ETag");
        if (etag) {
          lastETagRef.current = etag;
        }

        const data = await response.json();
        if (data.hasUpdates) {
          // Reload messages when updates are detected
          await loadMessages();
        }
      }
    } catch (error) {
      console.error("Polling error:", error);
    }
  };

  // Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          connectionId,
          content: newMessage.trim(),
        }),
      });

      if (response.ok) {
        setNewMessage("");
        // Reload messages to show the new message
        await loadMessages();
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Set up polling and initial load
  useEffect(() => {
    loadMessages();

    // Start polling every 5 seconds
    const pollInterval = setInterval(pollForUpdates, 5000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [connectionId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-96 border rounded-lg">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-sm">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isCurrentUser = message.senderId === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isCurrentUser ? "flex-row-reverse" : ""}`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={message.senderImage || undefined} />
                  <AvatarFallback className="text-xs">
                    {message.senderName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`max-w-[70%] rounded-lg px-3 py-2 ${
                    isCurrentUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isCurrentUser
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form onSubmit={sendMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={isSending}
            className="flex-1"
          />
          <Button type="submit" disabled={!newMessage.trim() || isSending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
