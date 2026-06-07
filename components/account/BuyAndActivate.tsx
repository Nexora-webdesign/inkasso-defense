"use client";

import { useEffect, useState } from "react";

type State = "idle" | "busy" | "ok" | "err";

// Lemon.js (Overlay-Checkout) global – minimal typisiert.
declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: {
      Setup?: (opts: { eventHandler: (e: { event?: string; data?: unknown }) => void }) => void;
      Url?: { Open?: (url: string) => void };
    };
  }
}

function extractKey(data: unknown): string {
  try {
    const d = data as Record<string, unknown>;
    const order = (d?.order ?? d) as Record<string, unknown>;
    const inner = (order?.data ?? order) as Record<string, unknown>;
    const attr = (inner?.attributes ?? inner) as Record<string, unknown>;
    const item = (attr?.first_order_item ?? attr?.order_item ?? {}) as Record<string, unknown>;
    return String(item?.license_key ?? attr?.license_key ?? (d?.license_key as string) ?? "");
  } catch {
    return "";
  }
}

export function BuyAndActivate({ checkoutUrl }: { checkoutUrl: string }) {
  const [state, setState] = useState<State>("idle");
  const [msg, setMsg] = useState("");
  const [code, setCode] = useState("");

  async function activate(key: string) {
    if (!key.trim()) return;
    setState("busy");
    setMsg("Schalte frei …");
    try {
      const r = await fetch("/api/premium/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ licenseKey: key.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        setState("ok");
        setMsg("Freigeschaltet! Einen Moment …");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setState("err");
        setMsg(j?.error || "Aktivierung fehlgeschlagen.");
      }
    } catch {
      setState("err");
      setMsg("Aktivierung fehlgeschlagen. Bitte erneut versuchen.");
    }
  }

  useEffect(() => {
    function setup() {
      try {
        window.createLemonSqueezy?.();
        window.LemonSqueezy?.Setup?.({
          eventHandler: (e) => {
            if (!e || e.event !== "Checkout.Success") return;
            const key = extractKey(e.data);
            if (key) activate(key);
            else {
              setState("err");
              setMsg("Kauf erkannt – bitte den Freischaltcode aus der E-Mail unten eingeben.");
            }
          },
        });
      } catch {
        /* ignore */
      }
    }
    if (window.LemonSqueezy) {
      setup();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://app.lemonsqueezy.com/js/lemon.js";
    s.defer = true;
    s.onload = setup;
    document.body.appendChild(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCheckout() {
    try {
      if (window.LemonSqueezy?.Url?.Open) window.LemonSqueezy.Url.Open(checkoutUrl);
      else window.open(checkoutUrl, "_blank", "noopener");
    } catch {
      window.open(checkoutUrl, "_blank", "noopener");
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={openCheckout}
        disabled={state === "busy"}
        className="btn-press inline-flex items-center gap-2 rounded-full bg-mint px-6 py-3 text-sm font-bold text-night shadow-float outline-none focus-visible:ring-2 focus-visible:ring-mint/60 disabled:opacity-60"
      >
        Fall-Begleitung freischalten
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </button>

      {msg ? (
        <p className={`mt-3 text-sm ${state === "ok" ? "text-mint-light" : state === "err" ? "text-red-400" : "text-slate-400"}`}>{msg}</p>
      ) : null}

      {/* Fallback: Code manuell eingeben (falls das Popup blockiert wurde o. Ä.) */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-slate-400 hover:text-slate-200">
          Schon gekauft? Freischaltcode manuell eingeben
        </summary>
        <form
          onSubmit={(e) => { e.preventDefault(); activate(code); }}
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Freischaltcode aus der Bestätigungs-E-Mail"
            className="min-w-[16rem] flex-1 rounded-xl border border-white/10 bg-night px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus-visible:border-mint/50 focus-visible:ring-2 focus-visible:ring-mint/40"
          />
          <button
            type="submit"
            disabled={state === "busy"}
            className="btn-press rounded-full border border-white/10 bg-night-surface px-5 py-2.5 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-mint/60 disabled:opacity-60"
          >
            Freischalten
          </button>
        </form>
      </details>
    </div>
  );
}
