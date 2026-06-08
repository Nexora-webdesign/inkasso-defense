"use client";

// components/portal/AppShell.tsx
// Helle, dokumentenhafte App-Shell fürs eingeloggte Kanzlei-Portal (Top-Leiste).
// Tokens kommen aus .portal-theme (siehe src/input.css) + next/font (Portal-Layout).
// Ersetzt die dunkle DashboardShell. KEINE Logik – nur Rahmen + Navigation.
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Mandanten folgt erst mit eigenem Screen (bewusst noch nicht in der Nav).
const NAV: { href: string; label: string }[] = [
  { href: "/faelle", label: "Akten" },
  { href: "/konto", label: "Konto" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/faelle") return pathname === "/faelle" || pathname.startsWith("/fall");
  if (href === "/konto") return pathname === "/konto";
  return false;
}

export function AppShell({ email, children }: { email?: string; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-papier text-tinte">
      {/* ── Top-Leiste ──────────────────────────────────────────────── */}
      <header className="border-b border-haar bg-karte">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-4 sm:px-8">
          {/* Wortmarke → Portal-Zuhause */}
          <Link
            href="/faelle"
            className="flex items-center gap-3 rounded outline-none focus-visible:ring-2 focus-visible:ring-akten/40"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-tinte font-akte text-base font-semibold text-papier">
              ID
            </span>
            <span className="leading-tight">
              <span className="block font-akte text-[17px] font-semibold tracking-[-0.01em]">Inkasso-Defense</span>
              <span className="block text-xs text-tinte-soft">Forderungsprüfung für Kanzleien</span>
            </span>
          </Link>

          {/* Navigation + Aktionen */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {NAV.map((n) => {
              const active = isActive(pathname, n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    "rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-akten/40 " +
                    (active ? "bg-akten-soft text-akten" : "text-tinte-soft hover:text-tinte")
                  }
                >
                  {n.label}
                </Link>
              );
            })}
            {/* „Forderung prüfen" entfernt: zeigte auf den öffentlichen B2C-Funnel "/"
                und hätte den eingeloggten Nutzer aus dem Portal geworfen. Kommt zurück,
                sobald es einen In-Portal-Start-Screen gibt (wie „Mandanten"). */}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md px-3 py-2 text-sm font-medium text-tinte-soft outline-none transition-colors hover:text-tinte focus-visible:ring-2 focus-visible:ring-akten/40"
              >
                Abmelden
              </button>
            </form>
          </nav>
        </div>
      </header>

      {/* ── Inhalt ──────────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8 sm:py-12">{children}</main>

      {/* ── Fußzeile (ruhig, kein Blog-Footer) ──────────────────────── */}
      <footer className="mx-auto w-full max-w-5xl px-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-haar py-6 text-xs text-tinte-soft">
          {email ? <span className="font-zahl">{email}</span> : <span />}
          <span>Automatisierte Ersteinschätzung – ersetzt keine anwaltliche Rechtsberatung.</span>
        </div>
      </footer>
    </div>
  );
}
