"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2, Loader2, Filter, X, BarChart3 } from "lucide-react";
import { api, HistoryItem, HistoryStats, ApiError, HistoryFilters } from "@/lib/api";
import { formatDate, formatPercent } from "@/lib/utils";
import {
  EmptyState,
  ErrorState,
  SectionHeading,
  Disclaimer,
} from "@/components/ui";

/** Compact analytics computed from genuine stored scan metadata. */
function StatsSection({ stats }: { stats: HistoryStats }) {
  if (!stats || stats.total_scans === 0) {
    return (
      <div className="rounded-xl border border-[var(--pp-border)] bg-[var(--pp-surface)] p-5">
        <h3 className="flex items-center gap-2 font-semibold">
          <BarChart3 className="h-4 w-4 text-forest-600 dark:text-leaf-400" aria-hidden />
          Scan Analytics
        </h3>
        <p className="mt-2 text-sm text-[var(--pp-muted)]">
          No scans recorded yet. Analytics appear here once predictions are made
          and stored locally.
        </p>
      </div>
    );
  }
  const bands = stats.confidence_bands || { low: 0, medium: 0, high: 0 };
  const cards: Array<[string, string | number]> = [
    ["Total scans", stats.total_scans],
    ["Diseased", stats.total_diseased ?? 0],
    ["Healthy", stats.total_healthy ?? 0],
    ["Unique crops", stats.unique_crops ?? 0],
    ["Unique diseases", stats.unique_diseases ?? 0],
    ["Avg confidence", stats.avg_confidence != null ? (stats.avg_confidence * 100).toFixed(1) + "%" : "—"],
  ];
  return (
    <div
      className="rounded-xl border border-[var(--pp-border)] bg-[var(--pp-surface)] p-5"
      data-testid="scan-analytics"
    >
      <h3 className="flex items-center gap-2 font-semibold">
        <BarChart3 className="h-5 w-5 text-forest-600 dark:text-leaf-400" aria-hidden />
        Scan Analytics
      </h3>
      <p className="mt-1 text-xs text-[var(--pp-muted)]">{stats.note}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-[var(--pp-border)] bg-[var(--pp-bg)] p-3">
            <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--pp-muted)]">{label}</div>
            <div className="mt-1 text-xl font-bold">{value}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--pp-muted)]">Confidence bands</div>
          <div className="mt-1 space-y-1 text-sm">
            <div className="flex justify-between"><span>High (&ge; 75%)</span><span className="font-mono">{bands.high}</span></div>
            <div className="flex justify-between"><span>Medium (0.55–0.75)</span><span className="font-mono">{bands.medium}</span></div>
            <div className="flex justify-between"><span>Low (&lt; 0.55)</span><span className="font-mono">{bands.low}</span></div>
          </div>
        </div>
        <div className="sm:col-span-2">
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--pp-muted)]">Most scanned crops</div>
          <ul className="mt-1.5 space-y-1 text-sm">
            {(stats.top_crops || []).slice(0, 3).map((c) => (
              <li key={c.crop} className="flex justify-between gap-2">
                <span className="font-medium">{c.crop}</span>
                <span className="font-mono text-[var(--pp-muted)]">{c.count}</span>
              </li>
            ))}
            {(stats.top_crops || []).length === 0 ? <li className="text-[var(--pp-muted)]">—</li> : null}
          </ul>
        </div>
      </div>
      <p className="mt-4 text-xs text-[var(--pp-muted)]">
        Median confidence: {stats.median_confidence != null ? (stats.median_confidence * 100).toFixed(1) + "%" : "—"}
        {stats.first_scan ? ` · first scan ${formatDate(stats.first_scan)}` : ""}
        {stats.last_scan ? ` · latest ${formatDate(stats.last_scan)}` : ""}
      </p>
    </div>
  );
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<HistoryFilters>({});
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async (limit: number = 200, f?: HistoryFilters) => {
    setLoading(true);
    try {
      const d = await api.history(limit, f);
      setItems(Array.isArray(d.items) ? d.items : []);
      setTotal(typeof d.total === "number" ? d.total : 0);
      setError(null);
    } catch (e) {
      setItems([]);
      setTotal(0);
      setError(e instanceof ApiError ? e.message : "Failed to load history.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      setStats(await api.historyStats());
    } catch {
      setStats(null);
    }
  }, []);

  useEffect(() => {
    load(200);
    loadStats();
  }, [load, loadStats]);

  const applyFilters = useCallback(
    (f: HistoryFilters) => {
      setFilters(f);
      load(200, f);
    },
    [load],
  );

  const deleteItem = useCallback(
    async (id: number) => {
      setDeleting(id);
      try {
        await api.deleteHistoryItem(id);
        setSelected(null);
        await load(200, filters);
        await loadStats();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete item.");
      } finally {
        setDeleting(null);
      }
    },
    [load, loadStats, filters],
  );

  const clear = useCallback(async () => {
    setClearing(true);
    try {
      await api.clearHistory();
      setFilters({});
      await load(200);
      await loadStats();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to clear history.");
    } finally {
      setClearing(false);
    }
  }, [load, loadStats]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          eyebrow="Local Records"
          title="Analysis History"
          description="Prediction metadata is stored in SQLite on the backend. Uploaded images are not permanently stored."
        />
        <button
          type="button"
          onClick={clear}
          disabled={clearing || total === 0}
          className="inline-flex items-center gap-2 rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100"
        >
          {clearing ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="h-4 w-4" aria-hidden />
          )}
          Clear History
        </button>
      </div>

      <div className="mt-8 space-y-6">
        <StatsSection stats={stats ?? { total_scans: 0 }} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className="inline-flex items-center gap-2 rounded-md border border-[var(--pp-border)] bg-[var(--pp-surface)] px-4 py-2 text-sm font-medium hover:bg-[var(--pp-bg)]"
          >
            <Filter className="h-4 w-4" aria-hidden />
            Filters
            {Object.values(filters).some((v) => v != null && v !== "") ? (
              <span className="rounded-full bg-forest-100 px-2 py-0.5 text-[11px] font-semibold text-forest-800 dark:bg-forest-900 dark:text-forest-100">
                active
              </span>
            ) : null}
          </button>
          {Object.values(filters).some((v) => v != null && v !== "") ? (
            <button
              type="button"
              onClick={() => applyFilters({})}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--pp-muted)] hover:text-[var(--pp-text)]"
            >
              <X className="h-3.5 w-3.5" aria-hidden /> Clear filters
            </button>
          ) : null}
        </div>

        {showFilters ? (
          <div
            className="rounded-xl border border-[var(--pp-border)] bg-[var(--pp-surface)] p-5"
            data-testid="history-filters"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="f-crop" className="block text-xs font-medium text-[var(--pp-muted)]">Crop</label>
                <input
                  id="f-crop"
                  value={filters.crop || ""}
                  onChange={(e) => applyFilters({ ...filters, crop: e.target.value || undefined })}
                  placeholder="e.g. Tomato"
                  className="mt-1 w-full rounded-md border border-[var(--pp-border)] bg-[var(--pp-bg)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="f-condition" className="block text-xs font-medium text-[var(--pp-muted)]">Condition</label>
                <select
                  id="f-condition"
                  value={filters.condition || ""}
                  onChange={(e) => applyFilters({ ...filters, condition: e.target.value || undefined })}
                  className="mt-1 w-full rounded-md border border-[var(--pp-border)] bg-[var(--pp-bg)] px-3 py-2 text-sm"
                >
                  <option value="">All</option>
                  <option value="diseased">Diseased</option>
                  <option value="healthy">Healthy</option>
                </select>
              </div>
              <div>
                <label htmlFor="f-mode" className="block text-xs font-medium text-[var(--pp-muted)]">Mode</label>
                <select
                  id="f-mode"
                  value={filters.mode || ""}
                  onChange={(e) => applyFilters({ ...filters, mode: (e.target.value || undefined) as HistoryFilters["mode"] })}
                  className="mt-1 w-full rounded-md border border-[var(--pp-border)] bg-[var(--pp-bg)] px-3 py-2 text-sm"
                >
                  <option value="">All modes</option>
                  <option value="real">Real</option>
                  <option value="demo">Demo</option>
                </select>
              </div>
              <div>
                <label htmlFor="f-search" className="block text-xs font-medium text-[var(--pp-muted)]">Search</label>
                <input
                  id="f-search"
                  value={filters.search || ""}
                  onChange={(e) => applyFilters({ ...filters, search: e.target.value || undefined })}
                  placeholder="crop or disease…"
                  className="mt-1 w-full rounded-md border border-[var(--pp-border)] bg-[var(--pp-bg)] px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <div>
                <label htmlFor="f-minconf" className="block text-xs font-medium text-[var(--pp-muted)]">
                  Min confidence: {filters.min_confidence != null ? (filters.min_confidence * 100).toFixed(0) + "%" : "any"}
                </label>
                <input
                  id="f-min-conf"
                  type="range"
                  min={0}
                  max={100}
                  value={filters.min_confidence != null ? filters.min_confidence * 100 : 0}
                  onChange={(e) =>
                    applyFilters({ ...filters, min_confidence: Number(e.target.value) / 100 || undefined })
                  }
                  className="mt-1 w-40"
                />
              </div>
              <div>
                <label htmlFor="f-max-conf" className="block text-xs font-medium text-[var(--pp-muted)]">
                  Max confidence: {filters.max_confidence != null ? (filters.max_confidence * 100).toFixed(0) + "%" : "any"}
                </label>
                <input
                  id="f-max-conf"
                  type="range"
                  min={0}
                  max={100}
                  value={filters.max_confidence != null ? filters.max_confidence * 100 : 100}
                  onChange={(e) =>
                    applyFilters({
                      ...filters,
                      max_confidence: Number(e.target.value) >= 100 ? undefined : Number(e.target.value) / 100,
                    })
                  }
                  className="mt-1 w-40"
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-16 rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={() => load(200, filters)} />
          ) : items.length === 0 ? (
          <EmptyState
            title="No predictions recorded"
            description="History is only written when the backend returns a real prediction. With no verified model connected, no prediction is generated, so this list stays empty — that is the correct outcome, not a fault."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--pp-border)] bg-[var(--pp-surface)]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--pp-border)] bg-[var(--pp-bg)] text-xs uppercase tracking-wide text-[var(--pp-muted)]">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Crop</th>
                  <th className="px-4 py-3 font-semibold">Disease</th>
                  <th className="px-4 py-3 font-semibold">Confidence</th>
                  <th className="px-4 py-3 font-semibold">Model</th>
                  <th className="px-4 py-3 font-semibold">Mode</th>
                  <th className="px-4 py-3 font-semibold">
                    <span className="sr-only">Delete</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer border-b border-[var(--pp-border)] hover:bg-forest-50 dark:hover:bg-forest-900/20"
                    onClick={() => setSelected(item)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setSelected(item);
                    }}
                    role="button"
                    aria-label={`Open history entry for ${item.disease || item.filename}`}
                  >
                    <td className="px-4 py-3 text-[var(--pp-muted)]">
                      {formatDate(item.timestamp)}
                    </td>
                    <td className="px-4 py-3 font-medium">{item.crop || "—"}</td>
                    <td className="px-4 py-3">{item.disease || "—"}</td>
                    <td className="px-4 py-3 font-mono">
                      {item.confidence == null ? "—" : formatPercent(item.confidence, 1)}
                    </td>
                    <td className="px-4 py-3 text-[var(--pp-muted)]">{item.model || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          item.mode === "real"
                            ? "rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100"
                            : "rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-100"
                        }
                      >
                        {item.mode === "real" ? "Real" : "Demo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={deleting === item.id}
                        aria-label={`Delete history entry ${item.id}`}
                        title="Delete this entry"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteItem(item.id);
                        }}
                        className="inline-flex items-center rounded-md p-1.5 text-[var(--pp-muted)] hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:hover:bg-rose-950/40"
                      >
                        {deleting === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Trash2 className="h-4 w-4" aria-hidden />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </div>

      {selected ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="History details"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-t-xl border border-[var(--pp-border)] bg-[var(--pp-surface)] p-6 sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">Analysis Details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--pp-muted)]">Timestamp</dt>
                <dd>{formatDate(selected.timestamp)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--pp-muted)]">Image</dt>
                <dd>{selected.filename}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--pp-muted)]">Crop</dt>
                <dd>{selected.crop || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--pp-muted)]">Disease</dt>
                <dd>{selected.disease || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--pp-muted)]">Condition</dt>
                <dd className="capitalize">{selected.condition || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--pp-muted)]">Confidence</dt>
                <dd className="font-mono">
                  {selected.confidence == null ? "—" : formatPercent(selected.confidence, 2)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--pp-muted)]">Model</dt>
                <dd>{selected.model || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--pp-muted)]">Mode</dt>
                <dd className="capitalize">{selected.mode || "—"}</dd>
              </div>
            </dl>
            {selected.top_predictions && selected.top_predictions.length > 0 ? (
              <div className="mt-5">
                <h3 className="text-sm font-semibold">Top Predictions</h3>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {selected.top_predictions.map((p) => (
                    <li key={p.class_name} className="flex justify-between gap-3">
                      <span>
                        {p.rank}. {p.disease}
                      </span>
                      <span className="font-mono text-[var(--pp-muted)]">
                        {formatPercent(p.probability, 2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={deleting === selected.id}
                onClick={() => deleteItem(selected.id)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100"
              >
                {deleting === selected.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden />
                )}
                Delete This Entry
              </button>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="w-full rounded-md border border-[var(--pp-border)] px-4 py-2 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-10">
        <Disclaimer />
      </div>
    </div>
  );
}
