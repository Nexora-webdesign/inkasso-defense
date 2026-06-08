// app/(portal)/layout.tsx
// Eigener Root-Layout der Route-Group (portal): helles, dokumentenhaftes Chrome
// für das eingeloggte Kanzlei-Portal – UNABHÄNGIG vom dunklen (site)-Layout.
// Lädt die Portal-Schriften via next/font und rahmt alle Portal-Seiten mit der
// hellen AppShell. Tokens: siehe .portal-theme in src/input.css + tailwind.config.js.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Spectral, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/portal/AppShell";

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-spectral",
  display: "swap",
});
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Portal", template: "%s · Inkasso-Defense" },
  robots: { index: false, follow: false },
};

export default async function PortalLayout({ children }: { children: ReactNode }) {
  // E-Mail für die Kopfzeile (Routen sind per Middleware geschützt; defensiv optional).
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="de" className={`${spectral.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <head>
        <meta name="theme-color" content="#F7F6F2" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body className="portal-theme antialiased">
        <AppShell email={user?.email ?? undefined}>{children}</AppShell>
      </body>
    </html>
  );
}
