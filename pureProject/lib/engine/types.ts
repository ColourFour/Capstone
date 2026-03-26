export type UserRole = "student" | "teacher" | "admin";

export type NodeType =
  | "question"
  | "hint"
  | "worked_example"
  | "instruction"
  | "checkpoint"
  | "review"
  | "extension";

export type TransitionConditionType =
  | "always"
  | "correct"
  | "incorrect"
  | "incorrect_twice"
  | "misconception"
  | "score_at_least";

export type ProgressStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "needs_review";

export type SubmissionEventType =
  | "entered_node"
  | "submitted_answer"
  | "viewed_hint"
  | "advanced"
  | "branched_to_remediation"
  | "completed_assignment";

export interface Profile {
  id: string;
  display_name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface AssignmentListItem {
  id: string;
  class_id: string;
  unit_version_id: string;
  open_at: string | null;
  due_at: string | null;
  is_live: boolean;
  unit_title: string;
  class_name: string;
  progress_id: string | null;
  current_node_id: string | null;
  status: ProgressStatus | null;
  mastery_score: number | null;
  last_active_at: string | null;
}

export interface LessonNodeContent {
  prompt?: string;
  body?: string;
  explanation?: string;
  questionLatex?: string;
  answerPlaceholder?: string;
  choices?: Array<{ label: string; value: string }>;
  workedSteps?: string[];
  ctaLabel?: string;
}

export interface ScoringRule {
  type: "exact_numeric" | "multiple_choice" | "free_response_keyword";
  correctAnswer?: string;
  acceptableAnswers?: string[];
  maxScore: number;
  misconceptionMap?: Record<string, string>;
}

export interface LessonNodeRecord {
  id: string;
  unit_version_id: string;
  node_key: string;
  node_type: NodeType;
  title: string;
  content_json: LessonNodeContent;
  scoring_json: ScoringRule | null;
  mastery_tags: string[] | null;
  layout_type: string | null;
}

export interface NodeTransitionRecord {
  id: string;
  from_node_id: string;
  to_node_id: string;
  condition_type: TransitionConditionType;
  condition_json: Record<string, unknown> | null;
  priority_order: number;
}

export interface StudentProgressRecord {
  id: string;
  assignment_id: string;
  student_id: string;
  current_node_id: string | null;
  status: ProgressStatus;
  mastery_score: number;
  last_active_at: string | null;
  completed_at: string | null;
}

export interface EvaluationInput {
  node: LessonNodeRecord;
  submittedAnswer: Record<string, unknown>;
  attemptNumber: number;
}

export interface EvaluationResult {
  normalizedAnswer: Record<string, unknown>;
  isCorrect: boolean;
  awardedScore: number;
  misconceptionCode: string | null;
  matchedRule: string;
  feedback: string;
}

export interface TransitionContext {
  evaluation: EvaluationResult;
  attemptNumber: number;
}

export interface NextNodeResolution {
  nextNodeId: string | null;
  selectedTransition: NodeTransitionRecord | null;
}

export interface LessonNodePayload {
  node: LessonNodeRecord;
  attemptCount: number;
}

export interface SubmissionResponse {
  progressId: string;
  status: ProgressStatus;
  nextNode: LessonNodePayload | null;
  evaluation: EvaluationResult;
}
