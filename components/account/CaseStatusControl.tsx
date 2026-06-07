"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_ORDER, STATUS_META, type CaseStatus } from "@/lib/escalation";

export function CaseStatusControl({ caseId, status }: { caseId: string; status: CaseStatus }) {
  const router = useRouter();
  const [current, setCurrent] = useState<CaseStatus>(status);
  const [busy, setBusy] = useState<CaseStatus | null>(null);
  const [error, setError] = useState("");

  async function change(next: CaseStatus) {
    if (next === current || busy) return;
    setBusy(next);
    setError("");
    try {
      const res = await fetch(`/api/cases/${caseId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j?.ok) {
        setCurrent(next);
        router.refresh();
      } else {
        setError(j?.error || "Aktualisierung fehlgeschlagen.");
      }
    } catch {
      setError("Aktualisierung fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Status des Falls">
        {STATUS_ORDER.map((s) => {
          const active = s === current;
          return (
            <button
              key={s}
              type="button"
              onClick={() => change(s)}
              disabled={busy !== null}
              aria-pressed={active}
              className={
                "btn-press rounded-full px-4 py-2 text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-mint/60 disabled:opacity-60 " +
                (active
                  ? "bg-mint text-night"
                  : "border border-white/10 bg-night-surface text-slate-300 hover:text-white")
              }
            >
              {busy === s ? "…" : STATUS_META[s].label}
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
