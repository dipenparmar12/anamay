# Anāmay Ashram: offline archive and website redesign

This repository holds five things:

| Folder | What it is |
|---|---|
| `offline-site/` | An offline copy of https://anamayashram.org as crawled on 3 Nov 2026: 107 pages and 1,036 images, stylesheets, fonts and scripts. Links point to the local copies, except the interview video and the magazine PDFs (170 MB), which link to the official site and are not stored here. `offline-site/_all-pages.html` lists every page. |
| `content/` | What the site says and the settings an editor may change: contact details (`site.json`), the Visiting page with its prices and schedule in English and Hindi (`visiting.json`), donations (`donation.json`), course dates and day schedules (CSV files), videos, photograph lists, old-address redirects. Also what the old site said: `SITE-AUDIT.md`, `RESEARCH.md` and `pages/*.md`. See [docs/configuration.md](docs/configuration.md). |
| `website/` | The redesigned site: 27 static pages (the Visiting page in English and Hindi), no framework, works offline. |
| `server/` | A small PHP API for the enquiry form (e-mail and a CSV record) and, optionally, donations. See [server/README.md](server/README.md). |
| `docs/` | [Configuration](docs/configuration.md), [keeping the Visiting page up to date](docs/visiting-content.md), [deployment](docs/deployment.md), [how donations worked on the old site and how the new one takes over](docs/legacy-donation-workflow.md), and [what each WordPress plugin did and what replaces it](docs/wordpress-migration.md). |

## Viewing

Both sites are best viewed through the small local server (Node.js 20.12 or later):

```bash
node serve.mjs website 8080
```

```bash
node serve.mjs offline-site 8081
```

Then open http://localhost:8080 for the redesign and http://localhost:8081 for the old site.

You can also double-click `website/index.html`, but two things only work through the server: web fonts (Chrome does not load them from `file://`) and the films (YouTube does not play inside pages opened from a file; the film window then says so and offers a "Watch on YouTube" link).

## The redesign at a glance

- **Identity:** a parchment, saffron, turmeric-gold and indigo-night palette drawn from temple murals and Pichwai painting. Type is Cormorant Garamond for headings, Mukta for body text and Tiro Devanagari Sanskrit for Sanskrit, all self-hosted. The Himalaya is the recurring shape: photographs are framed by a distant mountain skyline and paper-coloured ridges carry each hero into the page. The page is one calm parchment surface: sections differ only in a warmer or lighter shade, and only the hero, the photograph bands and the footer are dark. Other ornaments: a lotus divider, a kolam dot grid, paper grain and a generated mandala in the footer.
- **Home:** a full-screen photograph of the Kumaon Himalaya from Kausani with drifting mist, the name "Anāmay" rising from behind the hills, then the motto verse word by word, the three paths (Vedic Knowledge, Wellbeing, Sattvic Living) as a horizontal walk pinned on large screens and as grouped cards stacked on phones and tablets, the day at the ashram as a schedule of morning, afternoon and evening with a sky window beside it on wide screens, a panning Kausani panorama, ways to take part, quotes, a film strip of photographs and the welcome.
- **Motion:** GSAP 3.15 (ScrollTrigger, SplitText) and Lenis 1.3 for smooth scrolling, copied into `website/assets/vendor` so the site works offline. Headings rise line by line, photographs are revealed as they come into view and hovers are soft; nothing floats, spins or flashes. Swiper, Lottie and Three.js were considered and left out: native scrolling and SVG do the same with less weight. All motion turns off for visitors who choose reduced motion.
- **Navigation:** light over the home photograph, frosted parchment once you scroll, out of the way while reading down and back when scrolling up. On phones and tablets a full-screen menu opens from the menu button. Long pages also get a small floating pill of their own sections (it follows the section being read), a progress line at the top and a back-to-top button.
- **Films:** every video thumbnail opens a film window with the YouTube player (privacy-enhanced `youtube-nocookie.com`), with a loading state and clear messages if a film cannot play. Offline, thumbnails show an offline note and the film starts by itself when the connection returns.
- **Structure:** Home · About (The Ashram, Founder) · Vedic Knowledge (Vedas, Vidyapeeth, Yagya & Jyotish) · Wellbeing (Meditation, Yoga, Āyurveda, Panchakarma, Kshar Sutra) · Ashram Life (Sattvic Life, Volunteer & 1-week course, Gallery, Journal & Magazine) · Stay (Visiting Anāmay Ashram in English and Hindi, Anāmay Vedic Retreat, Rooms & Suites, Visit & Travel) · Contribute (Donate, Ways to contribute). Also three articles, policies and image credits (linked from the policies page).
- **Visiting Anāmay Ashram:** the answers to the questions first-time visitors ask on WhatsApp, in English (`visiting.html`) and Hindi (`visiting-hi.html`): the two ways to stay, room charges laid out as a tariff, optional Panchakarma with its treatments, the compulsory 1-week programme with its attendance policy, the daily schedule, the course dates (past ones fold away by themselves) and an enquiry composer that writes a WhatsApp or e-mail message the visitor can edit. Prices, times, dates and text are data, not code: [docs/visiting-content.md](docs/visiting-content.md).
- **Anāmay Vedic Retreat:** the content of anamayretreat.com lives in the main site: the Retreat page, the Rooms & Suites page, the rejuvenation rooms on the Panchakarma page and the driver and travel details on the Visit page. The text and photographs are kept in `content/retreat/`.
- **Enquiry forms:** with an API address set, a message goes straight to the ashram's e-mail and into a CSV record, with checks and spam protection on the server. Without one, the form opens the visitor's own e-mail app or WhatsApp with the message ready. Every WhatsApp button of the site opens WhatsApp with a message already typed that the visitor can change before sending (`contact.whatsappMessages` in `site.json`). The Retreat form writes to the Retreat address, all others to the ashram's.
- **Donations:** `donate.html` leads with the way to give and where it goes. By default it shows the Razorpay payment button of the old website, so donors stay on the new site. Our own form is built and tested but off. [How and why](docs/legacy-donation-workflow.md).
- **Images:** 52 of the ashram's own photographs, 37 from the Anāmay Vedic Retreat website, and 23 openly licensed photographs from Wikimedia Commons. Credits are kept on `credits.html` only.

## Settings, in short

Everything an editor is likely to change is a file in `content/` (or a variable), not code: [docs/configuration.md](docs/configuration.md) lists them all. Three are worth knowing by heart:

- **Prices, programme times, the schedule and every sentence of the Visiting page**, in English and Hindi: [`content/visiting.json`](content/visiting.json). How: [docs/visiting-content.md](docs/visiting-content.md).
- **Course dates**: [`content/course-dates.csv`](content/course-dates.csv), one line per course (`start,end`). Keep past dates; the site marks them itself.
- **The day at the ashram** on the home page: [`content/daily-schedule.csv`](content/daily-schedule.csv).

To change them without any tools: open the file on GitHub, press the pencil icon, edit, and choose **Commit changes**. The site rebuilds and publishes by itself within a couple of minutes. In Excel or Google Sheets keep the column names and save as CSV. Dates are `2027-03-14` or `14-03-2027` (day first). A mistake stops the build with the file and line number, so a typo cannot publish a broken page.

## Publishing

The site is published with GitHub Pages by `.github/workflows/pages.yml` on every push to `main`. Set **Pages → Source: GitHub Actions** once. All links are relative, so it works at `https://<user>.github.io/<repo>/` without a base path. The API is deployed separately (GitHub Pages cannot run PHP): see [docs/deployment.md](docs/deployment.md).

Large media (video, magazine PDFs) is not stored in the repository; `.gitignore` keeps them out. Link to the official `anamayashram.org/wp-content/uploads/…` address instead.

## Editing and rebuilding

Each page's content lives in `website/src/pages/*.html`. The shared header, footer, navigation, icons and ornaments are generated by `website/src/build.mjs`. After editing, run:

```bash
cd website && npm install && npm run build
```

`npm run images` re-creates the resized photographs listed in `content/images.json` from the offline copy. `node src/fetch-external.mjs` re-downloads the licensed images listed in `src/credits.json`. `node src/retreat-images.mjs <folder>` converts the original Retreat photographs and rewrites `src/retreat.json`.

The API's tests: `cd server && composer install && composer test`.

## Points to confirm with the ashram

- **Motto verse:** पदं गच्छन्त्यनामयम् is Bhagavad Gītā **2.51**. The old site says 2.52, and the redesign uses 2.51.
- **Course dates:** the file holds the earlier 2026 dates from the live site and the dates the ashram supplied, August 2026 to January 2028. The 2026 courses run from a Sunday to the next Sunday, the later ones from a Sunday to a Saturday, while the programme is described as ending on Saturday at 10 pm. The dates are shown as supplied.
- **Times of the day at the ashram:** the day on the home page (`content/daily-schedule.csv`) was written from the old site's description of the day, which gave no clock times there, so its times were estimated. A volunteer's day (`content/volunteer-day.csv`) is the one the old Volunteer page gave. Please correct either if it differs.
- **Hindi text:** the sentences you supplied are used as written. The labels, the descriptions of the treatments, the enquiry form and a few notices on the Hindi page were translated for the website. Please have a Hindi speaker read them before the page is promoted.
- **Panchakarma descriptions:** the one-line descriptions of the treatments on the Visiting page were written for it (three reuse the wording of the Āyurveda page). Please have the Vaidyas confirm them, and that every treatment listed is offered.
- **Number of rooms:** the ashram site says 25 guest rooms, the Retreat site says eighteen. The Retreat pages say eighteen; the home page keeps 25.
- **Donations:** which payment methods Razorpay has switched on, whether a webhook exists, and what to say about receipts or tax benefits (80G is switched off on the button; the site claims none). The own-form option needs Razorpay API keys, test keys first.
- **E-mail:** that anamayashram@gmail.com and anamayvedicretreat@gmail.com are the right recipients, and which mail account the website sends through.
- **Analytics:** the old site reported to Google Analytics `G-6V915Z31DG`. The new site collects nothing until `analytics.ga4` is set; doing so brings cookies back.
- **Placeholder text on the live site:** lorem ipsum on several old pages (see `content/SITE-AUDIT.md`). None of it was carried over.
- **Left out from the Retreat site:** its Research page (Masaru Emoto's water crystals), because it is a scientific claim we could not support with a source, its photograph of the crystals, and 23 blog posts that are theme placeholders.
