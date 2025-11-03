"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { parseTextForMath } from "@/lib/math-parser";
import { InlineMath, DisplayMath } from "@/components/MathDisplay";

export interface Message {
  id?: string;
  role: "student" | "tutor";
  content: string;
  timestamp: Date;
}

export interface MessageBubbleProps {
  message: Message;
  className?: string;
}

export function MessageBubble({ message, className }: MessageBubbleProps) {
  const isStudent = message.role === "student";

  // Parse message content for math expressions
  const segments = parseTextForMath(message.content);

  return (
    <div
      className={cn(
        "flex w-full",
        isStudent ? "justify-end" : "justify-start",
        className
      )}
    >
      <div className={cn("flex gap-2 max-w-[80%]", isStudent && "flex-row-reverse")}>
        {/* Role indicator / Avatar */}
        <div
          className={cn(
            "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold",
            isStudent
              ? "bg-blue-500 text-white"
              : "bg-purple-500 text-white"
          )}
        >
          {isStudent ? "S" : "T"}
        </div>

        {/* Message content */}
        <Card
          className={cn(
            "border-0 shadow-sm",
            isStudent
              ? "bg-blue-500 text-white"
              : "bg-secondary text-secondary-foreground"
          )}
        >
          <CardContent className="p-3">
            <div className="whitespace-pre-wrap break-words">
              {segments.map((segment, index) => {
                if (segment.type === "inline-math") {
                  return <InlineMath key={index} latex={segment.content} />;
                } else if (segment.type === "display-math") {
                  return <DisplayMath key={index} latex={segment.content} />;
                } else {
                  return <React.Fragment key={index}>{segment.content}</React.Fragment>;
                }
              })}
            </div>
            <div
              className={cn(
                "text-xs mt-1 opacity-70",
                isStudent ? "text-right text-blue-100" : "text-left text-muted-foreground"
              )}
            >
              {formatDistanceToNow(message.timestamp, { addSuffix: true })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
