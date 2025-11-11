"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PracticeOfferProps {
  onSelectDifficulty: (difficulty: "same" | "harder") => void;
  onDecline: () => void;
  isLoading?: boolean;
  className?: string;
}

export function PracticeOfferButtons({
  onSelectDifficulty,
  onDecline,
  isLoading = false,
  className,
}: PracticeOfferProps) {
  return (
    <div className={cn("flex flex-col gap-3 p-4 border rounded-lg bg-muted/30", className)}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Target className="h-4 w-4 text-primary" />
        <span>Ready for practice?</span>
      </div>

      <p className="text-sm text-muted-foreground">
        Would you like to try a practice problem to reinforce what you learned?
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => onSelectDifficulty("same")}
          disabled={isLoading}
          variant="default"
          size="sm"
          className="flex-1 min-w-[140px]"
        >
          <Target className="h-4 w-4 mr-2" />
          Same Level
        </Button>

        <Button
          onClick={() => onSelectDifficulty("harder")}
          disabled={isLoading}
          variant="default"
          size="sm"
          className="flex-1 min-w-[140px]"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Challenge Me
        </Button>

        <Button
          onClick={onDecline}
          disabled={isLoading}
          variant="ghost"
          size="sm"
        >
          <X className="h-4 w-4 mr-2" />
          No Thanks
        </Button>
      </div>

      {isLoading && (
        <div className="text-xs text-muted-foreground text-center">
          Generating practice problem...
        </div>
      )}
    </div>
  );
}
