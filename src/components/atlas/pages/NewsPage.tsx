"use client";

// ─── News ───────────────────────────────────────────────────────────────────────
// Full reading page: source filter chips, text search, headlines with
// relative timestamps. Links open in a new tab.

import React, { useMemo, useState } from "react";
import type { NewsState } from "@/hooks/useNews";
import { useNewsMlStatus } from "@/hooks/useNewsMlStatus";
import { Card, relTime } from "../ui";

function modeLabel(mode: string | undefined): string {
  if (mode === "ml-trained") return "ML trained";
  if (mode === "ml-seed") return "ML seed";
  if (mode === "fallback") return "Fallback";
  if (mode === "disabled") return "Disabled";
  if (mode === "unconfigured") return "Unconfigured";
  return "Checking";
}

function modeColor(mode: string | undefined): string {
  if (mode === "ml-trained") return "var(--up)";
  if (mode === "ml-seed") return "var(--warn)";
  if (mode === "fallback" || mode === "disabled" || mode === "unconfigured") return "var(--down)";
  return "var(--text-3)";
}

export default function NewsPage({ news }: { news: NewsState }) {
  const [source, setSource] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const mlStatus = useNewsMlStatus(30_000);
  const ml = mlStatus.data;

  const sources = useMemo(() => {
    const set = new Set(news.items.map((item) => item.source));
    return ["ALL", ...Array.from(set)];
  }, [news.items]);

  const visible = news.items.filter((item) => {
    if (source !== "ALL" && item.source !== source) return false;
    if (query && !item.title.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });
  const factorReads = Object.values(news.intelligence?.factors ?? {})
    .filter((factor: any) => factor.mentions > 0)
    .sort((a: any, b: any) => b.intensity - a.intensity)
    .slice(0, 6) as any[];
  const sourceReads = Object.entries(news.sources)
    .filter(([key]) => key !== "news");

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-3">
      <Card
        title="News model status"
        subtitle="Shows whether headlines are using trained ML weights or the deterministic fallback"
        bodyClassName="px-4 pb-4 pt-2"
        right={
          <span
            className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase"
            style={{
              color: modeColor(ml?.mode),
              backgroundColor: "var(--surface-3)",
              border: "1px solid var(--border)",
            }}
          >
            {modeLabel(ml?.mode)}
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <div className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>NLP service</div>
            <div className="tabular-nums mt-0.5 text-[13px] font-semibold" style={{ color: ml?.service?.health?.ok ? "var(--up)" : "var(--down)" }}>
              {ml?.service?.health?.ok ? "healthy" : mlStatus.isLoading ? "checking" : "offline"}
            </div>
            <div className="truncate text-[10px]" style={{ color: "var(--text-3)" }}>
              {ml?.service?.url ?? "no url"}
              {ml?.service?.health?.latencyMs != null ? ` · ${ml.service.health.latencyMs}ms` : ""}
            </div>
          </div>
          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <div className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>Classifier runtime</div>
            <div className="tabular-nums mt-0.5 text-[13px] font-semibold" style={{ color: "var(--value)" }}>
              {ml?.service?.runtime?.successes ?? 0}/{ml?.service?.runtime?.attempts ?? 0}
            </div>
            <div className="text-[10px]" style={{ color: "var(--text-3)" }}>
              successes / attempts
            </div>
          </div>
          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <div className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>Forward tape</div>
            <div className="tabular-nums mt-0.5 text-[13px] font-semibold" style={{ color: (ml?.database?.forward?.rows ?? 0) > 0 ? "var(--up)" : "var(--warn)" }}>
              {ml?.database?.forward?.rows ?? "n/a"}
            </div>
            <div className="text-[10px]" style={{ color: "var(--text-3)" }}>
              collected headlines
            </div>
          </div>
          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <div className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>Head weights</div>
            <div className="tabular-nums mt-0.5 text-[13px] font-semibold" style={{ color: ml?.database?.headWeights?.generatedAt ? "var(--up)" : "var(--warn)" }}>
              {ml?.database?.headWeights?.generatedAt ? "trained" : "seed"}
            </div>
            <div className="truncate text-[10px]" style={{ color: "var(--text-3)" }}>
              {ml?.database?.headWeights?.updatedAt ? `updated ${relTime(ml.database.headWeights.updatedAt)}` : "no DB weights yet"}
            </div>
          </div>
        </div>
        {(ml?.service?.health?.message || ml?.database?.error || ml?.service?.runtime?.lastError) && (
          <div className="mt-2 rounded-lg px-3 py-2 text-[11px]" style={{ color: "var(--warn)", backgroundColor: "rgba(232,161,60,0.10)", border: "1px solid rgba(232,161,60,0.28)" }}>
            {ml?.service?.health?.message ?? ml?.database?.error ?? ml?.service?.runtime?.lastError}
          </div>
        )}
      </Card>

      <div
        className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl px-4 py-3"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div>
          <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
            Editorial freshness
          </div>
          <div className="tabular-nums text-[13px] font-medium" style={{ color: "var(--text-1)" }}>
            {news.newestPublishedAt ? `newest ${relTime(news.newestPublishedAt)}` : "no timestamp"}
          </div>
        </div>
        {sourceReads.map(([key, status]: [string, any]) => (
          <div key={key} className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-2)" }}>
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: status.ok ? (status.stale ? "var(--warn)" : "var(--up)") : "var(--down)" }}
            />
            {status.label}
            <span className="tabular-nums" style={{ color: "var(--text-3)" }}>
              {status.itemCount ?? 0} · {status.cache ?? "live"}
            </span>
          </div>
        ))}
        <div className="ml-auto text-[10px]" style={{ color: "var(--text-3)" }}>
          collected {news.fetchedAt ? relTime(news.fetchedAt) : "—"} · polls {Math.round(news.refreshInterval / 1000)}s
        </div>
      </div>

      {factorReads.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 rounded-xl px-4 py-3"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <span className="mr-1 text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
            Live macro read
          </span>
          {factorReads.map((factor: any) => (
            <span
              key={factor.id}
              className="rounded-md px-2 py-1 text-[10.5px]"
              style={{
                color: factor.score > 0 ? "var(--up)" : factor.score < 0 ? "var(--down)" : "var(--text-2)",
                backgroundColor: "var(--surface-2)",
                border: "1px solid var(--border)",
              }}
              title={`${factor.mentions} headlines · intensity ${factor.intensity.toFixed(2)}`}
            >
              {factor.id.replaceAll("_", " ")}{" "}
              <span className="tabular-nums">{factor.score > 0 ? "+" : ""}{factor.score.toFixed(2)}</span>
            </span>
          ))}
          <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
            deterministic headline rules · live overlay only
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {sources.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSource(s)}
            className="rounded-full px-3 py-1 text-[11px] font-medium"
            style={
              source === s
                ? { color: "var(--accent)", backgroundColor: "var(--accent-soft)", border: "1px solid var(--accent)" }
                : { color: "var(--text-2)", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }
            }
          >
            {s}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter headlines…"
          className="w-full rounded-lg px-3 py-1.5 text-[12px] outline-none sm:ml-auto sm:w-[220px]"
          style={{
            backgroundColor: "var(--surface-2)",
            border: "1px solid var(--border)",
            color: "var(--text-1)",
          }}
        />
      </div>

      <div
        className="overflow-hidden rounded-xl"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {visible.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-4 px-4 py-3 hover:bg-[var(--surface-2)]"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] leading-snug group-hover:underline" style={{ color: "var(--text-1)" }}>
                {item.title}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[10.5px]" style={{ color: "var(--text-3)" }}>
                <span
                  className="rounded px-1.5 py-px font-medium"
                  style={
                    item.source === "BLOOMBERG"
                      ? { color: "#8fb0ff", backgroundColor: "rgba(94,139,255,0.14)" }
                      : { color: "#6fd4ac", backgroundColor: "rgba(52,201,142,0.12)" }
                  }
                >
                  {item.source}
                </span>
                {relTime(item.publishedAt)}
                {(item.classification?.themes ?? []).slice(0, 2).map((theme) => (
                  <span key={theme} className="rounded px-1.5 py-px" style={{ backgroundColor: "var(--surface-3)" }}>
                    {theme.replaceAll("_", " ")}
                  </span>
                ))}
                {item.classification && item.classification.relevance > 0 && (
                  <span className="tabular-nums">
                    impact {(item.classification.relevance * item.classification.confidence * item.classification.decay).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
            <span className="mt-1 text-[12px] opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "var(--text-3)" }}>
              ↗
            </span>
          </a>
        ))}
        {visible.length === 0 && (
          <div className="px-4 py-8 text-center text-[12px]" style={{ color: "var(--text-3)" }}>
            {news.isLoading ? "Loading headlines…" : "Nothing matches the current filter."}
          </div>
        )}
      </div>
    </div>
  );
}
