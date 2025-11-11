/**
 * Utility for detecting and parsing mathematical expressions in text
 * Converts plain text math notation to LaTeX format for KaTeX rendering
 */

export interface MathSegment {
  type: "text" | "inline-math" | "display-math";
  content: string;
}

/**
 * Parse text and identify LaTeX math expressions
 * Supports:
 * - $...$ for inline math
 * - $$...$$ for display math
 * - \[...\] for display math (alternative)
 * - \(...\) for inline math (alternative)
 */
export function parseTextForMath(text: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let currentIndex = 0;

  // Regex patterns for different LaTeX delimiters
  // Order matters: Check display mode before inline mode
  const patterns = [
    { regex: /\$\$(.*?)\$\$/gs, type: "display-math" as const },
    { regex: /\\\[(.*?)\\\]/gs, type: "display-math" as const },
    { regex: /\$(.*?)\$/g, type: "inline-math" as const },
    { regex: /\\\((.*?)\\\)/g, type: "inline-math" as const },
  ];

  // Find all math expressions
  const matches: Array<{ index: number; length: number; type: "inline-math" | "display-math"; content: string }> = [];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type: pattern.type,
        content: match[1],
      });
    }
  }

  // Sort matches by index
  matches.sort((a, b) => a.index - b.index);

  // Remove overlapping matches (keep the first one)
  const filteredMatches = matches.filter((match, i) => {
    if (i === 0) return true;
    const prevMatch = matches[i - 1];
    return match.index >= prevMatch.index + prevMatch.length;
  });

  // Build segments
  for (const match of filteredMatches) {
    // Add text before this match
    if (match.index > currentIndex) {
      const textContent = text.slice(currentIndex, match.index);
      if (textContent) {
        segments.push({ type: "text", content: textContent });
      }
    }

    // Add math segment
    segments.push({ type: match.type, content: match.content });
    currentIndex = match.index + match.length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    segments.push({ type: "text", content: text.slice(currentIndex) });
  }

  // If no math was found, return the entire text as a single segment
  if (segments.length === 0) {
    segments.push({ type: "text", content: text });
  }

  return segments;
}

/**
 * Convert common plain text math notation to LaTeX
 * Examples:
 * - x^2 → x^{2}
 * - sqrt(x) → \sqrt{x}
 * - x/y → \frac{x}{y}
 * - x_i → x_{i}
 */
export function convertPlainTextToLatex(text: string): string {
  let latex = text;

  // Convert superscripts: x^2 → x^{2}, x^10 → x^{10}
  latex = latex.replace(/\^(\d+)/g, "^{$1}");
  latex = latex.replace(/\^([a-zA-Z])/g, "^{$1}");

  // Convert subscripts: x_i → x_{i}, x_10 → x_{10}
  latex = latex.replace(/_(\d+)/g, "_{$1}");
  latex = latex.replace(/_([a-zA-Z])/g, "_{$1}");

  // Convert sqrt: sqrt(x) → \sqrt{x}
  latex = latex.replace(/sqrt\(([^)]+)\)/g, "\\sqrt{$1}");

  // Convert fractions: (numerator)/(denominator) → \frac{numerator}{denominator}
  // This is a simple version, may not catch all cases
  latex = latex.replace(/\(([^)]+)\)\/\(([^)]+)\)/g, "\\frac{$1}{$2}");

  // Convert common symbols
  latex = latex.replace(/\*\*/g, "^"); // ** for exponent
  latex = latex.replace(/>=|≥/g, "\\geq");
  latex = latex.replace(/<=|≤/g, "\\leq");
  latex = latex.replace(/!=/g, "\\neq");
  latex = latex.replace(/infinity|∞/g, "\\infty");
  latex = latex.replace(/alpha|α/g, "\\alpha");
  latex = latex.replace(/beta|β/g, "\\beta");
  latex = latex.replace(/gamma|γ/g, "\\gamma");
  latex = latex.replace(/delta|δ/g, "\\delta");
  latex = latex.replace(/theta|θ/g, "\\theta");
  latex = latex.replace(/pi|π/g, "\\pi");

  // Convert summation: sum(i=1 to n) → \sum_{i=1}^{n}
  latex = latex.replace(/sum\(([^=]+)=([^ ]+) to ([^)]+)\)/g, "\\sum_{$1=$2}^{$3}");

  return latex;
}

/**
 * Detect if text contains potential mathematical expressions
 * (even without LaTeX delimiters)
 */
export function containsMath(text: string): boolean {
  // Check for LaTeX delimiters
  if (/\$|\\\[|\\\(/.test(text)) {
    return true;
  }

  // Check for common math patterns
  const mathPatterns = [
    /\b\d+\s*[+\-*/]\s*\d+/, // Basic arithmetic
    /\b[a-z]\^[0-9a-z]/i, // Exponents
    /sqrt\(/i, // Square root
    /\b[a-z]_[0-9a-z]/i, // Subscripts
    /[≥≤≠∞]/, // Math symbols
    /\\frac|\\sqrt|\\sum|\\int/i, // LaTeX commands
  ];

  return mathPatterns.some((pattern) => pattern.test(text));
}
