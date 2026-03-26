"use client";

import { useState, useTransition } from "react";

import type { LessonNodePayload, SubmissionResponse } from "@/lib/engine/types";

interface AnswerInputProps {
  assignmentId: string;
  nodePayload: LessonNodePayload;
}

export function AnswerInput({ assignmentId, nodePayload }: AnswerInputProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const content = nodePayload.node.content_json;
  const nodeType = nodePayload.node.node_type;
  const hasChoices = Array.isArray(content.choices) && content.choices.length > 0;
  const isUngradedStep = !nodePayload.node.scoring_json;

  const submit = () => {
    startTransition(async () => {
      setError(null);
      setFeedback(null);

      const response = await fetch("/api/engine/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          assignmentId,
          answer: {
            value
          }
        })
      });

      const result = (await response.json()) as SubmissionResponse | { error: string };
      if (!response.ok) {
        setError("error" in result ? result.error : "Unable to submit your answer.");
        return;
      }

      const success = result as SubmissionResponse;
      setFeedback(success.evaluation.feedback);
      window.location.reload();
    });
  };

  const continueStep = () => {
    startTransition(async () => {
      const response = await fetch("/api/engine/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          assignmentId,
          answer: {}
        })
      });

      if (!response.ok) {
        const result = (await response.json()) as { error: string };
        setError(result.error);
        return;
      }

      window.location.reload();
    });
  };

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span className="font-medium capitalize">{nodeType.replaceAll("_", " ")}</span>
        <span>Attempt {nodePayload.attemptCount + 1}</span>
      </div>

      {hasChoices ? (
        <div className="grid gap-3">
          {content.choices?.map((choice) => (
            <label
              key={choice.value}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-4 hover:border-sky-300"
            >
              <input
                type="radio"
                name="answer"
                value={choice.value}
                checked={value === choice.value}
                onChange={(event) => setValue(event.target.value)}
              />
              <span>{choice.label}</span>
            </label>
          ))}
        </div>
      ) : isUngradedStep ? null : (
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={content.answerPlaceholder ?? "Type your answer"}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-0 transition focus:border-sky-400"
        />
      )}

      {feedback ? <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{feedback}</div> : null}
      {error ? <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">{error}</div> : null}

      {isUngradedStep ? (
        <button
          onClick={continueStep}
          disabled={pending}
          className="rounded-full bg-slate-950 px-5 py-3 font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "Advancing..." : content.ctaLabel ?? "Continue"}
        </button>
      ) : (
        <button
          onClick={submit}
          disabled={pending || (!value && !hasChoices)}
          className="rounded-full bg-accent px-5 py-3 font-medium text-white transition hover:bg-sky-600 disabled:opacity-60"
        >
          {pending ? "Checking..." : "Submit answer"}
        </button>
      )}
    </div>
  );
}
