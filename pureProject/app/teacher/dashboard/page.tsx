import Link from "next/link";

import { requireAuth } from "@/lib/auth";
import { listTeacherClasses } from "@/lib/data";

export default async function TeacherDashboardPage() {
  const auth = await requireAuth(["teacher", "admin"]);
  const classes = await listTeacherClasses(auth.userId);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-card">
        <p className="text-sm uppercase tracking-[0.25em] text-sky-300">Teacher dashboard</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Instructional bottlenecks at a glance</h1>
        <p className="mt-3 max-w-3xl text-slate-200">
          Monitor student position in the graph, find repeated error patterns, and jump to the
          assignment view that needs intervention next.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {classes.map((classroom) => (
          <Link
            key={classroom.id}
            href={`/teacher/class/${classroom.id}`}
            className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-card transition hover:-translate-y-0.5"
          >
            <p className="text-sm font-medium text-slate-500">{classroom.subject}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{classroom.name}</h2>
            <p className="mt-3 text-sm text-slate-600">Academic year {classroom.academic_year}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
