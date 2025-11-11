"use server";

/**
 * Server Action for parsing math problems from images using OpenAI Vision API
 */

import { createHash } from "crypto";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  ParseImageActionResult,
  ParsedImage,
  CachedParsedImage,
} from "@/lib/types/parsed-image";

// Configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const CACHE_TTL_DAYS = 30;

/**
 * Validate image file from FormData
 */
function validateImageFile(file: File | null): {
  valid: boolean;
  error?: string;
} {
  if (!file) {
    return { valid: false, error: "No image file provided" };
  }

  // Check file type
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Only JPG, PNG, and WEBP images are accepted.",
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

/**
 * Convert File to base64 string
 */
async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString("base64");
}

/**
 * Generate hash for image content (for caching)
 */
function generateImageHash(base64Image: string): string {
  return createHash("sha256").update(base64Image).digest("hex");
}

/**
 * Check cache for previously parsed image
 */
async function checkCache(imageHash: string): Promise<ParsedImage | null> {
  try {
    const cacheRef = doc(db, "parsed_images", imageHash);
    const cacheDoc = await getDoc(cacheRef);

    if (!cacheDoc.exists()) {
      return null;
    }

    const cachedData = cacheDoc.data() as {
      extractedText: string;
      confidenceScore: number;
      timestamp: Timestamp;
      problemBoundaries?: ParsedImage["problemBoundaries"];
    };

    // Check if cache is still valid (within TTL)
    const cacheAge =
      (Date.now() - cachedData.timestamp.toMillis()) / (1000 * 60 * 60 * 24);

    if (cacheAge > CACHE_TTL_DAYS) {
      return null; // Cache expired
    }

    return {
      extractedText: cachedData.extractedText,
      confidenceScore: cachedData.confidenceScore,
      problemBoundaries: cachedData.problemBoundaries,
      metadata: {
        cacheHit: true,
        imageHash,
      },
    };
  } catch (error) {
    console.error("Error checking cache:", error);
    return null; // Fail gracefully, proceed without cache
  }
}

/**
 * Store parsed result in cache
 */
async function storeInCache(
  imageHash: string,
  parsedImage: ParsedImage
): Promise<void> {
  try {
    const cacheRef = doc(db, "parsed_images", imageHash);
    await setDoc(cacheRef, {
      extractedText: parsedImage.extractedText,
      confidenceScore: parsedImage.confidenceScore,
      problemBoundaries: parsedImage.problemBoundaries,
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error storing in cache:", error);
    // Fail gracefully, don't throw
  }
}

/**
 * Parse image using OpenAI Vision API with Vercel AI SDK
 */
async function parseImageWithVision(
  base64Image: string,
  mimeType: string
): Promise<{ success: boolean; data?: ParsedImage; error?: string }> {
  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    return {
      success: false,
      error: "OpenAI API key is not configured",
    };
  }

  try {
    const startTime = Date.now();

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const { text } = await generateText({
        model: openai("gpt-4o"),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a math problem extraction assistant. Analyze this image and extract any mathematical problems, equations, or exercises visible in it.

Please provide:
1. The exact mathematical problem text (preserve all symbols, numbers, and formatting)
2. If there are multiple problems, number them and extract each one
3. A confidence score (0-100) indicating how clearly you could read the text

Format your response as JSON with this structure:
{
  "problems": ["problem 1 text", "problem 2 text", ...],
  "confidence": <0-100>,
  "notes": "any relevant observations about image quality or formatting"
}`,
              },
              {
                type: "image",
                image: `data:${mimeType};base64,${base64Image}`,
              },
            ],
          },
        ],
        abortSignal: controller.signal,
      });

      clearTimeout(timeoutId);

      const processingTime = Date.now() - startTime;

      if (!text) {
        return {
          success: false,
          error: "No response from Vision API",
        };
      }

      // Parse the JSON response
      let parsedResponse: {
        problems: string[];
        confidence: number;
        notes?: string;
      };

      try {
        // Remove markdown code blocks if present
        let cleanedText = text.trim();
        if (cleanedText.startsWith("```")) {
          // Remove ```json or ``` from start
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n/, "");
          // Remove closing ```
          cleanedText = cleanedText.replace(/\n```\s*$/, "");
        }

        parsedResponse = JSON.parse(cleanedText);
      } catch {
        // If not JSON, treat entire response as single problem
        parsedResponse = {
          problems: [text],
          confidence: 70, // Lower confidence for non-structured response
        };
      }

      const hasMultipleProblems = parsedResponse.problems.length > 1;
      const extractedText = hasMultipleProblems
        ? parsedResponse.problems.join("\n\n")
        : parsedResponse.problems[0] || "";

      const result: ParsedImage = {
        extractedText,
        confidenceScore: parsedResponse.confidence / 100, // Convert to 0-1 scale
        problemBoundaries: {
          hasMultipleProblems,
          problemNumber: parsedResponse.problems.length,
          problems: parsedResponse.problems,
        },
        metadata: {
          cacheHit: false,
          processingTime,
        },
      };

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        return {
          success: false,
          error: "Request timed out. Please try again with a clearer image.",
        };
      }

      throw error;
    }
  } catch (error: any) {
    console.error("Vision API error:", error);

    return {
      success: false,
      error:
        error.message || "Failed to parse image. Please try again.",
    };
  }
}

/**
 * Main Server Action to parse image
 */
export async function parseImageAction(
  formData: FormData
): Promise<ParseImageActionResult> {
  try {
    // Extract file from FormData
    const file = formData.get("image") as File | null;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Convert to base64
    const base64Image = await fileToBase64(file!);
    const imageHash = generateImageHash(base64Image);

    // Check cache first
    const cachedResult = await checkCache(imageHash);
    if (cachedResult) {
      return {
        success: true,
        data: cachedResult,
      };
    }

    // Parse with Vision API
    const result = await parseImageWithVision(base64Image, file!.type);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    // Add image hash to metadata
    if (result.data) {
      result.data.metadata = {
        ...result.data.metadata,
        imageHash,
      };

      // Store in cache
      await storeInCache(imageHash, result.data);
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    console.error("Error in parseImageAction:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while parsing the image",
    };
  }
}
