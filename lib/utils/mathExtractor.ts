/**
 * Utility functions for extracting and parsing mathematical expressions from text
 */

/**
 * Extract mathematical expressions from text
 * This function looks for:
 * - LaTeX expressions wrapped in $...$ or $$...$$
 * - Plain equations with = sign
 * - Mathematical expressions with common operators
 */
export function extractMathExpressions(text: string): string[] {
  const expressions: string[] = [];

  // Extract LaTeX expressions (both inline and display)
  const latexRegex = /\$\$?(.*?)\$\$?/g;
  let match;
  while ((match = latexRegex.exec(text)) !== null) {
    const expr = match[1].trim();
    if (expr) {
      // Clean conversational text before adding
      const cleaned = cleanConversationalText(expr);
      if (cleaned) {
        expressions.push(cleaned);
      }
    }
  }

  // If no LaTeX expressions found, try to find plain equations
  if (expressions.length === 0) {
    // Look for equations with = sign
    const equationRegex = /[^.!?]*[=][^.!?]*/g;
    while ((match = equationRegex.exec(text)) !== null) {
      const expr = match[0].trim();
      // Filter out non-mathematical sentences
      if (containsMathematicalContent(expr)) {
        // Clean conversational text before adding
        const cleaned = cleanConversationalText(expr);
        if (cleaned) {
          expressions.push(cleaned);
        }
      }
    }
  }

  return expressions;
}

/**
 * Check if text contains mathematical content
 */
function containsMathematicalContent(text: string): boolean {
  // Check for mathematical operators or patterns
  const mathPatterns = [
    /\d+\s*[+\-*/×÷^]\s*\d+/, // Numbers with operators
    /\w+\s*[+\-*/×÷^]\s*\d+/, // Variables with operators and numbers
    /\d+\s*[+\-*/×÷^]\s*\w+/, // Numbers with operators and variables
    /\w+\s*=\s*[\d\w]/, // Variable assignment
    /[+\-*/×÷^]\s*\d+/, // Operators with numbers
  ];

  return mathPatterns.some(pattern => pattern.test(text));
}

/**
 * Remove conversational fillers and question phrases from mathematical expressions
 * Examples: "3 + 4 right?" -> "3 + 4", "I think x = 5" -> "x = 5", "5x + 6 = 11 help me solve this" -> "5x + 6 = 11"
 */
function cleanConversationalText(expr: string): string {
  // First, remove everything after common conversational trigger phrases
  // This handles cases like "5x + 6 = 11 help me solve this"
  const conversationalTriggers = [
    /\s+help\s+me.*/i,           // "help me solve this", "help me", etc.
    /\s+can\s+you\s+help.*/i,    // "can you help"
    /\s+please\s+help.*/i,       // "please help"
    /\s+how\s+do\s+I.*/i,        // "how do I solve this"
    /\s+solve\s+this.*/i,        // "solve this"
    /\s+what\s+is.*/i,           // "what is the answer"
    /\s+show\s+me.*/i,           // "show me how"
  ];

  let cleaned = expr;
  for (const trigger of conversationalTriggers) {
    cleaned = cleaned.replace(trigger, '');
  }

  // Then remove common conversational patterns at start/end
  const conversationalPatterns = [
    /\s*right\??$/i,        // "right?" at end
    /\s*correct\??$/i,      // "correct?" at end
    /^I think\s*/i,         // "I think" at start
    /^maybe\s*/i,           // "maybe" at start
    /^is this\s*/i,         // "is this" at start
    /^could it be\s*/i,     // "could it be" at start
    /\s*I guess\s*/i,       // "I guess" anywhere
    /^so\s*/i,              // "so" at start
    /^and\s*/i,             // "and" at start
    /^then\s*/i,            // "then" at start
    /\s*\?+\s*$/,           // Question marks at end
  ];

  for (const pattern of conversationalPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleaned.trim();
}

/**
 * Check if text contains conversational language that shouldn't be in a math expression
 */
function containsConversationalText(text: string): boolean {
  const conversationalWords = /\b(right|correct|think|maybe|guess|perhaps|possibly|probably|help|solve|show|please|what|how)\b/i;
  return conversationalWords.test(text);
}

/**
 * Normalize a mathematical expression for comparison
 * Removes extra whitespace, LaTeX delimiters, and standardizes formatting
 */
export function normalizeMathExpression(expr: string): string {
  return expr
    .replace(/\$+/g, '') // Remove $ delimiters
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if an expression is likely a step in solving a problem
 * (i.e., contains an equation or significant mathematical content)
 */
export function isValidMathStep(expr: string): boolean {
  const normalized = normalizeMathExpression(expr);

  // Must contain some mathematical content
  if (!containsMathematicalContent(normalized)) {
    return false;
  }

  // Should not contain conversational text
  if (containsConversationalText(normalized)) {
    return false;
  }

  // Should not be too short (likely noise)
  if (normalized.length < 3) {
    return false;
  }

  // Should not be just a number
  if (/^\d+$/.test(normalized)) {
    return false;
  }

  return true;
}

/**
 * Check if an expression is a duplicate of another
 */
export function isDuplicateExpression(expr: string, existingExpr: string): boolean {
  const normalizedExpr = normalizeMathExpression(expr);
  const normalizedExisting = normalizeMathExpression(existingExpr);
  return normalizedExpr === normalizedExisting;
}

/**
 * Check if an expression already exists in a list of expressions
 */
export function expressionExists(expr: string, existingExpressions: string[]): boolean {
  return existingExpressions.some(existing => isDuplicateExpression(expr, existing));
}

/**
 * Format expression for display (ensure proper LaTeX wrapping)
 */
export function formatMathExpression(expr: string): string {
  // If already wrapped in LaTeX delimiters, return as-is
  if (expr.startsWith('$') && expr.endsWith('$')) {
    return expr;
  }

  // Wrap in inline LaTeX delimiters
  return `$${expr}$`;
}
