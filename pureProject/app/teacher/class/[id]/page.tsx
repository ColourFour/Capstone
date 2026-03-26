import Link from "next/link";

import { requireAuth } from "@/lib/auth";
import { getTeacherClassDetails } from "@/lib/data";

export default async function TeacherClassPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth(["teacher", "admin"]);
  const { id } = await params;
  const classroom = await getTeacherClassDetails(id);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-white p-8 shadow-card">
        <p className="text-sm uppercase tracking-[0.2em] text-sky-700">Class overview</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">{classroom.name}</h1>
        <p className="mt-3 text-slate-600">
          {classroom.subject} for {classroom.academic_year}
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Roster</h2>
          <div className="mt-6 space-y-4">
            {classroom.class_enrollments.map((enrollment) => {
              const student = Array.isArray(enrollment.student)
                ? enrollment.student[0]
                : enrollment.student;

              return (
                <div key={enrollment.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="font-medium text-slate-900">{student?.display_name}</div>
                  <div className="text-sm text-slate-600">{student?.email}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Assignments</h2>
          <div className="mt-6 space-y-4">
            {classroom.assignments.map((assignment) => {
              const unitVersion = Array.isArray(assignment.unit_versions)
                ? assignment.unit_versions[0]
                : assignment.unit_versions;
              const unit = Array.isArray(unitVersion?.units) ? unitVersion.units[0] : unitVersion?.units;

              return (
                <Link
                  key={assignment.id}
                  href={`/teacher/assignment/${assignment.id}`}
                  className="block rounded-2xl border border-slate-200 p-4 transition hover:border-sky-300"
                >
                  <div className="font-medium text-slate-900">{unit?.title ?? "Untitled unit"}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {assignment.is_live ? "Live" : "Not live"} assignment
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
