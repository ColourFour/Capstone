import Link from "next/link";

import type { AssignmentListItem } from "@/lib/engine/types";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";

export function StudentProgressCard({ assignment }: { assignment: AssignmentListItem }) {
  const statusTone =
    assignment.status === "completed"
      ? "bg-emerald-100 text-emerald-700"
      : assignment.status === "in_progress"
        ? "bg-sky-100 text-sky-700"
        : "bg-slate-100 text-slate-700";

  return (
    <Link
      href={`/student/assignment/${assignment.id}`}
      className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-card transition hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{assignment.class_name}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
            {assignment.unit_title}
          </h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone}`}>
          {assignment.status?.replaceAll("_", " ")}
        </span>
      </div>
      <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
        <div>
          <p className="font-medium text-slate-900">Mastery</p>
          <p>{assignment.mastery_score ?? 0}%</p>
        </div>
        <div>
          <p className="font-medium text-slate-900">Due</p>
          <p>{formatDateTime(assignment.due_at)}</p>
        </div>
        <div>
          <p className="font-medium text-slate-900">Last active</p>
          <p>{formatRelativeTime(assignment.last_active_at)}</p>
        </div>
      </div>
    </Link>
  );
}
