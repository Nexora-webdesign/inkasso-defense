"use client";

// @deprecated Dunkle Sidebar-Shell des alten Portals. Seit dem hellen B2B-Portal
// (Route-Group (portal) + components/portal/AppShell) NICHT mehr verwendet.
// In Schritt 2 (Screen-Migration) ersatzlos löschen.
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const HomeIcon = (p: { className?: string }) => (
  <svg className={p.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></svg>
);
const FolderIcon = (p: { className?: string }) => (
  <svg className={p.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
);
const ScanIcon = (p: { className?: string }) => (
  <svg className={p.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
);
const ShieldIcon = (p: { className?: string }) => (
  <svg className={p.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.2 7.7-8 9-4.8-1.3-8-4.5-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></svg>
);

type NavItem = { href: string; label: string; Icon: (p: { className?: string }) => ReactNode; external?: boolean };
const NAV: NavItem[] = [
  { href: "/konto", label: "Dashboard", Icon: HomeIcon },
  { href: "/faelle", label: "Meine Fälle", Icon: FolderIcon },
  { href: "/", label: "Forderung prüfen", Icon: ScanIcon, external: true },
];

function activeFor(pathname: string, href: string): boolean {
  if (href === "/konto") return pathname === "/konto";
  if (href === "/faelle") return pathname === "/faelle" || pathname.startsWith("/fall");
  return false;
}

function Brand() {
  return (
    <Link href="/konto" className="flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-mint/60">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-mint/15">
        <ShieldIcon className="h-4 w-4 text-mint-light" />
      </span>
      <span className="text-[15px] font-extrabold tracking-tightest text-white">
        Inkasso<span className="text-mint-light">·Defense</span>
      </span>
    </Link>
  );
}

function Logout({ className = "" }: { className?: string }) {
  return (
    <form action="/auth/signout" method="post" className={className}>
      <button
        type="submit"
        className="btn-press inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-400 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-mint/60"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
        Abmelden
      </button>
    </form>
  );
}

// B2B-Status: dezent pulsierender Mint-Punkt + "Intelligence Layer aktiv".
function StatusBadge({ className = "" }: { className?: string }) {
  return (
    <div className={"inline-flex items-center gap-2 rounded-full border border-gray-800 bg-gray-900/50 px-3 py-1 " + className}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75 motion-reduce:animate-none" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="text-[10px] font-medium uppercase tracking-widest text-emerald-400/90">Intelligence Layer aktiv</span>
    </div>
  );
}

export function DashboardShell({
  email,
  premiumActive = false,
  premiumLabel = "",
  children,
}: {
  email?: string;
  premiumActive?: boolean;
  premiumLabel?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const initial = (email?.trim()?.[0] || "K").toUpperCase();

  const NavList = ({ onItem = "" }: { onItem?: string }) => (
    <>
      {NAV.map(({ href, label, Icon, external }) => {
        const active = activeFor(pathname, href);
        const cls =
          "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-mint/60 " +
          (active ? "bg-mint/15 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white");
        const inner = (
          <>
            <Icon className={"h-[18px] w-[18px] " + (active ? "text-mint-light" : "text-slate-400 group-hover:text-mint-light")} />
            {label}
          </>
        );
        return external ? (
          <a key={href} href={href} className={cls + " " + onItem}>{inner}</a>
        ) : (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cls + " " + onItem}>{inner}</Link>
        );
      })}
    </>
  );

  const PremiumPill = premiumActive ? (
    <div className="rounded-2xl border border-mint/25 bg-mint/10 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-mint-light">
        <ShieldIcon className="h-3.5 w-3.5" /> Geschützt
      </p>
      {premiumLabel ? <p className="mt-1 text-xs text-slate-300">aktiv bis {premiumLabel}</p> : null}
    </div>
  ) : (
    <Link
      href="/konto#fall-begleitung"
      className="btn-press block rounded-2xl border border-mint/25 bg-gradient-to-br from-mint/15 to-night-inset p-3 outline-none focus-visible:ring-2 focus-visible:ring-mint/60"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-mint-light">
        <ShieldIcon className="h-3.5 w-3.5" /> Fall-Begleitung
      </p>
      <p className="mt-1 text-xs text-slate-300">Schutz aktivieren – 9,90 € →</p>
    </Link>
  );

  return (
    <div className="min-h-dvh bg-night text-slate-200">
      {/* ── Sidebar (Desktop) ──────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/10 bg-night-surface/40 px-4 py-5 lg:flex">
        <Brand />
        <StatusBadge className="mt-4" />
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          <NavList />
        </nav>
        <div className="space-y-3">
          {PremiumPill}
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-night-surface/60 p-2.5">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-mint/20 text-sm font-bold text-mint-light">{initial}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-slate-400">{email || "Mein Konto"}</span>
            </span>
          </div>
          <Logout />
        </div>
      </aside>

      {/* ── Topbar + Nav (Mobile) ──────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-night/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Brand />
        <Logout />
      </header>
      <div className="flex justify-center border-b border-white/10 bg-night/80 px-4 py-1.5 lg:hidden">
        <StatusBadge />
      </div>
      <nav className="sticky top-[57px] z-20 flex gap-2 overflow-x-auto border-b border-white/10 bg-night/80 px-4 py-2 backdrop-blur-xl lg:hidden">
        <NavList onItem="whitespace-nowrap" />
      </nav>

      {/* ── Inhalt ─────────────────────────────────────────────────────── */}
      <div className="lg:pl-64">
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
