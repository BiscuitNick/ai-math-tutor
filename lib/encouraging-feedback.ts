/**
 * Encouraging Feedback System
 *
 * Provides supportive, motivational feedback throughout the tutoring session
 * based on student progress, struggle level, and achievements.
 */

import type { StuckLevel } from "./stuck-detection";
import type { ResponseAnalysis } from "./misconception-detector";

export type FeedbackType =
  | "success"
  | "partial-success"
  | "encouragement"
  | "persistence"
  | "progress"
  | "milestone";

export interface FeedbackMessage {
  type: FeedbackType;
  message: string;
  tone: "celebratory" | "supportive" | "motivational" | "reassuring";
}

/**
 * Generates encouraging feedback based on response analysis and stuck level
 */
export function generateEncouragingFeedback(
  analysis: ResponseAnalysis,
  stuckLevel: StuckLevel,
  consecutiveAttempts: number
): FeedbackMessage {
  // Success feedback
  if (analysis.isCorrect) {
    return getSuccessFeedback(consecutiveAttempts);
  }

  // Partial success feedback
  if (analysis.isPartiallyCorrect && analysis.correctParts.length > 0) {
    return getPartialSuccessFeedback(analysis.correctParts);
  }

  // Struggle-based encouragement
  return getStruggleFeedback(stuckLevel, consecutiveAttempts);
}

/**
 * Success feedback for correct answers
 */
function getSuccessFeedback(attempts: number): FeedbackMessage {
  const messages = [
    "Excellent work! You got it!",
    "That's exactly right! Well done!",
    "Perfect! You really understand this!",
    "Great job! That's the correct answer!",
    "Brilliant! You've got the hang of this!",
    "Fantastic! Your reasoning was spot-on!",
    "Yes! That's absolutely correct!",
    "Outstanding work!",
  ];

  // Extra encouragement if it took multiple attempts
  const persistenceMessages = [
    "Excellent! Your persistence paid off!",
    "Great job! You stuck with it and figured it out!",
    "Perfect! All that thinking really helped!",
    "That's it! Your hard work led you to the right answer!",
  ];

  const selectedMessages = attempts > 3 ? persistenceMessages : messages;
  const message = selectedMessages[Math.floor(Math.random() * selectedMessages.length)];

  return {
    type: "success",
    message,
    tone: "celebratory",
  };
}

/**
 * Partial success feedback highlighting what's correct
 */
function getPartialSuccessFeedback(correctParts: string[]): FeedbackMessage {
  const templates = [
    `Good thinking! You're on the right track with ${correctParts[0]}.`,
    `Nice work! You correctly ${correctParts[0]}, which is an important step.`,
    `Great start! You've got ${correctParts[0]} exactly right.`,
    `You're making progress! ${correctParts[0]} is correct.`,
    `Good! You understood that ${correctParts[0]}.`,
  ];

  const message = templates[Math.floor(Math.random() * templates.length)];

  return {
    type: "partial-success",
    message,
    tone: "supportive",
  };
}

/**
 * Struggle-based encouragement
 */
function getStruggleFeedback(stuckLevel: StuckLevel, attempts: number): FeedbackMessage {
  if (stuckLevel === "severely_stuck" || attempts > 5) {
    return getSevereStruggleFeedback();
  }

  if (stuckLevel === "definitely_stuck" || attempts > 3) {
    return getModerateStruggleFeedback();
  }

  if (stuckLevel === "potentially_stuck" || attempts > 1) {
    return getMildStruggleFeedback();
  }

  return getInitialEncouragement();
}

/**
 * Encouragement for severe struggle
 */
function getSevereStruggleFeedback(): FeedbackMessage {
  const messages = [
    "I can see you're working really hard on this. That's what learning is all about!",
    "This is a challenging problem, and you're showing great persistence by sticking with it.",
    "It's okay to find this difficult - you're pushing yourself to learn something new!",
    "Your effort is really impressive. Let's break this down together.",
    "I appreciate how much thought you're putting into this. Learning takes time!",
    "You're doing the hard work of really thinking through this problem. That's admirable!",
  ];

  return {
    type: "persistence",
    message: messages[Math.floor(Math.random() * messages.length)],
    tone: "reassuring",
  };
}

/**
 * Encouragement for moderate struggle
 */
function getModerateStruggleFeedback(): FeedbackMessage {
  const messages = [
    "I can see you're thinking hard about this. Keep going!",
    "This is challenging, but you're making an effort - that's what matters!",
    "You're on a good path. Let's think about this together.",
    "I like that you're really working through this. Let's explore it further.",
    "Your persistence is great! Let's look at this from another angle.",
    "You're showing good problem-solving effort here.",
  ];

  return {
    type: "encouragement",
    message: messages[Math.floor(Math.random() * messages.length)],
    tone: "supportive",
  };
}

/**
 * Encouragement for mild struggle
 */
function getMildStruggleFeedback(): FeedbackMessage {
  const messages = [
    "Good thinking! Let's explore this a bit more.",
    "You're on an interesting track. Let's develop that idea further.",
    "I see where you're going with this. Let's think about it together.",
    "That's creative thinking! Let's refine that approach.",
    "You're engaging with the problem well. Let's dig deeper.",
  ];

  return {
    type: "encouragement",
    message: messages[Math.floor(Math.random() * messages.length)],
    tone: "supportive",
  };
}

/**
 * Initial encouragement
 */
function getInitialEncouragement(): FeedbackMessage {
  const messages = [
    "Let's think about this together.",
    "Interesting approach! Let's explore that.",
    "I see you're thinking carefully about this.",
    "Good start! Let's develop that idea.",
  ];

  return {
    type: "encouragement",
    message: messages[Math.floor(Math.random() * messages.length)],
    tone: "supportive",
  };
}

/**
 * Progress milestone feedback (called periodically)
 */
export function getProgressFeedback(turnsCompleted: number): FeedbackMessage | null {
  // Provide progress feedback at certain milestones
  if (turnsCompleted === 5) {
    return {
      type: "progress",
      message: "You're doing great! You've been working thoughtfully through this problem.",
      tone: "motivational",
    };
  }

  if (turnsCompleted === 10) {
    return {
      type: "progress",
      message: "I'm impressed by your dedication to understanding this!",
      tone: "motivational",
    };
  }

  if (turnsCompleted === 15) {
    return {
      type: "persistence",
      message: "Your persistence is really admirable. This kind of effort leads to real learning!",
      tone: "motivational",
    };
  }

  return null;
}

/**
 * Growth mindset messages
 */
export function getGrowthMindsetMessage(context: "mistake" | "struggle" | "success"): string {
  const messages = {
    mistake: [
      "Mistakes are how we learn! Let's figure out what happened.",
      "Everyone makes mistakes when learning. They help us understand better!",
      "This is a learning opportunity! Let's explore what went differently than expected.",
      "Making errors is part of the learning process. It means you're challenging yourself!",
    ],
    struggle: [
      "Struggling means you're learning something new!",
      "Your brain is growing stronger as you work through this challenge.",
      "The effort you're putting in is building your mathematical skills.",
      "This difficulty is temporary - you're developing new understanding!",
    ],
    success: [
      "Your hard work led to this success!",
      "You developed this skill through practice and persistence!",
      "This shows what you can achieve when you stick with a challenge!",
      "Your effort and thinking paid off!",
    ],
  };

  const contextMessages = messages[context];
  return contextMessages[Math.floor(Math.random() * contextMessages.length)];
}

/**
 * Formats feedback for inclusion in system prompt
 */
export function formatFeedbackForPrompt(
  feedback: FeedbackMessage,
  includeGrowthMindset: boolean = false
): string {
  let formatted = `## SUGGESTED FEEDBACK:\n\n`;
  formatted += `**Tone**: ${feedback.tone}\n`;
  formatted += `**Message**: "${feedback.message}"\n\n`;

  if (includeGrowthMindset) {
    const context = feedback.type === "success" ? "success" :
                    feedback.type.includes("persistence") ? "struggle" : "mistake";
    formatted += `**Growth Mindset Addition**: ${getGrowthMindsetMessage(context)}\n\n`;
  }

  formatted += `Incorporate this feedback naturally into your response. Don't just repeat it - weave it into your Socratic questioning.`;

  return formatted;
}

/**
 * Gets encouraging phrases to vary language
 */
export function getEncouragingPhrase(): string {
  const phrases = [
    "I see you thinking carefully about this",
    "That's an interesting approach",
    "You're engaging well with this problem",
    "I appreciate the thought you're putting into this",
    "You're showing good mathematical thinking",
    "That's creative problem-solving",
    "You're working through this systematically",
    "I can see your understanding developing",
    "You're asking yourself the right questions",
    "That shows good mathematical intuition",
  ];

  return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * Validates tone appropriateness for age/context
 */
export function validateTone(message: string, studentAge?: number): boolean {
  // Avoid overly childish language for older students
  if (studentAge && studentAge > 16) {
    const childishPhrases = ["super duper", "yippee", "wowza"];
    return !childishPhrases.some(phrase =>
      message.toLowerCase().includes(phrase)
    );
  }

  // Avoid overly complex language for younger students
  if (studentAge && studentAge < 12) {
    const complexPhrases = ["exemplary", "phenomenal", "extraordinary"];
    return !complexPhrases.some(phrase =>
      message.toLowerCase().includes(phrase)
    );
  }

  return true;
}

/**
 * Celebration messages for completing a problem
 */
export function getCompletionCelebration(attemptsCount: number, timeSpent?: number): string {
  if (attemptsCount <= 3) {
    return "Excellent! You solved that efficiently and showed great understanding!";
  }

  if (attemptsCount <= 7) {
    return "Wonderful! Your persistence and careful thinking led you to the solution!";
  }

  return "Amazing work! You showed incredible determination and problem-solving skills. That's what real learning looks like!";
}
