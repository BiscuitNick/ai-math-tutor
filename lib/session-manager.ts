/**
 * Session lifecycle management and status tracking
 */

import type {
  Session,
  SessionStatus,
  UpdateSessionStatusData,
} from "@/lib/types/session";
import {
  updateSessionStatus as updateSessionStatusDb,
  updateSessionActivity as updateSessionActivityDb,
} from "@/lib/firestore/sessions";

// Session configuration constants
export const SESSION_CONFIG = {
  MAX_TURNS: 50,
  WARNING_AT_TURNS: 45,
  INACTIVITY_TIMEOUT_MINUTES: 30,
  ABANDONED_AFTER_HOURS: 24,
  CLEANUP_AFTER_DAYS: 7,
} as const;

/**
 * Allowed status transitions
 */
const ALLOWED_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  "in-progress": ["completed", "abandoned"],
  "completed": [], // Completed sessions cannot transition
  "abandoned": [], // Abandoned sessions cannot transition
};

/**
 * Check if a status transition is valid
 */
export function isValidTransition(
  currentStatus: SessionStatus,
  newStatus: SessionStatus
): boolean {
  return ALLOWED_TRANSITIONS[currentStatus].includes(newStatus);
}

/**
 * Validate and perform a status transition
 */
export async function transitionSessionStatus(
  userId: string,
  sessionId: string,
  currentStatus: SessionStatus,
  newStatus: SessionStatus,
  metadata?: Session["metadata"]
): Promise<{ success: boolean; error?: string }> {
  // Validate transition
  if (!isValidTransition(currentStatus, newStatus)) {
    return {
      success: false,
      error: `Invalid transition from ${currentStatus} to ${newStatus}`,
    };
  }

  try {
    const updateData: UpdateSessionStatusData = {
      status: newStatus,
      metadata,
    };

    // Set completion timestamp for terminal states
    if (newStatus === "completed" || newStatus === "abandoned") {
      updateData.completedAt = new Date();
    }

    await updateSessionStatusDb(userId, sessionId, updateData);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update status",
    };
  }
}

/**
 * Complete a session with final metadata
 */
export async function completeSession(
  userId: string,
  sessionId: string,
  session: Session
): Promise<{ success: boolean; error?: string }> {
  const duration =
    new Date().getTime() - new Date(session.createdAt).getTime();

  const metadata: Session["metadata"] = {
    duration,
    completionRate: 100, // Assume 100% if manually completed
    ...session.metadata,
  };

  return transitionSessionStatus(
    userId,
    sessionId,
    session.status,
    "completed",
    metadata
  );
}

/**
 * Abandon a session
 */
export async function abandonSession(
  userId: string,
  sessionId: string,
  session: Session
): Promise<{ success: boolean; error?: string }> {
  const duration =
    new Date().getTime() - new Date(session.createdAt).getTime();

  const metadata: Session["metadata"] = {
    duration,
    completionRate: 0, // Session was abandoned
    ...session.metadata,
  };

  return transitionSessionStatus(
    userId,
    sessionId,
    session.status,
    "abandoned",
    metadata
  );
}

/**
 * Check if a session should trigger a turn limit warning
 */
export function shouldShowTurnWarning(turnCount: number): boolean {
  return (
    turnCount >= SESSION_CONFIG.WARNING_AT_TURNS &&
    turnCount < SESSION_CONFIG.MAX_TURNS
  );
}

/**
 * Check if a session has reached the turn limit
 */
export function hasReachedTurnLimit(turnCount: number): boolean {
  return turnCount >= SESSION_CONFIG.MAX_TURNS;
}

/**
 * Check if a session is inactive (based on last activity)
 */
export function isSessionInactive(
  lastActivityAt: Date,
  thresholdMinutes: number = SESSION_CONFIG.INACTIVITY_TIMEOUT_MINUTES
): boolean {
  const now = new Date();
  const diffMinutes =
    (now.getTime() - new Date(lastActivityAt).getTime()) / (1000 * 60);
  return diffMinutes >= thresholdMinutes;
}

/**
 * Check if a session should be marked as abandoned
 */
export function shouldMarkAsAbandoned(lastActivityAt: Date): boolean {
  const now = new Date();
  const diffHours =
    (now.getTime() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60);
  return diffHours >= SESSION_CONFIG.ABANDONED_AFTER_HOURS;
}

/**
 * Check if a session should be cleaned up (deleted)
 */
export function shouldCleanupSession(
  completedAt: Date | undefined,
  status: SessionStatus
): boolean {
  if (!completedAt || status === "in-progress") {
    return false;
  }

  const now = new Date();
  const diffDays =
    (now.getTime() - new Date(completedAt).getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= SESSION_CONFIG.CLEANUP_AFTER_DAYS;
}

/**
 * Calculate session statistics
 */
export function calculateSessionStats(session: Session, turns: number = 0) {
  const duration = session.completedAt
    ? new Date(session.completedAt).getTime() -
      new Date(session.createdAt).getTime()
    : new Date().getTime() - new Date(session.createdAt).getTime();

  const turnCount = turns || session.turnCount;
  const averageResponseTime = turnCount > 0 ? duration / turnCount : 0;

  return {
    duration,
    turnCount,
    averageResponseTime,
    hintsProvided: session.hints.length,
    completionRate: session.metadata?.completionRate || 0,
  };
}

/**
 * Get warning message based on turn count
 */
export function getTurnWarningMessage(turnCount: number): string | null {
  const remaining = SESSION_CONFIG.MAX_TURNS - turnCount;

  if (remaining <= 0) {
    return "This session has reached the maximum number of turns (50) and will be completed automatically.";
  }

  if (remaining <= 5) {
    return `You have ${remaining} turn${remaining === 1 ? "" : "s"} remaining in this session.`;
  }

  return null;
}

/**
 * Update session activity timestamp
 */
export async function trackSessionActivity(
  userId: string,
  sessionId: string
): Promise<void> {
  try {
    await updateSessionActivityDb(userId, sessionId);
  } catch (error) {
    console.error("Failed to track session activity:", error);
  }
}

/**
 * Session lifecycle manager for automatic transitions
 */
export class SessionLifecycleManager {
  private userId: string;
  private sessionId: string;
  private session: Session;
  private checkIntervalId: NodeJS.Timeout | null = null;

  constructor(userId: string, sessionId: string, session: Session) {
    this.userId = userId;
    this.sessionId = sessionId;
    this.session = session;
  }

  /**
   * Start monitoring session lifecycle
   */
  start() {
    // Check every minute for inactivity or turn limits
    this.checkIntervalId = setInterval(() => {
      this.checkSessionStatus();
    }, 60 * 1000);
  }

  /**
   * Stop monitoring session lifecycle
   */
  stop() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  /**
   * Update the session reference
   */
  updateSession(session: Session) {
    this.session = session;
  }

  /**
   * Check session status and perform automatic transitions
   */
  private async checkSessionStatus() {
    // Skip if session is not in-progress
    if (this.session.status !== "in-progress") {
      this.stop();
      return;
    }

    // Check for turn limit
    if (hasReachedTurnLimit(this.session.turnCount)) {
      await completeSession(this.userId, this.sessionId, this.session);
      this.stop();
      return;
    }

    // Check for inactivity timeout (30 minutes)
    if (isSessionInactive(this.session.lastActivityAt)) {
      await abandonSession(this.userId, this.sessionId, this.session);
      this.stop();
      return;
    }
  }
}

/**
 * Export session data to JSON
 */
export function exportSessionToJSON(
  session: Session,
  turns: Array<{ speaker: string; message: string; timestamp: Date }>
): string {
  const exportData = {
    session: {
      id: session.id,
      problemText: session.problemText,
      problemType: session.problemType,
      status: session.status,
      createdAt: session.createdAt.toISOString(),
      completedAt: session.completedAt?.toISOString(),
      turnCount: session.turnCount,
      hints: session.hints,
      metadata: session.metadata,
    },
    turns: turns.map((turn) => ({
      speaker: turn.speaker,
      message: turn.message,
      timestamp: turn.timestamp.toISOString(),
    })),
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Resume capability check - can this session be resumed?
 */
export function canResumeSession(session: Session): boolean {
  return (
    session.status === "in-progress" &&
    session.turnCount < SESSION_CONFIG.MAX_TURNS &&
    !shouldMarkAsAbandoned(session.lastActivityAt)
  );
}

/**
 * Get session status display information
 */
export function getSessionStatusInfo(session: Session) {
  const stats = calculateSessionStats(session);

  let statusMessage = "";
  let statusColor: "green" | "yellow" | "red" | "gray" = "gray";

  switch (session.status) {
    case "in-progress":
      if (shouldShowTurnWarning(session.turnCount)) {
        statusMessage = getTurnWarningMessage(session.turnCount) || "In Progress";
        statusColor = "yellow";
      } else if (isSessionInactive(session.lastActivityAt)) {
        statusMessage = "Inactive";
        statusColor = "yellow";
      } else {
        statusMessage = "In Progress";
        statusColor = "green";
      }
      break;

    case "completed":
      statusMessage = "Completed";
      statusColor = "green";
      break;

    case "abandoned":
      statusMessage = "Abandoned";
      statusColor = "gray";
      break;
  }

  return {
    status: session.status,
    statusMessage,
    statusColor,
    canResume: canResumeSession(session),
    stats,
  };
}
