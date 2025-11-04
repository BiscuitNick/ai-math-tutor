"use client";

import { useState, useEffect } from "react";
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
import { parseImageAction } from "@/app/actions/parse-image";
import { uploadImage } from "@/lib/storage";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { ErrorAlert } from "@/components/ErrorAlert";
import { LoadingSpinner, ChatSkeleton } from "@/components/LoadingSpinner";

export default function TutorPage() {
  const { user, loading: authLoading } = useAuth();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [initialProblem, setInitialProblem] = useState<string>("");
  const [parsingImages, setParsingImages] = useState(false);
  const [isResumingSession, setIsResumingSession] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const errorHandler = useErrorHandler();

  // Session hooks
  const { createSession, loading: createLoading, error: createError } = useCreateSession();
  const { session: currentSession } = useCurrentSession(currentSessionId);
  const { updateStatus } = useUpdateSessionStatus();
  const { addTurn, error: addTurnError } = useAddTurn();
  const { turns, loading: turnsLoading } = useTurns(currentSessionId);

  // Chat hook
  const { messages, append, isLoading, error, setMessages } = useChat({
    streamProtocol: 'text',
    onError: (error) => {
      console.error("Chat error:", error);
      errorHandler.showError(error);
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
      }
    },
  });

  // Timeout handling for stuck loading states
  useEffect(() => {
    if (isLoading || createLoading || parsingImages || turnsLoading) {
      // Set a timeout for 30 seconds
      const timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
        errorHandler.showError(
          new Error("Request is taking longer than expected. Please try again."),
          "timeout"
        );
      }, 30000); // 30 seconds

      return () => {
        clearTimeout(timeoutId);
        setLoadingTimeout(false);
      };
    }
  }, [isLoading, createLoading, parsingImages, turnsLoading, errorHandler]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && (!user || user.isAnonymous)) {
      console.log("No authenticated user detected, redirecting to login...");
      window.location.href = "/";
    } else if (user) {
      console.log("User authenticated:", user.uid, "isAnonymous:", user.isAnonymous);
    }
  }, [user, authLoading]);

  // Log session hook errors and show user-friendly messages
  useEffect(() => {
    if (createError) {
      console.error("Create session error:", createError);
      errorHandler.showError(createError, "firebase_connection_lost");
    }
  }, [createError, errorHandler]);

  useEffect(() => {
    if (addTurnError) {
      console.error("Add turn error:", addTurnError);
      errorHandler.showError(addTurnError, "firebase_connection_lost");
    }
  }, [addTurnError, errorHandler]);

  // Load turns into chat when resuming a session
  useEffect(() => {
    if (isResumingSession && !turnsLoading && turns.length > 0) {
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
        id: `turn-${msg.id}`,
        role: msg.role === "student" ? "user" : "assistant",
        content: msg.content,
        createdAt: msg.timestamp,
      }));

      console.log("Setting messages from turns:", chatMessages);
      setMessages(chatMessages as any);
      setIsResumingSession(false); // Reset flag after loading
    }
  }, [isResumingSession, turns, turnsLoading, setMessages]);

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

    let messageContent = data.text;

    // Parse images if any
    if (data.images.length > 0) {
      setParsingImages(true);

      try {
        const parsedTexts: string[] = [];

        for (let i = 0; i < data.images.length; i++) {
          const file = data.images[i];
          console.log(`Parsing image ${i + 1}/${data.images.length}...`);

          // Create FormData with the file
          const formData = new FormData();
          formData.append("image", file);

          // Parse the image
          const result = await parseImageAction(formData);

          if (!result.success || !result.data) {
            throw new Error(result.error || `Failed to parse image ${i + 1}`);
          }

          parsedTexts.push(`Image ${i + 1}: ${result.data.extractedText}`);

          // Upload image to Firebase Storage
          try {
            await uploadImage(file);
          } catch (uploadErr) {
            console.error("Failed to upload image to storage:", uploadErr);
            // Continue anyway, parsing is more important
          }
        }

        // Combine text and parsed images
        const imageContent = parsedTexts.join("\n\n");
        messageContent = data.text
          ? `${data.text}\n\n${imageContent}`
          : imageContent;

        console.log("Combined message content:", messageContent);
      } catch (err) {
        console.error("Error parsing images:", err);
        errorHandler.showError(err instanceof Error ? err : new Error("Failed to parse images"), "image_parse_failed");
        setParsingImages(false);
        return;
      } finally {
        setParsingImages(false);
      }
    }

    // Create session if this is the first message
    let sessionIdToUse = currentSessionId;
    if (!sessionIdToUse && user) {
      console.log("Creating new session...");
      const session = await createSession({
        problemText: messageContent.slice(0, 100), // Use first 100 chars
        problemType: "other",
      });

      if (session) {
        console.log("Session created successfully:", session.id);
        sessionIdToUse = session.id;
        setCurrentSessionId(session.id);
        setInitialProblem(messageContent.slice(0, 100));
      } else {
        console.error("Failed to create session");
        return;
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
          console.error("Failed to save student turn");
        }
      } catch (err) {
        console.error("Exception while saving student turn:", err);
      }
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
    setIsResumingSession(true); // Flag to load turns from Firestore
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

  // Show loading while checking auth
  if (authLoading) {
    return <LoadingSpinner size="lg" text="Loading..." fullScreen />;
  }

  // Don't render if not authenticated (will redirect)
  if (!user || user.isAnonymous) {
    return null;
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      {/* Header with History Sidebar */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b">
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

      {/* Error displays */}
      {error && (
        <div className="flex-shrink-0 px-4 pt-4">
          <ErrorAlert
            title="Unable to send message"
            message={error.message}
            severity="error"
            dismissible={true}
            onDismiss={() => {
              // Error will clear on next successful message
            }}
          />
        </div>
      )}

      {turnsLoading && turns.length === 0 && currentSessionId && (
        <div className="flex-shrink-0 p-4">
          <LoadingSpinner size="md" text="Loading session..." />
        </div>
      )}

      {parsingImages && (
        <div className="flex-shrink-0 p-4 bg-muted/20">
          <LoadingSpinner size="md" text="Parsing images with AI..." />
        </div>
      )}

      {/* Chat Interface */}
      <ChatInterface
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading || createLoading || parsingImages}
        className="flex-1"
      />
    </div>
  );
}
