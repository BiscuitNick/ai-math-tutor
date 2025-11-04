/**
 * Example Problem Generator
 *
 * Generates similar but simpler problems with step-by-step solutions
 * to help severely stuck students understand the approach.
 */

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export interface ExampleProblem {
  originalProblem: string;
  simplifiedProblem: string;
  solution: {
    steps: string[];
    finalAnswer: string;
    explanation: string;
  };
  howToApply: string; // Guidance on applying this to original problem
  timestamp: Date;
}

export interface GenerateExampleRequest {
  originalProblem: string;
  problemType?: string;
  studentLevel?: "beginner" | "intermediate" | "advanced";
}

/**
 * Generates a similar but simpler example problem with full solution
 */
export async function generateExampleProblem(
  request: GenerateExampleRequest
): Promise<ExampleProblem> {
  const { originalProblem, problemType = "unknown", studentLevel = "intermediate" } = request;

  const prompt = buildExampleGenerationPrompt(originalProblem, problemType, studentLevel);

  try {
    const { text } = await generateText({
      model: openai("gpt-4o"),
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: `Generate a simpler example problem for: ${originalProblem}`,
        },
      ],
    });

    // Parse the response
    const example = parseExampleResponse(text, originalProblem);
    return example;
  } catch (error) {
    console.error("Error generating example problem:", error);

    // Fallback to a generic example structure
    return {
      originalProblem,
      simplifiedProblem: "Let's try a simpler version of this problem first.",
      solution: {
        steps: [
          "Break down the problem into smaller parts",
          "Solve each part step by step",
          "Combine the results",
        ],
        finalAnswer: "Work through each step carefully",
        explanation: "The approach is the same, just with simpler numbers",
      },
      howToApply: "Use the same method but with the numbers from your original problem",
      timestamp: new Date(),
    };
  }
}

/**
 * Builds the prompt for example problem generation
 */
function buildExampleGenerationPrompt(
  originalProblem: string,
  problemType: string,
  studentLevel: string
): string {
  return `You are a math tutor creating a SIMPLER, ANALOGOUS problem to help a ${studentLevel} student understand the approach to solve their original problem.

Original Problem: ${originalProblem}
Problem Type: ${problemType}

Your task is to create a DIFFERENT problem that:
1. Uses the SAME mathematical concept/technique
2. Is SIMPLER (smaller numbers, fewer steps, less complexity)
3. Is EASY ENOUGH for the student to solve with guidance
4. Demonstrates the EXACT SAME approach that applies to the original

CRITICAL RULES:
- DO NOT solve the original problem
- DO NOT use the same numbers from the original problem
- DO create a structurally similar but simpler problem
- DO provide a complete step-by-step solution for YOUR simpler problem
- DO explain how this approach applies to the original problem

Return your response in this EXACT JSON format:
{
  "simplifiedProblem": "A clear statement of the simpler problem",
  "steps": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ..."
  ],
  "finalAnswer": "The final answer to the simpler problem",
  "explanation": "Why this approach works and what concept it demonstrates",
  "howToApply": "Specific guidance on applying this same approach to the original problem"
}

Example for "Solve 3x + 15 = 42":
{
  "simplifiedProblem": "Solve x + 2 = 5",
  "steps": [
    "Step 1: We want x by itself, so subtract 2 from both sides",
    "Step 2: x + 2 - 2 = 5 - 2",
    "Step 3: x = 3"
  ],
  "finalAnswer": "x = 3",
  "explanation": "We used inverse operations to isolate x. Addition is reversed by subtraction.",
  "howToApply": "Your problem has 3x + 15 = 42. First subtract 15 from both sides (like we subtracted 2), then divide by 3 to get x alone."
}

Now generate a simpler analogous problem for the student's original problem.`;
}

/**
 * Parses the GPT-4 response into an ExampleProblem structure
 */
function parseExampleResponse(text: string, originalProblem: string): ExampleProblem {
  try {
    // Remove markdown code blocks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```(?:json)?\s*\n/, "");
      cleanedText = cleanedText.replace(/\n```\s*$/, "");
    }

    const parsed = JSON.parse(cleanedText);

    return {
      originalProblem,
      simplifiedProblem: parsed.simplifiedProblem || "Simpler version of the problem",
      solution: {
        steps: Array.isArray(parsed.steps) ? parsed.steps : ["Step 1: Solve systematically"],
        finalAnswer: parsed.finalAnswer || "Solution",
        explanation: parsed.explanation || "This demonstrates the same approach",
      },
      howToApply: parsed.howToApply || "Apply the same method to your problem",
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Failed to parse example response:", error);
    console.log("Raw response:", text);

    // Try to extract information manually if JSON parsing fails
    return {
      originalProblem,
      simplifiedProblem: extractSimplifiedProblem(text),
      solution: {
        steps: extractSteps(text),
        finalAnswer: extractFinalAnswer(text),
        explanation: "Follow the steps shown above",
      },
      howToApply: "Use the same approach with your original problem",
      timestamp: new Date(),
    };
  }
}

/**
 * Helper functions to extract information when JSON parsing fails
 */
function extractSimplifiedProblem(text: string): string {
  const match = text.match(/simplified[Pp]roblem["\s:]+([^"}\n]+)/);
  return match ? match[1].trim() : "Let's solve a simpler version first";
}

function extractSteps(text: string): string[] {
  const stepMatches = text.match(/[Ss]tep \d+[:\s]+([^\n]+)/g);
  if (stepMatches) {
    return stepMatches.map(s => s.trim());
  }
  return ["Break down the problem", "Solve step by step", "Check your answer"];
}

function extractFinalAnswer(text: string): string {
  const match = text.match(/final[Aa]nswer["\s:]+([^"}\n]+)/);
  return match ? match[1].trim() : "Work through the steps";
}

/**
 * Formats an example problem for display in the chat
 */
export function formatExampleForChat(example: ExampleProblem): string {
  const stepsText = example.solution.steps
    .map((step, index) => `${index + 1}. ${step}`)
    .join("\n");

  return `Let's try a simpler problem first to understand the approach:

**Problem**: ${example.simplifiedProblem}

**Solution**:
${stepsText}

**Answer**: ${example.solution.finalAnswer}

**Why this works**: ${example.solution.explanation}

**Now for your problem**: ${example.howToApply}

Can you try applying this same approach to your original problem?`;
}

/**
 * Generates multiple example problems of increasing difficulty
 */
export async function generateProgressiveExamples(
  originalProblem: string,
  count: number = 2
): Promise<ExampleProblem[]> {
  const examples: ExampleProblem[] = [];

  // Generate examples with different complexity levels
  const levels: Array<"beginner" | "intermediate"> = count >= 2
    ? ["beginner", "intermediate"]
    : ["beginner"];

  for (const level of levels.slice(0, count)) {
    try {
      const example = await generateExampleProblem({
        originalProblem,
        studentLevel: level,
      });
      examples.push(example);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to generate ${level} example:`, error);
    }
  }

  return examples;
}
