/**
 * Firestore utility functions for session management
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter as firestoreStartAfter,
  Timestamp,
  DocumentSnapshot,
  QueryConstraint,
  onSnapshot,
  Unsubscribe,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  Session,
  SessionDocument,
  Turn,
  TurnDocument,
  CreateSessionData,
  UpdateSessionStatusData,
  SessionQueryOptions,
  TurnQueryOptions,
  SessionStatus,
} from "@/lib/types/session";

/**
 * Convert Firestore timestamp to Date
 */
function timestampToDate(timestamp: Timestamp | any): Date {
  return timestamp.toDate();
}

/**
 * Convert Date to Firestore timestamp
 */
function dateToTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

/**
 * Convert SessionDocument to Session
 */
export function sessionDocToSession(
  id: string,
  doc: SessionDocument
): Session {
  return {
    id,
    userId: doc.userId,
    problemText: doc.problemText,
    problemType: doc.problemType,
    status: doc.status,
    createdAt: timestampToDate(doc.createdAt),
    updatedAt: timestampToDate(doc.updatedAt),
    lastActivityAt: timestampToDate(doc.lastActivityAt),
    turnCount: doc.turnCount,
    hints: doc.hints,
    completedAt: doc.completedAt ? timestampToDate(doc.completedAt) : undefined,
    metadata: doc.metadata,
  };
}

/**
 * Convert TurnDocument to Turn
 */
export function turnDocToTurn(id: string, doc: TurnDocument): Turn {
  return {
    id,
    speaker: doc.speaker,
    message: doc.message,
    timestamp: timestampToDate(doc.timestamp),
    hintLevel: doc.hintLevel,
  };
}

/**
 * Get reference to user's sessions collection
 */
export function getSessionsCollectionRef(userId: string) {
  return collection(db, "users", userId, "sessions");
}

/**
 * Get reference to a specific session document
 */
export function getSessionDocRef(userId: string, sessionId: string) {
  return doc(db, "users", userId, "sessions", sessionId);
}

/**
 * Get reference to session's turns collection
 */
export function getTurnsCollectionRef(userId: string, sessionId: string) {
  return collection(db, "users", userId, "sessions", sessionId, "turns");
}

/**
 * Get reference to a specific turn document
 */
export function getTurnDocRef(
  userId: string,
  sessionId: string,
  turnId: string
) {
  return doc(db, "users", userId, "sessions", sessionId, "turns", turnId);
}

/**
 * Create a new session
 */
export async function createSession(
  userId: string,
  data: CreateSessionData
): Promise<Session> {
  const now = Timestamp.now();

  const sessionData: Omit<SessionDocument, "userId"> = {
    problemText: data.problemText,
    problemType: data.problemType,
    status: "in-progress",
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
    turnCount: 0,
    hints: [],
  };

  const sessionsRef = getSessionsCollectionRef(userId);
  const docRef = await addDoc(sessionsRef, {
    ...sessionData,
    userId,
  });

  return sessionDocToSession(docRef.id, {
    ...sessionData,
    userId,
  });
}

/**
 * Get a session by ID
 */
export async function getSession(
  userId: string,
  sessionId: string
): Promise<Session | null> {
  const docRef = getSessionDocRef(userId, sessionId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return sessionDocToSession(docSnap.id, docSnap.data() as SessionDocument);
}

/**
 * Query sessions with options
 */
export async function querySessions(
  userId: string,
  options: SessionQueryOptions = {}
): Promise<Session[]> {
  const {
    limit: limitCount = 20,
    status,
    orderBy: orderByField = "updatedAt",
    orderDirection = "desc",
    startAfter: startAfterId,
  } = options;

  const constraints: QueryConstraint[] = [];

  // Add status filter if provided
  if (status) {
    constraints.push(where("status", "==", status));
  }

  // Add ordering
  constraints.push(orderBy(orderByField, orderDirection));

  // Add limit
  constraints.push(limit(limitCount));

  // Add pagination if startAfter is provided
  if (startAfterId) {
    const startAfterDoc = await getDoc(getSessionDocRef(userId, startAfterId));
    if (startAfterDoc.exists()) {
      constraints.push(firestoreStartAfter(startAfterDoc));
    }
  }

  const sessionsRef = getSessionsCollectionRef(userId);
  const q = query(sessionsRef, ...constraints);
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) =>
    sessionDocToSession(doc.id, doc.data() as SessionDocument)
  );
}

/**
 * Update session status
 */
export async function updateSessionStatus(
  userId: string,
  sessionId: string,
  data: UpdateSessionStatusData
): Promise<void> {
  const docRef = getSessionDocRef(userId, sessionId);
  const now = Timestamp.now();

  const updateData: Partial<SessionDocument> = {
    status: data.status,
    updatedAt: now,
  };

  if (data.completedAt) {
    updateData.completedAt = dateToTimestamp(data.completedAt);
  }

  if (data.metadata) {
    updateData.metadata = data.metadata;
  }

  await updateDoc(docRef, updateData);
}

/**
 * Update session last activity timestamp
 */
export async function updateSessionActivity(
  userId: string,
  sessionId: string
): Promise<void> {
  const docRef = getSessionDocRef(userId, sessionId);
  await updateDoc(docRef, {
    lastActivityAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Delete a session and all its turns
 */
export async function deleteSession(
  userId: string,
  sessionId: string
): Promise<void> {
  // First, delete all turns
  const turnsRef = getTurnsCollectionRef(userId, sessionId);
  const turnsSnapshot = await getDocs(turnsRef);

  const batch = writeBatch(db);

  turnsSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // Delete the session document
  const sessionRef = getSessionDocRef(userId, sessionId);
  batch.delete(sessionRef);

  await batch.commit();
}

/**
 * Subscribe to session changes
 */
export function subscribeToSession(
  userId: string,
  sessionId: string,
  callback: (session: Session | null) => void
): Unsubscribe {
  const docRef = getSessionDocRef(userId, sessionId);

  return onSnapshot(docRef, (docSnap) => {
    if (!docSnap.exists()) {
      callback(null);
      return;
    }

    callback(sessionDocToSession(docSnap.id, docSnap.data() as SessionDocument));
  });
}

/**
 * Subscribe to sessions list changes
 */
export function subscribeToSessions(
  userId: string,
  options: SessionQueryOptions,
  callback: (sessions: Session[]) => void
): Unsubscribe {
  const {
    limit: limitCount = 20,
    status,
    orderBy: orderByField = "updatedAt",
    orderDirection = "desc",
  } = options;

  const constraints: QueryConstraint[] = [];

  if (status) {
    constraints.push(where("status", "==", status));
  }

  constraints.push(orderBy(orderByField, orderDirection));
  constraints.push(limit(limitCount));

  const sessionsRef = getSessionsCollectionRef(userId);
  const q = query(sessionsRef, ...constraints);

  return onSnapshot(q, (querySnapshot) => {
    const sessions = querySnapshot.docs.map((doc) =>
      sessionDocToSession(doc.id, doc.data() as SessionDocument)
    );
    callback(sessions);
  });
}

/**
 * Add a turn to a session
 */
export async function addTurn(
  userId: string,
  sessionId: string,
  turn: Omit<Turn, "id" | "timestamp">
): Promise<Turn> {
  const now = Timestamp.now();

  const turnData: any = {
    speaker: turn.speaker,
    message: turn.message,
    timestamp: now,
  };

  // Only include hintLevel if it's defined
  if (turn.hintLevel !== undefined) {
    turnData.hintLevel = turn.hintLevel;
  }

  const turnsRef = getTurnsCollectionRef(userId, sessionId);
  const docRef = await addDoc(turnsRef, turnData);

  // Update session turn count and last activity
  const sessionRef = getSessionDocRef(userId, sessionId);
  const sessionSnap = await getDoc(sessionRef);

  if (sessionSnap.exists()) {
    const currentTurnCount = sessionSnap.data().turnCount || 0;
    await updateDoc(sessionRef, {
      turnCount: currentTurnCount + 1,
      lastActivityAt: now,
      updatedAt: now,
    });
  }

  return turnDocToTurn(docRef.id, turnData);
}

/**
 * Query turns for a session
 */
export async function queryTurns(
  userId: string,
  sessionId: string,
  options: TurnQueryOptions = {}
): Promise<Turn[]> {
  const {
    limit: limitCount = 20,
    orderBy: orderByField = "timestamp",
    orderDirection = "asc",
    startAfter: startAfterId,
  } = options;

  const constraints: QueryConstraint[] = [];

  // Add ordering
  constraints.push(orderBy(orderByField, orderDirection));

  // Add limit
  constraints.push(limit(limitCount));

  // Add pagination if startAfter is provided
  if (startAfterId) {
    const startAfterDoc = await getDoc(
      getTurnDocRef(userId, sessionId, startAfterId)
    );
    if (startAfterDoc.exists()) {
      constraints.push(firestoreStartAfter(startAfterDoc));
    }
  }

  const turnsRef = getTurnsCollectionRef(userId, sessionId);
  const q = query(turnsRef, ...constraints);
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) =>
    turnDocToTurn(doc.id, doc.data() as TurnDocument)
  );
}

/**
 * Subscribe to turns changes
 */
export function subscribeToTurns(
  userId: string,
  sessionId: string,
  options: TurnQueryOptions,
  callback: (turns: Turn[]) => void
): Unsubscribe {
  const {
    limit: limitCount = 20,
    orderBy: orderByField = "timestamp",
    orderDirection = "asc",
  } = options;

  const constraints: QueryConstraint[] = [];

  constraints.push(orderBy(orderByField, orderDirection));
  constraints.push(limit(limitCount));

  const turnsRef = getTurnsCollectionRef(userId, sessionId);
  const q = query(turnsRef, ...constraints);

  return onSnapshot(q, (querySnapshot) => {
    const turns = querySnapshot.docs.map((doc) =>
      turnDocToTurn(doc.id, doc.data() as TurnDocument)
    );
    callback(turns);
  });
}

/**
 * Find abandoned sessions (inactive for more than 24 hours)
 */
export async function findAbandonedSessions(
  userId: string
): Promise<Session[]> {
  const twentyFourHoursAgo = Timestamp.fromMillis(
    Date.now() - 24 * 60 * 60 * 1000
  );

  const sessionsRef = getSessionsCollectionRef(userId);
  const q = query(
    sessionsRef,
    where("status", "==", "in-progress"),
    where("lastActivityAt", "<", twentyFourHoursAgo)
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) =>
    sessionDocToSession(doc.id, doc.data() as SessionDocument)
  );
}

/**
 * Mark abandoned sessions as abandoned
 */
export async function markSessionsAsAbandoned(
  userId: string,
  sessionIds: string[]
): Promise<void> {
  const batch = writeBatch(db);
  const now = Timestamp.now();

  sessionIds.forEach((sessionId) => {
    const docRef = getSessionDocRef(userId, sessionId);
    batch.update(docRef, {
      status: "abandoned" as SessionStatus,
      updatedAt: now,
      completedAt: now,
    });
  });

  await batch.commit();
}
