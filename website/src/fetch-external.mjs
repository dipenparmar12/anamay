// Downloads the selected openly licensed images (picked from src/image-candidates-*.json) and records credits.
// usage (from the website folder): node src/fetch-external.mjs
import fs from 'fs'; import path from 'path'; import sharp from 'sharp';

const UA = { 'User-Agent': 'AnamayAshramWebsite/1.0 (anamayashram@gmail.com)' };
const c1 = JSON.parse(fs.readFileSync('src/image-candidates-1.json', 'utf8'));
const c2 = JSON.parse(fs.readFileSync('src/image-candidates-2.json', 'utf8'));
// name: [candidate list, index, max width]
const picks = {
  'ext-shirodhara': [c1, 1, 1400], 'ext-mortar-herbs': [c1, 6, 1400], 'ext-rigveda-manuscript': [c1, 10, 2000],
  'ext-palmleaf': [c1, 15, 1600], 'ext-yajna-fire': [c1, 22, 1800], 'ext-temple-arch': [c1, 31, 1400],
  'ext-temple-pillars': [c1, 33, 1600], 'ext-stepwell': [c1, 41, 2000], 'ext-kausani-panorama': [c1, 43, 2400],
  'ext-kausani-sunset': [c1, 44, 1800], 'ext-trishul': [c1, 47, 2400], 'ext-diya-rangoli': [c1, 58, 1600],
  'ext-diya': [c1, 59, 1600], 'ext-tulsi': [c1, 61, 1400], 'ext-lotus': [c1, 68, 1600], 'ext-sushruta': [c1, 73, 1200],
  'ext-kumaon-dance': [c1, 79, 2000], 'ext-oil-massage': [c2, 0, 1400], 'ext-turmeric': [c2, 5, 1400],
  'ext-gita-closeup': [c2, 7, 1800], 'ext-samaveda-manuscript': [c2, 13, 1800], 'ext-aarti': [c2, 22, 1800],
  'ext-himalaya-dawn': [c2, 33, 2400], 'ext-nanda-devi': [c2, 36, 2400], 'ext-maharishi': [c2, 38, 1400],
};

const credits = {};
for (const [name, [list, i, w]] of Object.entries(picks)) {
  const c = list.find(x => x.n === i);
  const dest = path.resolve('assets/img', name + '.webp');
  if (!fs.existsSync(dest)) {
    const src = `https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/${encodeURIComponent(c.title)}&width=${Math.min(w, c.w)}`;
    const r = await fetch(src, { headers: UA });
    if (!r.ok) { console.log('FAILED', name, r.status); continue; }
    await sharp(Buffer.from(await r.arrayBuffer())).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toFile(dest);
  }
  const author = c.author.replace(/\s*\(talk\)|\s*Own work/gi, '').slice(0, 80);
  credits[name] = { file: `assets/img/${name}.webp`, title: c.title, author, license: c.license, licenseUrl: c.licenseUrl, source: c.source, page: c.page };
  console.log(name.padEnd(26), c.license.padEnd(14), author);
}
fs.writeFileSync('src/credits.json', JSON.stringify(credits, null, 1));
