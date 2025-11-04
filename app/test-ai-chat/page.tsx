"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { useChat } from "@/hooks/useChat";
import type { Message } from "@/components/chat/MessageBubble";
import { HistorySidebar } from "@/components/HistorySidebar";
import type { Session } from "@/lib/types/session";
import {
  useCreateSession,
  useCurrentSession,
  useUpdateSessionStatus,
  useAddTurn,
  useTurns,
} from "@/hooks/useSession";
import { useAuth } from "@/contexts/AuthContext";

export default function TestAIChatPage() {
  const { user, signInAnon, loading: authLoading } = useAuth();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [initialProblem, setInitialProblem] = useState<string>("");

  // Auto sign-in anonymously if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      console.log("No user detected, signing in anonymously...");
      signInAnon().catch((err) => {
        console.error("Failed to sign in anonymously:", err);
      });
    } else if (user) {
      console.log("User authenticated:", user.uid, "isAnonymous:", user.isAnonymous);
    }
  }, [user, authLoading, signInAnon]);

  // Session hooks
  const { createSession, loading: createLoading, error: createError } = useCreateSession();
  const { session: currentSession } = useCurrentSession(currentSessionId);
  const { updateStatus } = useUpdateSessionStatus();
  const { addTurn, error: addTurnError } = useAddTurn();
  const { turns, loading: turnsLoading } = useTurns(currentSessionId);

  // Log session hook errors
  useEffect(() => {
    if (createError) {
      console.error("Create session error:", createError);
    }
  }, [createError]);

  useEffect(() => {
    if (addTurnError) {
      console.error("Add turn error:", addTurnError);
    }
  }, [addTurnError]);

  // Chat hook
  const { messages, append, isLoading, error, setMessages } = useChat({
    streamProtocol: 'text',
    onError: (error) => {
      console.error("Chat error:", error);
    },
    onFinish: async (message) => {
      console.log("=== onFinish callback ===");
      console.log("Message:", message);
      console.log("Current Session ID:", currentSessionId);

      // Save assistant's response as a turn
      if (currentSessionId && message.role === "assistant") {
        console.log("Saving tutor turn to session:", currentSessionId);
        const turn = await addTurn(currentSessionId, {
          speaker: "assistant",
          message: message.content,
        });
        if (turn) {
          console.log("Tutor turn saved:", turn.id);
        } else {
          console.error("Failed to save tutor turn");
        }
      } else {
        console.warn("Not saving tutor turn - sessionId:", currentSessionId, "role:", message.role);
      }
    },
  });

  // Load turns into chat when session changes
  useEffect(() => {
    if (!turnsLoading && turns.length > 0) {
      console.log("Loading turns into chat:", turns.length);

      // Convert turns to chat messages
      const turnMessages: Message[] = turns.map((turn) => ({
        id: turn.id,
        role: turn.speaker === "assistant" ? "tutor" : "student",
        content: turn.message,
        timestamp: turn.timestamp,
      }));

      // Transform to chat format
      const chatMessages = turnMessages.map((msg) => ({
        id: msg.id,
        role: msg.role === "student" ? "user" : "assistant",
        content: msg.content,
        createdAt: msg.timestamp,
      }));

      console.log("Setting messages:", chatMessages);
      setMessages(chatMessages as any);
    }
  }, [turns, turnsLoading, setMessages]);

  // Transform messages to match ChatInterface expectations
  const chatMessages: Message[] = messages.map((msg) => ({
    id: msg.id,
    role: msg.role === "user" ? "student" : "tutor",
    content: msg.content,
    timestamp: msg.createdAt || new Date(),
  }));

  const handleSendMessage = async (data: { text: string; images: File[] }) => {
    console.log("=== handleSendMessage ===");
    console.log("User:", user?.uid);
    console.log("Current Session ID:", currentSessionId);
    console.log("Message text:", data.text);
    console.log("Images:", data.images.length);

    const messageContent = data.text;
    let sessionIdToUse = currentSessionId;

    // Create session if this is the first message
    if (!sessionIdToUse && user) {
      console.log("Creating new session...");
      const session = await createSession({
        problemText: messageContent.slice(0, 100), // Use first 100 chars as problem summary
        problemType: "other", // Default problem type
      });

      if (session) {
        console.log("Session created successfully:", session.id);
        sessionIdToUse = session.id;
        setCurrentSessionId(session.id);
        setInitialProblem(messageContent.slice(0, 100));
      } else {
        console.error("Failed to create session");
      }
    }

    // Save student's message as a turn
    if (sessionIdToUse) {
      console.log("Saving student turn to session:", sessionIdToUse);
      try {
        const turn = await addTurn(sessionIdToUse, {
          speaker: "user",
          message: messageContent,
        });
        if (turn) {
          console.log("Student turn saved:", turn.id);
        } else {
          console.error("Failed to save student turn - addTurn returned null/undefined");
        }
      } catch (err) {
        console.error("Exception while saving student turn:", err);
      }
    } else {
      console.warn("No session ID available, cannot save turn");
    }

    // Send message to AI
    console.log("Sending message to AI...");
    await append({
      role: "user",
      content: messageContent,
    });
  };

  const handleSelectSession = async (session: Session) => {
    console.log("Loading session:", session);
    setCurrentSessionId(session.id);
    setInitialProblem(session.problemText);
    // Turns will be loaded automatically by useTurns hook
  };

  const handleNewSession = () => {
    console.log("Starting new session");
    setCurrentSessionId(null);
    setInitialProblem("");
    setMessages([]);
  };

  const handleCompleteSession = async () => {
    if (currentSessionId) {
      await updateStatus(currentSessionId, {
        status: "completed",
        completedAt: new Date(),
      });
    }
  };

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Header with History Sidebar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <HistorySidebar
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            currentSessionId={currentSessionId || undefined}
          />
          <div>
            <h1 className="text-xl font-semibold">AI Math Tutor</h1>
            {initialProblem && (
              <p className="text-sm text-muted-foreground">{initialProblem}</p>
            )}
          </div>
        </div>
        {currentSessionId && currentSession?.status === "in-progress" && (
          <button
            onClick={handleCompleteSession}
            className="text-sm px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Mark Complete
          </button>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3">
          <div className="flex items-start gap-2">
            <svg
              className="h-5 w-5 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="font-medium">Unable to send message</p>
              <p className="text-sm mt-1">{error.message}</p>
              {error.message.includes("API key") && (
                <p className="text-sm mt-2 opacity-80">
                  Please check your environment configuration and ensure OPENAI_API_KEY is set correctly.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {turnsLoading && turns.length === 0 && currentSessionId && (
        <div className="flex items-center justify-center p-4 text-muted-foreground">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
          Loading session...
        </div>
      )}

      <ChatInterface
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading || createLoading}
      />
    </div>
  );
}
