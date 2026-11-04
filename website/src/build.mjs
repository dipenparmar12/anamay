// Builds the static site: wraps every src/pages/*.html fragment in the shared layout and expands {{tokens}}.
// usage (from the website folder): node src/build.mjs
// Settings live in ../content (site.json, donation.json, *.csv). Values that differ per deployment can be set with
// the environment variables SITE_URL, API_BASE_URL, DONATION_MODE and GA4_ID, or in an uncommitted website/.env file.
import fs from 'fs'; import path from 'path';
import { LANGS, loadVisiting, renderVisiting, schedule, values as visitingValues, visitingMeta } from './visiting.mjs';

if (fs.existsSync('.env')) process.loadEnvFile('.env');
const env = process.env;
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
// CSV (RFC 4180: quoted fields may hold commas and line breaks); the delimiter is a comma, or a semicolon as some Excel locales save it
function readCsv(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const first = text.split(/\r?\n/, 1)[0], delimiter = first.split(';').length > first.split(',').length ? ';' : ',';
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c !== '"') cell += c; else if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
    else if (c === '"') quoted = true;
    else if (c === delimiter) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows, keys = head.map(h => h.trim().toLowerCase());
  return body.map((r, i) => ({ line: i + 2, ...Object.fromEntries(keys.map((k, j) => [k, (r[j] ?? '').trim()])) })).filter(r => keys.some(k => r[k]));
}
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CONTENT = path.resolve('../content/pages');
const credits = JSON.parse(fs.readFileSync('src/credits.json', 'utf8'));
const gallery = JSON.parse(fs.readFileSync('src/gallery.json', 'utf8'));
const videos = Object.fromEntries(JSON.parse(fs.readFileSync('../content/videos.json', 'utf8')).map(v => [v.id, v.title]));
// photographs from the Anāmay Vedic Retreat website, grouped by set (see src/retreat.json)
const retreat = JSON.parse(fs.readFileSync('src/retreat.json', 'utf8'));

const SITE = readJson('../content/site.json');
const DONATION = readJson('../content/donation.json');
SITE.url = (env.SITE_URL || SITE.url || '').replace(/\/+$/, '');
SITE.api.base = (env.API_BASE_URL || SITE.api.base || '').replace(/\/+$/, '');
SITE.analytics.ga4 = env.GA4_ID || SITE.analytics.ga4 || '';
DONATION.mode = env.DONATION_MODE || DONATION.mode;
if (!['legacy', 'button', 'native'].includes(DONATION.mode)) throw new Error(`donation mode "${DONATION.mode}" is not legacy, button or native`);
if (DONATION.mode === 'native' && !SITE.api.base) throw new Error('DONATION_MODE=native needs the API address (api.base in content/site.json or API_BASE_URL)');
if (DONATION.mode === 'button' && !DONATION.razorpay?.paymentButtonId) throw new Error('DONATION_MODE=button needs razorpay.paymentButtonId in content/donation.json');
if (SITE.analytics.ga4 && !/^G-[A-Z0-9]+$/.test(SITE.analytics.ga4)) throw new Error(`analytics.ga4 "${SITE.analytics.ga4}" is not a GA4 measurement ID (G-XXXXXXXXXX)`);
const WA = SITE.contact.whatsappMessages;
if (!/^\d{10,15}$/.test(SITE.contact.whatsapp)) throw new Error(`contact.whatsapp "${SITE.contact.whatsapp}" in content/site.json must be digits only, with the country code (919917248154)`);
for (const k of ['general', 'stay', 'application']) for (const l of LANGS) if (!WA?.[k]?.[l]?.trim()) throw new Error(`contact.whatsappMessages.${k}.${l} is missing in content/site.json`);
const A = SITE.contact.address;
const addressHtml = (country = true) => `${esc(A.street)},<br>${esc(A.region)} ${esc(A.postalCode)}${country ? ', ' + esc(A.country) : ''}`;
const telHref = p => p.replace(/[^\d+]/g, '');
const phoneLink = p => `<a href="tel:${telHref(p)}">${esc(p)}</a>`;
const phoneLinks = list => list.map(phoneLink).join('<br>');
const orList = items => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`);
// {{site:contact.email}}: any value of site.json by its path
const setting = p => { const v = p.split('.').reduce((o, k) => (o == null ? o : o[k]), SITE); if (v == null || typeof v === 'object') throw new Error(`unknown site setting "${p}"`); return v; };

let LANG = 'en'; // the language of the page being built
let WA_KEY = 'general'; // the message the WhatsApp buttons of the header, menu and footer start with (a page can choose with "wa")
const waTemplate = (key, lang = LANG) => WA[key][lang];
// {{wa:key}}: a WhatsApp link with a message ready to send; the visitor can still change it in WhatsApp
const waLink = (key, lang = LANG) => `https://wa.me/${SITE.contact.whatsapp}?text=${encodeURIComponent(waTemplate(key, lang).replace('{details}', '').replace(/\n{3,}/g, '\n\n').trim())}`;
const inEnglish = () => (LANG === 'en' ? '' : ' lang="en"'); // the menu and footer stay English on a Hindi page
const asHindi = t => (/\p{Script=Devanagari}/u.test(t) ? `<span lang="hi">${t}</span>` : t);

const NAV = [
  { label: 'About', items: [
    ['about.html', 'The Ashram', 'Our purpose, our trust and the land of Kausani'],
    ['founder.html', 'Our Founder', 'Ashutosh Urs Strobel and his path'],
  ] },
  { label: 'Vedic Knowledge', items: [
    ['vedas.html', 'The Vedas', 'The living source of Indian knowledge'],
    ['vidyapeeth.html', 'Vedic Vidyapeeth', 'Our Gurukul for young Vedic pandits'],
    ['yagya-jyotish.html', 'Yagya & Jyotish', 'Vedic performances and astrology'],
  ] },
  { label: 'Wellbeing', items: [
    ['meditation.html', 'Dhyāna · Meditation', 'Transcendental Meditation'],
    ['yoga.html', 'Yoga', 'Āsana, prāṇāyāma and the five kośas'],
    ['ayurveda.html', 'Āyurveda', 'The science of life and our Vaidya'],
    ['panchakarma.html', 'Panchakarma', 'Classical cleansing and renewal'],
    ['kshar-sutra.html', 'Kshar Sutra', 'Ayurvedic para-surgical therapy'],
  ] },
  { label: 'Ashram Life', items: [
    ['sattvic-life.html', 'Sattvic Life', 'A day at the ashram, our farm and cows'],
    ['volunteer.html', 'Volunteer & 1-week Course', 'Seva and the TM introduction week'],
    ['gallery.html', 'Gallery', 'Photographs and films'],
    ['journal.html', 'Journal & Magazine', 'Stories, testimonials and our quarterly'],
  ] },
  { label: 'Stay', items: [
    ['visiting.html', 'Visiting Anāmay Ashram', 'Ways to stay, charges, schedule and dates'],
    ['visiting-hi.html', 'अनामय आश्रम में आगमन', 'The same information in Hindi'],
    ['retreat.html', 'Anāmay Vedic Retreat', 'The guest house beside the ashram'],
    ['rooms.html', 'Rooms & Suites', 'Eighteen rooms built by Vāstu'],
    ['visit.html', 'Visit & Travel', 'How to reach Kausani, and how to write to us'],
  ] },
  { label: 'Contribute', items: [
    ['donate.html', 'Donate', 'Support the Vedic pandits and the Goshala'],
    ['contribute.html', 'Ways to contribute', 'Learn TM, offer seva or donate'],
  ] },
];

/* ---------- small inline SVG icon set (24px line icons) ---------- */
const I = {
  lotus: '<path d="M12 20c-4 0-8-2.5-9-6 3 0 5 1 6.3 2.4M12 20c4 0 8-2.5 9-6-3 0-5 1-6.3 2.4M12 20c-2.2-1.6-3.6-4.2-3.6-7.2S10 7 12 4c2 3 3.6 5.8 3.6 8.8S14.2 18.4 12 20zM8.6 10.4C6.8 9.8 5 9.8 3.5 10.2c.3 1.6 1.2 3 2.5 4M15.4 10.4c1.8-.6 3.6-.6 5.1-.2-.3 1.6-1.2 3-2.5 4"/>',
  flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.6-5.3 3.7-8.8 1.9 1.3 3 3.1 3.1 5 .9-.8 1.6-1.9 1.8-3.4 2.4 1.9 4.4 4.4 4.4 7.2 0 3.6-2.6 6.2-6.5 6.2z"/><path d="M12 21c-1.6 0-2.7-1.1-2.7-2.6 0-1.7 1.6-2.7 2.7-4.4 1.1 1.7 2.7 2.7 2.7 4.4 0 1.5-1.1 2.6-2.7 2.6z"/>',
  book: '<path d="M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5V19c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5z"/><path d="M12 6v13.5"/>',
  star: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3.2"/>',
  leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-4 6-7 10-9"/>',
  drop: '<path d="M12 3c3.5 4.4 6 7.8 6 11a6 6 0 1 1-12 0c0-3.2 2.5-6.6 6-11z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
  bindu: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  yoga: '<circle cx="12" cy="5" r="2"/><path d="M12 7.5v6M6 10.5l6 1.5 6-1.5M7 20l5-6.5 5 6.5M5 20h14"/>',
  thread: '<path d="M4 18c3-6 5-10 8-12s5 1 3 4-6 3-6 6 3 3 5 1"/><circle cx="19" cy="18" r="1.5"/>',
  sun: '<circle cx="12" cy="14" r="4"/><path d="M3 20h18M12 4v3M5.6 7.6l2 2M18.4 7.6l-2 2M3 14h2M19 14h2"/>',
  seed: '<path d="M12 21v-8M12 13c0-4-3-6-7-6 0 4 3 6 7 6zM12 11c0-3.5 2.5-6 6.5-6 0 3.5-2.5 6-6.5 6z"/>',
  home: '<path d="M4 10.5 12 4l8 6.5V20H4z"/><path d="M9.5 20v-5.5h5V20"/>',
  hands: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M3 9h18M12 9v11M12 9c-2-4-6-4-6-1.5S9 9 12 9zm0 0c2-4 6-4 6-1.5S15 9 12 9z"/>',
  school: '<path d="M3 9l9-5 9 5-9 5z"/><path d="M7 11.2V16c3 2 7 2 10 0v-4.8M21 9v6"/>',
  pin: '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  train: '<rect x="6" y="3" width="12" height="13" rx="3"/><path d="M6 10h12M9 20l-1.5 1.5M15 20l1.5 1.5M9 13h.01M15 13h.01"/>',
  plane: '<path d="M10.5 4.5a1.5 1.5 0 0 1 3 0V10l7 4v2l-7-2v4l2 1.5V21l-3.5-1-3.5 1v-1.5l2-1.5v-4l-7 2v-2l7-4z"/>',
  car: '<path d="M5 16V11l2-5h10l2 5v5M3 16h18v3H3zM7 19v1.5M17 19v1.5M5 11h14"/>',
  whatsapp: '<path d="M4 20l1.3-4A8 8 0 1 1 8.4 19z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8a5 5 0 0 1-2.8-2.8l.8-1-1-2z"/>',
  facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".8" fill="currentColor"/>',
  youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.2v5.6l5-2.8z" fill="currentColor"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  sunrise: '<path d="M3 19h18M7 19a5 5 0 0 1 10 0M12 7v3M5.2 11.2l1.8 1.8M18.8 11.2 17 13"/>',
  daylight: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
};
const icon = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

/* ---------- generated ornaments ---------- */
function mandala(cls = '') {
  const petal = (r0, r1, w) => { const L = r1 - r0; return `M0 ${-r0}C${w} ${-(r0 + L * .35)} ${w * .55} ${-(r1 - L * .12)} 0 ${-r1}C${-w * .55} ${-(r1 - L * .12)} ${-w} ${-(r0 + L * .35)} 0 ${-r0}Z`; };
  const ring = (n, d, extra = '') => Array.from({ length: n }, (_, i) => `<path transform="rotate(${(360 / n) * i}${extra})" d="${d}"/>`).join('');
  const dots = (n, r, s) => Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return `<circle cx="${(r * Math.sin(a)).toFixed(1)}" cy="${(-r * Math.cos(a)).toFixed(1)}" r="${s}" fill="currentColor"/>`; }).join('');
  const arch = (r0, r1, w) => `M${-w} ${-r0}C${-w} ${-(r0 + (r1 - r0) * .6)} -3 ${-(r1 - 6)} 0 ${-r1}C3 ${-(r1 - 6)} ${w} ${-(r0 + (r1 - r0) * .6)} ${w} ${-r0}`;
  return `<svg class="mandala ${cls}" viewBox="-200 -200 400 400" fill="none" stroke="currentColor" stroke-width=".7" aria-hidden="true">
<circle r="6"/><circle r="13"/>${ring(8, petal(14, 44, 13))}${ring(8, petal(18, 36, 7), ' ')}<circle r="48"/>${dots(32, 54, 1.4)}
${ring(16, petal(60, 104, 14))}<circle r="108"/><circle r="112"/>${ring(24, arch(114, 146, 15))}${dots(24, 152, 1.8)}
<circle r="158"/>${ring(48, petal(160, 182, 5))}<circle r="186"/>${dots(96, 192, .9)}</svg>`;
}
// a Himalayan ridge silhouette across a 1440×240 box
const ridgeLine = (seed, base, amp, step) => {
  let pts = []; for (let x = 0; x <= 1440; x += step) {
    const y = base - amp * (0.55 * Math.sin(x / 210 + seed) + 0.3 * Math.sin(x / 83 + seed * 2.1) + 0.15 * Math.abs(Math.sin(x / 31 + seed * 3.7)));
    pts.push(`${x},${y.toFixed(1)}`);
  } return `M0,240L${pts.join('L')}L1440,240Z`;
};
function ridges() {
  return `<div class="hero-ridges" aria-hidden="true"><svg viewBox="0 0 1440 240" preserveAspectRatio="none">
<path data-parallax="-0.06" d="${ridgeLine(1.3, 120, 56, 16)}" style="fill:var(--paper);opacity:.28"/>
<path d="${ridgeLine(4.2, 176, 34, 12)}" style="fill:var(--paper)"/></svg></div>`;
}
// the mountains seen through the window of the day dial
const dialRidges = () => `<svg class="dial-ridges" viewBox="0 0 1440 240" preserveAspectRatio="none" aria-hidden="true"><path d="${ridgeLine(2.2, 120, 70, 18)}" fill="#3b3f63" opacity=".55"/><path d="${ridgeLine(5.1, 170, 46, 14)}" fill="#20253f"/></svg>`;
const lotusRule = () => `<div class="lotus-rule" aria-hidden="true"><svg viewBox="0 0 46 26" fill="none" stroke="currentColor" stroke-width="1"><path d="M23 24C19 20 17.5 15 23 3c5.5 12 4 17 0 21zM23 24c-4-1-9-4-11-11 6 0 9.5 4 11 11zM23 24c4-1 9-4 11-11-6 0-9.5 4-11 11zM23 24C17 25 9 23 3 18c7-2 14 1 20 6zM23 24c6 1 14-1 20-6-7-2-14 1-20 6z"/></svg></div>`;

/* ---------- images ---------- */
// {{img:name|alt|class}} — attributions live on credits.html only, not under the images
function img(name, alt = '', cls = '') {
  const c = credits[name];
  const tag = `<img src="assets/img/${name}.webp" alt="${alt || (c && c.caption) || ''}" loading="lazy" decoding="async"${cls ? ` class="${cls}"` : ''}>`;
  return tag;
}

/* ---------- article markdown (from the content inventory) ---------- */
function md(slug) {
  let t = fs.readFileSync(path.join(CONTENT, slug + '.md'), 'utf8').replace(/^---[\s\S]*?---\s*/, '');
  t = t.split(/## You May Also Like|## Add Your Comment|## Post navigation/)[0];
  const skip = /^(\d{1,2}|January|February|March|April|May|June|July|August|September|October|November|December|Share:|Tags:.*|##### What's your reaction\?|\d+(Cool|Bad|Happy|Sad)|\[posted by.*\]\(.*\)|!\[.*)$/i;
  const inline = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  let html = '', list = false;
  for (const raw of t.split('\n')) {
    const l = raw.trim(); if (!l || skip.test(l)) continue;
    if (/^- /.test(l)) { if (!list) { html += '<ul>'; list = true; } html += `<li>${inline(l.slice(2))}</li>`; continue; }
    if (list) { html += '</ul>'; list = false; }
    const h = l.match(/^(#{1,6}) (.*)/);
    if (h) { const lvl = Math.min(4, Math.max(2, h[1].length)); html += `<h${lvl}>${inline(h[2])}</h${lvl}>`; continue; }
    if (l.startsWith('> ')) { html += `<blockquote>${inline(l.slice(2))}</blockquote>`; continue; }
    html += `<p>${inline(l)}</p>`;
  }
  return html + (list ? '</ul>' : '');
}

/* ---------- reusable blocks ---------- */
const videoCard = id => `<figure class="video-card"><button class="yt" data-id="${id}" data-title="${(videos[id] || '').replace(/"/g, '&quot;')}" aria-label="Play video: ${(videos[id] || '').replace(/"/g, '&quot;')}"><img src="assets/img/video/${id}.jpg" alt="" loading="lazy"><span class="play">${icon('play')}</span></button><figcaption>${videos[id] || ''}</figcaption></figure>`;
const VIDEO_GROUPS = readJson('../content/video-groups.json'); // which films each page shows
// {{gallery}} / {{strip}} show the ashram photographs; {{gallery:rooms}} / {{strip:stay}} a set from src/retreat.json
const photoSet = (key, n) => (/^\d+$/.test(key || '') || !key ? gallery.slice(0, key ? +key : n) : retreat[key]);
const galleryGrid = (key, set = photoSet(key, gallery.length)) => `<div class="gallery" data-stagger>${set.map(g => `<a href="${g.full}" data-lightbox="${key || 'photos'}" data-caption="${g.caption}"><img src="${g.thumb}" alt="${g.caption}" width="${g.w}" height="${g.h}" loading="lazy"><span>${g.caption}</span></a>`).join('')}</div>`;
// a draggable film strip of photographs, each keeping its own proportions
const strip = (key, set = photoSet(key, 12)) => `<div class="strip" data-strip data-lenis-prevent-horizontal>${set.map((g, i) => `<a class="strip-item" href="${g.full}" data-lightbox="strip-${key || 'photos'}" data-caption="${g.caption}" style="--ar:${g.w}/${g.h}"><img src="${g.thumb}" alt="${g.caption}" width="${g.w}" height="${g.h}" loading="lazy" draggable="false"><span><i>${String(i + 1).padStart(2, '0')}</i>${g.caption}</span></a>`).join('')}</div>`;
const creditsTable = () => `<table class="credits-table"><thead><tr><th>Image</th><th>Subject</th><th>Author</th><th>Licence</th></tr></thead><tbody>${Object.entries(credits).map(([k, c]) => `<tr><td><img src="${c.file}" alt="" loading="lazy"></td><td>${c.caption}</td><td>${c.author}</td><td><a href="${c.page}" target="_blank" rel="noopener">${c.license}</a></td></tr>`).join('')}</tbody></table>`;

// {{contact-form:subject|interest|channel}}; the channel (ashram or retreat) decides which address receives the message
function contactForm(subject = 'Enquiry from the website', interest = '', channel = 'ashram') {
  const to = channel === 'retreat' ? SITE.contact.retreatEmail : SITE.contact.email;
  const viaApi = !!SITE.api.base;
  return `<form class="form" data-enquiry="${to}" data-channel="${channel}" data-subject="${esc(subject)}" novalidate>
  <div class="field"><input id="f-name" name="name" data-label="Name" placeholder=" " required maxlength="100" autocomplete="name"><label for="f-name">Your name</label><span class="error">Please tell us your name.</span></div>
  <div class="field"><input id="f-phone" name="phone" data-label="Mobile" placeholder=" " type="tel" maxlength="30" autocomplete="tel" pattern="[0-9 +\\(\\)\\-]{7,}"><label for="f-phone">Mobile number</label><span class="error">Please check the number.</span></div>
  <div class="field"><input id="f-email" name="email" data-label="Email" placeholder=" " type="email" required maxlength="150" autocomplete="email"><label for="f-email">Email</label><span class="error">Please enter a valid email.</span></div>
  <div class="field"><select id="f-interest" name="interest" data-label="Interested in">${SITE.forms.interests.map(o => `<option${o === interest ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select><label for="f-interest">Interested in</label></div>
  <div class="field"><input id="f-age" name="age" data-label="Age" placeholder=" " type="number" min="5" max="110"><label for="f-age">Age</label></div>
  <div class="field"><input id="f-date" name="arrival" data-label="Tentative arrival" placeholder=" " type="date"><label for="f-date">Tentative arrival date</label></div>
  <div class="field full"><textarea id="f-msg" name="message" data-label="Message" placeholder=" " required minlength="10" maxlength="5000"></textarea><label for="f-msg">Your message</label><span class="error">Please write a short message.</span></div>
  <div class="hp" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label></div>
  <p class="form-alert full" role="alert" hidden></p>
  <div class="full form-actions"><button class="btn" type="submit">${viaApi ? 'Send message' : 'Send by email'} <span class="arrow">→</span></button><button class="btn ghost" type="button" data-whatsapp="${SITE.contact.whatsapp}">${icon('whatsapp')} Send on WhatsApp</button></div>
  <p class="form-note full">${viaApi ? 'Your message goes straight to the ashram. We reply by email or phone. Please wait for a confirmation before travelling — space is limited.' : 'Your message opens in your own email or WhatsApp app, addressed to the ashram. Please wait for a confirmation before travelling — space is limited.'}</p>
</form>
<div class="form-success" role="status"><span class="sanskrit">धन्यवादः</span><h3>Thank you</h3><p class="muted">${viaApi ? 'Your message has reached us. We reply as soon as we can.' : 'Your message is ready in your email or WhatsApp app — just press send. We reply as soon as we can.'}</p></div>`;
}

/* ---------- layout ---------- */
function header(current) {
  const groups = NAV.map(g => {
    if (g.href) return `<a href="${g.href}"${g.href === current ? ' aria-current="page"' : ''}>${g.label}</a>`;
    const active = g.items.some(i => i[0] === current);
    return `<div class="nav-group"><button type="button" aria-haspopup="true"${active ? ' class="active"' : ''}>${g.label}</button><div class="dropdown">${g.items.map(([h, t, d]) => `<a href="${h}"${h === current ? ' aria-current="page"' : ''}><b>${asHindi(t)}</b><span>${d}</span></a>`).join('')}</div></div>`;
  }).join('');
  return `<header class="site-header"${inEnglish()}><div class="wrap">
  <a class="brand" href="index.html" aria-label="Anāmay Ashram home">${emblem()}<span class="brand-text"><b>Anāmay Ashram</b><small>अनामय आश्रम · Kausani</small></span></a>
  <button class="menu-toggle" aria-label="Menu" aria-expanded="false" aria-controls="site-menu"><span></span></button>
  <nav class="nav" aria-label="Main">${groups}<a class="btn" href="visit.html">Visit &amp; Contact</a></nav>
</div></header>
${menu(current)}`;
}
// full-screen menu for phones and tablets; it lives outside the header so it always covers the whole screen
function menu(current) {
  const num = ['१', '२', '३', '४', '५', '६'];
  const cur = h => h === current ? ' aria-current="page"' : '';
  const groups = NAV.map((g, i) => g.href
    ? `<div class="menu-group"><p class="menu-label"><span>${num[i]}</span>Support</p><a href="${g.href}"${cur(g.href)}>${g.label}</a></div>`
    : `<div class="menu-group"><p class="menu-label"><span>${num[i]}</span>${g.label}</p>${g.items.map(([h, t]) => `<a href="${h}"${cur(h)}>${asHindi(t)}</a>`).join('')}</div>`).join('');
  return `<div class="menu" id="site-menu"${inEnglish()} data-lenis-prevent inert>
  <div class="menu-inner wrap">
    <nav class="menu-nav" aria-label="Main menu"><a class="menu-home" href="index.html"${cur('index.html')}>Home</a>${groups}</nav>
    <div class="menu-aside"><p class="sanskrit">पदं गच्छन्त्यनामयम्</p><a class="btn" href="visit.html">Visit &amp; Contact <span class="arrow">→</span></a>
      <ul><li><a href="${waLink(WA_KEY)}" target="_blank" rel="noopener">${icon('whatsapp')} WhatsApp</a></li><li><a href="mailto:${SITE.contact.email}">${icon('mail')} ${SITE.contact.email}</a></li><li><a href="tel:${telHref(SITE.contact.phones[0])}">${icon('phone')} ${SITE.contact.phones[0]}</a></li></ul></div>
  </div>
</div>`;
}
function emblem() {
  return `<svg class="emblem" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><circle cx="24" cy="24" r="22.5" opacity=".5"/><circle cx="24" cy="24" r="19" stroke-dasharray="1 3"/><path d="M24 35c-3.6-2.6-5-7-5-11.2 0-4 2-8 5-11.8 3 3.8 5 7.8 5 11.8 0 4.2-1.4 8.6-5 11.2z"/><path d="M24 35c-4.5 0-10-2.6-12-7.8 4.4-.4 8.4 1.6 10.6 4.8M24 35c4.5 0 10-2.6 12-7.8-4.4-.4-8.4 1.6-10.6 4.8"/><circle cx="24" cy="10" r="1.3" fill="currentColor" stroke="none"/></svg>`;
}
function footer() {
  const links = (title, items) => `<div><h4>${title}</h4><ul>${items.map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join('')}</ul></div>`;
  return `<footer class="site-footer on-dark"${inEnglish()}>${mandala('hero-mandala')}
<div class="wrap"><div class="footer-top">
  <div><a class="brand" href="index.html">${emblem()}<span class="brand-text"><b>Anāmay Ashram</b><small>Shree Anamay Nyas · est. 2006</small></span></a>
    <p class="footer-shloka">पदं गच्छन्त्यनामयम्</p><p>Arrive at Anāmaya — the state free from all suffering. A Vedic ashram and Gurukul in the Himalayas at Kausani, Uttarakhand.</p>
    <div class="socials"><a href="${SITE.social.facebook}" target="_blank" rel="noopener" aria-label="Facebook">${icon('facebook')}</a><a href="${SITE.social.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${icon('instagram')}</a><a href="${SITE.social.youtube}" target="_blank" rel="noopener" aria-label="YouTube">${icon('youtube')}</a><a href="${waLink(WA_KEY)}" target="_blank" rel="noopener" aria-label="WhatsApp">${icon('whatsapp')}</a></div></div>
  ${links('Knowledge', [['vedas.html', 'The Vedas'], ['vidyapeeth.html', 'Vedic Vidyapeeth'], ['yagya-jyotish.html', 'Yagya & Jyotish'], ['meditation.html', 'Meditation'], ['yoga.html', 'Yoga']])}
  ${links('Healing & Life', [['ayurveda.html', 'Āyurveda'], ['panchakarma.html', 'Panchakarma'], ['kshar-sutra.html', 'Kshar Sutra'], ['sattvic-life.html', 'Sattvic Life'], ['volunteer.html', 'Volunteer']])}
  ${links('Stay', [['visiting.html', 'Visiting Anāmay Ashram'], ['retreat.html', 'Anāmay Vedic Retreat'], ['rooms.html', 'Rooms & Suites'], ['visit.html', 'Visit & Travel'], ['donate.html', 'Donate'], ['contribute.html', 'Ways to contribute']])}
  <div><h4>Reach us</h4><ul><li>${addressHtml(false)}</li>${SITE.contact.phones.map(p => `<li><a href="tel:${telHref(p)}">${p}</a></li>`).join('')}<li><a href="mailto:${SITE.contact.email}">${SITE.contact.email}</a></li><li>${esc(SITE.contact.hours)}</li></ul></div>
</div>
<div class="footer-bottom"><span>© <span data-year>${new Date().getFullYear()}</span> ${esc(SITE.legalName)}. All rights reserved.</span><nav><a href="policies.html">Privacy &amp; policies</a><a href="retreat.html">Anāmay Vedic Retreat</a></nav></div></div></footer>
<a class="whatsapp-float"${inEnglish()} href="${waLink(WA_KEY)}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">${icon('whatsapp')}</a>
<button class="to-top"${inEnglish()} type="button" aria-label="Back to top" tabindex="-1">${icon('up')}</button>
<div class="lightbox"${inEnglish()} role="dialog" aria-modal="true" aria-label="Photo viewer" data-lenis-prevent><span class="lb-count"></span><figure><img alt=""><figcaption></figcaption></figure><button class="close" aria-label="Close">×</button><button class="prev" aria-label="Previous">‹</button><button class="next" aria-label="Next">›</button></div>
<div class="vmodal"${inEnglish()} role="dialog" aria-modal="true" aria-label="Film player" data-lenis-prevent>
  <div class="vm-frame"><div class="vm-player"><div class="vm-state" role="status"><span class="vm-spin"></span><p>Loading the film…</p></div></div>
    <div class="vm-meta"><p class="vm-title"></p><a class="vm-out" href="${SITE.social.youtube}" target="_blank" rel="noopener">Watch on YouTube ↗</a></div></div>
  <button class="vm-close" aria-label="Close the film">×</button>
</div>`;
}
// the 1-week course dates, read from content/course-dates.csv (start,end as YYYY-MM-DD or DD-MM-YYYY), earliest first; dates that are over stay in the file
function readCourseDates() {
  const file = 'content/course-dates.csv';
  const rows = readCsv('../' + file);
  const parse = (s, n) => {
    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/), dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    const [y, mo, d] = iso ? iso.slice(1) : dmy ? [dmy[3], dmy[2], dmy[1]] : [];
    const date = new Date(Date.UTC(+y, mo - 1, +d));
    if (!(iso || dmy) || date.getUTCMonth() !== mo - 1) throw new Error(`${file} line ${n}: "${s}" is not a date (write it like 2027-03-15)`);
    return date;
  };
  const list = rows.map(r => ({ from: parse(r.start, r.line), to: parse(r.end || r.start, r.line), n: r.line })).sort((p, q) => p.from - q.from);
  list.forEach((c, i) => {
    if (c.to < c.from) throw new Error(`${file} line ${c.n}: the end date is before the start date`);
    if (i && +c.from === +list[i - 1].from) throw new Error(`${file} line ${c.n}: a course starting on this date is listed twice`);
  });
  return list;
}
const COURSE_DATES = readCourseDates();
const VISITING = loadVisiting('content/visiting.json', COURSE_DATES);
// {{course-dates}}: the dates still to come (the page script hides the ones that are over), with a link to the whole calendar
function courseDates() {
  const list = COURSE_DATES;
  const day = (d, year) => `${d.getUTCDate()} ${'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')[d.getUTCMonth()]}${year ? ' ' + d.getUTCFullYear() : ''}`;
  const years = [...new Set(list.map(c => c.from.getUTCFullYear()))], withYear = years.length > 1 ? 1 : 0; // years only when the list spans several
  const label = ({ from, to }) => from.getUTCMonth() !== to.getUTCMonth() || from.getUTCFullYear() !== to.getUTCFullYear() ? `${day(from, withYear)} – ${day(to, withYear)}`
    : +from === +to ? day(from, withYear) : `${from.getUTCDate()}–${day(to, withYear)}`;
  return `<span class="eyebrow">${years.length === 1 ? years[0] + ' course dates' : 'Course dates'}</span>
        <ul class="dates upcoming">${list.map(c => `<li data-start="${c.from.toISOString().slice(0, 10)}" data-end="${c.to.toISOString().slice(0, 10)}">${label(c)}</li>`).join('')}</ul>
        <p class="dates-empty" hidden>No coming dates are listed just now. Please write to us.</p>
        <p class="form-note" style="margin-top:18px"><a class="link-arrow" href="visiting.html#dates">The whole calendar</a></p>`;
}
// {{magazine}}: the issues of the quarterly magazine, from content/magazine.csv (issue number, then the address of the English and Hindi PDF)
function magazine() {
  const file = 'content/magazine.csv';
  return readCsv('../' + file).map(r => {
    const links = [['english', 'English'], ['hindi', 'हिन्दी']].filter(([k]) => r[k]).map(([k, label]) => {
      if (!/^https?:\/\//.test(r[k])) throw new Error(`${file} line ${r.line}: "${r[k]}" is not a web address (start it with https://)`);
      return `<a href="${esc(r[k])}" target="_blank" rel="noopener">${label}</a>`;
    });
    return `<div class="issue">${mandala()}<div><small>Issue ${esc(r.issue)}</small><h3>Anāmay Ashram</h3></div><div class="langs">${links.join('')}</div></div>`;
  }).join('\n      ');
}
const ui = { esc, icon, img, ridges: dialRidges }; // what visiting.mjs draws with
// {{schedule:daily-schedule|sky}}: a day's timetable from content/<name>.csv (time as 24-hour HH:MM; "sky" adds the sun window on wide screens)
function scheduleFromCsv(name, sky) {
  const file = `content/${name}.csv`;
  const rows = readCsv('../' + file).map(r => {
    const t = r.time.match(/^(\d{1,2}):(\d{2})$/);
    if (!t || +t[1] > 23 || +t[2] > 59) throw new Error(`${file} line ${r.line}: "${r.time}" is not a time (write it as 24-hour HH:MM, for example 07:30)`);
    return { from: r.time.padStart(5, '0'), label: r.label, title: r.title, note: r.description };
  }).sort((a, b) => a.from.localeCompare(b.from));
  return schedule(rows, { sky }, ui);
}
// {{donate-widget}}: the way to give, as set in content/donation.json (legacy link, the Razorpay payment button, or our own form)
function donateWidget() {
  const note = `Payments are handled by Razorpay, the same secure service as on our earlier website. Any amount from ${DONATION.currencySymbol}${DONATION.minAmount}.`;
  const fallback = `<p class="donate-fallback" hidden>The payment form could not be loaded. Please check your connection, or <a href="${DONATION.legacyUrl}" target="_blank" rel="noopener">donate on our original donation page</a>.</p>`;
  if (DONATION.mode === 'legacy') return `<div class="donate-box"><a class="btn" href="${DONATION.legacyUrl}" target="_blank" rel="noopener">Donate online <span class="arrow">→</span></a><p class="form-note">${note}</p></div>`;
  if (DONATION.mode === 'button') return `<div class="donate-box"><div class="donate-embed" data-razorpay-button="${esc(DONATION.razorpay.paymentButtonId)}"><p class="donate-loading" role="status">Loading the secure payment form…</p></div>${fallback}<p class="form-note">${note}</p><noscript><p class="form-note"><a href="${DONATION.legacyUrl}" target="_blank" rel="noopener">Donate on our original donation page</a> (needs JavaScript here).</p></noscript></div>`;
  return `<div class="donate-box"><div class="donate-native" data-donate-api="${esc(SITE.api.base)}"><p class="donate-loading" role="status">Loading the secure donation form…</p></div>${fallback}<noscript><p class="form-note"><a href="${DONATION.legacyUrl}" target="_blank" rel="noopener">Donate on our original donation page</a> (needs JavaScript here).</p></noscript></div>`;
}
// the language switch of a page that exists in English and Hindi
const langSwitch = ({ label, links }, current) => `<nav class="lang-switch" aria-label="${esc(label)}">${links.map(l => `<a href="${l.href}" hreflang="${l.lang}" lang="${l.lang}"${l.lang === current ? ' aria-current="page"' : ''}>${l.text}</a>`).join('')}</nav>`;
// inner pages open on a temple doorway: text on the parchment, the photograph framed in an arch
function pageHero(m) {
  return `<section class="page-hero">
  ${m.sanskrit ? `<span class="ph-glyph" aria-hidden="true">${m.sanskrit}</span>` : ''}
  <div class="wrap ph-grid">
    <div class="ph-text">
      ${m.langSwitch ? langSwitch(m.langSwitch, m.lang) : ''}
      ${m.crumb ? `<p class="crumbs"><a href="index.html"${m.homeLabel ? ` lang="${m.lang}"` : ''}>${m.homeLabel || 'Home'}</a><span>${m.crumb}</span></p>` : ''}
      ${m.sanskrit ? `<span class="sanskrit">${m.sanskrit}</span>` : ''}
      <h1 class="reveal">${m.heading || m.title}</h1>
      ${m.lead ? `<p class="lead">${m.lead}</p>` : ''}
      ${m.cta ? `<p class="ph-cta">${[m.cta].flat().map(c => `<a class="btn${c.ghost ? ' ghost' : ''}" href="${c.href}">${c.text} <span class="arrow">↓</span></a>`).join('')}</p>` : ''}
      ${m.contactStrip ? `<ul class="ph-contact"><li>${icon('phone')}<span>${phoneLinks(SITE.contact.phones).replace(/<br>/g, ' <i>·</i> ')}</span></li><li>${icon('mail')}<a href="mailto:${SITE.contact.email}">${SITE.contact.email}</a></li><li>${icon('clock')}<span>${esc(SITE.contact.hours)}</span></li></ul>` : ''}
      ${m.officialContact ? `<ul class="ph-contact"><li>${icon('mail')}<a href="mailto:${SITE.contact.email}">${SITE.contact.email}</a></li><li>${icon('phone')}<span><a href="tel:+${SITE.contact.whatsapp}">${esc(SITE.contact.whatsappLabel)}</a> <i>·</i> <a href="${waLink('stay')}" target="_blank" rel="noopener">WhatsApp</a></span></li></ul>` : ''}
      <span class="ph-cue" aria-hidden="true"></span>
    </div>
    <figure class="ph-media"><div class="arch"><img data-parallax="0.05" src="assets/img/${m.hero}.webp" alt="${m.heroAlt || ''}"${m.heroPos ? ` style="object-position:${m.heroPos}"` : ''} fetchpriority="high"></div></figure>
  </div>
</section>`;
}
const pageUrl = f => `${SITE.url}/${f === 'index.html' ? '' : f}`;
// search engines and link previews: who we are, as structured data (home page only)
const organizationJson = () => `<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org', '@type': 'Organization', name: SITE.legalName, alternateName: SITE.name, url: SITE.url + '/', foundingDate: String(SITE.established),
  email: SITE.contact.email, telephone: SITE.contact.phones[0],
  address: { '@type': 'PostalAddress', streetAddress: A.street, addressRegion: A.region, postalCode: A.postalCode, addressCountry: A.countryCode },
  sameAs: [SITE.social.facebook, SITE.social.instagram, SITE.social.youtube],
}).replace(/</g, '\\u003c')}</script>\n`;
function layout(m, body, file) {
  const name = m.siteName || SITE.name;
  const title = file === 'index.html' ? `${SITE.name} · Vedic Ashram & Gurukul in the Himalayas, Kausani` : m.title.includes(name) ? m.title : `${m.title} · ${name}`;
  return `<!doctype html>
<html lang="${m.lang || 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${title}</title>
<meta name="description" content="${m.description || ''}">
<meta name="theme-color" content="#1b2140">
${SITE.url ? `<link rel="canonical" href="${pageUrl(file)}">\n<meta property="og:url" content="${pageUrl(file)}">\n` : ''}${SITE.url && m.langSwitch ? m.langSwitch.links.map(l => `<link rel="alternate" hreflang="${l.lang}" href="${pageUrl(l.href)}">\n`).join('') + `<link rel="alternate" hreflang="x-default" href="${pageUrl(m.langSwitch.links[0].href)}">\n` : ''}<meta property="og:title" content="${title}"><meta property="og:description" content="${m.description || ''}"><meta property="og:type" content="website"><meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:image" content="${SITE.url ? SITE.url + '/' : ''}assets/img/${m.hero || 'hero-moon'}.webp">
${SITE.api.base ? `<meta name="api-base" content="${esc(SITE.api.base)}">\n` : ''}
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/CormorantGaramond-500-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/fonts/fonts.css">
<link rel="stylesheet" href="assets/css/style.css">
${SITE.analytics.ga4 ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${SITE.analytics.ga4}"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${SITE.analytics.ga4}')</script>\n` : ''}${file === 'index.html' && SITE.url ? organizationJson() : ''}<script>(function (c) { c.add('js'); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) c.add('motion'); if ('onpagereveal' in window) c.add('vt'); })(document.documentElement.classList)</script>
</head>
<body class="${m.bodyClass || ''}">
<a class="skip"${inEnglish()} href="#main">Skip to content</a>
${header(file)}
<main id="main">
${m.hero && file !== 'index.html' ? pageHero(m) : ''}
${body}
</main>
${footer()}
${VENDOR.map(f => `<script src="assets/vendor/${f}" defer></script>`).join('\n')}
<script src="assets/js/main.js" defer></script>
${m.script ? `<script src="assets/js/${m.script}.js" defer></script>\n` : ''}</body>
</html>
`;
}

/* ---------- tokens ---------- */
function expand(s) {
  return s
    .replace(/\{\{mandala(?::([\w -]+))?\}\}/g, (_, c) => mandala(c || ''))
    .replace(/\{\{ridges\}\}/g, ridges)
    .replace(/\{\{lotus\}\}/g, lotusRule)
    .replace(/\{\{icon:(\w+)\}\}/g, (_, n) => icon(n))
    .replace(/\{\{img:([\w/-]+)(?:\|([^|}]*))?(?:\|([^}]*))?\}\}/g, (_, n, a, c) => img(n, a, c))
    .replace(/\{\{md:([^}]+)\}\}/g, (_, slug) => md(slug))
    .replace(/\{\{videos:(\w+)\}\}/g, (_, g) => `<div class="video-grid" data-stagger>${VIDEO_GROUPS[g].map(videoCard).join('')}</div>`)
    .replace(/\{\{gallery(?::([\w-]+))?\}\}/g, (_, k) => galleryGrid(k))
    .replace(/\{\{strip(?::([\w-]+))?\}\}/g, (_, k) => strip(k))
    // {{contact-form:subject|interest|siteKeyOfAddress}}
    .replace(/\{\{contact-form(?::([^|}]*))?(?:\|([^|}]*))?(?:\|([^}]*))?\}\}/g, (_, subj, interest, channel) => contactForm(subj || undefined, interest || '', channel || undefined))
    .replace(/\{\{credits-table\}\}/g, creditsTable)
    .replace(/\{\{course-dates\}\}/g, courseDates)
    .replace(/\{\{magazine\}\}/g, magazine)
    .replace(/\{\{schedule:([\w-]+)(?:\|(sky))?\}\}/g, (_, name, sky) => scheduleFromCsv(name, !!sky))
    .replace(/\{\{visiting\}\}/g, () => renderVisiting(VISITING, LANG, { dates: COURSE_DATES, ui, site: SITE.contact, waLink, waTemplate }))
    // {{visiting:weekFee}}: a price, time or number of content/visiting.json, written for the language of the page
    .replace(/\{\{visiting:(\w+)\}\}/g, (_, k) => { const v = visitingValues(VISITING, LANG, COURSE_DATES)[k]; if (v == null) throw new Error(`unknown value {{visiting:${k}}}`); return v; })
    .replace(/\{\{wa:(\w+)\}\}/g, (_, key) => waLink(key))
    .replace(/\{\{donate-widget\}\}/g, donateWidget)
    .replace(/\{\{address(?::(short))?\}\}/g, (_, short) => addressHtml(!short))
    .replace(/\{\{phones(?::(inline))?\}\}/g, (_, inline) => (inline ? orList(SITE.contact.phones.map(phoneLink)) : phoneLinks(SITE.contact.phones)))
    .replace(/\{\{clinic-phones\}\}/g, () => SITE.contact.clinicPhones.map(phoneLink).join(' · '))
    .replace(/\{\{tel:([\w.]+)\}\}/g, (_, p) => telHref(setting(p)))
    .replace(/\{\{site:([\w.]+)\}\}/g, (_, p) => setting(p));
}

/* ---------- build ---------- */
// animation libraries, copied from node_modules so the site keeps working offline
const VENDOR = ['gsap.min.js', 'ScrollTrigger.min.js', 'SplitText.min.js', 'lenis.min.js'];
fs.mkdirSync('assets/vendor', { recursive: true });
for (const f of VENDOR) {
  const from = path.join('node_modules', f.startsWith('lenis') ? 'lenis' : 'gsap', 'dist', f);
  if (fs.existsSync(from)) fs.copyFileSync(from, path.join('assets/vendor', f));
}
fs.writeFileSync('assets/img/favicon.svg', emblem().replace('class="emblem" ', 'xmlns="http://www.w3.org/2000/svg" ').replace('stroke="currentColor"', 'stroke="#c2652a"').replace('fill="currentColor"', 'fill="#c2652a"'));
const built = []; // every page written; a page with "localized" also gets a Hindi twin, visiting.html and visiting-hi.html
for (const f of fs.readdirSync('src/pages').filter(f => f.endsWith('.html'))) {
  const src = fs.readFileSync(path.join('src/pages', f), 'utf8');
  const metaMatch = src.match(/^<!--([\s\S]*?)-->/);
  const meta = metaMatch ? JSON.parse(metaMatch[1]) : {};
  const files = Object.fromEntries(LANGS.map(l => [l, l === 'en' ? f : f.replace(/\.html$/, `-${l}.html`)]));
  for (const lang of meta.localized ? LANGS : ['en']) {
    LANG = lang; WA_KEY = meta.wa || 'general';
    const body = expand(src.slice(metaMatch ? metaMatch[0].length : 0));
    fs.writeFileSync(files[lang], layout({ ...meta, ...(meta.localized ? visitingMeta(VISITING, lang, files) : {}), lang }, expand(body), files[lang]));
    built.push(files[lang]);
  }
}
LANG = 'en';
// the old WordPress addresses (content/redirects.csv): small pages that send visitors and search engines to the new page.
// Built only when LEGACY_REDIRECTS is on (the deployment sets it), so a local build leaves no extra folders behind.
if (/^(1|true|yes)$/i.test(env.LEGACY_REDIRECTS || '')) {
  for (const r of readCsv('../content/redirects.csv')) {
    const dir = r.from.replace(/^\/+|\/+$/g, '');
    if (!dir || dir.split('/').includes('..') || !built.includes(r.to.split('#')[0])) throw new Error(`content/redirects.csv line ${r.line}: "${r.from}" or "${r.to}" is not usable (from is an old address like /about-us/, to is a page like about.html)`);
    const target = '../'.repeat(dir.split('/').length) + r.to;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(`${dir}/index.html`, `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>This page has moved · ${esc(SITE.name)}</title><meta name="robots" content="noindex">\n${SITE.url ? `<link rel="canonical" href="${SITE.url}/${r.to}">\n` : ''}<meta http-equiv="refresh" content="0; url=${target}"></head>\n<body><p>This page has moved to <a href="${target}">${esc(r.to)}</a>.</p></body></html>\n`);
  }
}
// search engines: robots.txt always, a sitemap once the public address of the site is known
fs.writeFileSync('robots.txt', `User-agent: *\nAllow: /\n${SITE.url ? `\nSitemap: ${SITE.url}/sitemap.xml\n` : ''}`);
if (SITE.url) fs.writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${built.map(f => `  <url><loc>${pageUrl(f)}</loc></url>`).join('\n')}\n</urlset>\n`);
else fs.rmSync('sitemap.xml', { force: true });
console.log('built', built.length, 'pages');
