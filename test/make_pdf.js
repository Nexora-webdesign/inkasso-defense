// Erzeugt ein minimales Test-PDF mit einer fiktiven Inkasso-Forderung.
const fs = require('fs');
const path = require('path');

const lines = [
  'Inkassobuero Mustermann GmbH - Aktenzeichen IM-2026 4711',
  'Forderungsaufstellung Vollsperrung Internetanschluss Maerz 2026:',
  'Grundgebuehr Maerz 2026 Anschluss gesperrt: 39,99 EUR',
  'Hauptforderung offener Rechnungsbetrag: 49,90 EUR',
  'Mahnkosten 1. Mahnung: 12,50 EUR',
  'Mahnkosten 2. Mahnung: 15,00 EUR',
  'Bearbeitungs- und Kontofuehrungsgebuehr: 9,90 EUR',
  'Adressermittlung Auskunftskosten: 14,50 EUR',
  'Inkassoverguetung: 58,50 EUR',
  'Verzugszinsen 12 Prozent: 6,20 EUR',
  'GESAMTFORDERUNG: 205,49 EUR',
];

let y = 760;
let stream = 'BT /F1 11 Tf\n';
for (const l of lines) {
  stream += `1 0 0 1 50 ${y} Tm (${l}) Tj\n`;
  y -= 22;
}
stream += 'ET';

const objs = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
  `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
];

let pdf = '%PDF-1.4\n';
const offsets = [];
objs.forEach((o, i) => {
  offsets.push(Buffer.byteLength(pdf, 'latin1'));
  pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
});
const xrefPos = Buffer.byteLength(pdf, 'latin1');
pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
offsets.forEach((off) => { pdf += String(off).padStart(10, '0') + ' 00000 n \n'; });
pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

const out = path.join(__dirname, 'inkasso_test.pdf');
fs.writeFileSync(out, pdf, 'latin1');
console.log('wrote', out, fs.statSync(out).size, 'bytes');
