"use client";

import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not sign in");
      const destination = new URLSearchParams(window.location.search).get("next") || "/";
      router.replace(destination.startsWith("/") ? destination : "/");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: "var(--bg)" }}>
      <form onSubmit={submit} className="w-full max-w-[380px] overflow-hidden rounded-xl" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border-strong)", boxShadow: "0 24px 70px rgba(0,0,0,0.5)" }}>
        <div className="px-6 py-5" style={{ backgroundColor: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg text-[14px] font-bold text-white" style={{ background: "linear-gradient(135deg, var(--accent), #8b5eff)" }}>A</div>
            <div>
              <h1 className="text-[16px] font-semibold" style={{ color: "var(--text-1)" }}>ATLAS Terminal</h1>
              <p className="text-[10.5px]" style={{ color: "var(--text-3)" }}>Private FICC workspace</p>
            </div>
          </div>
        </div>
        <div className="space-y-4 px-6 py-5">
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>Username</span>
            <input autoFocus autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-lg px-3 py-2.5 text-[13px] outline-none" style={{ color: "var(--text-1)", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>Password</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg px-3 py-2.5 text-[13px] outline-none" style={{ color: "var(--text-1)", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }} />
          </label>
          {error && <div className="rounded-lg px-3 py-2 text-[11px]" style={{ color: "var(--down)", backgroundColor: "rgba(240,100,122,0.08)", border: "1px solid rgba(240,100,122,0.25)" }}>{error}</div>}
          <button disabled={loading || !username || !password} className="w-full rounded-lg px-3 py-2.5 text-[12px] font-semibold text-white disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </form>
    </main>
  );
}
