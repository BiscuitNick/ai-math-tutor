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
      expressions.push(expr);
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
        expressions.push(expr);
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
