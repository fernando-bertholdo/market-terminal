"use client";

import React, { FormEvent, useEffect, useState } from "react";

export default function AccountSettings({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setMessage("");
    fetch("/api/auth/credentials", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Could not load account");
        setUsername(payload.username ?? "");
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load account"));
  }, [open]);

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (newPassword !== confirmation) {
      setError("The new passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, currentPassword, newPassword }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not update credentials");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setMessage("Credentials updated. Sessions on other devices were signed out.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update credentials");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.assign("/login");
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 px-4" style={{ backdropFilter: "blur(2px)" }} onMouseDown={onClose}>
      <div className="mx-auto mt-16 w-full max-w-[500px] overflow-hidden rounded-xl" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border-strong)", boxShadow: "0 24px 70px rgba(0,0,0,0.55)" }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Account settings">
        <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div className="text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>Account security</div>
            <div className="text-[10px]" style={{ color: "var(--text-3)" }}>Change the credentials used on every device</div>
          </div>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-[16px]" style={{ color: "var(--text-3)" }}>×</button>
        </div>
        <form onSubmit={submit} className="space-y-4 px-5 py-5">
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>Username</span>
            <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-lg px-3 py-2 text-[13px] outline-none" style={{ color: "var(--text-1)", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>Current password</span>
            <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="w-full rounded-lg px-3 py-2 text-[13px] outline-none" style={{ color: "var(--text-1)", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }} />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>New password</span>
              <input type="password" minLength={12} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="w-full rounded-lg px-3 py-2 text-[13px] outline-none" style={{ color: "var(--text-1)", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>Confirm password</span>
              <input type="password" minLength={12} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-lg px-3 py-2 text-[13px] outline-none" style={{ color: "var(--text-1)", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }} />
            </label>
          </div>
          <div className="text-[10px]" style={{ color: "var(--text-3)" }}>Minimum 12 characters. Saving signs out every other active session.</div>
          {error && <div className="rounded-lg px-3 py-2 text-[11px]" style={{ color: "var(--down)", backgroundColor: "rgba(240,100,122,0.08)", border: "1px solid rgba(240,100,122,0.25)" }}>{error}</div>}
          {message && <div className="rounded-lg px-3 py-2 text-[11px]" style={{ color: "var(--up)", backgroundColor: "rgba(52,201,142,0.08)", border: "1px solid rgba(52,201,142,0.25)" }}>{message}</div>}
          <div className="flex items-center justify-between gap-3 pt-1">
            <button type="button" onClick={signOut} className="rounded-lg px-3 py-2 text-[11px]" style={{ color: "var(--down)", border: "1px solid rgba(240,100,122,0.35)" }}>Sign out</button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-[11px]" style={{ color: "var(--text-2)", border: "1px solid var(--border)" }}>Cancel</button>
              <button disabled={loading || !username || !currentPassword || newPassword.length < 12 || newPassword !== confirmation} className="rounded-lg px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-40" style={{ backgroundColor: "var(--accent)" }}>{loading ? "Saving..." : "Update credentials"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

