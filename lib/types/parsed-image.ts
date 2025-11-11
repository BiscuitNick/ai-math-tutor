/**
 * Type definitions for image parsing results
 */

export interface ParsedImage {
  extractedText: string;
  confidenceScore: number; // 0-1
  problemBoundaries?: {
    problemNumber?: number;
    hasMultipleProblems: boolean;
    problems?: string[];
  };
  metadata?: {
    cacheHit?: boolean;
    processingTime?: number;
    imageHash?: string;
  };
}

export interface ParseImageActionResult {
  success: boolean;
  data?: ParsedImage;
  error?: string;
}

export interface CachedParsedImage {
  imageHash: string;
  extractedText: string;
  confidenceScore: number;
  timestamp: Date;
  problemBoundaries?: ParsedImage["problemBoundaries"];
}
