/**
 * Utility functions for quiz option parsing, answer normalization,
 * scoring, and guest/demo mode persistence.
 */

export interface TestRecord {
  id: string;
  user_id: string;
  topic_id: string;
  num_mcqs: number;
  num_coding: number;
  status: 'in_progress' | 'completed';
  created_at: string;
  completed_at?: string;
  topics?: {
    id?: string;
    name: string;
  };
}

export interface TestQuestionRecord {
  id: string;
  test_id: string;
  question_type: 'mcq' | 'coding';
  question_text: string;
  options?: string[] | null;
  correct_answer?: string | null;
  user_answer?: string | null;
  is_correct?: boolean | null;
  code_submission?: string | null;
  language?: string | null;
  difficulty?: string;
  example_input?: string;
  example_output?: string;
  constraints?: string;
}

export interface UserProgressRecord {
  id: string;
  user_id: string;
  topic_id: string;
  tests_taken: number;
  total_questions: number;
  correct_answers: number;
  accuracy: number;
  last_test_date: string;
  topics?: {
    name: string;
  };
}

/**
 * Strips leading option labels like "A)", "A.", "A -", "(A)", "1." from option strings
 */
export function cleanOptionText(text: string): string {
  if (!text) return "";
  return text.replace(/^(\([A-Za-z0-9]\)|[A-Za-z0-9][).\s-]+)\s*/i, "").trim();
}

/**
 * Normalizes an answer into a single uppercase letter ('A', 'B', 'C', 'D'...)
 */
export function normalizeAnswerLetter(
  rawAnswer: string | null | undefined,
  options?: string[]
): string {
  if (!rawAnswer) return "";
  const trimmed = rawAnswer.trim();

  // If already a single letter like "A" or "b"
  if (/^[A-Za-z]$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // If starts with "A)", "A.", "Option A"
  const prefixMatch = trimmed.match(/^([A-Za-z])[).\s-]/);
  if (prefixMatch) {
    return prefixMatch[1].toUpperCase();
  }

  // If matches one of the options by text
  if (options && options.length > 0) {
    const cleanedRaw = cleanOptionText(trimmed).toLowerCase();
    const idx = options.findIndex((opt) => cleanOptionText(opt).toLowerCase() === cleanedRaw);
    if (idx !== -1) {
      return String.fromCharCode(65 + idx);
    }
  }

  return trimmed.substring(0, 1).toUpperCase();
}

// ---------------- GUEST / DEMO MODE HELPERS ----------------

const GUEST_USER_KEY = "sqb_guest_user";
const GUEST_TESTS_KEY = "sqb_guest_tests";
const GUEST_QUESTIONS_KEY = "sqb_guest_questions";
const GUEST_PROGRESS_KEY = "sqb_guest_progress";

export interface GuestUser {
  id: string;
  email: string;
  isGuest: true;
}

export function isGuestUser(userId?: string): boolean {
  if (!userId) return false;
  return userId.startsWith("guest-") || userId === "guest-user";
}

export function getStoredGuestUser(): GuestUser | null {
  try {
    const data = localStorage.getItem(GUEST_USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function createGuestSession(): GuestUser {
  const guest: GuestUser = {
    id: `guest-${Date.now()}`,
    email: "guest@smartquiz.demo",
    isGuest: true,
  };
  try {
    localStorage.setItem(GUEST_USER_KEY, JSON.stringify(guest));
  } catch {
    // ignore
  }
  return guest;
}

export function clearGuestSession(): void {
  try {
    localStorage.removeItem(GUEST_USER_KEY);
  } catch {
    // ignore
  }
}

export function getLocalGuestTests(userId?: string): TestRecord[] {
  try {
    const data = localStorage.getItem(GUEST_TESTS_KEY);
    const tests: TestRecord[] = data ? JSON.parse(data) : [];
    if (userId) {
      return tests.filter((t) => t.user_id === userId);
    }
    return tests;
  } catch {
    return [];
  }
}

export function saveLocalGuestTest(test: TestRecord): void {
  try {
    const tests = getLocalGuestTests();
    const idx = tests.findIndex((t) => t.id === test.id);
    if (idx >= 0) {
      tests[idx] = test;
    } else {
      tests.unshift(test);
    }
    localStorage.setItem(GUEST_TESTS_KEY, JSON.stringify(tests));
  } catch {
    // ignore
  }
}

export function getLocalGuestQuestions(testId: string): TestQuestionRecord[] {
  try {
    const data = localStorage.getItem(GUEST_QUESTIONS_KEY);
    const allQuestions: TestQuestionRecord[] = data ? JSON.parse(data) : [];
    return allQuestions.filter((q) => q.test_id === testId);
  } catch {
    return [];
  }
}

export function saveLocalGuestQuestions(questions: TestQuestionRecord[]): void {
  try {
    const data = localStorage.getItem(GUEST_QUESTIONS_KEY);
    let allQuestions: TestQuestionRecord[] = data ? JSON.parse(data) : [];
    const testIds = new Set(questions.map((q) => q.test_id));
    allQuestions = allQuestions.filter((q) => !testIds.has(q.test_id));
    allQuestions.push(...questions);
    localStorage.setItem(GUEST_QUESTIONS_KEY, JSON.stringify(allQuestions));
  } catch {
    // ignore
  }
}

export function getLocalGuestProgress(userId: string): UserProgressRecord[] {
  try {
    const data = localStorage.getItem(GUEST_PROGRESS_KEY);
    const allProgress: UserProgressRecord[] = data ? JSON.parse(data) : [];
    return allProgress.filter((p) => p.user_id === userId);
  } catch {
    return [];
  }
}

export function saveLocalGuestProgress(progress: UserProgressRecord): void {
  try {
    const data = localStorage.getItem(GUEST_PROGRESS_KEY);
    const allProgress: UserProgressRecord[] = data ? JSON.parse(data) : [];
    const idx = allProgress.findIndex(
      (p) => p.user_id === progress.user_id && p.topic_id === progress.topic_id
    );
    if (idx >= 0) {
      allProgress[idx] = progress;
    } else {
      allProgress.push(progress);
    }
    localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(allProgress));
  } catch {
    // ignore
  }
}
