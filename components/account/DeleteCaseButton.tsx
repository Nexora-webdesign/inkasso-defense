"use client";

import { useState } from "react";

export function DeleteCaseButton({ caseId }: { caseId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function del() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/cases/${caseId}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j?.ok) {
        window.location.assign("/konto");
      } else {
        setError(j?.error || "Löschen fehlgeschlagen. Bitte erneut versuchen.");
        setBusy(false);
      }
    } catch {
      setError("Löschen fehlgeschlagen. Bitte erneut versuchen.");
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-full px-3 py-2 text-sm font-semibold text-slate-500 outline-none transition-colors hover:text-red-400 focus-visible:ring-2 focus-visible:ring-red-400/50"
      >
        Fall löschen
      </button>
    );
  }

  return (
    <div className="rounded-3xl border border-red-400/30 bg-red-400/5 p-4">
      <p className="text-sm text-slate-200">
        Diesen Fall <strong className="font-semibold text-white">endgültig löschen</strong>? Alle gespeicherten
        Schreiben und Fristen-Erinnerungen dieses Falls werden mitgelöscht. Das kann nicht rückgängig gemacht werden.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={del}
          disabled={busy}
          className="btn-press rounded-full bg-red-500 px-5 py-2.5 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 disabled:opacity-60"
        >
          {busy ? "Lösche …" : "Endgültig löschen"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="btn-press rounded-full border border-white/10 bg-night-surface px-5 py-2.5 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-mint/60 disabled:opacity-60"
        >
          Abbrechen
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
