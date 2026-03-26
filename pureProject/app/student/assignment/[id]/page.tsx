import { notFound } from "next/navigation";

import { LessonNodeRenderer } from "@/components/LessonNodeRenderer";
import { requireAuth } from "@/lib/auth";
import { getLessonNodePayload, getStudentProgress } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatRelativeTime } from "@/lib/utils";

export default async function StudentAssignmentPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = await requireAuth(["student"]);
  const progress = await getStudentProgress(id, auth.userId);

  if (!progress?.current_node_id) {
    notFound();
  }

  const nodePayload = await getLessonNodePayload(progress.current_node_id, auth.userId, id);
  const admin = createAdminClient();
  const { data: assignment } = await admin
    .from("assignments")
    .select("id, due_at, unit_versions(units(title))")
    .eq("id", id)
    .single();
  const unitVersion = Array.isArray(assignment?.unit_versions)
    ? assignment.unit_versions[0]
    : assignment?.unit_versions;
  const unit = Array.isArray(unitVersion?.units) ? unitVersion.units[0] : unitVersion?.units;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[2rem] bg-white p-6 shadow-card sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-sky-700">Current assignment</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {unit?.title ?? "Lesson"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Status: {progress.status.replaceAll("_", " ")}. Last active {formatRelativeTime(progress.last_active_at)}.
          </p>
        </div>
        <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Mastery score: <span className="font-semibold">{progress.mastery_score}%</span>
        </div>
      </section>

      <LessonNodeRenderer assignmentId={id} nodePayload={nodePayload} />
    </div>
  );
}
