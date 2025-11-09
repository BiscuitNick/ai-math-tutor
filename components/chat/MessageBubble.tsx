"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { parseTextForMath } from "@/lib/math-parser";
import { InlineMath, DisplayMath } from "@/components/MathDisplay";
import Image from "next/image";
import type { Session } from "@/lib/types/session";

export interface MessageImage {
  url: string;
}

export interface Message {
  id?: string;
  role: "student" | "tutor";
  content: string;
  timestamp: Date;
  images?: MessageImage[];
}

export interface MessageBubbleProps {
  message: Message;
  className?: string;
  currentSession?: Session | null;
}

export function MessageBubble({ message, className, currentSession }: MessageBubbleProps) {
  const isStudent = message.role === "student";
  const hasImages = message.images && message.images.length > 0;
  const hasTextContent = message.content.trim();

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

        {/* Message content wrapper */}
        <div className="flex flex-col gap-2">
          {/* Render images outside bubble if no text content */}
          {hasImages && !hasTextContent && (
            <>
              <div className="flex flex-col gap-2">
                {message.images!.map((image, index) => (
                  <div key={index} className="relative rounded-lg overflow-hidden shadow-md">
                    <Image
                      src={image.url}
                      alt={`Uploaded image ${index + 1}`}
                      width={400}
                      height={300}
                      className="w-full h-auto object-contain max-h-96"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
              {/* Timestamp below images */}
              <div
                className={cn(
                  "text-xs opacity-70",
                  isStudent ? "text-right text-muted-foreground" : "text-left text-muted-foreground"
                )}
              >
                {formatDistanceToNow(message.timestamp, { addSuffix: true })}
              </div>
            </>
          )}

          {/* Render card with content if there's text */}
          {hasTextContent && (
            <Card
              className={cn(
                "border-0 shadow-sm",
                isStudent
                  ? "bg-blue-500 text-white"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              <CardContent className="p-3">
                {/* Render images inside bubble if there's also text */}
                {hasImages && (
                  <div className="flex flex-col gap-2 mb-3">
                    {message.images!.map((image, index) => (
                      <div key={index} className="relative rounded-lg overflow-hidden border border-white/20">
                        <Image
                          src={image.url}
                          alt={`Uploaded image ${index + 1}`}
                          width={400}
                          height={300}
                          className="w-full h-auto object-contain max-h-96"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Render text content */}
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
          )}
        </div>
      </div>
    </div>
  );
}
