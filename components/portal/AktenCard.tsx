// components/portal/AktenCard.tsx
// Eine Akte als ruhige Karte (Papier). Rein präsentational – keine Datenlogik.
// Workflow-Status -> neutral/info Badge (NICHT die rechtliche Ampel).
// Frist -> dezente, rein typografische Dringlichkeit (keine Ampelfarben).
import Link from "next/link";
import { eur, fmtDateShort, STATUS_LABEL } from "@/lib/format";
import { Badge, type BadgeVariant } from "@/components/portal/Badge";

// Workflow-Status -> neutral/info. Dringlichkeit (Mahnbescheid) trägt die Frist, nicht die Farbe.
const WORKFLOW_VARIANT: Record<string, BadgeVariant> = {
  offen: "neutral",
  widerspruch_gesendet: "info",
  mahnbescheid_erhalten: "info",
  erledigt: "neutral",
};

function fristInfo(iso?: string | null): { text: string; urgent: boolean } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  let text: string;
  if (days < 0) text = "überfällig";
  else if (days === 0) text = "heute fällig";
  else text = `in ${days} ${days === 1 ? "Tag" : "Tagen"}`;
  return { text, urgent: days <= 3 };
}

export type AktenCardProps = {
  id: string;
  aktenzeichen?: string | null;
  glaeubiger?: string | null;
  mandantName?: string | null;
  mandantTyp?: "verbraucher" | "unternehmer" | null;
  status: string;
  fristWiderspruch?: string | null;
  beanstandbar?: number | null;
};

export function AktenCard({
  id,
  aktenzeichen,
  glaeubiger,
  mandantName,
  mandantTyp,
  status,
  fristWiderspruch,
  beanstandbar,
}: AktenCardProps) {
  const az = aktenzeichen && aktenzeichen.toLowerCase() !== "unbekannt" ? aktenzeichen : null;
  const frist = fristInfo(fristWiderspruch);
  const statusLabel = STATUS_LABEL[status] || status;
  const statusVariant = WORKFLOW_VARIANT[status] || "neutral";

  return (
    <Link
      href={`/fall/${id}`}
      className="group grid grid-cols-[1fr_auto] items-start gap-4 rounded-xl border border-haar bg-karte p-5 outline-none transition-shadow hover:shadow-akte focus-visible:ring-2 focus-visible:ring-akten/40"
    >
      {/* Links: Aktenzeichen + Status, Gläubiger, Mandant */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-zahl text-sm text-tinte-soft">{az ?? "Az. —"}</span>
          <Badge variant={statusVariant} dot>
            {statusLabel}
          </Badge>
        </div>

        <p className="mt-1.5 truncate font-akte text-lg font-medium text-tinte">
          {glaeubiger || "Forderung"}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-tinte-soft">
          {mandantName ? (
            <span className="truncate">{mandantName}</span>
          ) : (
            <span className="italic text-tinte-soft/70">kein Mandant zugeordnet</span>
          )}
          {mandantTyp ? (
            <Badge variant={mandantTyp === "verbraucher" ? "info" : "neutral"}>
              {mandantTyp === "verbraucher" ? "Verbraucher" : "Unternehmen"}
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Rechts: beanstandbare Summe + Frist */}
      <div className="flex flex-col items-end gap-1.5 text-right">
        {beanstandbar != null && beanstandbar > 0 ? (
          <span className="leading-tight">
            <span className="block text-[11px] text-tinte-soft">beanstandbar</span>
            <span className="font-zahl text-sm font-medium text-tinte">{eur(beanstandbar)}</span>
          </span>
        ) : null}
        {frist ? (
          <span className={"text-xs " + (frist.urgent ? "font-medium text-tinte" : "text-tinte-soft")}>
            Frist {frist.text}
            {fristWiderspruch ? (
              <span className="text-tinte-soft/70"> · {fmtDateShort(fristWiderspruch)}</span>
            ) : null}
          </span>
        ) : null}
        <span
          className="mt-auto text-akten transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        >
          →
        </span>
      </div>
    </Link>
  );
}
