"use client";

import { useState } from "react";

export function ActivateForm() {
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setState("busy");
    try {
      const r = await fetch("/api/premium/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ licenseKey: code.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        setState("ok");
        setMsg("Freigeschaltet! Deine Fall-Begleitung ist aktiv.");
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setState("err");
        setMsg(j?.error || "Aktivierung fehlgeschlagen.");
      }
    } catch {
      setState("err");
      setMsg("Aktivierung fehlgeschlagen. Bitte erneut versuchen.");
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-wrap items-center gap-2">
      <input
        type="text"
        autoComplete="off"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Freischaltcode aus der Bestätigungs-E-Mail"
        className="min-w-[16rem] flex-1 rounded-xl border border-white/10 bg-night px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus-visible:border-mint/50 focus-visible:ring-2 focus-visible:ring-mint/40"
      />
      <button
        type="submit"
        disabled={state === "busy"}
        className="btn-press rounded-full bg-mint px-5 py-2.5 text-sm font-bold text-night shadow-float outline-none focus-visible:ring-2 focus-visible:ring-mint/60 disabled:opacity-60"
      >
        {state === "busy" ? "Prüfe …" : "Freischalten"}
      </button>
      {msg ? (
        <p className={`w-full text-sm ${state === "ok" ? "text-mint-light" : "text-red-400"}`}>{msg}</p>
      ) : null}
    </form>
  );
}
