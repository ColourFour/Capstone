import { cache } from "react";

import type {
  AssignmentListItem,
  LessonNodePayload,
  LessonNodeRecord,
  NodeTransitionRecord,
  Profile,
  StudentProgressRecord
} from "@/lib/engine/types";
import { createAdminClient } from "@/lib/supabase/admin";

const admin = cache(() => createAdminClient());

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const getAssignmentForStudent = cache(async (assignmentId: string, studentId: string) => {
  const { data, error } = await admin()
    .from("assignments")
    .select(
      `
        id,
        class_id,
        unit_version_id,
        open_at,
        due_at,
        is_live,
        classes(name),
        unit_versions(
          id,
          units(title)
        ),
        student_assignment_progress!left(
          id,
          current_node_id,
          status,
          mastery_score,
          last_active_at
        )
      `
    )
    .eq("id", assignmentId)
    .eq("student_assignment_progress.student_id", studentId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
});

export const listStudentAssignments = cache(async (studentId: string) => {
  const { data, error } = await admin()
    .from("class_enrollments")
    .select(
      `
        classes!inner(id, name),
        assignments!inner(
          id,
          class_id,
          unit_version_id,
          open_at,
          due_at,
          is_live,
          unit_versions!inner(
            units!inner(title)
          )
        ),
        student_assignment_progress(
          id,
          current_node_id,
          status,
          mastery_score,
          last_active_at
        )
      `
    )
    .eq("student_id", studentId)
    .eq("status", "active");

  if (error) {
    throw error;
  }

  return (data ?? []).flatMap((row) => {
    const assignment = firstRelation(row.assignments);
    const progress = firstRelation(row.student_assignment_progress);
    const classroom = firstRelation(row.classes);
    const unitVersion = firstRelation(assignment?.unit_versions);
    const unit = firstRelation(unitVersion?.units);

    if (!assignment || !classroom) {
      return [];
    }

    return [
      {
        id: assignment.id,
        class_id: assignment.class_id,
        unit_version_id: assignment.unit_version_id,
        open_at: assignment.open_at,
        due_at: assignment.due_at,
        is_live: assignment.is_live,
        unit_title: unit?.title ?? "Untitled unit",
        class_name: classroom.name,
        progress_id: progress?.id ?? null,
        current_node_id: progress?.current_node_id ?? null,
        status: progress?.status ?? "not_started",
        mastery_score: progress?.mastery_score ?? 0,
        last_active_at: progress?.last_active_at ?? null
      } satisfies AssignmentListItem
    ];
  });
});

export const getLessonNodePayload = cache(async (nodeId: string, studentId: string, assignmentId: string) => {
  const [{ data: node, error: nodeError }, { count, error: attemptsError }] = await Promise.all([
    admin()
      .from("lesson_nodes")
      .select(
        "id, unit_version_id, node_key, node_type, title, content_json, scoring_json, mastery_tags, layout_type"
      )
      .eq("id", nodeId)
      .single(),
    admin()
      .from("student_node_attempts")
      .select("*", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("assignment_id", assignmentId)
      .eq("node_id", nodeId)
  ]);

  if (nodeError) {
    throw nodeError;
  }

  if (attemptsError) {
    throw attemptsError;
  }

  return {
    node: node as LessonNodeRecord,
    attemptCount: count ?? 0
  } satisfies LessonNodePayload;
});

export const getStudentProgress = cache(async (assignmentId: string, studentId: string) => {
  const { data, error } = await admin()
    .from("student_assignment_progress")
    .select("id, assignment_id, student_id, current_node_id, status, mastery_score, last_active_at, completed_at")
    .eq("assignment_id", assignmentId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as StudentProgressRecord | null;
});

export const getTransitionsForNode = cache(async (nodeId: string) => {
  const { data, error } = await admin()
    .from("node_transitions")
    .select("id, from_node_id, to_node_id, condition_type, condition_json, priority_order")
    .eq("from_node_id", nodeId)
    .order("priority_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as NodeTransitionRecord[];
});

export const listTeacherClasses = cache(async (teacherId: string) => {
  const { data, error } = await admin()
    .from("classes")
    .select("id, name, subject, academic_year, created_at")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
});

export const getTeacherClassDetails = cache(async (classId: string) => {
  const { data, error } = await admin()
    .from("classes")
    .select(
      `
        id,
        name,
        subject,
        academic_year,
        class_enrollments(
          id,
          status,
          student:profiles!class_enrollments_student_id_fkey(
            id,
            display_name,
            email
          )
        ),
        assignments(
          id,
          open_at,
          due_at,
          is_live,
          unit_versions(
            units(title)
          )
        )
      `
    )
    .eq("id", classId)
    .single();

  if (error) {
    throw error;
  }

  return data;
});

export const getTeacherAssignmentAnalytics = cache(async (assignmentId: string) => {
  const { data, error } = await admin().rpc("get_assignment_analytics", {
    target_assignment_id: assignmentId
  });

  if (error) {
    throw error;
  }

  return data ?? [];
});

export const getTeacherAssignmentRoster = cache(async (assignmentId: string) => {
  const { data, error } = await admin()
    .from("student_assignment_progress")
    .select(
      `
        id,
        status,
        mastery_score,
        last_active_at,
        completed_at,
        current_node:lesson_nodes!student_assignment_progress_current_node_id_fkey(id, title),
        student:profiles!student_assignment_progress_student_id_fkey(id, display_name, email)
      `
    )
    .eq("assignment_id", assignmentId)
    .order("last_active_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((entry) => ({
    ...entry,
    student: firstRelation(entry.student),
    current_node: firstRelation(entry.current_node)
  }));
});

export const getProfile = cache(async (profileId: string) => {
  const { data, error } = await admin()
    .from("profiles")
    .select("id, display_name, email, role, created_at")
    .eq("id", profileId)
    .single();

  if (error) {
    throw error;
  }

  return data as Profile;
});
