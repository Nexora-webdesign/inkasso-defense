// lib/reminders.ts – Planung mehrstufiger Fristen-Erinnerungen.
// Statt eines einzelnen Versuchs wird mehrfach vor der Frist erinnert, damit ein
// einzelner Ausfall nicht dazu führt, dass der Kunde die Frist verpasst.

/** Typische außergerichtliche Widerspruchsfrist (Tage). */
export const WIDERSPRUCH_FRIST_TAGE = 14;

/** Erinnerung wie viele Tage VOR der Frist (eskalierend). */
const LEAD_DAYS_BEFORE = [7, 2, 0];

/**
 * Liefert die Tages-Offsets ab heute, an denen erinnert werden soll, für eine
 * Frist in `deadlineInDays` Tagen. Beispiele:
 *   14 -> [7, 12, 14]   (7 und 2 Tage vorher + am Fristtag)
 *    5 -> [3, 5]
 *    1 -> [1]
 * Negative Offsets (Lead länger als Frist) werden verworfen; mind. ein Offset.
 */
export function reminderOffsets(deadlineInDays: number): number[] {
  const dl = Math.max(0, Math.round(Number(deadlineInDays) || 0));
  const set = new Set<number>();
  for (const lead of LEAD_DAYS_BEFORE) {
    const offset = dl - lead;
    if (offset >= 0) set.add(offset);
  }
  if (set.size === 0) set.add(0);
  return [...set].sort((a, b) => a - b);
}

/** Baut Reminder-Insert-Zeilen für die mehrstufige Erinnerung. */
export function buildReminderRows(
  caseId: string,
  userId: string,
  deadlineInDays: number,
  nowMs: number,
): { case_id: string; user_id: string; type: "widerspruch_14tage"; due_at: string }[] {
  return reminderOffsets(deadlineInDays).map((d) => ({
    case_id: caseId,
    user_id: userId,
    type: "widerspruch_14tage" as const,
    due_at: new Date(nowMs + d * 86_400_000).toISOString(),
  }));
}
