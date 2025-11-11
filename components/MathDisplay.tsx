"use client";

/**
 * Component for rendering LaTeX mathematical expressions using KaTeX
 * Supports both inline and display (block) modes
 */

import { useEffect, useRef } from "react";
import katex from "katex";

interface MathDisplayProps {
  /**
   * LaTeX expression to render
   */
  latex: string;

  /**
   * Display mode:
   * - inline: Renders math inline with text (smaller)
   * - display: Renders math as a centered block (larger)
   */
  displayMode?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Error handling callback
   */
  onError?: (error: Error) => void;
}

export function MathDisplay({
  latex,
  displayMode = false,
  className = "",
  onError,
}: MathDisplayProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Render the LaTeX expression using KaTeX
      katex.render(latex, containerRef.current, {
        displayMode,
        throwOnError: false, // Show error message instead of throwing
        errorColor: "#cc0000",
        strict: false, // Allow some non-standard LaTeX
        trust: false, // Don't allow \url{} or similar commands (security)
        macros: {
          // Common macros for convenience
          "\\f": "#1f(#2)",
        },
      });
    } catch (error) {
      console.error("KaTeX rendering error:", error);
      if (onError && error instanceof Error) {
        onError(error);
      }
      // KaTeX will display the error in the container
    }
  }, [latex, displayMode, onError]);

  return (
    <span
      ref={containerRef}
      className={`math-display ${displayMode ? "block" : "inline"} ${className}`}
      style={displayMode ? { display: "block", textAlign: "center" } : undefined}
    />
  );
}

/**
 * Helper component for inline math expressions
 */
export function InlineMath({ latex, className }: Omit<MathDisplayProps, "displayMode">) {
  return <MathDisplay latex={latex} displayMode={false} className={className} />;
}

/**
 * Helper component for display (block) math expressions
 */
export function DisplayMath({ latex, className }: Omit<MathDisplayProps, "displayMode">) {
  return <MathDisplay latex={latex} displayMode={true} className={className} />;
}
