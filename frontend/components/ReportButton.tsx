"use client";

import { useState } from "react";
import { Download, FileText, Loader2, Printer } from "lucide-react";
import {
  PredictionResponse,
  LOW_CONFIDENCE_FALLBACK,
  DiseaseInfo,
} from "@/lib/api";
import { formatPercent, formatDate } from "@/lib/utils";

function esc(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildReportHtml(
  result: PredictionResponse,
  unavailableReason?: string | null,
  imageUrl?: string | null,
): string {
  const topPredictions = Array.isArray(result.top_predictions)
    ? result.top_predictions
    : [];
  const top = result.top_prediction ?? null;
  const info: DiseaseInfo | null | undefined = result.disease_info;
  const topRows = topPredictions
    .map(
      (p) =>
        `<tr><td>${p.rank}</td><td>${esc(p.disease)}</td><td>${esc(p.crop)}</td><td>${formatPercent(p.probability, 2)}</td></tr>`,
    )
    .join("");
  const predictionBlock = top
    ? `<p class="kv"><strong>Crop:</strong> ${result.crop || top.crop}</p>
<p class="kv"><strong>Condition:</strong> ${result.condition || top.disease}</p>
<p class="kv"><strong>Detected disease:</strong> ${result.condition === "healthy" ? "Healthy (no disease class predicted)" : result.detected_disease || result.disease || top.disease}</p>
<p class="kv"><strong>Top class:</strong> ${top.class_name}</p>
<p class="kv"><strong>Confidence:</strong> ${formatPercent(top.probability, 2)}${result.confidence_band ? ` (${result.confidence_band})` : ""}</p>
${
  result.low_confidence
    ? `<p class="kv" style="color:#a4001e"><strong>Low confidence:</strong> ${result.low_confidence_message || LOW_CONFIDENCE_FALLBACK}</p>`
    : ""
}`
    : `<p class="kv"><strong>No prediction was returned by the backend</strong>, so no disease, crop, or confidence is reported in this document. Nothing has been substituted in its place.</p>${
        unavailableReason
          ? `<p class="kv"><strong>Backend reason:</strong> ${unavailableReason}</p>`
          : ""
      }`;
  const topPredictionsBlock = top
    ? `<h2>Top Predictions</h2>
<table>
<thead><tr><th>Rank</th><th>Disease</th><th>Crop</th><th>Probability</th></tr></thead>
<tbody>${topRows}</tbody>
</table>`
    : "";

  // Treatment & pesticide guidance from the knowledge base (only when the
  // backend attached a confident match — never invented).
  const treatmentBlock = info
    ? `<h2>Treatment &amp; Guidance</h2>
<p class="kv"><strong>Guidance source:</strong> PlantPath AI knowledge base — ${esc(info.sources?.join("; ") || "sources not recorded")}</p>
${
  info.incurable
    ? `<p class="kv warn"><strong>No established chemical cure.</strong> This disease cannot be cured with pesticides; management focuses on containment, vector control, and removing infected material.</p>`
    : ""
}
${
  (info.treatment || []).length
    ? `<h2>Treatment Steps</h2><ol class="steps">${(info.treatment || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ol>`
    : ""
}
${
  (info.pesticides || []).length
    ? `<h2>Recommended Pesticides (follow the product label)</h2>
<table>
<thead><tr><th>Category</th><th>Active ingredients</th><th>Application</th></tr></thead>
<tbody>${(info.pesticides || [])
        .map(
          (p) =>
            `<tr><td>${esc(p.category)}</td><td>${esc(p.active_ingredients?.join(", "))}</td><td>${esc(p.application)}</td></tr>`,
        )
        .join("")}</tbody>
</table>`
    : ""
}
${(info.management || []).length ? `<h2>Management</h2><ul class="steps">${(info.management || []).map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : ""}
${(info.prevention || []).length ? `<h2>Prevention</h2><ul class="steps">${(info.prevention || []).map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : ""}
${info.disclaimer ? `<p class="kv"><strong>Disclaimer:</strong> ${esc(info.disclaimer)}</p>` : ""}`
    : "";

  const imageBlock = imageUrl
    ? `<div class="report-image"><img src="${imageUrl}" alt="Uploaded leaf image" /></div>`
    : `<p class="kv">The uploaded image is not embedded in this report.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>PlantPath AI — Analysis Report</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #14201a; margin: 40px; line-height: 1.55; }
  h1 { font-size: 22px; border-bottom: 2px solid #2d6745; padding-bottom: 8px; }
  h2 { font-size: 15px; margin-top: 24px; color: #245238; }
  table { border-collapse: collapse; width: 100%; margin-top: 8px; font-size: 13px; }
  th, td { border: 1px solid #d7e0d8; padding: 6px 10px; text-align: left; }
  th { background: #f0f7f1; }
  .meta { font-size: 13px; color: #4a5c52; }
  .banner { background: #fff7e6; border: 1px solid #e0c48a; padding: 12px; font-size: 12px; margin: 12px 0; }
  .demo { background: #fff3e0; border: 1px solid #ffb74d; padding: 12px; font-size: 12px; margin: 12px 0; font-weight: bold; }
  .footer { margin-top: 32px; font-size: 11px; color: #4a5c52; border-top: 1px solid #d7e0d8; padding-top: 12px; }
  .kv { margin: 4px 0; font-size: 14px; }
  .steps { margin: 8px 0 0 0; padding-left: 22px; font-size: 13px; }
  .steps li { margin-bottom: 5px; }
  .warn { color: #a4001e; font-weight: bold; }
  .report-image img { max-width: 320px; max-height: 320px; border: 1px solid #d7e0d8; border-radius: 4px; margin-top: 8px; }
  @media print {
    body { margin: 0; font-size: 12pt; color: #000; background: #fff; }
    .banner, .demo { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .footer { font-size: 9pt; border-top-color: #999; }
    h1 { font-size: 18pt; }
    h2 { font-size: 13pt; }
  }
</style>
</head>
<body>
<h1>PlantPath AI — Analysis Report</h1>
<p class="meta">Generated: ${formatDate(new Date().toISOString())}</p>
${
  result.demo_mode
    ? `<div class="demo">DEMO MODE — This report contains demonstration values only. They are NOT real ML predictions.</div>`
    : ""
}
<div class="banner">
<strong>Academic Disclaimer.</strong> PlantPath AI is a research and educational prototype.
Predictions are limited to the classes represented by the connected model and should not be
treated as definitive agricultural diagnosis. Field performance may differ from
controlled-dataset performance.
</div>

<h2>Image</h2>
${imageBlock}
<p class="kv"><strong>Dimensions:</strong> ${result.validation?.width ?? "—"} × ${result.validation?.height ?? "—"} px</p>
<p class="kv"><strong>Format:</strong> ${result.validation?.format ?? "—"}</p>
<p class="kv"><strong>File size:</strong> ${result.validation?.file_size_bytes != null ? (result.validation.file_size_bytes / 1024).toFixed(1) + " KB" : "—"}</p>

<h2>Prediction</h2>
${predictionBlock}
<p class="kv"><strong>Model:</strong> ${result.model?.name || "Model name not reported"} — ${result.model?.architecture || "architecture not reported"}</p>
<p class="kv"><strong>Model status:</strong> ${
  top
    ? result.demo_mode
      ? "Demo mode"
      : "Live model — result returned by the backend"
    : result.demo_mode
      ? "Demo mode — no real prediction exists"
      : "No prediction returned — predictions are unavailable for this model"
}</p>

${topPredictionsBlock}

<h2>Explainability (Grad-CAM)</h2>
<p class="kv">${
  result.explainability?.available
    ? "Grad-CAM heatmap was generated for this prediction."
    : "Explainability unavailable for this model." +
      (result.explainability?.message ? " " + result.explainability.message : "")
}</p>

<h2>Severity Assessment</h2>
<p class="kv">${
  result.severity?.available
    ? `Affected area: ${result.severity.affected_area_percent}% — Level: ${result.severity.severity_level}`
    : "Severity assessment is currently unavailable for this model." +
      (result.severity?.unavailable_reason || result.severity?.reason || result.severity?.message
        ? " " + (result.severity.unavailable_reason || result.severity.reason || result.severity.message)
        : "")
}</p>

${treatmentBlock}

<h2>Limitations</h2>
<ul>
${(result.limitations || []).map((l) => `<li>${l}</li>`).join("")}
</ul>

<div class="footer">
PlantPath AI — B.Tech Computer Science research prototype.<br/>
No paid AI APIs were used. Predictions are limited to connected model classes.
Confidence values are model probability distributions, not diagnostic guarantees.
</div>
</body>
</html>`;
}

/** Resolve any image URL (object URL or data URL) to an embeddable data URL. */
async function toDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function ReportButton({
  result,
  unavailableReason,
  imageUrl,
}: {
  result: PredictionResponse;
  unavailableReason?: string | null;
  /** Object-URL / data-URL of the analyzed image, embedded into the report. */
  imageUrl?: string | null;
}) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const dataUrl = await toDataUrl(imageUrl);
      const html = buildReportHtml(result, unavailableReason, dataUrl);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      a.href = url;
      a.download = `plantpath-report-${(result.crop || "scan").toLowerCase()}-${stamp}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  const printPdf = async () => {
    const dataUrl = await toDataUrl(imageUrl);
    const html = buildReportHtml(result, unavailableReason, dataUrl);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-md bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-800 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Download className="h-4 w-4" aria-hidden />
        )}
        Download Report
      </button>
      <button
        type="button"
        onClick={printPdf}
        className="inline-flex items-center gap-2 rounded-md border border-[var(--pp-border)] bg-[var(--pp-surface)] px-4 py-2.5 text-sm font-medium text-[var(--pp-text)] hover:bg-[var(--pp-bg)]"
        title="Open in new tab and use browser Print → Save as PDF"
      >
        <Printer className="h-4 w-4" aria-hidden />
        Print / PDF
      </button>
      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--pp-muted)]">
        <FileText className="h-3.5 w-3.5" aria-hidden />
        Local HTML report — no paid reporting API
      </span>
    </div>
  );
}
