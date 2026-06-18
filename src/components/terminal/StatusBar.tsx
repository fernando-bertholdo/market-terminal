"use client";

import React from "react";
import { PANELS, type PanelId } from "@/lib/constants";
import type { SourceStatus } from "@/types/market";

interface StatusBarProps {
  activePanel: PanelId;
  marketSources?: Record<string, SourceStatus> | null;
  newsSource?: SourceStatus | null;
}

export default function StatusBar({
  activePanel,
  marketSources,
  newsSource,
}: StatusBarProps) {
  const shortcuts = [
    { key: "1-6", label: "workspace" },
    { key: "CTRL K", label: "commands" },
    { key: "/", label: "commands" },
    { key: "P", label: "prefs" },
    { key: "N", label: "news" },
    { key: "R", label: "refresh" },
    { key: "F", label: "mode" },
    { key: "ESC", label: "reset" },
  ];

  const sources = [
    marketSources?.fred ?? { label: "FRED", ok: false, message: "Pending" },
    marketSources?.bcb ?? { label: "BCB", ok: false, message: "Pending" },
    marketSources?.yahoo ?? { label: "YAHOO", ok: false, message: "Pending" },
    marketSources?.b3 ?? { label: "B3", ok: false, message: "Pending" },
    newsSource ?? { label: "NEWS", ok: false, message: "Pending" },
  ];

  return (
    <footer className="flex items-center justify-between gap-2 px-3 py-0.5 bg-header-bg border-t border-panel-border shrink-0">
      <div className="flex items-center gap-2 text-2xs">
        <span className="text-dim">PANEL:</span>
        <span className="text-accent-orange font-semibold tracking-wider">
          {PANELS[activePanel].label}
        </span>
      </div>

      <div className="hidden sm:flex items-center gap-4 text-2xs text-dim">
        {sources.map((source) => (
          <span
            key={source.label}
            className="flex items-center gap-1"
            title={source.message ?? source.label}
          >
            <span
              className={`status-dot ${
                source.ok
                  ? "bg-up"
                  : source.message === "Pending"
                  ? "bg-muted"
                  : "bg-down"
              }`}
            />
            {source.label}
          </span>
        ))}
      </div>

      <div className="hidden md:flex items-center gap-3 text-2xs">
        {shortcuts.map(({ key, label }) => (
          <span key={key} className="flex items-center gap-1">
            <kbd className="kbd">{key}</kbd>
            <span className="text-dim">{label}</span>
          </span>
        ))}
      </div>
    </footer>
  );
}
