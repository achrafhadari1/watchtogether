"use client";

import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function ChatMessage({ message, isMe }) {
  const { userName, message: content, timestamp } = message;

  const formattedTime = timestamp
    ? format(new Date(timestamp), "h:mm a")
    : format(new Date(), "h:mm a");

  return (
    <div
      className={cn(
        "flex flex-col max-w-[85%]",
        isMe ? "ml-auto items-end" : "mr-auto items-start"
      )}
    >
      <div
        className={cn(
          "px-3 py-2 rounded-md text-sm break-words",
          isMe
            ? "bg-primary text-primary-foreground rounded-tr-none"
            : "bg-secondary text-secondary-foreground rounded-tl-none"
        )}
      >
        {!isMe && <div className="font-medium text-xs mb-1">{userName}</div>}
        <p>{content}</p>
      </div>
      <span className="text-[10px] text-muted-foreground mt-1">
        {formattedTime}
      </span>
    </div>
  );
}
