/**
 * Daily Usage Limits
 *
 * Tracks and enforces daily usage limits per user.
 * Limits: 20 new problems per day (resets at midnight UTC).
 */

export interface DailyUsageConfig {
  maxProblemsPerDay: number; // Maximum new problems allowed per day (default: 20)
  resetHour: number; // Hour of day to reset (UTC, default: 0 = midnight)
}

export interface DailyUsageRecord {
  userId: string;
  date: string; // YYYY-MM-DD format
  problemsStarted: number;
  lastUpdated: Date;
}

export interface DailyUsageResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  resetAt: Date;
  message?: string;
}

const DEFAULT_CONFIG: DailyUsageConfig = {
  maxProblemsPerDay: 20,
  resetHour: 0, // Midnight UTC
};

/**
 * In-memory storage for daily usage (should be replaced with Firestore in production)
 */
class DailyUsageStore {
  private records: Map<string, DailyUsageRecord> = new Map();

  /**
   * Gets current usage for a user
   */
  getUsage(userId: string, date: string): DailyUsageRecord {
    const key = `${userId}:${date}`;
    const existing = this.records.get(key);

    if (existing) {
      return existing;
    }

    // Create new record for today
    const newRecord: DailyUsageRecord = {
      userId,
      date,
      problemsStarted: 0,
      lastUpdated: new Date(),
    };

    this.records.set(key, newRecord);
    return newRecord;
  }

  /**
   * Increments problem count for a user
   */
  incrementProblems(userId: string, date: string): number {
    const record = this.getUsage(userId, date);
    record.problemsStarted += 1;
    record.lastUpdated = new Date();

    const key = `${userId}:${date}`;
    this.records.set(key, record);

    return record.problemsStarted;
  }

  /**
   * Resets usage for a user (admin/testing)
   */
  reset(userId: string, date: string): void {
    const key = `${userId}:${date}`;
    this.records.delete(key);
  }

  /**
   * Cleanup old records (older than 7 days)
   */
  cleanup(): void {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const [key, record] of this.records.entries()) {
      if (record.lastUpdated < sevenDaysAgo) {
        this.records.delete(key);
      }
    }
  }
}

// Singleton instance
const dailyUsageStore = new DailyUsageStore();

// Cleanup old records every 24 hours
if (typeof setInterval !== 'undefined') {
  setInterval(() => dailyUsageStore.cleanup(), 24 * 60 * 60 * 1000);
}

/**
 * Gets the current UTC date string (YYYY-MM-DD)
 */
export function getCurrentDateUTC(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets the next reset time (midnight UTC)
 */
export function getNextResetTime(config: Partial<DailyUsageConfig> = {}): Date {
  const { resetHour } = { ...DEFAULT_CONFIG, ...config };

  const now = new Date();
  const resetTime = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    resetHour,
    0,
    0,
    0
  ));

  // If reset time has passed today, move to tomorrow
  if (resetTime <= now) {
    resetTime.setUTCDate(resetTime.getUTCDate() + 1);
  }

  return resetTime;
}

/**
 * Checks if a new problem can be started
 */
export function checkDailyLimit(
  userId: string,
  config: Partial<DailyUsageConfig> = {}
): DailyUsageResult {
  const { maxProblemsPerDay } = { ...DEFAULT_CONFIG, ...config };
  const date = getCurrentDateUTC();

  const usage = dailyUsageStore.getUsage(userId, date);
  const current = usage.problemsStarted;
  const remaining = Math.max(0, maxProblemsPerDay - current);
  const allowed = current < maxProblemsPerDay;
  const resetAt = getNextResetTime(config);

  let message: string | undefined;

  if (!allowed) {
    const hoursUntilReset = Math.ceil((resetAt.getTime() - Date.now()) / (1000 * 60 * 60));
    message = `Daily limit reached: You've started ${current} problems today (limit: ${maxProblemsPerDay}). Your limit will reset in ${hoursUntilReset} hour${hoursUntilReset === 1 ? '' : 's'}.`;
  } else if (remaining <= 3) {
    message = `You have ${remaining} problem${remaining === 1 ? '' : 's'} remaining today (${current}/${maxProblemsPerDay} used).`;
  }

  return {
    allowed,
    current,
    limit: maxProblemsPerDay,
    remaining,
    resetAt,
    message,
  };
}

/**
 * Records that a new problem was started
 */
export function recordProblemStarted(
  userId: string,
  config: Partial<DailyUsageConfig> = {}
): DailyUsageResult {
  const date = getCurrentDateUTC();
  const newCount = dailyUsageStore.incrementProblems(userId, date);

  return checkDailyLimit(userId, config);
}

/**
 * Gets current usage without incrementing
 */
export function getDailyUsage(
  userId: string,
  config: Partial<DailyUsageConfig> = {}
): DailyUsageResult {
  return checkDailyLimit(userId, config);
}

/**
 * Resets daily limit for a user (admin/testing)
 */
export function resetDailyLimit(userId: string): void {
  const date = getCurrentDateUTC();
  dailyUsageStore.reset(userId, date);
}

/**
 * Creates error response for daily limit exceeded
 */
export function createDailyLimitError(result: DailyUsageResult): {
  error: string;
  message: string;
  current: number;
  limit: number;
  resetAt: string;
} {
  const hoursUntilReset = Math.ceil((result.resetAt.getTime() - Date.now()) / (1000 * 60 * 60));

  return {
    error: "DAILY_LIMIT_EXCEEDED",
    message: result.message || `You've reached your daily limit of ${result.limit} problems. Try again in ${hoursUntilReset} hour${hoursUntilReset === 1 ? '' : 's'}.`,
    current: result.current,
    limit: result.limit,
    resetAt: result.resetAt.toISOString(),
  };
}

/**
 * Formats daily limit info for response headers
 */
export function formatDailyLimitHeaders(result: DailyUsageResult): Record<string, string> {
  return {
    'X-Daily-Limit': result.limit.toString(),
    'X-Daily-Used': result.current.toString(),
    'X-Daily-Remaining': result.remaining.toString(),
    'X-Daily-Reset': result.resetAt.toISOString(),
  };
}

/**
 * Checks if this is a new problem (first message in conversation)
 */
export function isNewProblem(messageCount: number): boolean {
  // Consider it a new problem if this is the first user message
  return messageCount <= 1;
}

/**
 * Gets usage statistics for monitoring
 */
export function getDailyUsageStats(userId: string): {
  date: string;
  used: number;
  limit: number;
  percentage: number;
  status: "healthy" | "warning" | "critical";
} {
  const date = getCurrentDateUTC();
  const usage = dailyUsageStore.getUsage(userId, date);
  const limit = DEFAULT_CONFIG.maxProblemsPerDay;
  const percentage = (usage.problemsStarted / limit) * 100;

  let status: "healthy" | "warning" | "critical";
  if (usage.problemsStarted >= limit) {
    status = "critical";
  } else if (usage.problemsStarted >= limit * 0.8) {
    status = "warning";
  } else {
    status = "healthy";
  }

  return {
    date,
    used: usage.problemsStarted,
    limit,
    percentage,
    status,
  };
}

/**
 * Formats usage info for logging
 */
export function formatDailyUsage(result: DailyUsageResult): string {
  const percentage = ((result.current / result.limit) * 100).toFixed(0);
  const status = result.allowed ? "OK" : "EXCEEDED";

  return `Daily usage: ${result.current}/${result.limit} problems (${percentage}%) [${status}] - ${result.remaining} remaining`;
}
