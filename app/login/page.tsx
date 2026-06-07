"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { SiteHeader } from "@/components/blog/SiteHeader";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    try {
      const supabase = createClient();
      const next = new URLSearchParams(window.location.search).get("next") || "/konto";
      const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo } });
      setStatus(error ? "error" : "sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col px-4 pb-24 pt-16 sm:pt-24">
        <h1 className="font-display text-3xl font-semibold tracking-tightest text-white sm:text-4xl">
          Anmelden
        </h1>
        <p className="mt-3 text-slate-400">
          Für die <strong className="font-semibold text-white">Fall-Begleitung</strong> melde dich
          mit deiner E-Mail an – wir senden dir einen Login-Link, kein Passwort nötig.
        </p>

        {status === "sent" ? (
          <div className="mt-8 rounded-3xl border border-mint/30 bg-mint/10 p-6 text-slate-200">
            <p className="font-semibold text-white">Link unterwegs 📬</p>
            <p className="mt-2 text-sm text-slate-300">
              Wir haben dir einen Login-Link an <strong>{email}</strong> geschickt. Öffne ihn auf
              diesem Gerät, um dich anzumelden.
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
            <button
              type="submit"
              disabled={status === "sending"}
              className="btn-press w-full rounded-2xl bg-mint py-3.5 text-base font-bold text-night shadow-float outline-none focus-visible:ring-2 focus-visible:ring-mint/60 disabled:opacity-60"
            >
              {status === "sending" ? "Sende Link …" : "Login-Link senden"}
            </button>
            {status === "error" ? (
              <p className="text-sm text-red-400">Das hat nicht geklappt. Bitte erneut versuchen.</p>
            ) : null}
          </form>
        )}

        <p className="mt-6 text-xs text-slate-500">
          Mit der Anmeldung stimmst du der Verarbeitung gemäß{" "}
          <a href="/datenschutz" className="text-mint-light underline underline-offset-2">Datenschutzerklärung</a> zu.
        </p>
      </main>
    </>
  );
}
