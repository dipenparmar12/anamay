// The "Visiting Anāmay Ashram" page and the day schedule component.
// The text and the numbers come from content/visiting.json (English and Hindi), the course dates from content/course-dates.csv
// and the contact details from content/site.json. build.mjs hands in its helpers as `ui` ({ esc, icon, img, ridges }).
import fs from 'fs';

export const LANGS = ['en', 'hi'];
const MONTHS = {
  en: 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' '),
  hi: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितम्बर', 'अक्टूबर', 'नवम्बर', 'दिसम्बर'],
};
const AMOUNTS = ['shared', 'single', 'double', 'extraPerson', 'panchakarma', 'weekFee', 'missedWeekExtra']; // every price in visiting.json
const SHOWN_AS_AMOUNT = ['shared', 'extraPerson', 'panchakarma', 'weekFee', 'missedWeekExtra']; // {placeholders} set in bold

/* ---------- numbers, times and dates in each language ---------- */
const money = n => '₹' + n.toLocaleString('en-IN');
const pick = (o, lang) => (typeof o === 'string' ? o : o[lang]); // a plain string reads the same in both languages
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const parseTime = s => s.split(':').map(Number);
const clock = ([h, m]) => `${(h + 11) % 12 + 1}:${String(m).padStart(2, '0')}`;
const meridiem = h => (h < 12 ? 'AM' : 'PM');
const dayPart = h => (h < 4 || h >= 20 ? 'रात' : h < 12 ? 'सुबह' : h < 16 ? 'दोपहर' : 'शाम');
// 16:00 reads "4:00 PM", or "शाम 4:00 बजे" in Hindi
export const timeText = (t, lang) => { const p = parseTime(t); return lang === 'hi' ? `${dayPart(p[0])} ${clock(p)} बजे` : `${clock(p)} ${meridiem(p[0])}`; };
// a range reads "7:00 – 8:30 AM" or "9:30 AM – 12:00 PM"; in Hindi it is the plain numbers, as the part of the day is the heading above them
const rangeText = (a, b, lang) => {
  const [x, y] = [parseTime(a), parseTime(b)];
  if (lang === 'hi') return `${clock(x)} – ${clock(y)}`;
  return meridiem(x[0]) === meridiem(y[0]) ? `${clock(x)} – ${clock(y)} ${meridiem(y[0])}` : `${clock(x)} ${meridiem(x[0])} – ${clock(y)} ${meridiem(y[0])}`;
};
const dayMonth = (d, lang, year) => `${d.getUTCDate()} ${MONTHS[lang][d.getUTCMonth()]}${year ? ' ' + d.getUTCFullYear() : ''}`;
const dateRange = (a, b, lang) => `${dayMonth(a, lang, a.getUTCFullYear() !== b.getUTCFullYear())} – ${dayMonth(b, lang, true)}`;
const iso = d => d.toISOString().slice(0, 10);

// the values that {placeholders} in the text, and {{visiting:name}} in the pages, stand for
export function values(d, lang, dates) {
  const when = ({ day, time }) => (lang === 'hi' ? `${d.weekdays[day].hi} ${timeText(time, 'hi')}` : `${d.weekdays[day].en}, ${timeText(time, 'en')}`);
  const first = Math.min(...dates.map(c => c.from.getUTCFullYear())), last = Math.max(...dates.map(c => c.to.getUTCFullYear()));
  return {
    ...Object.fromEntries(SHOWN_AS_AMOUNT.map(k => [k, money(d.amounts[k])])),
    minDays: String(d.stay.minDays), minNights: String(d.stay.minNights),
    treatmentsMin: String(d.panchakarma.perDay.min), treatmentsMax: String(d.panchakarma.perDay.max),
    weekStart: when(d.week.starts), weekEnd: when(d.week.ends),
    years: first === last ? String(first) : `${first}–${last}`,
  };
}

/* ---------- loading and checking the content ---------- */
export function loadVisiting(file, dates) {
  const d = JSON.parse(fs.readFileSync('../' + file, 'utf8').trim());
  const bad = (where, why) => { throw new Error(`${file}: ${where} ${why}`); };
  if (!dates.length) throw new Error('content/course-dates.csv has no dates');
  const whole = (where, n) => { if (!Number.isInteger(n) || n < 1) bad(where, `must be a whole number of 1 or more (it is ${JSON.stringify(n)})`); };
  for (const k of AMOUNTS) {
    const a = d.amounts?.[k];
    if (a == null || (Array.isArray(a) && !a.length)) bad(`amounts.${k}`, 'is missing');
    [].concat(a).forEach(n => whole(`amounts.${k}`, n));
  }
  ['minDays', 'minNights'].forEach(k => whole(`stay.${k}`, d.stay?.[k]));
  ['min', 'max'].forEach(k => whole(`panchakarma.perDay.${k}`, d.panchakarma?.perDay?.[k]));
  for (const k of ['starts', 'ends']) {
    const w = d.week?.[k];
    if (!w || !d.weekdays?.[w.day]) bad(`week.${k}.day`, `must be one of ${Object.keys(d.weekdays || {}).join(', ')}`);
    if (!TIME.test(w.time)) bad(`week.${k}.time`, `must be a 24-hour time like 16:00 (it is "${w.time}")`);
  }
  // every text needs English and Hindi, and the {values} in it must exist
  const known = Object.keys(values(d, 'en', dates)).concat('n');
  const check = (text, where) => { for (const [, k] of text.matchAll(/\{(\w+)\}/g)) if (!known.includes(k)) bad(where, `uses {${k}}, which is not a value (the values are ${known.filter(k => k !== 'n').join(', ')})`); };
  const walk = (node, where) => {
    if (Array.isArray(node)) return node.forEach((x, i) => walk(x, `${where}[${i}]`));
    if (typeof node === 'string') return check(node, where);
    if (!node || typeof node !== 'object') return;
    if ('en' in node || 'hi' in node) {
      for (const l of LANGS) if (typeof node[l] !== 'string' || !node[l].trim()) bad(`${where}.${l}`, 'is missing or empty (every text needs both English "en" and Hindi "hi")');
      return LANGS.forEach(l => check(node[l], `${where}.${l}`));
    }
    Object.entries(node).forEach(([k, v]) => walk(v, where ? `${where}.${k}` : k));
  };
  walk(d, '');
  d.guest.rooms.forEach((r, i) => { if (!AMOUNTS.includes(r.amount)) bad(`guest.rooms[${i}].amount`, `"${r.amount}" is not a price in "amounts"`); });
  if (!d.panchakarma.groups.every(g => g.treatments.length)) bad('panchakarma.groups', 'has a group without treatments');
  let end = '00:00';
  d.schedule.items.forEach((s, i) => {
    const at = `schedule.items[${i}]`;
    if (!TIME.test(s.from) || !TIME.test(s.to)) bad(at, `"from" and "to" must be 24-hour times like 07:30 (they are "${s.from}" and "${s.to}")`);
    if (s.to <= s.from) bad(at, 'ends before it starts');
    if (s.from < end) bad(at, 'starts before the entry above it ends (list the day in time order)');
    end = s.to;
  });
  const images = [d.guest.photo, ...d.panchakarma.photos];
  images.forEach(p => { if (!fs.existsSync(`assets/img/${p.image}.webp`)) bad('image', `"${p.image}" is not in assets/img`); });
  return d;
}

/* ---------- the day schedule: morning, afternoon and evening, every entry in plain sight ---------- */
// rows: [{ from: '07:00', to?: '08:30', title, note?, label? }] in time order. With sky, a window beside the list (wide screens only)
// shows the sun and the sky of the entry being read; it never sits over the text.
export function schedule(rows, { lang = 'en', sky = false, periods } = {}, { esc, icon, ridges }) {
  const names = periods || { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };
  const icons = { morning: 'sunrise', afternoon: 'daylight', evening: 'moon' };
  const parts = { morning: [], afternoon: [], evening: [] };
  for (const r of rows) {
    const [h, m] = parseTime(r.from);
    const label = r.label || (r.to ? rangeText(r.from, r.to, lang) : timeText(r.from, lang));
    parts[h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'].push(`<li data-h="${(h + m / 60).toFixed(2)}"><time datetime="${r.from}">${esc(label)}</time><div><b>${esc(r.title)}</b>${r.note ? `<span>${esc(r.note)}</span>` : ''}</div></li>`);
  }
  const skyWindow = `<div class="sched-sky" aria-hidden="true"><div class="dial-window"><span class="sky sky-night"></span><span class="sky sky-dawn"></span><span class="sky sky-day"></span><span class="sky sky-dusk"></span><span class="stars"></span><span class="moon"></span><span class="sun-arm"><span class="sun"></span></span>${ridges()}</div><p class="dial-time"><b></b><span></span></p></div>`;
  return `<div class="sched${sky ? ' has-sky' : ''}" data-sched>${sky ? skyWindow : ''}<div class="sched-parts">${Object.entries(parts).filter(([, li]) => li.length).map(([p, li]) => `<section class="sched-part" data-period="${p}"><h3 class="sched-head">${icon(icons[p])}${esc(names[p])}</h3><ol>${li.join('')}</ol></section>`).join('')}</div></div>`;
}

/* ---------- the programme dates: a calendar by year; the page script marks past, current and next ---------- */
function datesHtml(dates, lang, L, { esc }) {
  const years = [...new Set(dates.map(c => c.from.getUTCFullYear()))];
  const card = c => `<li class="pd-item" data-start="${iso(c.from)}" data-end="${iso(c.to)}"><time class="pd-leaf" datetime="${iso(c.from)}" aria-hidden="true"><span>${MONTHS[lang][c.from.getUTCMonth()]}</span><b>${c.from.getUTCDate()}</b></time><div class="pd-text"><span class="pd-range">${dateRange(c.from, c.to, lang)}</span><em class="pd-status"></em></div></li>`;
  const text = k => esc(pick(L.dates[k], lang));
  return `<div class="pdates" data-pdates data-l-next="${text('next')}" data-l-now="${text('now')}" data-l-done="${text('done')}" data-l-show="${text('showEarlier')}" data-l-hide="${text('hideEarlier')}">
    <button class="pd-toggle" type="button" aria-expanded="false" hidden></button>
    ${years.map(y => `<div class="pd-year"><h3>${y}</h3><ol class="pd-list">${dates.filter(c => c.from.getUTCFullYear() === y).map(card).join('')}</ol></div>`).join('\n    ')}
    <p class="pd-empty" role="status" hidden>${text('none')}</p>
  </div>`;
}

/* ---------- the page ---------- */
// ctx: dates (sorted course dates), ui (build.mjs helpers), site (contact settings), waLink(key) and waTemplate(key) for the page language
export function renderVisiting(d, lang, { dates, ui, site, waLink, waTemplate }) {
  const { esc, icon, img } = ui;
  const v = values(d, lang, dates), L = d.labels;
  const t = o => esc(pick(o, lang));
  const fill = (text, plain) => esc(text).replace(/\{(\w+)\}/g, (_, k) => (!plain && SHOWN_AS_AMOUNT.includes(k) ? `<b class="amt">${v[k]}</b>` : v[k]));
  const T = (o, plain) => fill(pick(o, lang), plain); // text with its {values} filled in
  const chapter = s => `data-chapter="${t(s.chapter)}"`;
  const head = (s, title = t(s.title), lead = '') => `<div class="section-head reveal"><span class="eyebrow">${t(s.eyebrow)}</span><h2>${title}</h2>${lead}</div>`;
  const prices = a => { const list = [].concat(a); return list.map(n => `<b>${money(n)}</b>`).join(list.length === 2 ? ` <i>${t(L.or)}</i> ` : ' '); };

  const ways = `<section class="section" id="ways" ${chapter(d.ways)}>
  <div class="wrap">
    <div class="section-head center reveal"><span class="eyebrow">${t(d.ways.eyebrow)}</span><h2>${t(d.ways.title)}</h2></div>
    <div class="ways2" data-stagger>${d.ways.items.map((w, i) => `<a class="way2" href="${esc(w.href)}"><span class="way2-num" aria-hidden="true">${['I', 'II', 'III', 'IV'][i] ?? i + 1}</span>${icon(w.icon)}<h3>${t(w.title)}</h3><p>${T(w.text)}</p><span class="link-arrow">${t(w.link)}</span></a>`).join('')}</div>
  </div>
</section>`;

  const g = d.guest;
  const guest = `<section class="section tint" id="guest" ${chapter(g)}>
  <div class="wrap guest-grid">
    <div class="guest-intro">
      ${head(g)}
      <div class="minstay reveal"><small>${t(g.minStay.label)}</small><b>${T(g.minStay.value)}</b><span>${T(g.minStay.text)}</span></div>
      <figure class="figure reveal-img">${img(g.photo.image, t(g.photo.alt))}</figure>
    </div>
    <div class="rate-card reveal" style="--d:.1s">
      <h3>${t(g.ratesTitle)}</h3>
      <p class="rc-label">${t(g.included.label)}</p>
      <ul class="rc-incl">${g.included.items.map(i => `<li>${icon(i.icon)}${t(i.text)}</li>`).join('')}</ul>
      <dl class="rc-list">${g.rooms.map(r => `<div class="rc-row${[].concat(d.amounts[r.amount]).length > 2 ? ' many' : ''}"><dt>${t(r.name)}${r.note ? `<small>${T(r.note)}</small>` : ''}</dt><dd>${prices(d.amounts[r.amount])}</dd></div>`).join('')}</dl>
    </div>
  </div>
</section>`;

  const p = d.panchakarma;
  const panchakarma = `<section class="section" id="panchakarma" ${chapter(p)}>
  <div class="wrap pk-top">
    <div class="pk-main">
      ${head(p)}
      <p class="pk-price reveal"><b>${money(d.amounts.panchakarma)}</b> <span>${t(L.perDay)}</span></p>
      <p class="lead reveal">${T(p.lead)}</p>
      <p class="note reveal"><strong>${T(p.prescribed)}</strong> ${T(p.caution)}</p>
      <a class="link-arrow reveal" href="${esc(p.more.href)}">${t(p.more.text)}</a>
    </div>
    <div class="pk-photos" data-stagger>${p.photos.map(f => `<figure class="figure">${img(f.image, t(f.alt))}</figure>`).join('')}</div>
  </div>
  <div class="wrap pk-groups">${p.groups.map(gr => `<div class="pk-group reveal"><h3>${t(gr.title)}</h3><ul>${gr.treatments.map(x => `<li><b>${t(x.name)}</b><span>${t(x.text)}</span></li>`).join('')}</ul></div>`).join('')}</div>
</section>`;

  const vo = d.volunteer;
  const volunteer = `<section class="section deep" id="volunteer" ${chapter(vo)}>
  <div class="wrap">
    ${head(vo, t(vo.title), `<p class="lead">${T(vo.lead)}</p>`)}
    <ol class="vol-path reveal">${vo.path.map((s, i) => `<li><b aria-hidden="true">${i + 1}</b><span>${t(s)}</span></li>`).join('')}</ol>
    <div class="vol-grid">
      <div class="vol-facts reveal">
        <h3>${t(vo.factsTitle)}</h3>
        <dl class="vfacts">${vo.facts.map(f => `<div><dt>${t(f.label)}</dt><dd><b>${T(f.value, true)}</b>${f.note ? `<span>${T(f.note)}</span>` : ''}</dd></div>`).join('')}</dl>
        <a class="link-arrow" href="${esc(vo.more.href)}">${t(vo.more.text)}</a>
      </div>
      <aside class="policy reveal" aria-labelledby="policy-title" style="--d:.1s">
        <h3 id="policy-title">${t(vo.policy.title)}</h3>
        <p class="policy-lead">${T(vo.policy.lead)}</p>
        <ul>${vo.policy.items.map(x => `<li>${T(x)}</li>`).join('')}</ul>
      </aside>
    </div>
  </div>
</section>`;

  const sc = d.schedule;
  const rows = sc.items.map(i => ({ from: i.from, to: i.to, title: pick(i.title, lang), note: i.note && pick(i.note, lang) }));
  const periods = Object.fromEntries(Object.entries(L.periods).map(([k, o]) => [k, pick(o, lang)]));
  const day = `<section class="section tint day" id="schedule" ${chapter(sc)}>
  <div class="wrap">
    ${head(sc)}
    ${schedule(rows, { lang, sky: true, periods }, ui)}
  </div>
</section>`;

  const dt = d.dates;
  const calendar = `<section class="section" id="dates" ${chapter(dt)}>
  <div class="wrap">
    ${head(dt, T(dt.title, true))}
    <p class="avail reveal">${icon('clock')}<span>${T(dt.notice)}</span></p>
    ${datesHtml(dates, lang, L, ui)}
  </div>
</section>`;

  const e = d.enquire, f = e.form, tel = site.whatsapp;
  const mailto = `mailto:${site.email}?subject=${encodeURIComponent(pick(f.emailSubject, lang))}`;
  const field = (id, label, control) => `<div class="field">${control}<label for="${id}">${label}</label></div>`;
  const enquire = `<section class="section deep enquire" id="enquire" ${chapter(e)}>
  <div class="wrap enq-grid">
    <div class="enq-info reveal">
      <span class="eyebrow">${t(e.eyebrow)}</span>
      <h2>${t(e.title)}</h2>
      <p class="lead">${T(e.lead)}</p>
      <ul class="enq-contact">
        <li>${icon('mail')}<div><small>${t(e.emailLabel)}</small><a href="mailto:${site.email}">${esc(site.email)}</a></div></li>
        <li>${icon('phone')}<div><small>${t(e.phoneLabel)}</small><a href="tel:+${tel}">${esc(site.whatsappLabel)}</a></div></li>
      </ul>
      <p class="enq-notice">${T(e.notice)}</p>
      <p class="blessing" lang="${lang}">${t(e.closing)}</p>
    </div>
    <div class="enq-compose reveal" data-compose data-wa="${tel}" data-email="${esc(site.email)}" data-subject="${t(f.emailSubject)}" data-template="${esc(waTemplate('stay'))}" style="--d:.1s">
      <div class="enq-fields" role="group" aria-labelledby="enq-title" hidden>
        <h3 id="enq-title">${t(f.title)}</h3>
        <p class="muted">${t(f.intro)}</p>
        <div class="enq-row">
          ${field('q-type', t(f.type.label), `<select id="q-type" data-line="${t(f.type.label)}">${f.type.options.map(o => `<option>${t(o)}</option>`).join('')}</select>`)}
          ${field('q-arrival', t(f.arrival.label), `<input id="q-arrival" type="date" placeholder=" " data-line="${t(f.arrival.label)}">`)}
          ${field('q-people', t(f.people.label), `<input id="q-people" type="number" min="1" max="20" placeholder=" " data-line="${t(f.people.label)}">`)}
          ${field('q-room', t(f.room.label), `<select id="q-room" data-line="${t(f.room.label)}"><option value="">${t(f.room.none)}</option>${g.rooms.map(r => `<option>${t(r.name)}</option>`).join('')}</select>`)}
        </div>
        <div class="field full">
          <textarea id="q-message" rows="9" placeholder=" "></textarea><label for="q-message">${t(f.message)}</label>
        </div>
        <button class="link-arrow" type="button" data-reset hidden>${t(f.reset)}</button>
      </div>
      <div class="form-actions">
        <a class="btn" data-send="wa" href="${waLink('stay')}" target="_blank" rel="noopener">${icon('whatsapp')} ${t(f.whatsapp)}</a>
        <a class="btn ghost" data-send="mail" href="${mailto}">${icon('mail')} ${t(f.email)}</a>
      </div>
    </div>
  </div>
</section>`;

  return [ways, guest, panchakarma, volunteer, day, calendar, enquire].join('\n\n');
}

// the title, description and hero texts of the page in one language (for the layout)
export function visitingMeta(d, lang, files) {
  const p = d.page, L = d.labels, t = o => pick(o, lang);
  return {
    title: t(p.title), siteName: t(p.siteName), description: t(p.description), crumb: t(p.crumb), lead: t(p.lead), heroAlt: t(p.heroAlt), homeLabel: t(L.home),
    cta: [{ text: t(p.cta), href: '#enquire' }, { text: t(p.ctaDates), href: '#dates', ghost: true }],
    langSwitch: { label: t(L.language), links: LANGS.map(l => ({ lang: l, text: l === 'en' ? 'English' : 'हिन्दी', href: files[l] })) },
    officialContact: true,
  };
}
