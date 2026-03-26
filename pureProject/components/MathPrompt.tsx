import type { LessonNodeContent } from "@/lib/engine/types";

export function MathPrompt({ content }: { content: LessonNodeContent }) {
  return (
    <div className="space-y-4">
      {content.prompt ? <p className="text-lg font-medium text-slate-900">{content.prompt}</p> : null}
      {content.questionLatex ? (
        <div className="rounded-2xl bg-slate-950 px-5 py-4 text-xl font-semibold text-white">
          {content.questionLatex}
        </div>
      ) : null}
      {content.body ? <p className="leading-7 text-slate-700">{content.body}</p> : null}
      {content.workedSteps?.length ? (
        <ol className="space-y-2 rounded-2xl bg-amber-50 p-5 text-sm text-amber-950">
          {content.workedSteps.map((step, index) => (
            <li key={`${step}-${index}`}>{`${index + 1}. ${step}`}</li>
          ))}
        </ol>
      ) : null}
      {content.explanation ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
          {content.explanation}
        </div>
      ) : null}
    </div>
  );
}
