"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function TypingIndicator() {
  return (
    <div className="flex w-full justify-start">
      <div className="flex gap-2 max-w-[80%]">
        {/* Tutor avatar */}
        <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold bg-purple-500 text-white">
          T
        </div>

        {/* Typing animation */}
        <Card className="border-0 shadow-sm bg-secondary text-secondary-foreground">
          <CardContent className="p-3">
            <div className="flex gap-1 items-center">
              <div className={cn(
                "h-2 w-2 rounded-full bg-muted-foreground/50",
                "animate-bounce [animation-delay:-0.3s]"
              )} />
              <div className={cn(
                "h-2 w-2 rounded-full bg-muted-foreground/50",
                "animate-bounce [animation-delay:-0.15s]"
              )} />
              <div className={cn(
                "h-2 w-2 rounded-full bg-muted-foreground/50",
                "animate-bounce"
              )} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
