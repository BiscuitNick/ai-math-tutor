/**
 * React hooks for session management
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  createSession as createSessionDb,
  getSession as getSessionDb,
  querySessions as querySessionsDb,
  updateSessionStatus as updateSessionStatusDb,
  updateSessionActivity as updateSessionActivityDb,
  deleteSession as deleteSessionDb,
  subscribeToSession,
  subscribeToSessions,
  addTurn as addTurnDb,
  queryTurns as queryTurnsDb,
  subscribeToTurns,
  findAbandonedSessions as findAbandonedSessionsDb,
  markSessionsAsAbandoned as markSessionsAsAbandonedDb,
} from "@/lib/firestore/sessions";
import type {
  Session,
  Turn,
  CreateSessionData,
  UpdateSessionStatusData,
  SessionQueryOptions,
  TurnQueryOptions,
} from "@/lib/types/session";

/**
 * Hook for creating a new session
 */
export function useCreateSession() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createSession = useCallback(
    async (data: CreateSessionData): Promise<Session | null> => {
      if (!user) {
        setError(new Error("User must be authenticated to create a session"));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const session = await createSessionDb(user.uid, data);
        return session;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to create session");
        setError(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { createSession, loading, error };
}

/**
 * Hook for retrieving the current/active session with real-time updates
 */
export function useCurrentSession(sessionId: string | null) {
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !sessionId) {
      setSession(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe to real-time updates
    const unsubscribe = subscribeToSession(user.uid, sessionId, (updatedSession) => {
      setSession(updatedSession);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user, sessionId]);

  return { session, loading, error };
}

/**
 * Hook for fetching a single session (one-time, not real-time)
 */
export function useGetSession() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getSession = useCallback(
    async (sessionId: string): Promise<Session | null> => {
      if (!user) {
        setError(new Error("User must be authenticated"));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const session = await getSessionDb(user.uid, sessionId);
        return session;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to get session");
        setError(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { getSession, loading, error };
}

/**
 * Hook for fetching user's session history with real-time updates
 */
export function useSessionList(options: SessionQueryOptions = {}) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Track options to detect changes
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe to real-time updates
    const unsubscribe = subscribeToSessions(user.uid, optionsRef.current, (updatedSessions) => {
      setSessions(updatedSessions);
      setHasMore(updatedSessions.length >= (optionsRef.current.limit || 20));
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user, options.limit, options.status, options.orderBy, options.orderDirection]);

  // Function to load more sessions
  const loadMore = useCallback(async () => {
    if (!user || !hasMore || loading) return;

    setLoading(true);
    setError(null);

    try {
      const lastSession = sessions[sessions.length - 1];
      const moreSessions = await querySessionsDb(user.uid, {
        ...optionsRef.current,
        startAfter: lastSession?.id,
      });

      setSessions((prev) => [...prev, ...moreSessions]);
      setHasMore(moreSessions.length >= (optionsRef.current.limit || 20));
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to load more sessions");
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [user, sessions, hasMore, loading]);

  return { sessions, loading, error, hasMore, loadMore };
}

/**
 * Hook for updating session status
 */
export function useUpdateSessionStatus() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateStatus = useCallback(
    async (sessionId: string, data: UpdateSessionStatusData): Promise<boolean> => {
      if (!user) {
        setError(new Error("User must be authenticated"));
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        await updateSessionStatusDb(user.uid, sessionId, data);
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to update session status");
        setError(error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { updateStatus, loading, error };
}

/**
 * Hook for updating session activity timestamp
 */
export function useUpdateSessionActivity() {
  const { user } = useAuth();

  const updateActivity = useCallback(
    async (sessionId: string): Promise<void> => {
      if (!user) return;

      try {
        await updateSessionActivityDb(user.uid, sessionId);
      } catch (err) {
        console.error("Failed to update session activity:", err);
      }
    },
    [user]
  );

  return { updateActivity };
}

/**
 * Hook for deleting a session
 */
export function useDeleteSession() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      if (!user) {
        setError(new Error("User must be authenticated"));
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        await deleteSessionDb(user.uid, sessionId);
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to delete session");
        setError(error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { deleteSession, loading, error };
}

/**
 * Hook for adding a turn to a session
 */
export function useAddTurn() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addTurn = useCallback(
    async (
      sessionId: string,
      turn: Omit<Turn, "id" | "timestamp">
    ): Promise<Turn | null> => {
      if (!user) {
        setError(new Error("User must be authenticated"));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const newTurn = await addTurnDb(user.uid, sessionId, turn);
        return newTurn;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to add turn");
        setError(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { addTurn, loading, error };
}

/**
 * Hook for fetching turns with real-time updates
 */
export function useTurns(sessionId: string | null, options: TurnQueryOptions = {}) {
  const { user } = useAuth();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!user || !sessionId) {
      setTurns([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe to real-time updates
    const unsubscribe = subscribeToTurns(user.uid, sessionId, optionsRef.current, (updatedTurns) => {
      setTurns(updatedTurns);
      setHasMore(updatedTurns.length >= (optionsRef.current.limit || 20));
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user, sessionId, options.limit, options.orderBy, options.orderDirection]);

  // Function to load more turns
  const loadMore = useCallback(async () => {
    if (!user || !sessionId || !hasMore || loading) return;

    setLoading(true);
    setError(null);

    try {
      const lastTurn = turns[turns.length - 1];
      const moreTurns = await queryTurnsDb(user.uid, sessionId, {
        ...optionsRef.current,
        startAfter: lastTurn?.id,
      });

      setTurns((prev) => [...prev, ...moreTurns]);
      setHasMore(moreTurns.length >= (optionsRef.current.limit || 20));
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to load more turns");
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [user, sessionId, turns, hasMore, loading]);

  return { turns, loading, error, hasMore, loadMore };
}

/**
 * Hook for finding and marking abandoned sessions
 */
export function useAbandonedSessions() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const findAbandoned = useCallback(async (): Promise<Session[]> => {
    if (!user) {
      setError(new Error("User must be authenticated"));
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const abandonedSessions = await findAbandonedSessionsDb(user.uid);
      return abandonedSessions;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to find abandoned sessions");
      setError(error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsAbandoned = useCallback(
    async (sessionIds: string[]): Promise<boolean> => {
      if (!user) {
        setError(new Error("User must be authenticated"));
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        await markSessionsAsAbandonedDb(user.uid, sessionIds);
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to mark sessions as abandoned");
        setError(error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { findAbandoned, markAsAbandoned, loading, error };
}

/**
 * Complete session management hook that combines multiple operations
 */
export function useSessionManager() {
  const { createSession, loading: createLoading, error: createError } = useCreateSession();
  const { updateStatus, loading: updateLoading, error: updateError } = useUpdateSessionStatus();
  const { deleteSession, loading: deleteLoading, error: deleteError } = useDeleteSession();
  const { updateActivity } = useUpdateSessionActivity();
  const { addTurn, loading: addTurnLoading, error: addTurnError } = useAddTurn();

  const loading = createLoading || updateLoading || deleteLoading || addTurnLoading;
  const error = createError || updateError || deleteError || addTurnError;

  return {
    createSession,
    updateStatus,
    deleteSession,
    updateActivity,
    addTurn,
    loading,
    error,
  };
}
