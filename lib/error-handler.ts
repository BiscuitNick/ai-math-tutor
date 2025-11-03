/**
 * Error types for API failures
 */
export enum APIErrorType {
  RATE_LIMIT = "rate_limit",
  TOKEN_LIMIT = "token_limit",
  INVALID_REQUEST = "invalid_request",
  NETWORK_ERROR = "network_error",
  TIMEOUT = "timeout",
  API_KEY_MISSING = "api_key_missing",
  API_KEY_INVALID = "api_key_invalid",
  UNKNOWN = "unknown",
}

export class APIError extends Error {
  constructor(
    message: string,
    public type: APIErrorType,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "APIError";
  }
}

/**
 * Parse error from API response
 */
export function parseAPIError(error: any): APIError {
  // API Key errors
  if (error?.status === 401) {
    const message = error?.message || "";
    if (message.toLowerCase().includes("api key") || message.toLowerCase().includes("authentication")) {
      return new APIError(
        "Invalid API key. Please check your OpenAI API key configuration.",
        APIErrorType.API_KEY_INVALID,
        401,
        false
      );
    }
    return new APIError(
      "Authentication failed. Please verify your API credentials.",
      APIErrorType.INVALID_REQUEST,
      401,
      false
    );
  }

  // OpenAI API errors
  if (error?.status === 429) {
    return new APIError(
      "Rate limit exceeded. Please wait a moment and try again.",
      APIErrorType.RATE_LIMIT,
      429,
      true
    );
  }

  if (error?.status === 400) {
    const message = error?.message || "Invalid request";
    if (message.includes("token")) {
      return new APIError(
        "Message is too long. Please try a shorter message.",
        APIErrorType.TOKEN_LIMIT,
        400,
        false
      );
    }
    return new APIError(
      "Invalid request. Please check your input.",
      APIErrorType.INVALID_REQUEST,
      400,
      false
    );
  }

  if (error?.status === 403) {
    return new APIError(
      "Access forbidden. Please check your API permissions.",
      APIErrorType.INVALID_REQUEST,
      403,
      false
    );
  }

  if (error?.status >= 500) {
    return new APIError(
      "Server error. Please try again in a moment.",
      APIErrorType.NETWORK_ERROR,
      error.status,
      true
    );
  }

  // Network errors
  if (error?.code === "ECONNREFUSED" || error?.code === "ENOTFOUND") {
    return new APIError(
      "Unable to connect to the server. Please check your internet connection.",
      APIErrorType.NETWORK_ERROR,
      undefined,
      true
    );
  }

  // Timeout errors
  if (error?.code === "ETIMEDOUT" || error?.message?.includes("timeout")) {
    return new APIError(
      "Request timed out. Please try again.",
      APIErrorType.TIMEOUT,
      undefined,
      true
    );
  }

  // Unknown error
  return new APIError(
    error?.message || "An unexpected error occurred. Please try again.",
    APIErrorType.UNKNOWN,
    undefined,
    true
  );
}

/**
 * Retry configuration
 */
interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 32000, // 32 seconds
  backoffMultiplier: 2,
};

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  options: Required<RetryOptions>
): number {
  const delay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1);
  return Math.min(delay, options.maxDelay);
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const apiError = parseAPIError(error);
      lastError = apiError;

      // Don't retry if error is not retryable
      if (!apiError.retryable) {
        throw apiError;
      }

      // Don't retry if we've exhausted all attempts
      if (attempt > config.maxRetries) {
        throw apiError;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, config);
      console.log(
        `Retry attempt ${attempt}/${config.maxRetries} after ${delay}ms delay. Error: ${apiError.message}`
      );
      await sleep(delay);
    }
  }

  throw lastError || new Error("Retry failed");
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: any): string {
  if (error instanceof APIError) {
    return error.message;
  }

  const apiError = parseAPIError(error);
  return apiError.message;
}

/**
 * Validate OpenAI API key is configured
 * @throws {APIError} if API key is missing or invalid
 */
export function validateOpenAIKey(): void {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new APIError(
      "OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.",
      APIErrorType.API_KEY_MISSING,
      500,
      false
    );
  }

  // Basic format validation (OpenAI keys start with 'sk-')
  if (!apiKey.startsWith('sk-')) {
    throw new APIError(
      "Invalid OpenAI API key format. API keys should start with 'sk-'.",
      APIErrorType.API_KEY_INVALID,
      500,
      false
    );
  }
}
