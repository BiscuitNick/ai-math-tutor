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
import { extractMathExpressions, isValidMathStep, expressionExists } from "@/lib/utils/mathExtractor";
import { addStepToSession } from "@/lib/firestore/sessions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TutorPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [initialProblem, setInitialProblem] = useState<string>("");
  const [parsingImages, setParsingImages] = useState(false);
  const [isResumingSession, setIsResumingSession] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [messageImagesMap, setMessageImagesMap] = useState<Map<string, { url: string }[]>>(new Map());
  const errorHandler = useErrorHandler();

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user?.displayName) return "U";
    const names = user.displayName.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.displayName[0].toUpperCase();
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

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
      console.log("Loading turns into chat:", turns.length, "for session:", currentSessionId);

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

    // Reset resuming flag if no turns found and not loading
    if (isResumingSession && !turnsLoading && turns.length === 0) {
      console.log("No turns found for session:", currentSessionId);
      setIsResumingSession(false);
    }
  }, [isResumingSession, turns, turnsLoading, setMessages, currentSessionId]);

  // Transform messages to match ChatInterface expectations
  const chatMessages: Message[] = messages.map((msg) => {
    const baseMessage: Message = {
      id: msg.id,
      role: msg.role === "user" ? "student" : "tutor",
      content: msg.content,
      timestamp: msg.createdAt || new Date(),
    };

    // Attach images if this message has any
    const images = messageImagesMap.get(msg.id);
    if (images && images.length > 0) {
      return {
        ...baseMessage,
        images: images,
      } as Message;
    }

    return baseMessage;
  });

  const handleSendMessage = async (data: { text: string; images: File[] }) => {
    console.log("=== handleSendMessage ===");
    console.log("User:", user?.uid);
    console.log("Current Session ID:", currentSessionId);
    console.log("Message text:", data.text);
    console.log("Images:", data.images.length);

    let formattedProblems = "";
    let firstMessageId = "";

    // Parse images if any
    if (data.images.length > 0) {
      setParsingImages(true);

      try {
        const imageDataList: { url: string }[] = [];
        const allProblems: string[] = [];

        for (let i = 0; i < data.images.length; i++) {
          const file = data.images[i];
          console.log(`Parsing image ${i + 1}/${data.images.length}...`);

          // Create data URL for immediate display
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });

          // Create FormData with the file
          const formData = new FormData();
          formData.append("image", file);

          // Parse the image
          const result = await parseImageAction(formData);

          if (!result.success || !result.data) {
            throw new Error(result.error || `Failed to parse image ${i + 1}`);
          }

          const parsedText = result.data.extractedText;
          console.log("Parsed text:", parsedText);

          // Strip markdown code blocks if present
          let cleanedText = parsedText.trim();
          if (cleanedText.startsWith("```")) {
            // Remove opening ```json or ``` and closing ```
            cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
          }

          // Parse JSON to extract problems array
          try {
            const jsonData = JSON.parse(cleanedText);
            if (jsonData.problems && Array.isArray(jsonData.problems)) {
              allProblems.push(...jsonData.problems);
            } else {
              console.warn("No problems array found in JSON:", jsonData);
              // Fallback: use the whole cleaned text
              allProblems.push(cleanedText);
            }
          } catch (jsonErr) {
            console.error("Failed to parse JSON from extracted text:", jsonErr);
            console.error("Cleaned text was:", cleanedText);
            // If JSON parsing fails, use the cleaned text
            allProblems.push(cleanedText);
          }

          // Store image data for display (without parsed text)
          imageDataList.push({ url: dataUrl });

          // Upload image to Firebase Storage
          try {
            await uploadImage(file);
          } catch (uploadErr) {
            console.error("Failed to upload image to storage:", uploadErr);
            // Continue anyway, parsing is more important
          }
        }

        // Format problems as LaTeX
        formattedProblems = allProblems.map(problem => `$${problem}$`).join("\n\n");
        console.log("Formatted problems:", formattedProblems);

        // Create first message (image + user text) manually
        firstMessageId = `msg-${Date.now()}`;
        const firstMessage = {
          id: firstMessageId,
          role: "user" as const,
          content: data.text || " ", // Use space if no text to avoid empty content
          createdAt: new Date(),
        };

        // Add first message to chat
        setMessages(prev => [...prev, firstMessage]);

        // Store images with first message ID
        setMessageImagesMap(prev => {
          const newMap = new Map(prev);
          newMap.set(firstMessageId, imageDataList);
          return newMap;
        });

        console.log("First message added with images");
      } catch (err) {
        console.error("Error parsing images:", err);
        errorHandler.showError(err instanceof Error ? err : new Error("Failed to parse images"), "image_parse_failed");
        setParsingImages(false);
        return;
      } finally {
        setParsingImages(false);
      }
    }

    // Determine what content to send to AI
    const contentForAI = data.images.length > 0
      ? formattedProblems  // If images, use formatted problems
      : data.text;          // Otherwise use typed text

    // Create session if this is the first message
    let sessionIdToUse = currentSessionId;
    if (!sessionIdToUse && user) {
      console.log("Creating new session...");
      const session = await createSession({
        problemText: contentForAI.slice(0, 100), // Use first 100 chars
        problemType: "other",
      });

      if (session) {
        console.log("Session created successfully:", session.id);
        sessionIdToUse = session.id;
        setCurrentSessionId(session.id);
        setInitialProblem(contentForAI.slice(0, 100));
      } else {
        console.error("Failed to create session");
        return;
      }
    }

    // Save first message (image + text) as a turn if we have images
    if (sessionIdToUse && firstMessageId) {
      console.log("Saving image message turn to session:", sessionIdToUse);
      try {
        const turn = await addTurn(sessionIdToUse, {
          speaker: "user",
          message: data.text ? data.text : "[Image]",
        });
        if (turn) {
          console.log("Image message turn saved:", turn.id);
        }
      } catch (err) {
        console.error("Exception while saving image message turn:", err);
      }
    }

    // Extract and save mathematical steps from the user's message
    if (sessionIdToUse && user && contentForAI) {
      const expressions = extractMathExpressions(contentForAI);
      console.log("Extracted expressions from user message:", expressions);

      // Get existing expressions to check for duplicates
      const existingExpressions = [
        initialProblem || contentForAI.slice(0, 100), // Original problem
        ...(currentSession?.steps || []).map(s => s.expression), // Existing steps
      ];

      for (const expr of expressions) {
        if (isValidMathStep(expr)) {
          // Check if this expression already exists
          if (!expressionExists(expr, existingExpressions)) {
            try {
              await addStepToSession(user.uid, sessionIdToUse, {
                expression: expr,
                explanation: "Student's work",
              });
              console.log("Added step to session:", expr);
              // Add to existing expressions list to prevent duplicates in this batch
              existingExpressions.push(expr);
            } catch (err) {
              console.error("Failed to add step:", err);
            }
          } else {
            console.log("Skipped duplicate expression:", expr);
          }
        }
      }
    }

    // Send second message (formatted problems or text) to AI via append
    console.log("Sending message to AI...");
    await append({
      role: "user",
      content: contentForAI,
    });

    // Note: The second message will be saved as a turn via onFinish callback
  };

  const handleSelectSession = async (session: Session) => {
    console.log("Loading session:", session);
    // Clear messages immediately to prevent showing old session
    setMessages([]);
    setMessageImagesMap(new Map());
    setCurrentSessionId(session.id);
    setInitialProblem(session.problemText);
    setIsResumingSession(true); // Flag to load turns from Firestore
  };

  const handleNewSession = () => {
    console.log("Starting new session");
    setCurrentSessionId(null);
    setInitialProblem("");
    setMessages([]);
    setMessageImagesMap(new Map());
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
    <div className="h-screen w-full flex flex-col overflow-hidden relative">
      {/* Absolute positioned History Sidebar button - Top Left */}
      <div className="fixed top-4 left-4 z-50">
        <HistorySidebar
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          currentSessionId={currentSessionId || undefined}
        />
      </div>

      {/* Absolute positioned User Avatar - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        {user && !user.isAnonymous && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.displayName || "User"}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/tutor">
                  <User className="mr-2 h-4 w-4" />
                  <span>My Sessions</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/test">
                  <span>Test Pages</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Error displays */}
      {error && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-40 w-full max-w-md px-4">
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
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40">
          <LoadingSpinner size="md" text="Loading session..." />
        </div>
      )}

      {parsingImages && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-40 bg-muted/90 backdrop-blur px-4 py-2 rounded-lg">
          <LoadingSpinner size="md" text="Parsing images with AI..." />
        </div>
      )}

      {/* Chat Interface - Full Height */}
      <ChatInterface
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading || createLoading || parsingImages}
        className="h-full w-full"
        currentSessionId={currentSessionId}
        currentSession={currentSession}
        onCompleteSession={handleCompleteSession}
      />
    </div>
  );
}
