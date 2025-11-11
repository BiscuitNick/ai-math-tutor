"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, Target, TrendingUp, Plus } from "lucide-react";

export interface PracticeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confidence: number;
  showPracticeOffer: boolean;
  onSelectDifficulty: (difficulty: "same" | "harder") => void;
  onDecline: () => void;
  onNewChat: () => void;
  isGenerating?: boolean;
}

export function PracticeModal({
  open,
  onOpenChange,
  confidence,
  showPracticeOffer,
  onSelectDifficulty,
  onDecline,
  onNewChat,
  isGenerating = false,
}: PracticeModalProps) {
  const confidencePercent = Math.round(confidence * 100);

  const handleSelectDifficulty = (difficulty: "same" | "harder") => {
    onSelectDifficulty(difficulty);
    onOpenChange(false);
  };

  const handleDecline = () => {
    onDecline();
    onOpenChange(false);
  };

  const handleNewChat = () => {
    onNewChat();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            <div className="flex items-center gap-2">
              <AlertDialogTitle className="text-xl text-green-700 dark:text-green-300">
                Great work! 🎉
              </AlertDialogTitle>
              <Sparkles className="h-5 w-5 text-yellow-500" />
            </div>
          </div>

          <AlertDialogDescription>
            It looks like you solved the problem correctly!
            {confidencePercent >= 90 && " I'm very confident you got it right."}
            {confidencePercent >= 75 && confidencePercent < 90 && " Your work looks solid."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Content outside of AlertDialogDescription to avoid nesting issues */}
        <div className="space-y-3">
          {/* Confidence meter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Confidence:</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
            <span className="font-medium text-green-600">{confidencePercent}%</span>
          </div>

          {showPracticeOffer && (
            <>
              <div className="flex items-center gap-2 pt-3 border-t">
                <Target className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Ready for practice?</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Would you like to try a practice problem to reinforce what you learned?
              </p>
            </>
          )}
        </div>

        {showPracticeOffer && (
          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            <div className="flex gap-2 w-full">
              <Button
                onClick={() => handleSelectDifficulty("same")}
                disabled={isGenerating}
                variant="default"
                className="flex-1"
              >
                <Target className="h-4 w-4 mr-2" />
                Same Level
              </Button>

              <Button
                onClick={() => handleSelectDifficulty("harder")}
                disabled={isGenerating}
                variant="default"
                className="flex-1"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Challenge Me
              </Button>
            </div>

            <Button
              onClick={handleDecline}
              disabled={isGenerating}
              variant="outline"
              className="w-full"
            >
              No Thanks
            </Button>

            <Button
              onClick={handleNewChat}
              disabled={isGenerating}
              variant="ghost"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>

            {isGenerating && (
              <div className="text-xs text-muted-foreground text-center">
                Generating practice problem...
              </div>
            )}
          </AlertDialogFooter>
        )}

        {/* When not showing practice offer, show confirmation buttons */}
        {!showPracticeOffer && (
          <AlertDialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              variant="default"
              className="w-full"
            >
              Continue
            </Button>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}