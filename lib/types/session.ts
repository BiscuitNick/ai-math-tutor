/**
 * Type definitions for chat session management
 */

export type ProblemType = "algebra" | "geometry" | "word-problem" | "calculus" | "statistics" | "other";

export type SessionStatus = "in-progress" | "completed" | "abandoned";

export type Speaker = "user" | "assistant";

/**
 * Represents a single turn in a conversation
 */
export interface Turn {
  id: string;
  speaker: Speaker;
  message: string;
  timestamp: Date;
  hintLevel?: number; // 0-4, where higher numbers indicate more specific hints
}

/**
 * Represents a chat session with a student
 */
export interface Session {
  id: string;
  userId: string;
  problemText: string;
  problemType: ProblemType;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
  turnCount: number;
  hints: string[]; // Array of hint texts provided during the session
  lastActivityAt: Date; // Used for detecting abandoned sessions
  completedAt?: Date; // When the session was completed/abandoned
  metadata?: {
    duration?: number; // Total duration in milliseconds
    averageResponseTime?: number; // Average time between turns in milliseconds
    completionRate?: number; // Percentage of problem solved (0-100)
  };
}

/**
 * Firestore document data (without id field, as it's stored as document ID)
 */
export interface SessionDocument extends Omit<Session, "id" | "createdAt" | "updatedAt" | "lastActivityAt" | "completedAt"> {
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  lastActivityAt: FirebaseFirestore.Timestamp;
  completedAt?: FirebaseFirestore.Timestamp;
}

/**
 * Firestore turn document data
 */
export interface TurnDocument extends Omit<Turn, "id" | "timestamp"> {
  timestamp: FirebaseFirestore.Timestamp;
}

/**
 * Data required to create a new session
 */
export interface CreateSessionData {
  problemText: string;
  problemType: ProblemType;
}

/**
 * Data for updating session status
 */
export interface UpdateSessionStatusData {
  status: SessionStatus;
  completedAt?: Date;
  metadata?: Session["metadata"];
}

/**
 * Query options for fetching sessions
 */
export interface SessionQueryOptions {
  limit?: number;
  status?: SessionStatus;
  orderBy?: "createdAt" | "updatedAt" | "lastActivityAt";
  orderDirection?: "asc" | "desc";
  startAfter?: string; // Document ID for pagination
}

/**
 * Query options for fetching turns
 */
export interface TurnQueryOptions {
  limit?: number;
  orderBy?: "timestamp";
  orderDirection?: "asc" | "desc";
  startAfter?: string; // Document ID for pagination
}
