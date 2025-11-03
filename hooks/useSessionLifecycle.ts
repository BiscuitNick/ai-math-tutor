/**
 * React hook for managing session lifecycle with automatic status transitions
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { Session } from "@/lib/types/session";
import {
  SessionLifecycleManager,
  shouldShowTurnWarning,
  hasReachedTurnLimit,
  getTurnWarningMessage,
  completeSession,
  abandonSession,
  trackSessionActivity,
  canResumeSession,
  getSessionStatusInfo,
  exportSessionToJSON,
} from "@/lib/session-manager";

interface UseSessionLifecycleOptions {
  session: Session | null;
  userId: string | null;
  onSessionCompleted?: (session: Session) => void;
  onSessionAbandoned?: (session: Session) => void;
  onTurnWarning?: (remainingTurns: number) => void;
}

interface SessionLifecycleState {
  showWarning: boolean;
  warningMessage: string | null;
  isAtLimit: boolean;
  canResume: boolean;
  statusInfo: ReturnType<typeof getSessionStatusInfo> | null;
}

export function useSessionLifecycle({
  session,
  userId,
  onSessionCompleted,
  onSessionAbandoned,
  onTurnWarning,
}: UseSessionLifecycleOptions) {
  const [state, setState] = useState<SessionLifecycleState>({
    showWarning: false,
    warningMessage: null,
    isAtLimit: false,
    canResume: false,
    statusInfo: null,
  });

  const lifecycleManagerRef = useRef<SessionLifecycleManager | null>(null);
  const lastTurnCountRef = useRef<number>(0);

  // Update lifecycle state when session changes
  useEffect(() => {
    if (!session) {
      setState({
        showWarning: false,
        warningMessage: null,
        isAtLimit: false,
        canResume: false,
        statusInfo: null,
      });
      return;
    }

    const showWarning = shouldShowTurnWarning(session.turnCount);
    const warningMessage = getTurnWarningMessage(session.turnCount);
    const isAtLimit = hasReachedTurnLimit(session.turnCount);
    const canResumeSession = canResumeSession(session);
    const statusInfo = getSessionStatusInfo(session);

    setState({
      showWarning,
      warningMessage,
      isAtLimit,
      canResume: canResumeSession,
      statusInfo,
    });

    // Trigger warning callback if turn count increased and we're in warning range
    if (
      showWarning &&
      session.turnCount > lastTurnCountRef.current &&
      onTurnWarning
    ) {
      const remaining = 50 - session.turnCount;
      onTurnWarning(remaining);
    }

    lastTurnCountRef.current = session.turnCount;
  }, [session, onTurnWarning]);

  // Set up lifecycle manager
  useEffect(() => {
    if (!session || !userId || session.status !== "in-progress") {
      // Clean up existing manager
      if (lifecycleManagerRef.current) {
        lifecycleManagerRef.current.stop();
        lifecycleManagerRef.current = null;
      }
      return;
    }

    // Create or update lifecycle manager
    if (!lifecycleManagerRef.current) {
      lifecycleManagerRef.current = new SessionLifecycleManager(
        userId,
        session.id,
        session
      );
      lifecycleManagerRef.current.start();
    } else {
      lifecycleManagerRef.current.updateSession(session);
    }

    return () => {
      if (lifecycleManagerRef.current) {
        lifecycleManagerRef.current.stop();
        lifecycleManagerRef.current = null;
      }
    };
  }, [session, userId]);

  // Watch for status changes to trigger callbacks
  useEffect(() => {
    if (!session) return;

    if (session.status === "completed" && onSessionCompleted) {
      onSessionCompleted(session);
    } else if (session.status === "abandoned" && onSessionAbandoned) {
      onSessionAbandoned(session);
    }
  }, [session?.status, session, onSessionCompleted, onSessionAbandoned]);

  // Manual complete session
  const complete = useCallback(async () => {
    if (!userId || !session) {
      return { success: false, error: "No active session" };
    }

    return completeSession(userId, session.id, session);
  }, [userId, session]);

  // Manual abandon session
  const abandon = useCallback(async () => {
    if (!userId || !session) {
      return { success: false, error: "No active session" };
    }

    return abandonSession(userId, session.id, session);
  }, [userId, session]);

  // Track activity (call this on user interactions)
  const trackActivity = useCallback(async () => {
    if (!userId || !session) return;

    await trackSessionActivity(userId, session.id);
  }, [userId, session]);

  // Export session
  const exportSession = useCallback(
    (turns: Array<{ speaker: string; message: string; timestamp: Date }>) => {
      if (!session) return null;

      return exportSessionToJSON(session, turns);
    },
    [session]
  );

  return {
    ...state,
    complete,
    abandon,
    trackActivity,
    exportSession,
  };
}
