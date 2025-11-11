/**
 * Hook for managing practice problem generation and sessions
 */

import { useState, useCallback } from "react";
import { createPracticeSession } from "@/lib/firestore/sessions";
import type { DifficultyLevel } from "@/lib/practice-generator";
import type { ProblemType } from "@/lib/types/session";

interface PracticeProblemResponse {
  success: boolean;
  practiceProblem?: {
    problem: string;
    difficulty: DifficultyLevel;
    problemType?: string;
    solution?: {
      steps: string[];
      finalAnswer: string;
      hints?: string[];
    };
    timestamp: Date;
  };
  error?: string;
}

interface UsePracticeReturn {
  generatePractice: (problemText: string, difficulty: DifficultyLevel, problemType?: string) => Promise<PracticeProblemResponse>;
  startPracticeSession: (userId: string, practiceProblem: string, problemType: ProblemType, parentSessionId: string) => Promise<string | null>;
  isGenerating: boolean;
  error: string | null;
}

export function usePractice(): UsePracticeReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate a practice problem from the API
   */
  const generatePractice = useCallback(async (
    problemText: string,
    difficulty: DifficultyLevel,
    problemType?: string
  ): Promise<PracticeProblemResponse> => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/practice/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          problemText,
          difficulty,
          problemType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate practice problem");
      }

      const data: PracticeProblemResponse = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate practice problem";
      setError(errorMessage);
      console.error("Error generating practice problem:", err);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Create a new practice session in Firestore
   */
  const startPracticeSession = useCallback(async (
    userId: string,
    practiceProblem: string,
    problemType: ProblemType,
    parentSessionId: string
  ): Promise<string | null> => {
    setError(null);

    try {
      const session = await createPracticeSession(userId, {
        problemText: practiceProblem,
        problemType,
        parentSessionId,
      });

      console.log("Created practice session:", session.id);
      return session.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create practice session";
      setError(errorMessage);
      console.error("Error creating practice session:", err);
      return null;
    }
  }, []);

  return {
    generatePractice,
    startPracticeSession,
    isGenerating,
    error,
  };
}
