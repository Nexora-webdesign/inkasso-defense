// lib/widerspruch-pdf.ts
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

export interface PdfInput {
  empfaenger: string;
  aktenzeichen: string;
  betreff: string;
  body: string;
  absender?: { name?: string; strasse?: string; plzOrt?: string };
}

const A4 = { w: 595.28, h: 841.89 };
const M = { left: 70, right: 56, top: 60, bottom: 72 };
const CONTENT_W = A4.w - M.left - M.right;
const INK = rgb(0.07, 0.09, 0.12);
const MUTED = rgb(0.42, 0.45, 0.5);

// Normalisiert typografische Unicode-Zeichen auf WinAnsi-sichere ASCII-Äquivalente
// (per Codepoint-Map – verhindert pdf-lib-Fehler bei z. B. schmalem geschütztem
// Leerzeichen 0x202F vor dem €). Nicht gelistete Zeichen bleiben unverändert.
const CHAR_MAP: Record<number, string> = {
  0x202f: " ", 0x00a0: " ", 0x2009: " ", 0x200a: " ", 0x2007: " ",
  0x2013: "-", 0x2014: "-", 0x2212: "-",
  0x2018: "'", 0x2019: "'", 0x201a: "'",
  0x201c: '"', 0x201d: '"', 0x201e: '"',
  0x2026: "...",
  0x0009: "    ",
};

function sanitize(s: string): string {
  let res = "";
  for (const ch of String(s == null ? "" : s)) {
    const code = ch.codePointAt(0);
    res += code !== undefined && CHAR_MAP[code] !== undefined ? CHAR_MAP[code] : ch;
  }
  return res;
}

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    if (raw === "") { out.push(""); continue; }
    let line = "";
    for (const word of raw.split(/\s+/)) {
      const test = line ? line + " " + word : word;
      if (line && font.widthOfTextAtSize(test, size) > maxW) {
        out.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

export async function renderWiderspruchPdf(input: PdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("Teilwiderspruch");
  if (input.absender && input.absender.name) doc.setAuthor(input.absender.name);

  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([A4.w, A4.h]);
  let y = A4.h - M.top;

  const newPage = () => { page = doc.addPage([A4.w, A4.h]); y = A4.h - M.top; };
  const ensure = (need: number) => { if (y - need < M.bottom) newPage(); };

  function line(text: string, opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; align?: "left" | "right"; gapAfter?: number } = {}) {
    const font = opts.font || reg;
    const size = opts.size || 11;
    const t = sanitize(text);
    ensure(size * 1.3);
    const x = opts.align === "right" ? A4.w - M.right - font.widthOfTextAtSize(t, size) : M.left;
    page.drawText(t, { x, y: y - size, size, font, color: opts.color || INK });
    y -= size * 1.3 + (opts.gapAfter || 0);
  }

  function para(text: string, opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; lh?: number; gapAfter?: number } = {}) {
    const font = opts.font || reg;
    const size = opts.size || 11;
    const lh = opts.lh || 1.45;
    for (const ln of wrap(sanitize(text), font, size, CONTENT_W)) {
      ensure(size * lh);
      if (ln) page.drawText(ln, { x: M.left, y: y - size, size, font, color: opts.color || INK });
      y -= size * lh;
    }
    y -= opts.gapAfter || 0;
  }

  const a = input.absender || {};
  const senderLine = [a.name, a.strasse, a.plzOrt].filter(Boolean).join(" · ");
  if (senderLine) line(senderLine, { size: 7.5, color: MUTED, gapAfter: 12 });
  else y -= 20;

  line(input.empfaenger || "Inkassobüro", { size: 11 });
  line("[Anschrift des Inkassobüros / der Kanzlei]", { size: 9.5, color: MUTED, gapAfter: 26 });

  const ort = a.plzOrt ? a.plzOrt.replace(/^\s*\d{4,5}\s*/, "").trim() : "";
  const datum = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  line(ort ? `${ort}, den ${datum}` : datum, { align: "right", size: 10, gapAfter: 20 });

  const az = input.aktenzeichen && input.aktenzeichen.toLowerCase() !== "unbekannt" ? input.aktenzeichen : "";
  para(input.betreff || "Teilwiderspruch", { font: bold, size: 11.5, gapAfter: az ? 2 : 16 });
  if (az) para(`Aktenzeichen: ${az}`, { font: bold, size: 10, gapAfter: 16 });

  para(input.body || "", { size: 11, lh: 1.5 });
  if (a.name) { y -= 28; para(a.name, { size: 11 }); }

  return doc.save();
}
