"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { SiteHeader } from "@/components/blog/SiteHeader";

const BENEFITS = [
  { t: "Fristen-Erinnerungen", d: "Wir erinnern dich rechtzeitig – z. B. an die 14-Tage-Widerspruchsfrist." },
  { t: "Eskalations-Assistent", d: "Schritt-für-Schritt, was als Nächstes zu tun ist (z. B. bei Mahnbescheid)." },
  { t: "Alle Fälle an einem Ort", d: "Speichere deine Analyse und behalte den Überblick." },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);

  function nextUrl() {
    return new URLSearchParams(window.location.search).get("next") || "/konto";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setMsg("Bitte gib deine E-Mail-Adresse ein.");
      return;
    }
    setBusy(true);
    setMsg("");
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl())}`,
        },
      });
      if (error) setMsg("Der Link konnte nicht gesendet werden. Bitte erneut versuchen.");
      else setSent(true);
    } catch {
      setMsg("Etwas ist schiefgelaufen. Bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 pb-24 pt-14 sm:pt-20">
        <span className="text-xs font-bold uppercase tracking-[0.22em] text-mint-light">Fall-Begleitung</span>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tightest text-white sm:text-4xl">
          Konto für deine Fall-Begleitung
        </h1>
        <p className="mt-3 leading-relaxed text-slate-400">
          Die Inkasso-Analyse ist <strong className="font-semibold text-white">kostenlos und ohne Konto</strong>.
          Ein Konto brauchst du nur für die optionale Begleitung deines Falls:
        </p>

        {/* Nutzen */}
        <ul className="mt-5 space-y-3">
          {BENEFITS.map((b) => (
            <li key={b.t} className="flex gap-3">
              <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-mint/15">
                <svg className="h-3 w-3 text-mint-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
              </span>
              <span>
                <span className="font-semibold text-white">{b.t}</span>
                <span className="block text-sm text-slate-400">{b.d}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Magic-Link: nur E-Mail, kein Passwort */}
        <div className="mt-8 rounded-4xl border border-white/10 bg-night-surface/60 p-6 bezel-soft">
          {sent ? (
            <div className="text-slate-200">
              <p className="font-semibold text-white">Link unterwegs 📬</p>
              <p className="mt-2 text-sm text-slate-300">
                Wir haben dir einen Anmelde-Link an <strong>{email}</strong> geschickt.
                Öffne ihn auf diesem Gerät – du bist dann sofort eingeloggt. Kein Passwort nötig.
              </p>
              <button
                type="button"
                onClick={() => { setSent(false); setMsg(""); }}
                className="mt-4 text-sm text-mint-light underline underline-offset-2"
              >
                Andere E-Mail verwenden
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-400">
                Gib deine E-Mail ein – wir senden dir einen Anmelde-Link.
                <strong className="font-semibold text-white"> Ohne Passwort, ohne Wartezeit.</strong>
              </p>
              <form onSubmit={submit} className="mt-4 space-y-4">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  className="w-full rounded-2xl border border-white/10 bg-night px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 outline-none focus-visible:border-mint/50 focus-visible:ring-2 focus-visible:ring-mint/40"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-press w-full rounded-2xl bg-mint py-3.5 text-base font-bold text-night shadow-float outline-none focus-visible:ring-2 focus-visible:ring-mint/60 disabled:opacity-60"
                >
                  {busy ? "Link wird gesendet …" : "Anmelden / Konto erstellen"}
                </button>
                {msg ? <p className="text-sm text-red-400">{msg}</p> : null}
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-sm text-slate-500">
          Nur prüfen, ohne Konto?{" "}
          <a href="/" className="text-mint-light underline underline-offset-2">Zur kostenlosen Analyse</a>
          {" · "}
          <a href="/datenschutz" className="text-mint-light underline underline-offset-2">Datenschutz</a>
        </p>
      </main>
    </>
  );
}
