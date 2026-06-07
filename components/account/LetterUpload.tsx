"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
const MAX_BYTES = 10 * 1024 * 1024;

// Große Fotos clientseitig verkleinern (hält die Anfrage unter dem Vercel-Body-Limit).
async function maybeDownscale(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 400 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const max = 1600;
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.8));
    if (!blob) return file;
    return new File([blob], "schreiben.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function LetterUpload({ caseId }: { caseId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function pick(f: File | null) {
    setError("");
    if (!f) return;
    if (!ALLOWED.includes(f.type)) {
      setError("Bitte ein Foto (JPG/PNG) oder PDF hochladen.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("Die Datei ist zu groß (max. 10 MB).");
      return;
    }
    setFile(f);
  }

  async function submit() {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      const toSend = await maybeDownscale(file);
      const fd = new FormData();
      fd.append("file", toSend);
      const res = await fetch(`/api/cases/${caseId}/letters`, { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j?.ok) {
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      } else {
        setError(j?.error || "Analyse fehlgeschlagen. Bitte erneut versuchen.");
      }
    } catch {
      setError("Analyse fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-white/20 bg-night px-4 py-8 text-center transition-colors hover:border-mint/50"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        <svg className="h-7 w-7 text-mint-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4m0 0L8 8m4-4l4 4" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
        <span className="text-sm text-slate-300">
          {file ? <strong className="text-white">{file.name}</strong> : "Foto oder PDF des Schreibens auswählen"}
        </span>
        <span className="text-xs text-slate-500">JPG, PNG oder PDF · max. 10 MB</span>
      </label>

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

      <button
        type="button"
        onClick={submit}
        disabled={!file || busy}
        className="btn-press mt-4 inline-flex items-center gap-2 rounded-full bg-mint px-6 py-3 text-sm font-bold text-night shadow-float outline-none focus-visible:ring-2 focus-visible:ring-mint/60 disabled:opacity-60"
      >
        {busy ? "Analysiere …" : "Schreiben analysieren"}
        {!busy ? (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        ) : null}
      </button>
      {busy ? <p className="mt-2 text-xs text-slate-500">Das Dokument wird gelesen und eingeordnet – einen Moment.</p> : null}
    </div>
  );
}
