/**
 * Cost Tracking System
 *
 * Tracks API costs per session with detailed breakdowns.
 * Supports GPT-4, GPT-3.5, and Vision API pricing.
 */

export type ModelType =
  | "gpt-4-turbo-preview"
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gpt-3.5-turbo"
  | "gpt-4-vision-preview";

export interface ModelPricing {
  inputTokens: number; // Cost per 1M input tokens
  outputTokens: number; // Cost per 1M output tokens
}

export interface CostRecord {
  timestamp: Date;
  model: ModelType;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  purpose: string; // e.g., "chat", "hint", "summarization", "problem_detection"
}

export interface SessionCost {
  sessionId: string;
  userId: string;
  totalCost: number;
  records: CostRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CostBreakdown {
  byModel: Record<ModelType, number>;
  byPurpose: Record<string, number>;
  total: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Model pricing (as of January 2025)
 * Prices are per 1 million tokens
 */
const MODEL_PRICING: Record<ModelType, ModelPricing> = {
  "gpt-4-turbo-preview": {
    inputTokens: 10.00,    // $10 per 1M input tokens
    outputTokens: 30.00,   // $30 per 1M output tokens
  },
  "gpt-4o": {
    inputTokens: 2.50,     // $2.50 per 1M input tokens
    outputTokens: 10.00,   // $10 per 1M output tokens
  },
  "gpt-4o-mini": {
    inputTokens: 0.15,     // $0.15 per 1M input tokens
    outputTokens: 0.60,    // $0.60 per 1M output tokens
  },
  "gpt-3.5-turbo": {
    inputTokens: 0.50,     // $0.50 per 1M input tokens
    outputTokens: 1.50,    // $1.50 per 1M output tokens
  },
  "gpt-4-vision-preview": {
    inputTokens: 10.00,    // $10 per 1M input tokens
    outputTokens: 30.00,   // $30 per 1M output tokens
  },
};

/**
 * Calculates cost for a single API call
 */
export function calculateCost(
  model: ModelType,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model];

  if (!pricing) {
    console.warn(`Unknown model: ${model}, using GPT-4 pricing as fallback`);
    return calculateCost("gpt-4-turbo-preview", inputTokens, outputTokens);
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputTokens;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputTokens;

  return inputCost + outputCost;
}

/**
 * Creates a cost record
 */
export function createCostRecord(
  model: ModelType,
  inputTokens: number,
  outputTokens: number,
  purpose: string = "chat"
): CostRecord {
  const cost = calculateCost(model, inputTokens, outputTokens);

  return {
    timestamp: new Date(),
    model,
    inputTokens,
    outputTokens,
    cost,
    purpose,
  };
}

/**
 * Aggregates cost records into a breakdown
 */
export function aggregateCosts(records: CostRecord[]): CostBreakdown {
  const byModel: Record<string, number> = {};
  const byPurpose: Record<string, number> = {};
  let totalCost = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const record of records) {
    // Aggregate by model
    if (!byModel[record.model]) {
      byModel[record.model] = 0;
    }
    byModel[record.model] += record.cost;

    // Aggregate by purpose
    if (!byPurpose[record.purpose]) {
      byPurpose[record.purpose] = 0;
    }
    byPurpose[record.purpose] += record.cost;

    // Totals
    totalCost += record.cost;
    totalInputTokens += record.inputTokens;
    totalOutputTokens += record.outputTokens;
  }

  return {
    byModel: byModel as Record<ModelType, number>,
    byPurpose,
    total: totalCost,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
  };
}

/**
 * Formats cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 1000).toFixed(3)}m`; // Display in millidollars
  }
  return `$${cost.toFixed(4)}`;
}

/**
 * Formats cost breakdown for logging
 */
export function formatCostBreakdown(breakdown: CostBreakdown): string {
  const lines = [
    `Total Cost: ${formatCost(breakdown.total)}`,
    `Tokens: ${breakdown.inputTokens} in + ${breakdown.outputTokens} out = ${breakdown.totalTokens} total`,
  ];

  // By model
  if (Object.keys(breakdown.byModel).length > 0) {
    lines.push("By Model:");
    for (const [model, cost] of Object.entries(breakdown.byModel)) {
      lines.push(`  ${model}: ${formatCost(cost)}`);
    }
  }

  // By purpose
  if (Object.keys(breakdown.byPurpose).length > 0) {
    lines.push("By Purpose:");
    for (const [purpose, cost] of Object.entries(breakdown.byPurpose)) {
      lines.push(`  ${purpose}: ${formatCost(cost)}`);
    }
  }

  return lines.join("\n");
}

/**
 * Checks if cost exceeds budget threshold
 */
export function checkBudgetThreshold(
  currentCost: number,
  thresholds: {
    warning?: number;
    critical?: number;
  } = {}
): {
  status: "ok" | "warning" | "critical";
  message?: string;
} {
  const { warning = 1.00, critical = 5.00 } = thresholds;

  if (currentCost >= critical) {
    return {
      status: "critical",
      message: `Cost ${formatCost(currentCost)} exceeds critical threshold ${formatCost(critical)}`,
    };
  }

  if (currentCost >= warning) {
    return {
      status: "warning",
      message: `Cost ${formatCost(currentCost)} exceeds warning threshold ${formatCost(warning)}`,
    };
  }

  return { status: "ok" };
}

/**
 * Estimates cost for a planned API call
 */
export function estimateCost(
  model: ModelType,
  estimatedInputTokens: number,
  estimatedOutputTokens: number
): {
  cost: number;
  formatted: string;
  breakdown: {
    inputCost: number;
    outputCost: number;
  };
} {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING["gpt-4-turbo-preview"];

  const inputCost = (estimatedInputTokens / 1_000_000) * pricing.inputTokens;
  const outputCost = (estimatedOutputTokens / 1_000_000) * pricing.outputTokens;
  const totalCost = inputCost + outputCost;

  return {
    cost: totalCost,
    formatted: formatCost(totalCost),
    breakdown: {
      inputCost,
      outputCost,
    },
  };
}

/**
 * Gets daily/monthly cost aggregates
 */
export function aggregateCostsByPeriod(
  records: CostRecord[],
  period: "day" | "month"
): Record<string, number> {
  const aggregates: Record<string, number> = {};

  for (const record of records) {
    const date = record.timestamp;
    let key: string;

    if (period === "day") {
      key = date.toISOString().split("T")[0]; // YYYY-MM-DD
    } else {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      key = `${year}-${month}`; // YYYY-MM
    }

    if (!aggregates[key]) {
      aggregates[key] = 0;
    }
    aggregates[key] += record.cost;
  }

  return aggregates;
}

/**
 * Calculates cost efficiency metrics
 */
export function calculateCostEfficiency(
  totalCost: number,
  problemsSolved: number,
  turnsCompleted: number
): {
  costPerProblem: number;
  costPerTurn: number;
  efficiency: "excellent" | "good" | "fair" | "poor";
} {
  const costPerProblem = problemsSolved > 0 ? totalCost / problemsSolved : 0;
  const costPerTurn = turnsCompleted > 0 ? totalCost / turnsCompleted : 0;

  let efficiency: "excellent" | "good" | "fair" | "poor";

  if (costPerProblem < 0.10) {
    efficiency = "excellent";
  } else if (costPerProblem < 0.25) {
    efficiency = "good";
  } else if (costPerProblem < 0.50) {
    efficiency = "fair";
  } else {
    efficiency = "poor";
  }

  return {
    costPerProblem,
    costPerTurn,
    efficiency,
  };
}

/**
 * Formats session cost summary for Firestore storage
 */
export function createSessionCostSummary(
  sessionId: string,
  userId: string,
  records: CostRecord[]
): {
  sessionId: string;
  userId: string;
  totalCost: number;
  breakdown: CostBreakdown;
  recordCount: number;
  createdAt: Date;
  updatedAt: Date;
} {
  const breakdown = aggregateCosts(records);

  return {
    sessionId,
    userId,
    totalCost: breakdown.total,
    breakdown,
    recordCount: records.length,
    createdAt: records[0]?.timestamp || new Date(),
    updatedAt: new Date(),
  };
}
