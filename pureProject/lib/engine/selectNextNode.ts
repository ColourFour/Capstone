import type {
  NextNodeResolution,
  NodeTransitionRecord,
  TransitionContext
} from "@/lib/engine/types";

function matchesTransition(transition: NodeTransitionRecord, context: TransitionContext) {
  const config = transition.condition_json ?? {};
  const minAttempt = Number(config.min_attempt_number ?? 1);
  const maxAttempt = Number(config.max_attempt_number ?? Number.MAX_SAFE_INTEGER);
  const withinAttemptWindow =
    context.attemptNumber >= minAttempt && context.attemptNumber <= maxAttempt;

  // Extend here when you add new branching semantics. Keeping resolution centralized
  // avoids hardcoded page flows and keeps lesson versions data-driven.
  switch (transition.condition_type) {
    case "always":
      return withinAttemptWindow;
    case "correct":
      return context.evaluation.isCorrect && withinAttemptWindow;
    case "incorrect":
      return !context.evaluation.isCorrect && withinAttemptWindow;
    case "incorrect_twice":
      return !context.evaluation.isCorrect && context.attemptNumber >= 2 && withinAttemptWindow;
    case "misconception":
      return (
        !context.evaluation.isCorrect &&
        withinAttemptWindow &&
        context.evaluation.misconceptionCode === config.misconception_code
      );
    case "score_at_least":
      return withinAttemptWindow && context.evaluation.awardedScore >= Number(config.threshold ?? 0);
    default:
      return false;
  }
}

export function selectNextNode(
  transitions: NodeTransitionRecord[],
  context: TransitionContext
): NextNodeResolution {
  const ordered = [...transitions].sort((a, b) => a.priority_order - b.priority_order);
  const selected = ordered.find((transition) => matchesTransition(transition, context)) ?? null;

  return {
    nextNodeId: selected?.to_node_id ?? null,
    selectedTransition: selected
  };
}
