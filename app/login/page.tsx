"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { SiteHeader } from "@/components/blog/SiteHeader";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirmSent, setConfirmSent] = useState(false);

  function nextUrl() {
    return new URLSearchParams(window.location.search).get("next") || "/konto";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      setMsg("Bitte E-Mail und ein Passwort (mind. 6 Zeichen) eingeben.");
      return;
    }
    setBusy(true);
    setMsg("");
    const supabase = createClient();
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          setMsg("Anmeldung fehlgeschlagen. Stimmen E-Mail und Passwort?");
        } else {
          window.location.assign(nextUrl());
          return;
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl())}` },
        });
        if (error) {
          setMsg(error.message.includes("registered") ? "Diese E-Mail ist bereits registriert – bitte anmelden." : "Registrierung fehlgeschlagen.");
        } else if (data.session) {
          window.location.assign(nextUrl()); // E-Mail-Bestätigung ist deaktiviert -> direkt eingeloggt
          return;
        } else {
          setConfirmSent(true); // E-Mail-Bestätigung aktiv -> Hinweis zeigen
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
      <main className="mx-auto flex max-w-md flex-col px-4 pb-24 pt-16 sm:pt-24">
        <h1 className="font-display text-3xl font-semibold tracking-tightest text-white sm:text-4xl">
          {mode === "login" ? "Anmelden" : "Konto erstellen"}
        </h1>
        <p className="mt-3 text-slate-400">
          Für die <strong className="font-semibold text-white">Fall-Begleitung</strong> – mit E-Mail
          und Passwort, ohne Wartezeit.
        </p>

        {confirmSent ? (
          <div className="mt-8 rounded-3xl border border-mint/30 bg-mint/10 p-6 text-slate-200">
            <p className="font-semibold text-white">Fast geschafft 📬</p>
            <p className="mt-2 text-sm text-slate-300">
              Wir haben dir eine Bestätigungs-E-Mail an <strong>{email}</strong> geschickt. Bestätige
              sie, danach kannst du dich anmelden.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="deine@email.de"
              className="w-full rounded-2xl border border-white/10 bg-night-surface px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 outline-none focus-visible:border-mint/50 focus-visible:ring-2 focus-visible:ring-mint/40"
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort (mind. 6 Zeichen)"
              className="w-full rounded-2xl border border-white/10 bg-night-surface px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-500 outline-none focus-visible:border-mint/50 focus-visible:ring-2 focus-visible:ring-mint/40"
            />
            <button
              type="submit"
              disabled={busy}
              className="btn-press w-full rounded-2xl bg-mint py-3.5 text-base font-bold text-night shadow-float outline-none focus-visible:ring-2 focus-visible:ring-mint/60 disabled:opacity-60"
            >
              {busy ? "Bitte warten …" : mode === "login" ? "Anmelden" : "Konto erstellen"}
            </button>
            {msg ? <p className="text-sm text-red-400">{msg}</p> : null}
          </form>
        )}

        {!confirmSent ? (
          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setMsg(""); }}
            className="mt-6 text-left text-sm text-slate-400 underline underline-offset-2 hover:text-mint-light"
          >
            {mode === "login" ? "Noch kein Konto? Jetzt registrieren" : "Schon ein Konto? Zur Anmeldung"}
          </button>
        ) : null}

        <p className="mt-6 text-xs text-slate-500">
          Mit der Nutzung stimmst du der{" "}
          <a href="/datenschutz" className="text-mint-light underline underline-offset-2">Datenschutzerklärung</a> zu.
        </p>
      </main>
    </>
  );
}
