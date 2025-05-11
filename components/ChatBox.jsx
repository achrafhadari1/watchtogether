"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import { cn } from "@/lib/utils";

export default function ChatBox({ roomId, messages, setMessages, className }) {
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("userId");
      if (stored) return stored;
      const newId = crypto.randomUUID();
      localStorage.setItem("userId", newId);
      return newId;
    }
    return crypto.randomUUID();
  });

  const [userName, setUserName] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("userName") ||
        `User${Math.floor(Math.random() * 10000)}`
      );
    }
    return `User${Math.floor(Math.random() * 10000)}`;
  });

  const scrollAreaRef = useRef(null);
  const bottomRef = useRef(null);
  const socketListenerSetRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("userName", userName);
    }
  }, [userName]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Use a stable callback function for the message handler
  const handleIncomingMessage = useCallback(
    (data) => {
      const socket = getSocket();
      // Check both socket.id and userId to ensure we don't show duplicate messages
      const isMe = data.senderId === socket.id || data.senderId === userId;
      if (isMe) return;

      setMessages((prev) => [
        ...prev,
        {
          ...data,
          isMe: false,
        },
      ]);
    },
    [setMessages, userId]
  );

  // Set up socket listener only once
  useEffect(() => {
    const socket = getSocket();

    // Only set up the listener if it hasn't been set up yet
    if (!socketListenerSetRef.current) {
      // Remove any existing listeners first to be safe
      socket.off("chat-message");

      // Add the new listener
      socket.on("chat-message", handleIncomingMessage);

      // Mark that we've set up the listener
      socketListenerSetRef.current = true;
    }

    return () => {
      // Clean up on unmount
      socket.off("chat-message", handleIncomingMessage);
      socketListenerSetRef.current = false;
    };
  }, [handleIncomingMessage]);

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (!message.trim()) return;

    const newMessage = {
      id: Date.now(),
      message: message.trim(),
      userName,
      senderId: userId, // Use userId consistently
      timestamp: new Date().toISOString(),
    };

    // Emit to others
    const socket = getSocket();
    socket.emit("chat-message", { ...newMessage, roomId });

    // Add to local state
    setMessages((prev) => [...prev, { ...newMessage, isMe: true }]);

    setMessage("");
  };

  const handleUserNameChange = (e) => {
    setUserName(e.target.value);
  };

  return (
    <div
      className={cn(
        "flex flex-col h-80 lg:h-[calc(100vh-80px)] p-4",
        className
      )}
    >
      <div className="mb-2 flex items-center">
        <Input
          type="text"
          placeholder="Your name"
          value={userName}
          onChange={handleUserNameChange}
          className="text-sm bg-background border-input"
        />
      </div>

      <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4 mb-2 rounded-md">
        <div className="space-y-3 py-2">
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm italic">
              No messages yet. Start the conversation!
            </p>
          ) : (
            messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} isMe={msg.isMe} />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <form
        onSubmit={handleSendMessage}
        className="flex items-center space-x-2"
      >
        <Input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 bg-background border-input focus:ring-primary"
        />
        <Button type="submit" size="icon" disabled={!message.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
