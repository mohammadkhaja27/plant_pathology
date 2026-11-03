"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, HelpCircle, Loader2 } from "lucide-react";
import { api, FeedbackRating } from "@/lib/api";
import type { PredictionResponse } from "@/lib/api";

/**
 * Post-scan feedback panel: lets the user report whether the prediction was
 * correct. Feedback is stored as local metadata only and never changes the
 * model, the metrics, or the displayed prediction.
 */
export function FeedbackPanel({ result }: { result: PredictionResponse }) {
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [comment, setComment] = useState("");

  const top = result.top_prediction ?? null;
  if (!top || result.demo_mode) return null;

  const send = async (rating: FeedbackRating, withDetail: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.submitFeedback({
        rating,
        predicted_disease: top.disease || null,
        actual_disease: null,
        comment: withDetail ? comment || null : null,
      });
      if (res.status === "ok") setSubmitted(rating);
      else setError("Feedback could not be recorded.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record feedback.");
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <div
        className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100"
        role="status"
      >
        <p className="font-semibold">Feedback recorded — thank you.</p>
        <p className="mt-1 text-emerald-800 dark:text-emerald-200">
          Your note is stored locally with the scan metadata. It helps document
          where the model struggles; it does not alter the model or the metrics.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-[var(--pp-border)] bg-[var(--pp-surface)] p-4"
      data-testid="feedback-panel"
    >
      <h3 className="font-semibold">Was this prediction correct?</h3>
      <p className="mt-1 text-xs text-[var(--pp-muted)]">
        Optional: your feedback is stored locally (no image, no account) and
        never modifies the model.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => send("correct", false)}
          className="inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100"
        >
          <ThumbsUp className="h-4 w-4" aria-hidden /> Correct
        </button>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          disabled={busy}
          aria-expanded={showForm}
          className="inline-flex items-center gap-2 rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100"
        >
          <ThumbsDown className="h-4 w-4" aria-hidden /> Incorrect
        </button>
        <button
          type="button"
          onClick={() => send("unsure", false)}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md border border-[var(--pp-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--pp-bg)] disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <HelpCircle className="h-4 w-4" aria-hidden />
          )}
          Not sure
        </button>
      </div>

      {showForm ? (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            send("incorrect", true);
          }}
        >
          <label htmlFor="feedback-comment" className="block text-xs font-medium text-[var(--pp-muted)]">
            What does the leaf actually look like, or what went wrong?
          </label>
          <textarea
            id="feedback-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="e.g. It is actually Septoria leaf spot, or the image was not a leaf."
            className="w-full rounded-md border border-[var(--pp-border)] bg-[var(--pp-bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
            required
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <ThumbsDown className="h-4 w-4" aria-hidden />
              )}
              Submit as incorrect
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-[var(--pp-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--pp-bg)]"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-[var(--pp-muted)]">
            An &quot;incorrect&quot; report should describe the actual disease or issue
            (the model is never updated automatically).
          </p>
        </form>
      ) : null}

      {error ? (
        <p className="mt-2 text-sm text-rose-700 dark:text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
