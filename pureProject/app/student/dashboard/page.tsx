import { StudentProgressCard } from "@/components/StudentProgressCard";
import { requireAuth } from "@/lib/auth";
import { listStudentAssignments } from "@/lib/data";

export default async function StudentDashboardPage() {
  const auth = await requireAuth(["student"]);
  const assignments = await listStudentAssignments(auth.userId);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-white p-8 shadow-card">
        <p className="text-sm uppercase tracking-[0.25em] text-sky-700">Student dashboard</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          Welcome back, {auth.profile.display_name}
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Your assigned units stay pinned to a published version, so the lesson path stays stable
          while teachers monitor where support is needed.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {assignments.map((assignment) => (
          <StudentProgressCard key={assignment.id} assignment={assignment} />
        ))}
      </section>
    </div>
  );
}
