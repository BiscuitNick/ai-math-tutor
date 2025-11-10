/**
 * Practice Problem Generator
 *
 * Generates similar problems at the same or higher difficulty level
 * for students to practice after successfully solving a problem.
 */

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export type DifficultyLevel = "same" | "harder";

export interface PracticeProblem {
  originalProblem: string;
  practiceProblem: string;
  difficultyLevel: DifficultyLevel;
  solution?: {
    steps: string[];
    finalAnswer: string;
    hints?: string[];
  };
  problemType?: string;
  timestamp: Date;
}

export interface GeneratePracticeRequest {
  originalProblem: string;
  problemType?: string;
  difficulty: DifficultyLevel;
}

/**
 * Generates a practice problem based on a completed problem
 */
export async function generatePracticeProblem(
  request: GeneratePracticeRequest
): Promise<PracticeProblem> {
  const { originalProblem, problemType = "unknown", difficulty } = request;

  const prompt = buildPracticeGenerationPrompt(originalProblem, problemType, difficulty);

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
          content: `Generate a ${difficulty === "same" ? "similar" : "more challenging"} practice problem for: ${originalProblem}`,
        },
      ],
      temperature: 0.7, // Higher creativity for varied problems
    });

    // Parse the response
    const practice = parsePracticeResponse(text, originalProblem, difficulty, problemType);
    return practice;
  } catch (error) {
    console.error("Error generating practice problem:", error);

    // Fallback to a generic practice problem
    return {
      originalProblem,
      practiceProblem: `Try solving a similar problem using the same approach you just learned.`,
      difficultyLevel: difficulty,
      problemType,
      timestamp: new Date(),
    };
  }
}

/**
 * Builds the prompt for practice problem generation
 */
function buildPracticeGenerationPrompt(
  originalProblem: string,
  problemType: string,
  difficulty: DifficultyLevel
): string {
  const difficultyInstruction = difficulty === "same"
    ? "CREATE A SIMILAR problem at the SAME difficulty level with DIFFERENT numbers/values"
    : "CREATE A MORE CHALLENGING problem that builds upon the same concepts but requires additional steps or complexity";

  return `You are a math tutor creating a practice problem for a student who just successfully solved a problem.

ORIGINAL PROBLEM SOLVED: ${originalProblem}
PROBLEM TYPE: ${problemType}
DIFFICULTY REQUESTED: ${difficulty}

Your task: ${difficultyInstruction}

REQUIREMENTS:
1. Use the SAME mathematical concept/technique as the original
2. Use DIFFERENT numbers, variables, or scenarios
3. Make it interesting and engaging
4. ${difficulty === "same" ? "Keep similar complexity and number of steps" : "Add one or two additional steps or complications"}
5. Ensure it has a clear, definite answer
6. DO provide a complete solution (student can check their work)

${difficulty === "harder" ? `WAYS TO INCREASE DIFFICULTY:
- Use larger or more complex numbers
- Add an extra step to the solution process
- Combine multiple concepts
- Use more variables
- Require more algebraic manipulation
- Add a real-world context that requires interpretation` : ""}

Return your response in this EXACT JSON format:
{
  "practiceProblem": "A clear statement of the new practice problem",
  "steps": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ..."
  ],
  "finalAnswer": "The correct answer to the practice problem",
  "hints": [
    "Hint 1: A subtle hint if they get stuck",
    "Hint 2: A more direct hint"
  ]
}

Example for original "Solve 2x + 5 = 13" with difficulty="same":
{
  "practiceProblem": "Solve 3x + 7 = 19",
  "steps": [
    "Step 1: Subtract 7 from both sides: 3x = 12",
    "Step 2: Divide both sides by 3: x = 4"
  ],
  "finalAnswer": "x = 4",
  "hints": [
    "Start by isolating the term with x",
    "Use inverse operations - what's the opposite of adding 7?"
  ]
}

Example for original "Solve 2x + 5 = 13" with difficulty="harder":
{
  "practiceProblem": "Solve 4(x - 3) + 7 = 23",
  "steps": [
    "Step 1: Expand: 4x - 12 + 7 = 23",
    "Step 2: Combine like terms: 4x - 5 = 23",
    "Step 3: Add 5 to both sides: 4x = 28",
    "Step 4: Divide both sides by 4: x = 7"
  ],
  "finalAnswer": "x = 7",
  "hints": [
    "Remember to distribute the 4 first",
    "Combine constants before isolating x"
  ]
}

Now generate the practice problem.`;
}

/**
 * Parses the AI response into a PracticeProblem
 */
function parsePracticeResponse(
  text: string,
  originalProblem: string,
  difficulty: DifficultyLevel,
  problemType?: string
): PracticeProblem {
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
      practiceProblem: parsed.practiceProblem || "Try a similar problem",
      difficultyLevel: difficulty,
      solution: {
        steps: Array.isArray(parsed.steps) ? parsed.steps : [],
        finalAnswer: parsed.finalAnswer || "Complete the problem to find out!",
        hints: Array.isArray(parsed.hints) ? parsed.hints : [],
      },
      problemType,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Failed to parse practice response:", error);
    console.log("Raw response:", text);

    // Fallback
    return {
      originalProblem,
      practiceProblem: "Try solving a similar problem using what you learned.",
      difficultyLevel: difficulty,
      problemType,
      timestamp: new Date(),
    };
  }
}

/**
 * Formats practice problem for display (without showing the solution)
 */
export function formatPracticeForChat(practice: PracticeProblem): string {
  return `## 🎯 Practice Problem

Ready to reinforce what you learned? Here's ${practice.difficultyLevel === "same" ? "a similar problem" : "a more challenging problem"}:

**${practice.practiceProblem}**

Give it a try! I'm here if you need help.`;
}

/**
 * Formats the solution for a practice problem
 */
export function formatPracticeSolution(practice: PracticeProblem): string {
  if (!practice.solution) {
    return "Solution not available.";
  }

  const stepsText = practice.solution.steps
    .map((step, index) => `${index + 1}. ${step}`)
    .join("\n");

  return `## Solution

${stepsText}

**Answer**: ${practice.solution.finalAnswer}`;
}
