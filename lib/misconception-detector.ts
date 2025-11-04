/**
 * Misconception Detection System
 *
 * Identifies common mathematical misconceptions and errors in student responses
 * to provide targeted corrective feedback.
 */

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export type MisconceptionType =
  | "order-of-operations"
  | "sign-error"
  | "fraction-arithmetic"
  | "algebra-manipulation"
  | "unit-conversion"
  | "conceptual-misunderstanding"
  | "calculation-error"
  | "formula-misuse"
  | "geometric-property"
  | "none";

export interface Misconception {
  type: MisconceptionType;
  description: string;
  example?: string;
  correctiveGuidance: string;
  confidence: number; // 0-1
}

export interface ResponseAnalysis {
  isCorrect: boolean;
  isPartiallyCorrect: boolean;
  misconceptions: Misconception[];
  correctParts: string[];
  incorrectParts: string[];
  suggestedQuestion: string;
  reasoning: string;
}

/**
 * Analyzes a student's response for misconceptions
 */
export async function analyzeStudentResponse(
  studentResponse: string,
  problemContext: string,
  expectedConcepts?: string[]
): Promise<ResponseAnalysis> {
  // First try quick pattern matching
  const quickAnalysis = quickMisconceptionCheck(studentResponse);

  // If we find high-confidence misconceptions, we might not need GPT
  const hasHighConfidenceMisconception = quickAnalysis.some(m => m.confidence > 0.85);

  // Use GPT for deeper analysis
  try {
    const gptAnalysis = await analyzeWithGPT(studentResponse, problemContext, expectedConcepts);

    // Combine quick and GPT analyses
    const allMisconceptions = [
      ...quickAnalysis.filter(m => m.confidence > 0.6),
      ...gptAnalysis.misconceptions
    ];

    // Deduplicate misconceptions
    const uniqueMisconceptions = deduplicateMisconceptions(allMisconceptions);

    return {
      ...gptAnalysis,
      misconceptions: uniqueMisconceptions,
    };
  } catch (error) {
    console.error("Error analyzing with GPT:", error);

    // Fallback to quick analysis only
    return {
      isCorrect: false,
      isPartiallyCorrect: quickAnalysis.length === 0,
      misconceptions: quickAnalysis,
      correctParts: [],
      incorrectParts: [studentResponse],
      suggestedQuestion: "Can you walk me through your thinking?",
      reasoning: "Quick pattern-based analysis only",
    };
  }
}

/**
 * Quick pattern-based misconception detection
 */
function quickMisconceptionCheck(response: string): Misconception[] {
  const misconceptions: Misconception[] = [];
  const text = response.toLowerCase();

  // Pattern 1: Common PEMDAS errors
  if (/(add|subtract).*(before|first).*(multiply|divide)/i.test(response)) {
    misconceptions.push({
      type: "order-of-operations",
      description: "Possible order of operations error (PEMDAS)",
      correctiveGuidance: "Remember PEMDAS: Parentheses, Exponents, Multiplication/Division (left to right), Addition/Subtraction (left to right)",
      confidence: 0.7,
    });
  }

  // Pattern 2: Sign errors (negative + negative = positive, etc.)
  if (/(negative.*negative.*positive)|(minus.*minus.*plus)/i.test(response)) {
    misconceptions.push({
      type: "sign-error",
      description: "Possible sign error with negative numbers",
      example: "Remember: -3 + (-5) = -8, not +8",
      correctiveGuidance: "When adding two negative numbers, the result is more negative",
      confidence: 0.75,
    });
  }

  // Pattern 3: Fraction multiplication confusion
  if (/(multiply.*fraction.*add)|(cross.*multiply.*wrong)/i.test(response)) {
    misconceptions.push({
      type: "fraction-arithmetic",
      description: "Possible confusion with fraction operations",
      correctiveGuidance: "To multiply fractions, multiply numerators together and denominators together. Don't cross-multiply unless solving proportions.",
      confidence: 0.65,
    });
  }

  // Pattern 4: Distributing incorrectly
  if (/(distribute|expand).*\(.*\+.*\)/i.test(response) && /forgot/i.test(text)) {
    misconceptions.push({
      type: "algebra-manipulation",
      description: "Possible distribution error",
      example: "a(b + c) = ab + ac, not ab + c",
      correctiveGuidance: "When distributing, multiply the outside term by EACH term inside the parentheses",
      confidence: 0.7,
    });
  }

  return misconceptions;
}

/**
 * Deep analysis using GPT-4
 */
async function analyzeWithGPT(
  studentResponse: string,
  problemContext: string,
  expectedConcepts?: string[]
): Promise<ResponseAnalysis> {
  const prompt = buildAnalysisPrompt(studentResponse, problemContext, expectedConcepts);

  const { text } = await generateText({
    model: openai("gpt-4o-mini"), // Use mini for faster analysis
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return parseAnalysisResponse(text);
}

/**
 * Builds the analysis prompt
 */
function buildAnalysisPrompt(
  studentResponse: string,
  problemContext: string,
  expectedConcepts?: string[]
): string {
  return `You are a math tutor analyzing a student's response for misconceptions and errors.

Problem Context: ${problemContext}
${expectedConcepts ? `Expected Concepts: ${expectedConcepts.join(', ')}` : ''}

Student's Response: "${studentResponse}"

Analyze this response and identify:
1. Is it correct, partially correct, or incorrect?
2. What specific misconceptions or errors are present?
3. What parts (if any) are correct?
4. What Socratic question would help guide the student?

Common misconceptions to look for:
- Order of operations (PEMDAS) errors
- Sign errors with negative numbers
- Fraction arithmetic confusion
- Incorrect algebraic manipulation
- Unit conversion errors
- Conceptual misunderstandings
- Calculation mistakes
- Formula misuse

Return your analysis in this EXACT JSON format:
{
  "isCorrect": false,
  "isPartiallyCorrect": true,
  "misconceptions": [
    {
      "type": "order-of-operations",
      "description": "Student added before multiplying",
      "correctiveGuidance": "Remember to follow PEMDAS",
      "confidence": 0.9
    }
  ],
  "correctParts": ["recognized the variable", "set up equation correctly"],
  "incorrectParts": ["wrong order of operations"],
  "suggestedQuestion": "What operation should you do first according to PEMDAS?",
  "reasoning": "Student has the right idea but applied operations in wrong order"
}`;
}

/**
 * Parses GPT response into ResponseAnalysis
 */
function parseAnalysisResponse(text: string): ResponseAnalysis {
  try {
    // Remove markdown code blocks
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```(?:json)?\s*\n/, "");
      cleanedText = cleanedText.replace(/\n```\s*$/, "");
    }

    const parsed = JSON.parse(cleanedText);

    return {
      isCorrect: parsed.isCorrect || false,
      isPartiallyCorrect: parsed.isPartiallyCorrect || false,
      misconceptions: Array.isArray(parsed.misconceptions)
        ? parsed.misconceptions.map((m: any) => ({
            type: m.type || "conceptual-misunderstanding",
            description: m.description || "Unknown error",
            example: m.example,
            correctiveGuidance: m.correctiveGuidance || "Let's think about this differently",
            confidence: m.confidence || 0.5,
          }))
        : [],
      correctParts: Array.isArray(parsed.correctParts) ? parsed.correctParts : [],
      incorrectParts: Array.isArray(parsed.incorrectParts) ? parsed.incorrectParts : [],
      suggestedQuestion: parsed.suggestedQuestion || "Can you explain your thinking?",
      reasoning: parsed.reasoning || "Analysis complete",
    };
  } catch (error) {
    console.error("Failed to parse analysis response:", error);

    return {
      isCorrect: false,
      isPartiallyCorrect: false,
      misconceptions: [],
      correctParts: [],
      incorrectParts: [],
      suggestedQuestion: "Can you walk me through your approach?",
      reasoning: "Failed to parse analysis",
    };
  }
}

/**
 * Removes duplicate misconceptions
 */
function deduplicateMisconceptions(misconceptions: Misconception[]): Misconception[] {
  const seen = new Set<string>();
  const unique: Misconception[] = [];

  for (const misconception of misconceptions) {
    const key = `${misconception.type}-${misconception.description}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(misconception);
    }
  }

  // Sort by confidence (highest first)
  return unique.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Gets a human-readable description of a misconception type
 */
export function getMisconceptionDescription(type: MisconceptionType): string {
  const descriptions: Record<MisconceptionType, string> = {
    "order-of-operations": "Order of Operations (PEMDAS)",
    "sign-error": "Sign Error with Negative Numbers",
    "fraction-arithmetic": "Fraction Arithmetic Confusion",
    "algebra-manipulation": "Algebraic Manipulation Error",
    "unit-conversion": "Unit Conversion Mistake",
    "conceptual-misunderstanding": "Conceptual Misunderstanding",
    "calculation-error": "Calculation Mistake",
    "formula-misuse": "Formula Applied Incorrectly",
    "geometric-property": "Geometric Property Misunderstanding",
    "none": "No Misconception Detected",
  };

  return descriptions[type] || "Unknown Misconception";
}

/**
 * Formats analysis for inclusion in system prompt
 */
export function formatAnalysisForPrompt(analysis: ResponseAnalysis): string {
  if (analysis.isCorrect) {
    return `✓ Student's response is CORRECT. Acknowledge this and guide them to the next step.`;
  }

  let formatted = `## RESPONSE ANALYSIS:\n\n`;

  if (analysis.isPartiallyCorrect) {
    formatted += `**Status**: Partially correct\n`;
    if (analysis.correctParts.length > 0) {
      formatted += `**What's right**: ${analysis.correctParts.join(', ')}\n`;
    }
  } else {
    formatted += `**Status**: Incorrect\n`;
  }

  if (analysis.misconceptions.length > 0) {
    formatted += `\n**Identified Misconceptions**:\n`;
    analysis.misconceptions.forEach((m, i) => {
      formatted += `${i + 1}. ${getMisconceptionDescription(m.type)}: ${m.description}\n`;
      formatted += `   Guidance: ${m.correctiveGuidance}\n`;
    });
  }

  formatted += `\n**Suggested Question**: ${analysis.suggestedQuestion}\n`;
  formatted += `\nUse this analysis to ask guiding questions that help the student recognize and correct their error.`;

  return formatted;
}
