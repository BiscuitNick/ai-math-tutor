/**
 * Practice Problem Generation API
 *
 * Generates practice problems based on a completed problem
 */

import { NextRequest, NextResponse } from "next/server";
import { generatePracticeProblem, type DifficultyLevel } from "@/lib/practice-generator";
import { validateOpenAIKey, parseAPIError } from "@/lib/error-handler";
import { checkRateLimit, formatRateLimitHeaders, createRateLimitError } from "@/lib/rate-limiter";

export const runtime = "edge";

interface PracticeGenerateRequest {
  problemText: string;
  problemType?: string;
  difficulty: DifficultyLevel;
  sessionId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as PracticeGenerateRequest;
    const { problemText, problemType, difficulty, sessionId } = body;

    // Validate request
    if (!problemText) {
      return NextResponse.json(
        { error: "problemText is required" },
        { status: 400 }
      );
    }

    if (!difficulty || (difficulty !== "same" && difficulty !== "harder")) {
      return NextResponse.json(
        { error: "difficulty must be 'same' or 'harder'" },
        { status: 400 }
      );
    }

    // Extract user ID for rate limiting
    const userId = req.headers.get('x-user-id') ||
                   req.headers.get('x-forwarded-for') ||
                   'anonymous';

    // Check rate limit
    const rateLimitResult = checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for user ${userId}`);
      const error = createRateLimitError(rateLimitResult);

      return new Response(JSON.stringify(error), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...formatRateLimitHeaders(rateLimitResult),
        },
      });
    }

    // Validate OpenAI API key
    validateOpenAIKey();

    console.log(`Generating ${difficulty} practice problem for: ${problemText.substring(0, 50)}...`);

    // Generate practice problem
    const practiceProblem = await generatePracticeProblem({
      originalProblem: problemText,
      problemType,
      difficulty,
    });

    console.log(`Generated practice problem: ${practiceProblem.practiceProblem.substring(0, 50)}...`);

    // Return the practice problem
    const response = NextResponse.json({
      success: true,
      practiceProblem: {
        problem: practiceProblem.practiceProblem,
        difficulty: practiceProblem.difficultyLevel,
        problemType: practiceProblem.problemType,
        solution: practiceProblem.solution,
        timestamp: practiceProblem.timestamp,
      },
    });

    // Add rate limit headers
    const rateLimitHeaders = formatRateLimitHeaders(rateLimitResult);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error: any) {
    console.error("Practice generation API error:", error);

    const apiError = parseAPIError(error);

    return NextResponse.json(
      {
        success: false,
        error: apiError.message,
      },
      { status: apiError.statusCode || 500 }
    );
  }
}
