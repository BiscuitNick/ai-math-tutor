import { openai } from "@ai-sdk/openai";
import { streamText, CoreMessage } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { SOCRATIC_SYSTEM_PROMPT } from "@/lib/prompts/socratic-tutor";
import { manageConversationContext, countTotalTokens } from "@/lib/token-counter";
import { validateOpenAIKey, APIError, parseAPIError } from "@/lib/error-handler";
import { analyzeStuckStatus, shouldProvideHint, getHintLevelDescription } from "@/lib/stuck-detection";
import { generateHint, shouldGenerateNewHint, getHintDescription } from "@/lib/hint-system";
import { detectProblemTypeWithCache, getSocraticQuestions } from "@/lib/problem-type-detector";
import { checkRateLimit, formatRateLimitHeaders, createRateLimitError } from "@/lib/rate-limiter";
import { checkTurnLimit, formatTurnLimitForPrompt, createTurnLimitError, shouldAllowNewTurn } from "@/lib/session-limits";
import { compressConversationContext, shouldCompressContext, getCompressionStats } from "@/lib/context-compression";
import { checkTokenLimit, formatTokenBudget, createTokenLimitError, truncateToTokenBudget } from "@/lib/token-limits";
import { checkDailyLimit, recordProblemStarted, isNewProblem, formatDailyUsage, formatDailyLimitHeaders, createDailyLimitError } from "@/lib/daily-limits";
import { createCostRecord, formatCost, checkBudgetThreshold } from "@/lib/cost-tracking";

export const runtime = "edge";

// Configuration
const MAX_TOKENS = 4000;
const MAX_CONVERSATION_TURNS = 10;
const MAX_RESPONSE_TOKENS = 1000;

// TypeScript interfaces for API
interface ChatRequest {
  messages: CoreMessage[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ChatRequest;
    const { messages } = body;

    // Validate request
    if (!messages || !Array.isArray(messages)) {
      throw new Error("Messages array is required");
    }

    // Validate messages format
    for (const message of messages) {
      if (!message.role || !message.content) {
        throw new Error("Invalid message format. Each message must have 'role' and 'content'");
      }
    }

    // Extract user ID from request (from auth header, session, etc.)
    // For now, use IP address or a header-based identifier
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

    // Log rate limit status
    console.log(`Rate limit: ${rateLimitResult.remaining} requests remaining for user ${userId}`);

    // Check turn limit
    const turnLimitResult = checkTurnLimit(messages);

    // If turn limit reached, return completion message
    if (turnLimitResult.limitReached) {
      console.log(`Turn limit reached: ${turnLimitResult.currentTurns}/${turnLimitResult.maxTurns} turns`);
      const error = createTurnLimitError(turnLimitResult.currentTurns, turnLimitResult.maxTurns);

      return new Response(JSON.stringify({
        ...error,
        completionMessage: turnLimitResult.completionMessage,
      }), {
        status: 403, // Forbidden - session limit reached
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Log turn status
    console.log(`Turn limit: ${turnLimitResult.currentTurns}/${turnLimitResult.maxTurns} (${turnLimitResult.remaining} remaining)`);
    if (turnLimitResult.shouldWarn) {
      console.log(`Turn warning triggered: ${turnLimitResult.warningMessage}`);
    }

    // Check daily limits (only for new problems)
    if (isNewProblem(messages.length)) {
      const dailyLimit = checkDailyLimit(userId);

      if (!dailyLimit.allowed) {
        console.log(`Daily limit exceeded for user ${userId}: ${dailyLimit.current}/${dailyLimit.limit}`);
        const error = createDailyLimitError(dailyLimit);

        return new Response(JSON.stringify(error), {
          status: 429, // Too Many Requests
          headers: {
            'Content-Type': 'application/json',
            ...formatDailyLimitHeaders(dailyLimit),
          },
        });
      }

      // Record new problem started
      const updatedLimit = recordProblemStarted(userId);
      console.log(formatDailyUsage(updatedLimit));
    }

    // Validate OpenAI API key
    validateOpenAIKey();

    // Extract problem text from first user message
    const firstUserMessage = messages.find(m => m.role === "user");
    const problemText = firstUserMessage?.content?.toString() || "the problem";

    // Detect problem type for tailored guidance
    let problemTypeInfo = null;
    try {
      problemTypeInfo = await detectProblemTypeWithCache(problemText);
      console.log(`Problem type detected: ${problemTypeInfo.primaryType} (confidence: ${problemTypeInfo.confidence})`);
    } catch (error) {
      console.error("Error detecting problem type:", error);
    }

    // Analyze stuck status from conversation history
    const stuckStatus = analyzeStuckStatus(messages);
    console.log(`Stuck detection: ${stuckStatus.level}, consecutive: ${stuckStatus.consecutiveStuckTurns}, hint level: ${stuckStatus.recommendedHintLevel}`);

    // Enhance system prompt with problem type and stuck status information
    let enhancedSystemPrompt = SOCRATIC_SYSTEM_PROMPT;
    let generatedHint: string | null = null;

    // Add problem-type-specific guidance
    if (problemTypeInfo && problemTypeInfo.confidence > 0.6) {
      const typeGuidance = `

## PROBLEM TYPE ANALYSIS:

This appears to be a **${problemTypeInfo.primaryType}** problem (confidence: ${Math.round(problemTypeInfo.confidence * 100)}%).

**Suggested Approach**: ${problemTypeInfo.suggestedApproach}

**Relevant Socratic Questions**:
${getSocraticQuestions(problemTypeInfo.primaryType).map((q, i) => `${i + 1}. ${q}`).join('\n')}

Use these as guidance for your questioning strategy.`;

      enhancedSystemPrompt = SOCRATIC_SYSTEM_PROMPT + typeGuidance;
    }

    if (shouldProvideHint(stuckStatus)) {

      // Check if we should generate a hint
      // For now, we'll generate hints at levels 3 and 4 (more stuck)
      if (stuckStatus.recommendedHintLevel >= 3) {
        try {
          const hint = await generateHint({
            problemText,
            conversationHistory: messages,
            currentStuckLevel: stuckStatus.recommendedHintLevel,
            problemType: problemTypeInfo?.primaryType,
          });

          generatedHint = hint.hintText;
          console.log(`Generated ${getHintDescription(hint.level)}: ${hint.hintText.substring(0, 100)}...`);
        } catch (error) {
          console.error("Failed to generate hint:", error);
        }
      }

      const hintGuidance = `

## CURRENT STUDENT STATUS:

The student appears to be ${stuckStatus.level.replace('_', ' ')} (${stuckStatus.consecutiveStuckTurns} consecutive stuck turns).

**Recommended Action**: ${getHintLevelDescription(stuckStatus.recommendedHintLevel)}

${generatedHint ? `**Suggested Hint to Incorporate**: "${generatedHint}"

Incorporate this hint naturally into your Socratic questioning. Don't present it as a "hint" - weave it into your guiding questions.
` : ''}

Adjust your response accordingly:
- Level 1: Ask about the relevant concept or mathematical principle
- Level 2: Suggest which operation or method might help
- Level 3: Guide them toward the specific next step without solving it
- Level 4: Consider offering a simpler analogous problem they can solve first

Remember: NEVER solve the problem directly, even at higher hint levels.`;

      enhancedSystemPrompt = SOCRATIC_SYSTEM_PROMPT + hintGuidance;
    }

    // Add turn limit guidance to system prompt
    const turnLimitGuidance = formatTurnLimitForPrompt(turnLimitResult);
    if (turnLimitGuidance) {
      enhancedSystemPrompt += turnLimitGuidance;
    }

    // Prepare messages with enhanced system prompt
    const messagesWithSystem: CoreMessage[] = [
      {
        role: "system",
        content: enhancedSystemPrompt,
      },
      ...messages,
    ];

    // Check if compression should be applied
    let managedMessages: CoreMessage[];

    if (shouldCompressContext(messagesWithSystem, 15)) {
      // Use compression for long conversations
      console.log(`Compression triggered for conversation with ${messagesWithSystem.length} messages`);

      const compressionResult = await compressConversationContext(messagesWithSystem, {
        keepRecentTurns: MAX_CONVERSATION_TURNS,
        summarizeOlderTurns: true,
        keepSystemPrompt: true,
        compressionThreshold: 15,
      });

      managedMessages = compressionResult.messages;
      console.log(getCompressionStats(compressionResult));
    } else {
      // Use simple context management for shorter conversations
      managedMessages = manageConversationContext(messagesWithSystem, {
        maxTurns: MAX_CONVERSATION_TURNS,
        maxTokens: MAX_TOKENS - MAX_RESPONSE_TOKENS, // Reserve space for response
        keepSystemPrompt: true,
      });
    }

    // Pre-flight token check with enforcement
    const tokenCheck = checkTokenLimit(managedMessages, {
      hardLimit: MAX_TOKENS,
      softLimit: 3800,
      reservedForResponse: MAX_RESPONSE_TOKENS,
    });

    console.log(formatTokenBudget(tokenCheck.budget));

    // If token limit exceeded, attempt truncation
    if (!tokenCheck.allowed) {
      console.log(`Token limit exceeded: ${tokenCheck.tokenCount} tokens. Attempting truncation...`);

      const truncationResult = truncateToTokenBudget(
        managedMessages,
        MAX_TOKENS - MAX_RESPONSE_TOKENS,
        {
          keepSystemPrompt: true,
          keepFirstUserMessage: true,
          truncateFromOldest: true,
        }
      );

      managedMessages = truncationResult.messages;
      console.log(`Truncated ${truncationResult.removedCount} messages: ${truncationResult.originalTokens} → ${truncationResult.finalTokens} tokens`);

      // Re-check after truncation
      const recheckResult = checkTokenLimit(managedMessages, {
        hardLimit: MAX_TOKENS,
        softLimit: 3800,
        reservedForResponse: MAX_RESPONSE_TOKENS,
      });

      if (!recheckResult.allowed) {
        console.error(`Token limit still exceeded after truncation: ${recheckResult.tokenCount} tokens`);
        const error = createTokenLimitError(recheckResult.tokenCount, recheckResult.limit);

        return new Response(JSON.stringify(error), {
          status: 413, // Payload Too Large
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
    }

    // Log final token status
    const inputTokens = countTotalTokens(managedMessages);
    console.log(`Final token count: ${inputTokens} / ${MAX_TOKENS - MAX_RESPONSE_TOKENS}`);
    console.log(`Messages: ${managedMessages.length} (${messages.length} original)`);

    // Stream the response using Vercel AI SDK with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const result = await streamText({
        model: openai("gpt-4-turbo-preview"),
        messages: managedMessages,
        temperature: 0.7,
        maxOutputTokens: MAX_RESPONSE_TOKENS,
        abortSignal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Track cost (estimate output tokens as we can't get exact count from streaming)
      const estimatedOutputTokens = 500; // Conservative estimate
      const costRecord = createCostRecord(
        "gpt-4-turbo-preview",
        inputTokens,
        estimatedOutputTokens,
        "chat"
      );

      console.log(`API Call Cost: ${formatCost(costRecord.cost)} (${inputTokens} in + ~${estimatedOutputTokens} out tokens)`);

      // Check budget threshold
      const budgetCheck = checkBudgetThreshold(costRecord.cost, {
        warning: 0.10, // Warn at $0.10 per request
        critical: 0.50, // Critical at $0.50 per request
      });

      if (budgetCheck.status !== "ok") {
        console.warn(`Budget alert: ${budgetCheck.message}`);
      }

      // Add rate limit headers to response
      const response = result.toTextStreamResponse();
      const rateLimitHeaders = formatRateLimitHeaders(rateLimitResult);
      Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      // Add cost tracking header
      response.headers.set('X-Request-Cost', formatCost(costRecord.cost));

      return response;
    } catch (streamError: any) {
      clearTimeout(timeoutId);
      throw streamError;
    }
  } catch (error: any) {
    console.error("Chat API error:", error);

    // Parse error using error handler
    const apiError = parseAPIError(error);

    // Return error in text stream format that AI SDK can parse
    return new Response(apiError.message, {
      status: apiError.statusCode || 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}
