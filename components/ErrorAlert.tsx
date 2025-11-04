"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, Info, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ErrorSeverity } from "@/hooks/useErrorHandler";

export interface ErrorAlertProps {
  title: string;
  message: string;
  severity?: ErrorSeverity;
  onDismiss?: () => void;
  onRetry?: () => void;
  dismissible?: boolean;
  className?: string;
}

/**
 * Icon mapping for error severities
 */
const SEVERITY_ICONS = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  critical: XCircle,
};

/**
 * Style mapping for error severities
 */
const SEVERITY_STYLES = {
  info: {
    container: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950",
    icon: "text-blue-600 dark:text-blue-400",
    title: "text-blue-900 dark:text-blue-100",
    description: "text-blue-800 dark:text-blue-200",
  },
  warning: {
    container: "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950",
    icon: "text-yellow-600 dark:text-yellow-400",
    title: "text-yellow-900 dark:text-yellow-100",
    description: "text-yellow-800 dark:text-yellow-200",
  },
  error: {
    container: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950",
    icon: "text-red-600 dark:text-red-400",
    title: "text-red-900 dark:text-red-100",
    description: "text-red-800 dark:text-red-200",
  },
  critical: {
    container: "border-red-300 dark:border-red-700 bg-red-100 dark:bg-red-900",
    icon: "text-red-700 dark:text-red-300",
    title: "text-red-950 dark:text-red-50",
    description: "text-red-900 dark:text-red-100",
  },
};

/**
 * ErrorAlert Component
 *
 * Displays user-friendly error messages with appropriate styling and actions.
 * Supports different severity levels with color-coded icons and styles.
 */
export function ErrorAlert({
  title,
  message,
  severity = "error",
  onDismiss,
  onRetry,
  dismissible = true,
  className,
}: ErrorAlertProps) {
  const Icon = SEVERITY_ICONS[severity];
  const styles = SEVERITY_STYLES[severity];

  return (
    <Alert className={cn(styles.container, "relative", className)}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", styles.icon)} />

        {/* Content */}
        <div className="flex-1 space-y-2">
          <AlertTitle className={cn("font-semibold", styles.title)}>
            {title}
          </AlertTitle>
          <AlertDescription className={cn("text-sm", styles.description)}>
            {message}
          </AlertDescription>

          {/* Actions */}
          {(onRetry || (dismissible && onDismiss)) && (
            <div className="flex items-center gap-2 mt-3">
              {onRetry && (
                <Button
                  onClick={onRetry}
                  size="sm"
                  variant="outline"
                  className={cn(
                    "h-8 text-xs",
                    severity === "critical" && "border-red-600 hover:bg-red-600 hover:text-white"
                  )}
                >
                  Try Again
                </Button>
              )}
              {dismissible && onDismiss && (
                <Button
                  onClick={onDismiss}
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                >
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Close button */}
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className={cn(
              "flex-shrink-0 p-1 rounded-sm opacity-70 hover:opacity-100 transition-opacity",
              styles.icon
            )}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </Alert>
  );
}

/**
 * Compact variant for inline error displays
 */
export function ErrorAlertCompact({
  message,
  severity = "error",
  onDismiss,
  className,
}: Omit<ErrorAlertProps, "title">) {
  const Icon = SEVERITY_ICONS[severity];
  const styles = SEVERITY_STYLES[severity];

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md border",
        styles.container,
        className
      )}
    >
      <Icon className={cn("h-4 w-4 flex-shrink-0", styles.icon)} />
      <p className={cn("text-sm flex-1", styles.description)}>{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={cn(
            "flex-shrink-0 p-0.5 rounded-sm opacity-70 hover:opacity-100 transition-opacity",
            styles.icon
          )}
          aria-label="Dismiss"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
