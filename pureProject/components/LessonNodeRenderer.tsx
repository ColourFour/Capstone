import type { LessonNodePayload } from "@/lib/engine/types";

import { AnswerInput } from "@/components/AnswerInput";
import { MathPrompt } from "@/components/MathPrompt";

export function LessonNodeRenderer({
  assignmentId,
  nodePayload
}: {
  assignmentId: string;
  nodePayload: LessonNodePayload;
}) {
  const nodeTypeStyles: Record<string, string> = {
    question: "bg-white",
    hint: "bg-amber-50 border-amber-200",
    worked_example: "bg-orange-50 border-orange-200",
    instruction: "bg-white",
    checkpoint: "bg-sky-50 border-sky-200",
    review: "bg-white",
    extension: "bg-emerald-50 border-emerald-200"
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <article
        className={`rounded-[2rem] border p-8 shadow-card ${nodeTypeStyles[nodePayload.node.node_type] ?? "bg-white"}`}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-sky-700">
              {nodePayload.node.node_type.replaceAll("_", " ")}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              {nodePayload.node.title}
            </h1>
          </div>
          {nodePayload.node.mastery_tags?.length ? (
            <div className="flex flex-wrap justify-end gap-2">
              {nodePayload.node.mastery_tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <MathPrompt content={nodePayload.node.content_json} />
      </article>

      <aside className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-card">
          <div className="text-sm uppercase tracking-[0.2em] text-sky-300">Focus mode</div>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            Your next step is chosen on the server after each submission, so every move in the lesson
            stays consistent and auditable.
          </p>
        </div>
        <AnswerInput assignmentId={assignmentId} nodePayload={nodePayload} />
      </aside>
    </section>
  );
}
