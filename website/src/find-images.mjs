// Searches Wikimedia Commons and Unsplash for openly licensed photos and writes a review sheet.
// Only keeps: Commons files under CC0 / public domain / CC BY / CC BY-SA, and Unsplash photos under the
// standard Unsplash License (Unsplash+ "premium" photos are excluded).
// usage (from the website folder): node src/find-images.mjs   -> writes src/image-candidates.json + _candidates.html
import fs from 'fs';

const UA = { 'User-Agent': 'AnamayAshramWebsiteResearch/1.0 (anamayashram@gmail.com)' };
const topics = process.argv[2] ? JSON.parse(process.argv[2]) : {
  shirodhara: 'shirodhara', herbs: 'ayurvedic herbs spices', rigveda: 'Rigveda manuscript', palmleaf: 'palm leaf manuscript sanskrit',
  yajna: 'yajna fire ritual', temple: 'hindu temple architecture carving', stepwell: 'stepwell india', kausani: 'Kausani himalaya',
  nandadevi: 'Trishul peak', lamp: 'diya oil lamp', tulsi: 'tulsi holy basil', lotus: 'lotus flower nelumbo', sushruta: 'Sushruta statue', kumaon: 'Kumaon village terraced',
};
const okCommons = /^(CC0|Public domain|PD|CC BY(-SA)? [0-9.]+|CC BY(-SA)?)/i;
const strip = s => (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function commons(q) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=25&gsrsearch=${encodeURIComponent(q + ' filetype:bitmap')}&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=480`;
  const j = await (await fetch(u, { headers: UA })).json();
  return Object.values(j.query?.pages || {}).map(p => {
    const ii = p.imageinfo?.[0]; if (!ii) return null; const m = ii.extmetadata || {};
    const license = strip(m.LicenseShortName?.value);
    if (!okCommons.test(license) || ii.width < 1500) return null;
    return { source: 'Wikimedia Commons', title: p.title.replace(/^File:/, ''), author: strip(m.Artist?.value) || 'Unknown', license, licenseUrl: m.LicenseUrl?.value || '', page: ii.descriptionurl, url: ii.url, thumb: ii.thumburl, w: ii.width, h: ii.height };
  }).filter(Boolean).slice(0, 6);
}
async function unsplash(q) {
  try {
    const r = await fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(q)}&per_page=20`, { headers: UA });
    if (!r.ok) return [];
    const j = await r.json();
    return j.results.filter(p => !p.premium && !p.plus && p.width >= 2000).slice(0, 6).map(p => ({
      source: 'Unsplash', title: p.alt_description || p.description || p.slug, author: p.user.name, license: 'Unsplash License', licenseUrl: 'https://unsplash.com/license',
      page: p.links.html, url: p.urls.raw, thumb: p.urls.small, w: p.width, h: p.height,
    }));
  } catch { return []; }
}

const all = [];
for (const [key, q] of Object.entries(topics)) {
  const [c, s] = await Promise.all([commons(q), unsplash(q)]);
  [...c, ...s].forEach(x => all.push({ topic: key, ...x }));
  console.log(key.padEnd(12), 'commons', c.length, 'unsplash', s.length);
}
all.forEach((x, i) => { x.n = i; });
const outName = process.argv[3] || 'src/image-candidates.json';
fs.writeFileSync(outName, JSON.stringify(all, null, 1));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
fs.writeFileSync('_candidates.html', `<!doctype html><meta charset=utf-8><style>body{margin:0;background:#222;color:#eee;font:10px monospace}div{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;padding:4px}img{width:100%;height:105px;object-fit:cover;display:block}p{margin:2px 0 0;height:24px;overflow:hidden}</style><div>${all.map(x => `<figure style="margin:0"><img src="${x.thumb}"><p>#${x.n} ${x.topic} · ${x.source === 'Unsplash' ? 'U' : 'C'} · ${esc(x.license)}</p></figure>`).join('')}</div><script>const p=+(location.search.slice(3)||0);[...document.querySelectorAll('figure')].forEach((f,i)=>{if(i<p*30||i>=(p+1)*30)f.remove()})</script>`);
console.log('candidates', all.length);
