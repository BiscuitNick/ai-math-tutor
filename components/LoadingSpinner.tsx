"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  text?: string;
  variant?: "spinner" | "skeleton" | "pulse";
  className?: string;
  fullScreen?: boolean;
}

/**
 * Size mappings for spinner
 */
const SPINNER_SIZES = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

const TEXT_SIZES = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

/**
 * LoadingSpinner Component
 *
 * Displays loading states with multiple variants:
 * - spinner: Animated spinning icon
 * - skeleton: Skeleton placeholder
 * - pulse: Pulsing animation
 */
export function LoadingSpinner({
  size = "md",
  text,
  variant = "spinner",
  className,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const content = (
    <div
      className={cn(
        "flex items-center justify-center gap-3",
        fullScreen && "min-h-screen w-full",
        className
      )}
    >
      {variant === "spinner" && (
        <>
          <Loader2 className={cn(SPINNER_SIZES[size], "animate-spin text-primary")} />
          {text && (
            <p className={cn(TEXT_SIZES[size], "text-muted-foreground")}>{text}</p>
          )}
        </>
      )}

      {variant === "skeleton" && (
        <div className="w-full space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      )}

      {variant === "pulse" && (
        <div className="flex items-center gap-3">
          <div
            className={cn(
              SPINNER_SIZES[size],
              "rounded-full bg-primary animate-pulse"
            )}
          />
          {text && (
            <p className={cn(TEXT_SIZES[size], "text-muted-foreground animate-pulse")}>
              {text}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Inline loading spinner for buttons and small spaces
 */
export function InlineSpinner({ size = "sm", className }: Pick<LoadingSpinnerProps, "size" | "className">) {
  return (
    <Loader2
      className={cn(SPINNER_SIZES[size], "animate-spin text-current", className)}
    />
  );
}

/**
 * Message loading skeleton
 */
export function MessageSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

/**
 * Chat loading skeleton
 */
export function ChatSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* User message */}
      <div className="flex justify-end">
        <div className="w-3/4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>

      {/* Assistant message */}
      <div className="flex justify-start">
        <div className="w-3/4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>

      {/* User message */}
      <div className="flex justify-end">
        <div className="w-3/4 space-y-2">
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Card loading skeleton
 */
export function CardSkeleton() {
  return (
    <div className="rounded-lg border p-6 space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}
