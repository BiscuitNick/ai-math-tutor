/**
 * Problem Type Detection
 *
 * Automatically classifies math problems into categories to enable
 * tailored Socratic questioning and hint strategies.
 */

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export type ProblemType =
  | "algebra"
  | "geometry"
  | "word-problem"
  | "calculus"
  | "statistics"
  | "trigonometry"
  | "arithmetic"
  | "linear-algebra"
  | "other";

export interface ProblemTypeResult {
  primaryType: ProblemType;
  secondaryTypes: ProblemType[];
  confidence: number; // 0-1
  keywords: string[];
  suggestedApproach: string;
  reasoning: string;
}

/**
 * Detects the type of a math problem using GPT-4 analysis
 */
export async function detectProblemType(problemText: string): Promise<ProblemTypeResult> {
  // First try quick rule-based detection
  const quickDetection = quickDetectProblemType(problemText);

  // If confidence is high enough, use quick detection
  if (quickDetection.confidence > 0.8) {
    return quickDetection;
  }

  // Otherwise, use GPT-4 for more accurate detection
  try {
    const result = await detectProblemTypeWithGPT(problemText);
    return result;
  } catch (error) {
    console.error("Error detecting problem type with GPT:", error);
    // Fall back to quick detection
    return quickDetection;
  }
}

/**
 * Quick rule-based problem type detection using keywords and patterns
 */
function quickDetectProblemType(problemText: string): ProblemTypeResult {
  const text = problemText.toLowerCase();

  // Keyword patterns for different problem types
  const patterns: Record<ProblemType, { keywords: string[]; weight: number }> = {
    "algebra": {
      keywords: ["solve", "equation", "variable", "x =", "simplify", "factor", "expand", "polynomial"],
      weight: 1
    },
    "geometry": {
      keywords: ["triangle", "circle", "square", "rectangle", "area", "perimeter", "angle", "volume", "radius", "diameter"],
      weight: 1
    },
    "word-problem": {
      keywords: ["john has", "mary bought", "train", "car", "speed", "distance", "total cost", "how many", "how much"],
      weight: 1
    },
    "calculus": {
      keywords: ["derivative", "integral", "limit", "dx", "dy", "rate of change", "slope of tangent", "optimization"],
      weight: 1
    },
    "statistics": {
      keywords: ["probability", "mean", "median", "mode", "standard deviation", "variance", "distribution", "sample"],
      weight: 1
    },
    "trigonometry": {
      keywords: ["sin", "cos", "tan", "sine", "cosine", "tangent", "theta", "angle", "radians", "degrees"],
      weight: 1
    },
    "arithmetic": {
      keywords: ["add", "subtract", "multiply", "divide", "sum", "difference", "product", "quotient"],
      weight: 0.8
    },
    "linear-algebra": {
      keywords: ["matrix", "vector", "determinant", "eigenvalue", "eigenvector", "dot product", "cross product"],
      weight: 1
    },
    "other": {
      keywords: [],
      weight: 0.5
    }
  };

  const scores: Partial<Record<ProblemType, number>> = {};
  const matchedKeywords: string[] = [];

  // Calculate scores based on keyword matches
  for (const [type, { keywords, weight }] of Object.entries(patterns)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score += weight;
        matchedKeywords.push(keyword);
      }
    }
    if (score > 0) {
      scores[type as ProblemType] = score;
    }
  }

  // Sort types by score
  const sortedTypes = Object.entries(scores)
    .sort(([, a], [, b]) => (b || 0) - (a || 0))
    .map(([type]) => type as ProblemType);

  const primaryType = sortedTypes[0] || "other";
  const secondaryTypes = sortedTypes.slice(1, 3);
  const maxScore = scores[primaryType] || 0;

  // Calculate confidence based on score
  const confidence = Math.min(maxScore / 3, 0.85); // Cap at 0.85 for rule-based

  return {
    primaryType,
    secondaryTypes,
    confidence,
    keywords: matchedKeywords,
    suggestedApproach: getSuggestedApproach(primaryType),
    reasoning: `Quick detection based on ${matchedKeywords.length} keyword matches`,
  };
}

/**
 * More accurate problem type detection using GPT-4
 */
async function detectProblemTypeWithGPT(problemText: string): Promise<ProblemTypeResult> {
  const prompt = `You are a math problem classifier. Analyze this math problem and classify it into one or more categories.

Problem: ${problemText}

Available categories:
- algebra: Equations, variables, solving for x, factoring, polynomials
- geometry: Shapes, areas, perimeters, volumes, angles, spatial reasoning
- word-problem: Real-world scenarios requiring mathematical modeling
- calculus: Derivatives, integrals, limits, rates of change
- statistics: Probability, data analysis, distributions, statistics
- trigonometry: Sine, cosine, tangent, angles, triangles
- arithmetic: Basic operations (addition, subtraction, multiplication, division)
- linear-algebra: Matrices, vectors, linear transformations
- other: Problems that don't fit the above categories

Return your analysis in this EXACT JSON format:
{
  "primaryType": "the main category",
  "secondaryTypes": ["any additional relevant categories"],
  "confidence": 0.95,
  "keywords": ["key", "words", "found"],
  "suggestedApproach": "Brief suggestion for how to approach this type of problem",
  "reasoning": "Why you chose this classification"
}`;

  const { text } = await generateText({
    model: openai("gpt-4o-mini"), // Use mini for faster/cheaper classification
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return parseProblemTypeResponse(text);
}

/**
 * Parses GPT response into ProblemTypeResult
 */
function parseProblemTypeResponse(text: string): ProblemTypeResult {
  try {
    // Remove markdown code blocks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```(?:json)?\s*\n/, "");
      cleanedText = cleanedText.replace(/\n```\s*$/, "");
    }

    const parsed = JSON.parse(cleanedText);

    return {
      primaryType: parsed.primaryType || "other",
      secondaryTypes: Array.isArray(parsed.secondaryTypes) ? parsed.secondaryTypes : [],
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      suggestedApproach: parsed.suggestedApproach || getSuggestedApproach(parsed.primaryType),
      reasoning: parsed.reasoning || "Classified by AI",
    };
  } catch (error) {
    console.error("Failed to parse problem type response:", error);

    // Fallback
    return {
      primaryType: "other",
      secondaryTypes: [],
      confidence: 0.5,
      keywords: [],
      suggestedApproach: "Break down the problem and solve step by step",
      reasoning: "Failed to parse classification",
    };
  }
}

/**
 * Gets suggested approach for a problem type
 */
function getSuggestedApproach(type: ProblemType): string {
  const approaches: Record<ProblemType, string> = {
    "algebra": "Identify the variable, use inverse operations to isolate it",
    "geometry": "Draw a diagram, identify given information and what you need to find, apply relevant formulas",
    "word-problem": "Identify what you know and what you need to find, translate words into mathematical expressions",
    "calculus": "Identify what type of problem (derivative/integral/limit), apply relevant rules and formulas",
    "statistics": "Organize the data, identify what statistic you need, apply the appropriate formula",
    "trigonometry": "Draw a triangle if applicable, identify known angles/sides, apply trig ratios",
    "arithmetic": "Follow order of operations (PEMDAS), work step by step",
    "linear-algebra": "Set up the matrix/vector equation, apply appropriate operations",
    "other": "Break down the problem into smaller parts, solve each part systematically",
  };

  return approaches[type] || approaches.other;
}

/**
 * Gets Socratic question templates for a problem type
 */
export function getSocraticQuestions(type: ProblemType): string[] {
  const questions: Record<ProblemType, string[]> = {
    "algebra": [
      "What are you trying to solve for?",
      "What operation is being applied to the variable?",
      "What's the inverse operation you could use?",
      "Can you simplify either side of the equation first?",
    ],
    "geometry": [
      "What shape or shapes are we working with?",
      "What information are you given?",
      "What formula applies to this shape?",
      "Can you draw a diagram to visualize this?",
    ],
    "word-problem": [
      "What information does the problem give you?",
      "What is the problem asking you to find?",
      "Can you translate this into a mathematical equation?",
      "What operation connects these quantities?",
    ],
    "calculus": [
      "Are you finding a derivative, integral, or limit?",
      "What rule or technique applies here?",
      "What is the rate of change in this problem?",
      "Can you identify the function you're working with?",
    ],
    "statistics": [
      "What type of data are you analyzing?",
      "Which statistical measure are you calculating?",
      "Do you have all the values you need?",
      "What does this statistic tell us about the data?",
    ],
    "trigonometry": [
      "What angle are you working with?",
      "Which sides of the triangle do you know?",
      "Which trig ratio relates these quantities?",
      "Is the angle in degrees or radians?",
    ],
    "arithmetic": [
      "What operation should you do first (PEMDAS)?",
      "Can you simplify any part of this expression?",
      "What do you get when you calculate this step?",
    ],
    "linear-algebra": [
      "What are the dimensions of this matrix/vector?",
      "What operation are you performing?",
      "Can you set this up as a matrix equation?",
    ],
    "other": [
      "What information do you have?",
      "What are you trying to find?",
      "What mathematical concept might apply here?",
      "Can you break this into smaller steps?",
    ],
  };

  return questions[type] || questions.other;
}

/**
 * Cache for problem type detection to avoid repeated API calls
 */
const problemTypeCache = new Map<string, ProblemTypeResult>();

/**
 * Detects problem type with caching
 */
export async function detectProblemTypeWithCache(problemText: string): Promise<ProblemTypeResult> {
  // Simple cache key (first 100 chars)
  const cacheKey = problemText.slice(0, 100);

  if (problemTypeCache.has(cacheKey)) {
    return problemTypeCache.get(cacheKey)!;
  }

  const result = await detectProblemType(problemText);
  problemTypeCache.set(cacheKey, result);

  return result;
}
