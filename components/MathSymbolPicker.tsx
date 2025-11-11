"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Omega } from "lucide-react";

interface MathSymbol {
  symbol: string;
  name: string;
  category: "operators" | "relations" | "misc";
}

const MATH_SYMBOLS: MathSymbol[] = [
  // Operators
  { symbol: "±", name: "Plus-minus", category: "operators" },
  { symbol: "×", name: "Multiplication", category: "operators" },
  { symbol: "÷", name: "Division", category: "operators" },
  { symbol: "√", name: "Square root", category: "operators" },
  { symbol: "∛", name: "Cube root", category: "operators" },
  { symbol: "∑", name: "Summation", category: "operators" },
  { symbol: "∫", name: "Integral", category: "operators" },
  { symbol: "∂", name: "Partial derivative", category: "operators" },

  // Relations
  { symbol: "≤", name: "Less than or equal", category: "relations" },
  { symbol: "≥", name: "Greater than or equal", category: "relations" },
  { symbol: "≠", name: "Not equal", category: "relations" },
  { symbol: "≈", name: "Approximately equal", category: "relations" },
  { symbol: "≡", name: "Equivalent", category: "relations" },
  { symbol: "∝", name: "Proportional to", category: "relations" },

  // Miscellaneous
  { symbol: "∞", name: "Infinity", category: "misc" },
  { symbol: "°", name: "Degree", category: "misc" },
  { symbol: "′", name: "Prime", category: "misc" },
  { symbol: "″", name: "Double prime", category: "misc" },
  { symbol: "⊥", name: "Perpendicular", category: "misc" },
  { symbol: "∠", name: "Angle", category: "misc" },
  { symbol: "⌊", name: "Floor left", category: "misc" },
  { symbol: "⌋", name: "Floor right", category: "misc" },
  { symbol: "⌈", name: "Ceiling left", category: "misc" },
  { symbol: "⌉", name: "Ceiling right", category: "misc" },
];

interface MathSymbolPickerProps {
  onSymbolSelect: (symbol: string) => void;
  disabled?: boolean;
}

export function MathSymbolPicker({ onSymbolSelect, disabled = false }: MathSymbolPickerProps) {
  const categories = [
    { id: "operators", label: "Operators" },
    { id: "relations", label: "Relations" },
    { id: "misc", label: "Miscellaneous" },
  ];

  const groupedSymbols = categories.map((category) => ({
    ...category,
    symbols: MATH_SYMBOLS.filter((s) => s.category === category.id),
  }));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-2"
        >
          <Omega className="h-4 w-4" />
          Symbols
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div className="text-sm font-medium">Mathematical Symbols</div>
          {groupedSymbols.map((group) => (
            <div key={group.id} className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                {group.label}
              </div>
              <div className="grid grid-cols-6 gap-1">
                {group.symbols.map((symbol) => (
                  <Button
                    key={symbol.symbol}
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 hover:bg-accent"
                    onClick={() => onSymbolSelect(symbol.symbol)}
                    title={symbol.name}
                  >
                    <span className="text-lg">{symbol.symbol}</span>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
