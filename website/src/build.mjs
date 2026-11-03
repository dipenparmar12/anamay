// Builds the static site: wraps every src/pages/*.html fragment in the shared layout and expands {{tokens}}.
// usage (from the website folder): node src/build.mjs
import fs from 'fs'; import path from 'path';

const CONTENT = path.resolve('../content/pages');
const credits = JSON.parse(fs.readFileSync('src/credits.json', 'utf8'));
const gallery = JSON.parse(fs.readFileSync('src/gallery.json', 'utf8'));
const videos = Object.fromEntries(JSON.parse(fs.readFileSync('../content/videos.json', 'utf8')).map(v => [v.id, v.title]));
// photographs from the Anāmay Vedic Retreat website, grouped by set (see src/retreat.json)
const retreat = JSON.parse(fs.readFileSync('src/retreat.json', 'utf8'));

const SITE = {
  name: 'Anāmay Ashram', email: 'anamayashram@gmail.com', whatsapp: '919917248154',
  retreatEmail: 'anamayvedicretreat@gmail.com',
  phones: ['+91 98102 07429', '+91 75993 67331', '+91 99172 48154'],
  address: 'Anāmay Vedic Ashram, Kausani Estate, District Bageshwar, Uttarakhand 263620, India',
  facebook: 'https://www.facebook.com/anamayvedicashram/', instagram: 'https://www.instagram.com/anamayashram/',
  retreatFacebook: 'https://www.facebook.com/pages/Anamay-Vedic-Resort/146831818790054',
  youtube: 'https://www.youtube.com/channel/UCcxnAEWJmbQxaA0FXpYI8vA',
  donate: 'https://anamayashram.org/donation/',
};

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
    ['retreat.html', 'Anāmay Vedic Retreat', 'The guest house beside the ashram'],
    ['rooms.html', 'Rooms & Suites', 'Eighteen rooms built by Vāstu'],
    ['visit.html', 'Visit & Travel', 'How to reach Kausani, and how to write to us'],
  ] },
  { href: 'contribute.html', label: 'Contribute' },
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
// {{img:name|alt|class}} — photos from the ashram; licensed photos also get a visible credit line
function img(name, alt = '', cls = '') {
  const c = credits[name];
  const tag = `<img src="assets/img/${name}.webp" alt="${alt || (c && c.caption) || ''}" loading="lazy" decoding="async"${cls ? ` class="${cls}"` : ''}>`;
  return tag;
}
function credit(name) {
  const c = credits[name]; if (!c) return '';
  return `<small class="credit">${c.caption} · Photo: ${c.author}, <a href="${c.page}" target="_blank" rel="noopener">${c.license}</a> via Wikimedia Commons</small>`;
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
const VIDEO_GROUPS = {
  ashram: ['Xk6SwyLn8Fw', 'nP_lb0YjA1c', 'I-ofLsL7D1I', 'U-Z_E7br980', 'Z6mgWj-UH1A', 'HxVXeANxsds'],
  vedic: ['xsw2vdhuano', 'B65WXdR1qIc', '7ix6Xkf4M0M', 'pNkAGlWVIt8', 'CvJnRhw4zDo'],
  recitation: ['SyvbJv38088', 'WNRvTLTnXIA', 'DfUyKjOdG9k'],
  founder: ['AnbB1qRbric', '_zCujII8iqs', '8CpxrfQnxIU', 'k2F4z6y3liU', 'WpvWMFGC-VY'],
  meditation: ['RK1kbJiisLk', '8CpxrfQnxIU'],
  retreat: ['nP_lb0YjA1c', 'AEs7XcbLifw', 'Oc6q0t-mta8'],
  arrival: ['Xk6SwyLn8Fw'],
};
// {{gallery}} / {{strip}} show the ashram photographs; {{gallery:rooms}} / {{strip:stay}} a set from src/retreat.json
const photoSet = (key, n) => (/^\d+$/.test(key || '') || !key ? gallery.slice(0, key ? +key : n) : retreat[key]);
const galleryGrid = (key, set = photoSet(key, gallery.length)) => `<div class="gallery" data-stagger>${set.map(g => `<a href="${g.full}" data-lightbox="${key || 'photos'}" data-caption="${g.caption}"><img src="${g.thumb}" alt="${g.caption}" width="${g.w}" height="${g.h}" loading="lazy"><span>${g.caption}</span></a>`).join('')}</div>`;
// a draggable film strip of photographs, each keeping its own proportions
const strip = (key, set = photoSet(key, 12)) => `<div class="strip" data-strip data-lenis-prevent-horizontal>${set.map((g, i) => `<a class="strip-item" href="${g.full}" data-lightbox="strip-${key || 'photos'}" data-caption="${g.caption}" style="--ar:${g.w}/${g.h}"><img src="${g.thumb}" alt="${g.caption}" width="${g.w}" height="${g.h}" loading="lazy" draggable="false"><span><i>${String(i + 1).padStart(2, '0')}</i>${g.caption}</span></a>`).join('')}</div>`;
const creditsTable = () => `<table class="credits-table"><thead><tr><th>Image</th><th>Subject</th><th>Author</th><th>Licence</th></tr></thead><tbody>${Object.entries(credits).map(([k, c]) => `<tr><td><img src="${c.file}" alt="" loading="lazy"></td><td>${c.caption}</td><td>${c.author}</td><td><a href="${c.page}" target="_blank" rel="noopener">${c.license}</a></td></tr>`).join('')}</tbody></table>`;

function contactForm(subject = 'Enquiry from the website', interest = '', to = SITE.email) {
  const opts = ['Visiting / staying at the ashram', 'A stay at the Anāmay Vedic Retreat', 'Panchakarma or Ayurveda consultation', 'Kshar Sutra treatment', 'Meditation or yoga course', '1-week TM course / volunteering', 'Vedic Vidyapeeth', 'Jyotish consultation', 'Donation or support', 'Something else'];
  return `<form class="form" data-enquiry="${to}" data-subject="${subject}" novalidate>
  <div class="field"><input id="f-name" name="name" data-label="Name" placeholder=" " required autocomplete="name"><label for="f-name">Your name</label><span class="error">Please tell us your name.</span></div>
  <div class="field"><input id="f-phone" name="phone" data-label="Mobile" placeholder=" " type="tel" autocomplete="tel" pattern="[0-9 +()-]{7,}"><label for="f-phone">Mobile number</label><span class="error">Please check the number.</span></div>
  <div class="field"><input id="f-email" name="email" data-label="Email" placeholder=" " type="email" required autocomplete="email"><label for="f-email">Email</label><span class="error">Please enter a valid email.</span></div>
  <div class="field"><select id="f-interest" name="interest" data-label="Interested in">${opts.map(o => `<option${o === interest ? ' selected' : ''}>${o}</option>`).join('')}</select><label for="f-interest">Interested in</label></div>
  <div class="field"><input id="f-age" name="age" data-label="Age" placeholder=" " type="number" min="5" max="110"><label for="f-age">Age</label></div>
  <div class="field"><input id="f-date" name="arrival" data-label="Tentative arrival" placeholder=" " type="date"><label for="f-date">Tentative arrival date</label></div>
  <div class="field full"><textarea id="f-msg" name="message" data-label="Message" placeholder=" " required></textarea><label for="f-msg">Your message</label><span class="error">Please write a short message.</span></div>
  <div class="full form-actions"><button class="btn" type="submit">Send by email <span class="arrow">→</span></button><button class="btn ghost" type="button" data-whatsapp="${SITE.whatsapp}">${icon('whatsapp')} Send on WhatsApp</button></div>
  <p class="form-note full">Your message opens in your own email or WhatsApp app, addressed to the ashram. Please wait for a confirmation before travelling — space is limited.</p>
</form>
<div class="form-success" role="status"><span class="sanskrit">धन्यवादः</span><h3>Thank you</h3><p class="muted">Your message is ready in your email or WhatsApp app — just press send. We reply as soon as we can.</p></div>`;
}

/* ---------- layout ---------- */
function header(current) {
  const groups = NAV.map(g => {
    if (g.href) return `<a href="${g.href}"${g.href === current ? ' aria-current="page"' : ''}>${g.label}</a>`;
    const active = g.items.some(i => i[0] === current);
    return `<div class="nav-group"><button type="button" aria-haspopup="true"${active ? ' class="active"' : ''}>${g.label}</button><div class="dropdown">${g.items.map(([h, t, d]) => `<a href="${h}"${h === current ? ' aria-current="page"' : ''}><b>${t}</b><span>${d}</span></a>`).join('')}</div></div>`;
  }).join('');
  return `<header class="site-header"><div class="wrap">
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
    : `<div class="menu-group"><p class="menu-label"><span>${num[i]}</span>${g.label}</p>${g.items.map(([h, t]) => `<a href="${h}"${cur(h)}>${t}</a>`).join('')}</div>`).join('');
  return `<div class="menu" id="site-menu" data-lenis-prevent inert>
  <div class="menu-inner wrap">
    <nav class="menu-nav" aria-label="Main menu"><a class="menu-home" href="index.html"${cur('index.html')}>Home</a>${groups}</nav>
    <div class="menu-aside"><p class="sanskrit">पदं गच्छन्त्यनामयम्</p><a class="btn" href="visit.html">Visit &amp; Contact <span class="arrow">→</span></a>
      <ul><li><a href="https://wa.me/${SITE.whatsapp}" target="_blank" rel="noopener">${icon('whatsapp')} WhatsApp</a></li><li><a href="mailto:${SITE.email}">${icon('mail')} ${SITE.email}</a></li><li><a href="tel:${SITE.phones[0].replace(/\s/g, '')}">${icon('phone')} ${SITE.phones[0]}</a></li></ul></div>
  </div>
</div>`;
}
function emblem() {
  return `<svg class="emblem" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><circle cx="24" cy="24" r="22.5" opacity=".5"/><circle cx="24" cy="24" r="19" stroke-dasharray="1 3"/><path d="M24 35c-3.6-2.6-5-7-5-11.2 0-4 2-8 5-11.8 3 3.8 5 7.8 5 11.8 0 4.2-1.4 8.6-5 11.2z"/><path d="M24 35c-4.5 0-10-2.6-12-7.8 4.4-.4 8.4 1.6 10.6 4.8M24 35c4.5 0 10-2.6 12-7.8-4.4-.4-8.4 1.6-10.6 4.8"/><circle cx="24" cy="10" r="1.3" fill="currentColor" stroke="none"/></svg>`;
}
function footer() {
  const links = (title, items) => `<div><h4>${title}</h4><ul>${items.map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join('')}</ul></div>`;
  return `<footer class="site-footer on-dark">${mandala('hero-mandala mandala-spin')}
<div class="wrap"><div class="footer-top">
  <div><a class="brand" href="index.html">${emblem()}<span class="brand-text"><b>Anāmay Ashram</b><small>Shree Anamay Nyas · est. 2006</small></span></a>
    <p class="footer-shloka">पदं गच्छन्त्यनामयम्</p><p>Arrive at Anāmaya — the state free from all suffering. A Vedic ashram and Gurukul in the Himalayas at Kausani, Uttarakhand.</p>
    <div class="socials"><a href="${SITE.facebook}" target="_blank" rel="noopener" aria-label="Facebook">${icon('facebook')}</a><a href="${SITE.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${icon('instagram')}</a><a href="${SITE.youtube}" target="_blank" rel="noopener" aria-label="YouTube">${icon('youtube')}</a><a href="https://wa.me/${SITE.whatsapp}" target="_blank" rel="noopener" aria-label="WhatsApp">${icon('whatsapp')}</a></div></div>
  ${links('Knowledge', [['vedas.html', 'The Vedas'], ['vidyapeeth.html', 'Vedic Vidyapeeth'], ['yagya-jyotish.html', 'Yagya & Jyotish'], ['meditation.html', 'Meditation'], ['yoga.html', 'Yoga']])}
  ${links('Healing & Life', [['ayurveda.html', 'Āyurveda'], ['panchakarma.html', 'Panchakarma'], ['kshar-sutra.html', 'Kshar Sutra'], ['sattvic-life.html', 'Sattvic Life'], ['volunteer.html', 'Volunteer']])}
  ${links('Stay', [['retreat.html', 'Anāmay Vedic Retreat'], ['rooms.html', 'Rooms & Suites'], ['visit.html', 'Visit & Travel'], ['contribute.html', 'Contribute']])}
  <div><h4>Reach us</h4><ul><li>Kausani Estate, District Bageshwar,<br>Uttarakhand 263620</li>${SITE.phones.map(p => `<li><a href="tel:${p.replace(/\s/g, '')}">${p}</a></li>`).join('')}<li><a href="mailto:${SITE.email}">${SITE.email}</a></li><li>Every day, 9:30 am – 6:30 pm</li></ul></div>
</div>
<div class="footer-bottom"><span>© <span data-year>2026</span> Shree Anamay Nyas. All rights reserved.</span><nav><a href="policies.html">Privacy &amp; policies</a><a href="credits.html">Image credits</a><a href="retreat.html">Anāmay Vedic Retreat</a></nav></div></div></footer>
<a class="whatsapp-float" href="https://wa.me/${SITE.whatsapp}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">${icon('whatsapp')}</a>
<div class="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" data-lenis-prevent><span class="lb-count"></span><figure><img alt=""><figcaption></figcaption></figure><button class="close" aria-label="Close">×</button><button class="prev" aria-label="Previous">‹</button><button class="next" aria-label="Next">›</button></div>
<div class="vmodal" role="dialog" aria-modal="true" aria-label="Film player" data-lenis-prevent>
  <div class="vm-frame"><div class="vm-player"><div class="vm-state" role="status"><span class="vm-spin"></span><p>Loading the film…</p></div></div>
    <div class="vm-meta"><p class="vm-title"></p><a class="vm-out" href="${SITE.youtube}" target="_blank" rel="noopener">Watch on YouTube ↗</a></div></div>
  <button class="vm-close" aria-label="Close the film">×</button>
</div>`;
}
// inner pages open on a temple doorway: text on the parchment, the photograph framed in an arch
function pageHero(m) {
  return `<section class="page-hero">
  ${m.sanskrit ? `<span class="ph-glyph" aria-hidden="true">${m.sanskrit}</span>` : ''}
  <div class="wrap ph-grid">
    <div class="ph-text">
      ${m.crumb ? `<p class="crumbs"><a href="index.html">Home</a><span>${m.crumb}</span></p>` : ''}
      ${m.sanskrit ? `<span class="sanskrit">${m.sanskrit}</span>` : ''}
      <h1>${m.heading || m.title}</h1>
      ${m.lead ? `<p class="lead">${m.lead}</p>` : ''}
      <span class="ph-cue" aria-hidden="true"></span>
    </div>
    <figure class="ph-media"><div class="arch"><img data-parallax="0.05" src="assets/img/${m.hero}.webp" alt="" fetchpriority="high"></div>${m.heroCredit ? credit(m.hero) : ''}</figure>
  </div>
</section>`;
}
function layout(m, body, file) {
  const title = file === 'index.html' ? `${SITE.name} · Vedic Ashram & Gurukul in the Himalayas, Kausani` : `${m.title} · ${SITE.name}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${title}</title>
<meta name="description" content="${m.description || ''}">
<meta name="theme-color" content="#1b2140">
<meta property="og:title" content="${title}"><meta property="og:description" content="${m.description || ''}"><meta property="og:type" content="website">
<meta property="og:image" content="assets/img/${m.hero || 'hero-moon'}.webp">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/CormorantGaramond-500-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/fonts/fonts.css">
<link rel="stylesheet" href="assets/css/style.css">
<script>(function (c) { c.add('js'); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) c.add('motion'); if ('onpagereveal' in window) c.add('vt'); })(document.documentElement.classList)</script>
</head>
<body class="${m.bodyClass || ''}">
<a class="skip" href="#main">Skip to content</a>
${header(file)}
<main id="main">
${m.hero && file !== 'index.html' ? pageHero(m) : ''}
${body}
</main>
${footer()}
${VENDOR.map(f => `<script src="assets/vendor/${f}" defer></script>`).join('\n')}
<script src="assets/js/main.js" defer></script>
</body>
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
    .replace(/\{\{credit:([\w-]+)\}\}/g, (_, n) => credit(n))
    .replace(/\{\{md:([^}]+)\}\}/g, (_, slug) => md(slug))
    .replace(/\{\{videos:(\w+)\}\}/g, (_, g) => `<div class="video-grid" data-stagger>${VIDEO_GROUPS[g].map(videoCard).join('')}</div>`)
    .replace(/\{\{gallery(?::([\w-]+))?\}\}/g, (_, k) => galleryGrid(k))
    .replace(/\{\{strip(?::([\w-]+))?\}\}/g, (_, k) => strip(k))
    .replace(/\{\{dial-ridges\}\}/g, dialRidges)
    // {{contact-form:subject|interest|siteKeyOfAddress}}
    .replace(/\{\{contact-form(?::([^|}]*))?(?:\|([^|}]*))?(?:\|([^}]*))?\}\}/g, (_, subj, interest, to) => contactForm(subj || undefined, interest || '', to ? SITE[to] : undefined))
    .replace(/\{\{credits-table\}\}/g, creditsTable)
    .replace(/\{\{site:(\w+)\}\}/g, (_, k) => SITE[k]);
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
let count = 0;
for (const f of fs.readdirSync('src/pages').filter(f => f.endsWith('.html'))) {
  const src = fs.readFileSync(path.join('src/pages', f), 'utf8');
  const metaMatch = src.match(/^<!--([\s\S]*?)-->/);
  const meta = metaMatch ? JSON.parse(metaMatch[1]) : {};
  const body = expand(src.slice(metaMatch ? metaMatch[0].length : 0));
  fs.writeFileSync(f, layout({ ...meta, hero: meta.hero }, expand(body), f));
  count++;
}
console.log('built', count, 'pages');
