"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { SiteHeader } from "@/components/blog/SiteHeader";

type Mode = "login" | "register";

const BENEFITS = [
  { t: "Fristen-Erinnerungen", d: "Wir erinnern dich rechtzeitig – z. B. an die 14-Tage-Widerspruchsfrist." },
  { t: "Eskalations-Assistent", d: "Schritt-für-Schritt, was als Nächstes zu tun ist (z. B. bei Mahnbescheid)." },
  { t: "Alle Fälle an einem Ort", d: "Speichere deine Analyse und behalte den Überblick." },
];

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirmSent, setConfirmSent] = useState(false);
  const [confirmedBanner, setConfirmedBanner] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("confirmed") === "1") {
      setConfirmedBanner(true);
      setMode("login");
    }
    if (p.get("error") === "link") {
      setMsg("Der Bestätigungslink war ungültig oder abgelaufen. Bitte registriere dich erneut.");
    }
  }, []);

  function nextUrl() {
    return new URLSearchParams(window.location.search).get("next") || "/konto";
  }

  function callbackUrl() {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl())}`;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || password.length < 8) {
      setMsg("Bitte E-Mail und ein Passwort (mind. 8 Zeichen) eingeben.");
      return;
    }
    setBusy(true);
    setMsg("");
    const supabase = createClient();
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          const m = error.message.toLowerCase();
          if (m.includes("not confirmed") || m.includes("confirm")) {
            setMsg("Bitte bestätige zuerst deine E-Mail – der Link ist in deinem Postfach.");
          } else {
            setMsg("Anmeldung fehlgeschlagen. Stimmen E-Mail und Passwort?");
          }
        } else {
          return window.location.assign(nextUrl());
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: callbackUrl() },
        });
        if (error) {
          const m = error.message.toLowerCase();
          if (m.includes("registered") || m.includes("already")) {
            setMsg("Diese E-Mail ist bereits registriert – bitte melde dich an.");
            setMode("login");
          } else {
            setMsg("Registrierung fehlgeschlagen. Bitte erneut versuchen.");
          }
        } else if (data.session) {
          // Falls E-Mail-Bestätigung deaktiviert ist: direkt eingeloggt.
          return window.location.assign(nextUrl());
        } else {
          setConfirmSent(true);
        }
      }
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

        <div className="mt-8 rounded-4xl border border-white/10 bg-night-surface/60 p-6 bezel-soft">
          {confirmedBanner ? (
            <div className="mb-5 rounded-2xl border border-mint/30 bg-mint/10 p-4">
              <p className="text-sm font-semibold text-mint-light">✅ E-Mail bestätigt</p>
              <p className="mt-1 text-sm text-slate-300">Melde dich jetzt mit E-Mail und Passwort an.</p>
            </div>
          ) : null}

          {confirmSent ? (
            <div className="text-slate-200">
              <p className="font-semibold text-white">Fast geschafft 📬</p>
              <p className="mt-2 text-sm text-slate-300">
                Wir haben dir eine Bestätigungs-E-Mail an <strong>{email}</strong> geschickt.
                Klicke auf den Link darin – danach kannst du dich hier mit deinem Passwort anmelden.
              </p>
              <button
                type="button"
                onClick={() => { setConfirmSent(false); setMode("login"); setMsg(""); }}
                className="mt-4 text-sm text-mint-light underline underline-offset-2"
              >
                Zur Anmeldung
              </button>
            </div>
          ) : (
            <>
              <div className="inline-flex rounded-full bg-night p-1">
                {(["register", "login"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setMsg(""); }}
                    aria-pressed={mode === m}
                    className={
                      "rounded-full px-4 py-2 text-sm font-bold transition " +
                      (mode === m ? "bg-mint text-night" : "text-slate-300 hover:text-white")
                    }
                  >
                    {m === "register" ? "Konto erstellen" : "Anmelden"}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} className="mt-5 space-y-4">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  className="w-full rounded-2xl border border-white/10 bg-night px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 outline-none focus-visible:border-mint/50 focus-visible:ring-2 focus-visible:ring-mint/40"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "login" ? "Passwort" : "Passwort (mind. 8 Zeichen)"}
                  className="w-full rounded-2xl border border-white/10 bg-night px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 outline-none focus-visible:border-mint/50 focus-visible:ring-2 focus-visible:ring-mint/40"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-press w-full rounded-2xl bg-mint py-3.5 text-base font-bold text-night shadow-float outline-none focus-visible:ring-2 focus-visible:ring-mint/60 disabled:opacity-60"
                >
                  {busy ? "Bitte warten …" : mode === "register" ? "Konto erstellen" : "Anmelden"}
                </button>
                {msg ? <p className="text-sm text-red-400">{msg}</p> : null}
              </form>

              <p className="mt-4 text-sm text-slate-400">
                {mode === "register" ? (
                  <>Schon ein Konto?{" "}
                    <button type="button" onClick={() => { setMode("login"); setMsg(""); }} className="font-semibold text-mint-light underline underline-offset-2">Anmelden</button>
                  </>
                ) : (
                  <>Neu hier?{" "}
                    <button type="button" onClick={() => { setMode("register"); setMsg(""); }} className="font-semibold text-mint-light underline underline-offset-2">Konto erstellen</button>
                  </>
                )}
              </p>
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
