// scripts/optimize-blog-images.cjs
// Wandelt PNG/JPG in public/Blog/ in performante WebP um (max. Breite 1600 px,
// Qualität 80). Lokales Dev-Tool – wird NICHT im Vercel-Build benötigt.
//
//   node scripts/optimize-blog-images.cjs            -> konvertieren
//   node scripts/optimize-blog-images.cjs --delete   -> Quell-PNG/JPG danach löschen
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const DIR = path.join(process.cwd(), "public", "Blog");
const MAX_WIDTH = 1600;
const QUALITY = 80;
const deleteSource = process.argv.includes("--delete");

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

async function run() {
  if (!fs.existsSync(DIR)) {
    console.log("Kein public/Blog – nichts zu tun.");
    return;
  }
  const files = fs.readdirSync(DIR).filter((f) => /\.(png|jpe?g)$/i.test(f));
  if (!files.length) {
    console.log("Keine PNG/JPG in public/Blog gefunden.");
    return;
  }

  for (const file of files) {
    const src = path.join(DIR, file);
    const out = path.join(DIR, file.replace(/\.(png|jpe?g)$/i, ".webp"));
    const before = fs.statSync(src).size;

    await sharp(src)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(out);

    const after = fs.statSync(out).size;
    const saved = ((1 - after / before) * 100).toFixed(0);
    console.log(`${file} -> ${path.basename(out)}  ${kb(before)} -> ${kb(after)}  (-${saved}%)`);

    if (deleteSource) fs.unlinkSync(src);
  }
  console.log(deleteSource ? "Fertig (Quelldateien gelöscht)." : "Fertig.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
