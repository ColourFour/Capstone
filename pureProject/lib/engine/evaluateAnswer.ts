import { classifyMisconception } from "@/lib/engine/classifyMisconception";
import type { EvaluationInput, EvaluationResult, ScoringRule } from "@/lib/engine/types";

function normalizeAnswer(submittedAnswer: Record<string, unknown>) {
  const value = submittedAnswer.value;
  return {
    value: typeof value === "string" ? value.trim() : String(value ?? "").trim()
  };
}

function evaluateExactNumeric(
  normalizedValue: string,
  scoring: ScoringRule
): Pick<EvaluationResult, "isCorrect" | "awardedScore" | "matchedRule" | "feedback"> {
  const acceptableAnswers = new Set(
    [scoring.correctAnswer, ...(scoring.acceptableAnswers ?? [])].filter(Boolean)
  );
  const isCorrect = acceptableAnswers.has(normalizedValue);

  return {
    isCorrect,
    awardedScore: isCorrect ? scoring.maxScore : 0,
    matchedRule: "exact_numeric",
    feedback: isCorrect ? "Nice work. That answer is correct." : "That is not correct yet."
  };
}

function evaluateMultipleChoice(
  normalizedValue: string,
  scoring: ScoringRule
): Pick<EvaluationResult, "isCorrect" | "awardedScore" | "matchedRule" | "feedback"> {
  const isCorrect = normalizedValue === scoring.correctAnswer;

  return {
    isCorrect,
    awardedScore: isCorrect ? scoring.maxScore : 0,
    matchedRule: "multiple_choice",
    feedback: isCorrect
      ? "Correct. You chose the right strategy."
      : "That choice points to a different strategy than the target one."
  };
}

export function evaluateAnswer(input: EvaluationInput): EvaluationResult {
  const scoring = input.node.scoring_json;
  const normalizedAnswer = normalizeAnswer(input.submittedAnswer);

  if (!scoring) {
    return {
      normalizedAnswer,
      isCorrect: true,
      awardedScore: 0,
      misconceptionCode: null,
      matchedRule: "non_assessed",
      feedback: "This step has no scored response."
    };
  }

  const normalizedValue = String(normalizedAnswer.value);
  // Extend here when you add richer scoring modes such as symbolic equivalence,
  // partial credit, or rubric-based free response grading.
  const baseResult =
    scoring.type === "multiple_choice"
      ? evaluateMultipleChoice(normalizedValue, scoring)
      : evaluateExactNumeric(normalizedValue, scoring);

  return {
    normalizedAnswer,
    ...baseResult,
    misconceptionCode: baseResult.isCorrect ? null : classifyMisconception(input.node, normalizedAnswer)
  };
}
