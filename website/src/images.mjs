// Resizes the chosen photos from the offline mirror into web-ready WebP files under assets/img.
// usage (from the website folder): node src/images.mjs
// Needs the "sharp" package: npm install sharp
import fs from 'fs'; import path from 'path'; import sharp from 'sharp';

if (fs.existsSync('.env')) process.loadEnvFile('.env');

// The photographs and gallery captions are listed in ../content/images.json; their originals are looked up in
// IMAGE_SOURCE_DIR (default: the uploads folder of the offline copy of the old site).
const SRC = path.resolve(process.env.IMAGE_SOURCE_DIR || '../offline-site/wp-content/uploads');
const OUT = path.resolve('assets/img');
const { photos, gallery } = JSON.parse(fs.readFileSync('../content/images.json', 'utf8'));

fs.mkdirSync(path.join(OUT, 'gallery'), { recursive: true });
const make = (src, dest, width, quality = 78) =>
  sharp(path.join(SRC, src)).rotate().resize({ width, withoutEnlargement: true }).webp({ quality }).toFile(dest);

for (const [name, { source: src, width: w }] of Object.entries(photos)) {
  const dest = path.join(OUT, name + '.webp');
  if (!fs.existsSync(dest)) await make(src, dest, w);
}
const manifest = [];
for (const [i, { source: src, caption }] of gallery.entries()) {
  const base = String(i + 1).padStart(2, '0');
  const thumb = path.join(OUT, 'gallery', base + '-sm.webp'), full = path.join(OUT, 'gallery', base + '.webp');
  if (!fs.existsSync(thumb)) await make(src, thumb, 720, 74);
  if (!fs.existsSync(full)) await make(src, full, 1800, 80);
  const meta = await sharp(thumb).metadata();
  manifest.push({ thumb: `assets/img/gallery/${base}-sm.webp`, full: `assets/img/gallery/${base}.webp`, caption, w: meta.width, h: meta.height });
}
fs.writeFileSync(path.resolve('src/gallery.json'), JSON.stringify(manifest, null, 1));
const total = fs.readdirSync(OUT, { recursive: true }).filter(f => f.endsWith('.webp')).reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
console.log('images ready, total', (total / 1e6).toFixed(1), 'MB');
