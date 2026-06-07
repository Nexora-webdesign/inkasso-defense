"use client";

import { useState } from "react";

export function CopyEmail({ subject, body }: { subject: string; body: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`Betreff: ${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore – Nutzer kann den Text manuell markieren */
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Betreff</p>
          <p className="mt-1 font-semibold text-white">{subject}</p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="btn-press flex items-center gap-2 rounded-full bg-mint px-5 py-2.5 text-sm font-bold text-night shadow-float outline-none focus-visible:ring-2 focus-visible:ring-mint/60"
        >
          {copied ? "Kopiert ✓" : "E-Mail kopieren"}
        </button>
      </div>
      <textarea
        readOnly
        rows={14}
        value={body}
        className="mt-3 w-full resize-y rounded-2xl border border-white/10 bg-night p-4 text-sm leading-relaxed text-slate-200 outline-none focus-visible:border-mint/50 focus-visible:ring-2 focus-visible:ring-mint/40"
      />
    </div>
  );
}
