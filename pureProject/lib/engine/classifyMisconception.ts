import type { LessonNodeRecord, ScoringRule } from "@/lib/engine/types";

function getSubmittedValue(answer: Record<string, unknown>) {
  const rawValue = answer.value;
  return typeof rawValue === "string" ? rawValue.trim() : String(rawValue ?? "").trim();
}

export function classifyMisconception(
  node: LessonNodeRecord,
  answer: Record<string, unknown>
) {
  const scoring = node.scoring_json as ScoringRule | null;
  if (!scoring?.misconceptionMap) {
    return null;
  }

  const submittedValue = getSubmittedValue(answer);
  return scoring.misconceptionMap[submittedValue] ?? null;
}
