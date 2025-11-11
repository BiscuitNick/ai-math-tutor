import { useCallback } from "react";
import { toast } from "sonner";
import { APIError, APIErrorType } from "@/lib/error-handler";

/**
 * Error severity levels
 */
export type ErrorSeverity = "info" | "warning" | "error" | "critical";

/**
 * Structured error message
 */
export interface ErrorMessage {
  title: string;
  message: string;
  severity: ErrorSeverity;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  duration?: number;
}

/**
 * Error message mappings for common errors
 */
const ERROR_MESSAGES: Record<APIErrorType, ErrorMessage> = {
  [APIErrorType.RATE_LIMIT]: {
    title: "Too Many Requests",
    message: "You're sending messages too quickly. Please wait a moment before trying again.",
    severity: "warning",
    dismissible: true,
    duration: 5000,
  },
  [APIErrorType.TOKEN_LIMIT]: {
    title: "Message Too Long",
    message: "Your message or conversation is too long. Try shortening your message or starting a new session.",
    severity: "error",
    dismissible: true,
    duration: 7000,
  },
  [APIErrorType.INVALID_REQUEST]: {
    title: "Invalid Request",
    message: "There was a problem with your request. Please try rephrasing or check your input.",
    severity: "error",
    dismissible: true,
    duration: 5000,
  },
  [APIErrorType.NETWORK_ERROR]: {
    title: "Connection Problem",
    message: "Unable to reach the server. Please check your internet connection and try again.",
    severity: "error",
    dismissible: true,
    duration: 6000,
  },
  [APIErrorType.TIMEOUT]: {
    title: "Request Timed Out",
    message: "The request took too long to complete. Please try again.",
    severity: "warning",
    dismissible: true,
    duration: 5000,
  },
  [APIErrorType.API_KEY_MISSING]: {
    title: "Configuration Error",
    message: "The API key is not configured. Please contact support.",
    severity: "critical",
    dismissible: false,
  },
  [APIErrorType.API_KEY_INVALID]: {
    title: "Authentication Failed",
    message: "Invalid API credentials. Please contact support.",
    severity: "critical",
    dismissible: false,
  },
  [APIErrorType.UNKNOWN]: {
    title: "Unexpected Error",
    message: "Something went wrong. Please try again or contact support if the problem persists.",
    severity: "error",
    dismissible: true,
    duration: 5000,
  },
};

/**
 * Custom error messages for specific scenarios
 */
const CUSTOM_ERROR_MESSAGES: Record<string, ErrorMessage> = {
  session_limit_reached: {
    title: "Session Limit Reached",
    message: "You've reached the maximum number of turns for this session. Please start a new session to continue.",
    severity: "info",
    dismissible: true,
    duration: 7000,
  },
  daily_limit_reached: {
    title: "Daily Limit Reached",
    message: "You've reached your daily limit of 20 problems. The limit resets at midnight UTC.",
    severity: "warning",
    dismissible: true,
    duration: 7000,
  },
  image_parse_failed: {
    title: "Image Processing Failed",
    message: "We couldn't process the image. Please try a clearer image or type your problem instead.",
    severity: "warning",
    dismissible: true,
    duration: 6000,
  },
  firebase_connection_lost: {
    title: "Connection Lost",
    message: "Your session data may not be saved. Please check your connection.",
    severity: "warning",
    dismissible: true,
    duration: 8000,
  },
  auth_required: {
    title: "Authentication Required",
    message: "Please sign in to continue using the tutor.",
    severity: "info",
    dismissible: false,
  },
};

/**
 * Toast configuration by severity
 */
const TOAST_CONFIGS = {
  info: {
    icon: "ℹ️",
    className: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
  },
  warning: {
    icon: "⚠️",
    className: "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800",
  },
  error: {
    icon: "❌",
    className: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
  },
  critical: {
    icon: "🚨",
    className: "bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700",
  },
};

/**
 * Centralized error handling hook
 */
export function useErrorHandler() {
  /**
   * Display an error using the appropriate UI component
   */
  const showError = useCallback((error: Error | APIError | string, customKey?: string) => {
    let errorMessage: ErrorMessage;

    // Handle custom error keys
    if (customKey && CUSTOM_ERROR_MESSAGES[customKey]) {
      errorMessage = CUSTOM_ERROR_MESSAGES[customKey];
    }
    // Handle APIError instances
    else if (error instanceof APIError) {
      errorMessage = ERROR_MESSAGES[error.type] || ERROR_MESSAGES[APIErrorType.UNKNOWN];
    }
    // Handle Error instances
    else if (error instanceof Error) {
      errorMessage = {
        title: "Error",
        message: error.message,
        severity: "error",
        dismissible: true,
        duration: 5000,
      };
    }
    // Handle string errors
    else {
      errorMessage = {
        title: "Error",
        message: error,
        severity: "error",
        dismissible: true,
        duration: 5000,
      };
    }

    // Display toast based on severity
    displayToast(errorMessage);

    // Log to console for debugging
    console.error(`[${errorMessage.severity.toUpperCase()}] ${errorMessage.title}:`, errorMessage.message);
    if (error instanceof Error) {
      console.error("Stack trace:", error.stack);
    }
  }, []);

  /**
   * Display a toast notification
   */
  const displayToast = useCallback((errorMessage: ErrorMessage) => {
    const config = TOAST_CONFIGS[errorMessage.severity];
    const duration = errorMessage.duration || (errorMessage.severity === "critical" ? Infinity : 5000);

    // Create toast based on severity
    switch (errorMessage.severity) {
      case "critical":
      case "error":
        toast.error(errorMessage.message, {
          description: errorMessage.title,
          duration,
          action: errorMessage.action
            ? {
                label: errorMessage.action.label,
                onClick: errorMessage.action.onClick,
              }
            : undefined,
          className: config.className,
        });
        break;

      case "warning":
        toast.warning(errorMessage.message, {
          description: errorMessage.title,
          duration,
          action: errorMessage.action
            ? {
                label: errorMessage.action.label,
                onClick: errorMessage.action.onClick,
              }
            : undefined,
          className: config.className,
        });
        break;

      case "info":
        toast.info(errorMessage.message, {
          description: errorMessage.title,
          duration,
          action: errorMessage.action
            ? {
                label: errorMessage.action.label,
                onClick: errorMessage.action.onClick,
              }
            : undefined,
          className: config.className,
        });
        break;
    }
  }, []);

  /**
   * Display a success message
   */
  const showSuccess = useCallback((message: string, title?: string) => {
    toast.success(message, {
      description: title,
      duration: 3000,
    });
  }, []);

  /**
   * Display a loading toast that can be updated
   */
  const showLoading = useCallback((message: string) => {
    return toast.loading(message);
  }, []);

  /**
   * Dismiss a specific toast by ID
   */
  const dismissToast = useCallback((toastId: string | number) => {
    toast.dismiss(toastId);
  }, []);

  /**
   * Dismiss all toasts
   */
  const dismissAll = useCallback(() => {
    toast.dismiss();
  }, []);

  return {
    showError,
    showSuccess,
    showLoading,
    dismissToast,
    dismissAll,
  };
}

/**
 * Helper to create a retry action for errors
 */
export function createRetryAction(onRetry: () => void): ErrorMessage["action"] {
  return {
    label: "Retry",
    onClick: onRetry,
  };
}

/**
 * Helper to parse and handle API response errors
 */
export async function handleAPIResponse<T>(
  response: Response,
  errorHandler: ReturnType<typeof useErrorHandler>
): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));

    // Handle specific status codes
    if (response.status === 429) {
      const errorData = error as { resetAfter?: number };
      const resetAfter = errorData.resetAfter || 60;

      errorHandler.showError(
        new APIError(
          `Rate limit exceeded. Try again in ${resetAfter} seconds.`,
          APIErrorType.RATE_LIMIT,
          429,
          true
        )
      );
    } else if (response.status === 401) {
      errorHandler.showError(
        new APIError(
          "Authentication failed. Please sign in again.",
          APIErrorType.API_KEY_INVALID,
          401,
          false
        )
      );
    } else if (response.status >= 500) {
      errorHandler.showError(
        new APIError(
          "Server error. Please try again in a moment.",
          APIErrorType.NETWORK_ERROR,
          response.status,
          true
        )
      );
    } else {
      errorHandler.showError(
        new APIError(
          error.error || "Request failed",
          APIErrorType.INVALID_REQUEST,
          response.status,
          false
        )
      );
    }

    throw new APIError(
      error.error || "Request failed",
      APIErrorType.INVALID_REQUEST,
      response.status,
      false
    );
  }

  return response.json();
}
