// components/portal/Badge.tsx
// Badge-Primitive fürs helle Portal. Farbe = BEDEUTUNG, nie Deko.
//  - neutral / info  → organisatorische/Workflow-Bedeutung
//  - berechtigt / fraglich / ueberhoeht → AUSSCHLIESSLICH die rechtliche Ampel
//    (Posten-Status, ab Schritt 2b). Niemals den Workflow damit einfärben.
// Tokens kommen aus .portal-theme (src/input.css) via tailwind.config.
import type { ReactNode } from "react";

export type BadgeVariant = "neutral" | "info" | "berechtigt" | "fraglich" | "ueberhoeht";

const VARIANT_CLS: Record<BadgeVariant, string> = {
  neutral: "bg-haar text-tinte-soft",
  info: "bg-akten-soft text-akten",
  berechtigt: "bg-berechtigt-bg text-berechtigt",
  fraglich: "bg-fraglich-bg text-fraglich",
  ueberhoeht: "bg-ueberhoeht-bg text-ueberhoeht",
};

const DOT_CLS: Record<BadgeVariant, string> = {
  neutral: "bg-tinte-soft",
  info: "bg-akten",
  berechtigt: "bg-berechtigt",
  fraglich: "bg-fraglich",
  ueberhoeht: "bg-ueberhoeht",
};

export function Badge({
  variant = "neutral",
  dot = false,
  children,
  className = "",
}: {
  variant?: BadgeVariant;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium " +
        VARIANT_CLS[variant] +
        (className ? " " + className : "")
      }
    >
      {dot ? <span className={"h-1.5 w-1.5 rounded-full " + DOT_CLS[variant]} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
