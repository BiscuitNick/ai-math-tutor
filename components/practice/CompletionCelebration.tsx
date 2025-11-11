"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CompletionCelebrationProps {
  confidence: number;
  className?: string;
}

export function CompletionCelebration({
  confidence,
  className,
}: CompletionCelebrationProps) {
  const confidencePercent = Math.round(confidence * 100);

  return (
    <Card className={cn("border-green-500/50 bg-green-500/5", className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-green-700 dark:text-green-300">
                Great work! 🎉
              </h3>
              <Sparkles className="h-4 w-4 text-yellow-500" />
            </div>

            <p className="text-sm text-muted-foreground">
              It looks like you solved the problem correctly!
              {confidencePercent >= 90 && " I'm very confident you got it right."}
              {confidencePercent >= 75 && confidencePercent < 90 && " Your work looks solid."}
            </p>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
              <span className="font-medium">{confidencePercent}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
