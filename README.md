# Anāmay Ashram: offline archive and website redesign

This repository holds five things:

| Folder | What it is |
|---|---|
| `offline-site/` | An offline copy of https://anamayashram.org as crawled on 3 Nov 2026: 107 pages and 1,036 images, stylesheets, fonts and scripts. Links point to the local copies, except the interview video and the magazine PDFs (170 MB), which link to the official site and are not stored here. `offline-site/_all-pages.html` lists every page. |
| `content/` | What the site says and the settings an editor may change: contact details (`site.json`), donations (`donation.json`), course dates and the daily schedule (CSV files), videos, photograph lists, old-address redirects. Also what the old site said: `SITE-AUDIT.md`, `RESEARCH.md` and `pages/*.md`. See [docs/configuration.md](docs/configuration.md). |
| `website/` | The redesigned site: 25 static pages, no framework, works offline. |
| `server/` | A small PHP API for the enquiry form (e-mail and a CSV record) and, optionally, donations. See [server/README.md](server/README.md). |
| `docs/` | [Configuration](docs/configuration.md), [deployment](docs/deployment.md), [how donations worked on the old site and how the new one takes over](docs/legacy-donation-workflow.md), and [what each WordPress plugin did and what replaces it](docs/wordpress-migration.md). |

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

- **Identity:** a parchment, saffron, turmeric-gold and indigo-night palette drawn from temple murals and Pichwai painting. Type is Cormorant Garamond for headings, Mukta for body text and Tiro Devanagari Sanskrit for Sanskrit, all self-hosted. The Himalaya is the recurring shape: photographs are framed by a distant mountain skyline, dark sections and new pages rise into view like a peak, and paper-coloured ridges carry each hero into the page. Other ornaments: a generated mandala, a lotus divider, a kolam dot grid and paper grain.
- **Home:** a full-screen photograph of the Kumaon Himalaya from Kausani with drifting mist, the name "Anāmay" rising from behind the hills, then the motto verse word by word, a horizontal walk through the three paths (pinned on large screens, swiped on phones), the day at the ashram shown as a sky that follows the timeline, a panning Kausani panorama, ways to take part, quotes, a film strip of photographs and the welcome.
- **Motion:** GSAP 3.15 (ScrollTrigger, SplitText) and Lenis 1.3 for smooth scrolling, copied into `website/assets/vendor` so the site works offline. Headings rise line by line and mandalas turn with the scroll. Swiper, Lottie and Three.js were considered and left out: native scrolling and SVG do the same with less weight. All motion turns off for visitors who choose reduced motion.
- **Navigation:** light over the home photograph, frosted parchment once you scroll, out of the way while reading down and back when scrolling up. On phones and tablets a full-screen menu opens from the menu button. Long pages also get a small floating pill of their own sections (it follows the section being read), a progress line at the top and a back-to-top button.
- **Films:** every video thumbnail opens a film window with the YouTube player (privacy-enhanced `youtube-nocookie.com`), with a loading state and clear messages if a film cannot play. Offline, thumbnails show an offline note and the film starts by itself when the connection returns.
- **Structure:** Home · About (The Ashram, Founder) · Vedic Knowledge (Vedas, Vidyapeeth, Yagya & Jyotish) · Wellbeing (Meditation, Yoga, Āyurveda, Panchakarma, Kshar Sutra) · Ashram Life (Sattvic Life, Volunteer & 1-week course, Gallery, Journal & Magazine) · Stay (Anāmay Vedic Retreat, Rooms & Suites, Visit & Travel) · Contribute (Donate, Ways to contribute). Also three articles, policies and image credits (linked from the policies page).
- **Anāmay Vedic Retreat:** the content of anamayretreat.com lives in the main site: the Retreat page, the Rooms & Suites page, the rejuvenation rooms on the Panchakarma page and the driver and travel details on the Visit page. The text and photographs are kept in `content/retreat/`.
- **Enquiry forms:** with an API address set, a message goes straight to the ashram's e-mail and into a CSV record, with checks and spam protection on the server. Without one, the form opens the visitor's own e-mail app or WhatsApp with the message ready. The Retreat form writes to the Retreat address, all others to the ashram's.
- **Donations:** `donate.html` leads with the way to give and where it goes. By default it shows the Razorpay payment button of the old website, so donors stay on the new site. Our own form is built and tested but off. [How and why](docs/legacy-donation-workflow.md).
- **Images:** 52 of the ashram's own photographs, 37 from the Anāmay Vedic Retreat website, and 23 openly licensed photographs from Wikimedia Commons. Credits are kept on `credits.html` only.

## Settings, in short

Everything an editor is likely to change is a file in `content/` (or a variable), not code: [docs/configuration.md](docs/configuration.md) lists them all. Two are worth knowing by heart:

- **Course dates**: [`content/course-dates.csv`](content/course-dates.csv), one line per course (`start,end`).
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
- **Course dates:** the file holds the 2026 dates from the live site. Add the 2027 dates when they are known.
- **Times of the day at the ashram:** the old site describes the daily rhythm in words but gives **no clock times**. The times on the home page (7:00, 7:30, 8:30, 9:00, 12:00, 5:00, 8:00) were estimated in the redesign. Please correct them in `content/daily-schedule.csv`.
- **Number of rooms:** the ashram site says 25 guest rooms, the Retreat site says eighteen. The Retreat pages say eighteen; the home page keeps 25.
- **Donations:** which payment methods Razorpay has switched on, whether a webhook exists, and what to say about receipts or tax benefits (80G is switched off on the button; the site claims none). The own-form option needs Razorpay API keys, test keys first.
- **E-mail:** that anamayashram@gmail.com and anamayvedicretreat@gmail.com are the right recipients, and which mail account the website sends through.
- **Analytics:** the old site reported to Google Analytics `G-6V915Z31DG`. The new site collects nothing until `analytics.ga4` is set; doing so brings cookies back.
- **Placeholder text on the live site:** lorem ipsum on several old pages (see `content/SITE-AUDIT.md`). None of it was carried over.
- **Left out from the Retreat site:** its Research page (Masaru Emoto's water crystals), because it is a scientific claim we could not support with a source, its photograph of the crystals, and 23 blog posts that are theme placeholders.
