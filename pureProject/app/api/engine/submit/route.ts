import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthContext } from "@/lib/auth";
import { evaluateAnswer } from "@/lib/engine/evaluateAnswer";
import { selectNextNode } from "@/lib/engine/selectNextNode";
import { getLessonNodePayload, getStudentProgress, getTransitionsForNode } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";

const submitSchema = z.object({
  assignmentId: z.string().uuid(),
  answer: z.record(z.unknown())
});

type ProgressEventInsert = {
  student_id: string;
  assignment_id: string;
  event_type:
    | "entered_node"
    | "submitted_answer"
    | "viewed_hint"
    | "advanced"
    | "branched_to_remediation"
    | "completed_assignment";
  event_payload_json: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth || auth.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = submitSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid submission payload" }, { status: 400 });
    }

    const { assignmentId, answer } = parsed.data;
    const progress = await getStudentProgress(assignmentId, auth.userId);

    if (!progress?.current_node_id) {
      return NextResponse.json({ error: "No active lesson node found." }, { status: 404 });
    }

    const currentNodePayload = await getLessonNodePayload(progress.current_node_id, auth.userId, assignmentId);
    const attemptNumber = currentNodePayload.attemptCount + 1;
    // The client only sends the answer payload. Grading, event writes, and next-node
    // resolution stay on the server so students cannot spoof progression.
    const evaluation = evaluateAnswer({
      node: currentNodePayload.node,
      submittedAnswer: answer,
      attemptNumber
    });

    const transitions = await getTransitionsForNode(progress.current_node_id);
    const resolution = selectNextNode(transitions, {
      evaluation,
      attemptNumber
    });

    const admin = createAdminClient();
    const now = new Date().toISOString();
    const updatedMasteryScore = Math.min(
      100,
      Math.round((progress.mastery_score + evaluation.awardedScore) * 10) / 10
    );
    const nextStatus = resolution.nextNodeId ? "in_progress" : "completed";

    const events: ProgressEventInsert[] = [
      {
        student_id: auth.userId,
        assignment_id: assignmentId,
        event_type: "submitted_answer",
        event_payload_json: {
          node_id: progress.current_node_id,
          attempt_number: attemptNumber,
          is_correct: evaluation.isCorrect,
          misconception_code: evaluation.misconceptionCode
        }
      }
    ];

    if (resolution.nextNodeId) {
      events.push({
        student_id: auth.userId,
        assignment_id: assignmentId,
        event_type:
          evaluation.misconceptionCode || (!evaluation.isCorrect && attemptNumber >= 2)
            ? "branched_to_remediation"
            : "advanced",
        event_payload_json: {
          from_node_id: progress.current_node_id,
          to_node_id: resolution.nextNodeId,
          transition_id: resolution.selectedTransition?.id ?? null
        }
      });

      events.push({
        student_id: auth.userId,
        assignment_id: assignmentId,
        event_type: "entered_node",
        event_payload_json: {
          node_id: resolution.nextNodeId
        }
      });
    } else {
      events.push({
        student_id: auth.userId,
        assignment_id: assignmentId,
        event_type: "completed_assignment",
        event_payload_json: {
          completed_from_node_id: progress.current_node_id
        }
      });
    }

    const { error: attemptError } = await admin.from("student_node_attempts").insert({
      student_id: auth.userId,
      assignment_id: assignmentId,
      node_id: progress.current_node_id,
      attempt_number: attemptNumber,
      submitted_answer_json: evaluation.normalizedAnswer,
      is_correct: evaluation.isCorrect,
      misconception_code: evaluation.misconceptionCode,
      awarded_score: evaluation.awardedScore,
      time_spent_seconds: 0,
      answered_at: now
    });

    if (attemptError) {
      throw attemptError;
    }

    const { error: eventsError } = await admin.from("student_progress_events").insert(events);
    if (eventsError) {
      throw eventsError;
    }

    const { error: progressError } = await admin
      .from("student_assignment_progress")
      .update({
        current_node_id: resolution.nextNodeId,
        status: nextStatus,
        mastery_score: updatedMasteryScore,
        last_active_at: now,
        completed_at: nextStatus === "completed" ? now : null
      })
      .eq("id", progress.id);

    if (progressError) {
      throw progressError;
    }

    const nextNode = resolution.nextNodeId
      ? await getLessonNodePayload(resolution.nextNodeId, auth.userId, assignmentId)
      : null;

    return NextResponse.json({
      progressId: progress.id,
      status: nextStatus,
      nextNode,
      evaluation
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected engine failure";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
