// Custom error classes for Firebase operations

export class FirebaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: any
  ) {
    super(message);
    this.name = "FirebaseError";
  }
}

export class AuthError extends FirebaseError {
  constructor(message: string, code: string, originalError?: any) {
    super(message, code, originalError);
    this.name = "AuthError";
  }
}

export class FirestoreError extends FirebaseError {
  constructor(message: string, code: string, originalError?: any) {
    super(message, code, originalError);
    this.name = "FirestoreError";
  }
}

export class StorageError extends FirebaseError {
  constructor(message: string, code: string, originalError?: any) {
    super(message, code, originalError);
    this.name = "StorageError";
  }
}

// User-friendly error messages
export function getUserFriendlyErrorMessage(error: any): string {
  const code = error?.code || error?.originalError?.code || "unknown";

  const errorMessages: Record<string, string> = {
    // Auth errors
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/network-request-failed": "Network error. Please check your connection.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/popup-closed-by-user": "Sign-in popup was closed. Please try again.",
    "auth/cancelled-popup-request": "Sign-in cancelled. Please try again.",

    // Firestore errors
    "permission-denied": "You don't have permission to access this data.",
    "not-found": "The requested data was not found.",
    "already-exists": "This data already exists.",
    "resource-exhausted": "Too many requests. Please try again later.",
    "unauthenticated": "Please sign in to continue.",
    "unavailable": "Service temporarily unavailable. Please try again.",

    // Storage errors
    "storage/unauthorized": "You don't have permission to upload files.",
    "storage/canceled": "Upload cancelled.",
    "storage/unknown": "An unknown error occurred during upload.",
    "storage/object-not-found": "File not found.",
    "storage/bucket-not-found": "Storage bucket not found.",
    "storage/quota-exceeded": "Storage quota exceeded.",
    "storage/unauthenticated": "Please sign in to upload files.",
    "storage/retry-limit-exceeded": "Upload failed. Please try again.",
    "storage/invalid-checksum": "File integrity check failed. Please try again.",

    // Custom errors
    FILE_TOO_LARGE: "File size exceeds 5MB limit.",
    INVALID_FILE_TYPE: "Invalid file type. Only JPG, PNG, and WEBP are allowed.",
    UPLOAD_FAILED: "Failed to upload file. Please try again.",
    DELETE_FAILED: "Failed to delete file. Please try again.",

    // Default
    unknown: "An unexpected error occurred. Please try again.",
  };

  return errorMessages[code] || errorMessages.unknown;
}

// Log error with context
export function logError(error: any, context: string): void {
  console.error(`[${context}] Error:`, {
    message: error.message,
    code: error.code,
    name: error.name,
    stack: error.stack,
    originalError: error.originalError,
  });
}
