# Anāmay Ashram: offline archive and website redesign

This folder holds three things:

| Folder | What it is |
|---|---|
| `offline-site/` | An offline copy of https://anamayashram.org as crawled on 3 Nov 2026: 107 pages and 1,036 images, stylesheets, fonts and scripts. Links point to the local copies, except the interview video and the magazine PDFs (170 MB), which link to the official site and are not stored here. `offline-site/_all-pages.html` lists every page. |
| `content/` | What the old site says. `SITE-AUDIT.md` summarises the organisation, its offerings and contact details, lists the theme-demo leftover pages and records what is broken on the live site. `RESEARCH.md` lists the external facts used in the redesign and their sources. `pages/*.md` holds the extracted text and images of every page. `videos.json` lists all YouTube videos with titles. |
| `website/` | The redesigned site: 22 static pages, no framework, works offline. |

## Viewing

Both sites are best viewed through the small local server (Node.js 18 or later):

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
- **Motion:** GSAP 3.15 (ScrollTrigger, SplitText) and Lenis 1.3 for smooth scrolling, copied into `website/assets/vendor` so the site works offline. Headings rise line by line, mandalas turn with the scroll, and a thread on the left of large screens (a hairline on phones) shows progress with a knot for each section. Swiper, Lottie and Three.js were considered and left out: native scrolling and SVG do the same with less weight. All motion turns off for visitors who choose reduced motion.
- **Navigation:** light over the home photograph, frosted parchment once you scroll, out of the way while reading down and back when scrolling up. On phones and tablets a full-screen menu opens from the menu button.
- **Films:** every video thumbnail opens a film window with the YouTube player (privacy-enhanced `youtube-nocookie.com`), with a loading state and clear messages if a film cannot play. Offline, thumbnails show an offline note and the film starts by itself when the connection returns. Esc, the close button or a click outside closes it and removes the player.
- **Structure:** Home · About (The Ashram, Founder) · Vedic Knowledge (Vedas, Vidyapeeth, Yagya & Jyotish) · Wellbeing (Meditation, Yoga, Āyurveda, Panchakarma, Kshar Sutra) · Ashram Life (Sattvic Life, Volunteer & 1-week course, Gallery, Journal & Magazine) · Stay (Anāmay Vedic Retreat, Rooms & Suites, Visit & Travel) · Contribute. Also three articles, policies and image credits.
- **Anāmay Vedic Retreat:** the content of anamayretreat.com now lives in the main site: the Retreat page (the stay, photographs, rejuvenation, three films, questions on food, seasons and climate, and its own contact form and email), the Rooms & Suites page, the rejuvenation rooms on the Panchakarma page and the driver and travel details on the Visit page. The text and photographs are kept in `content/retreat/`.
- **Forms:** the enquiry form checks the fields, then opens the visitor's own email app or WhatsApp with the message ready to send. The Retreat form writes to anamayvedicretreat@gmail.com, all others to anamayashram@gmail.com. Donations link to the existing donation page on anamayashram.org.
- **Images:** 52 of the ashram's own photographs, 37 from the Anāmay Vedic Retreat website, and 23 openly licensed photographs from Wikimedia Commons, each credited on `credits.html` and next to the image.

## Publishing

The site is published with GitHub Pages by `.github/workflows/pages.yml`: every push to `main` that touches `website/` runs `npm ci && npm run build` and publishes the folder. In the repository settings choose **Pages → Source: GitHub Actions** once. All links are relative, so the site works at `https://<user>.github.io/<repo>/` without any base path setting.

Large media (video, magazine PDFs) is not stored in the repository; `.gitignore` keeps `*.mp4`, the offline PDFs and `website/assets/magazine/` out. Link to the official `anamayashram.org/wp-content/uploads/…` address instead.

## Editing and rebuilding

Each page's content lives in `website/src/pages/*.html`. The shared header, footer, navigation, icons and ornaments are generated by `website/src/build.mjs`. After editing, run:

```bash
cd website && npm install && npm run build
```

`npm run images` re-creates the resized photographs from `offline-site/`. `node src/fetch-external.mjs` re-downloads the licensed images listed in `src/credits.json`. `node src/retreat-images.mjs <folder>` converts the original Retreat photographs (as downloaded from anamayretreat.com) and rewrites `src/retreat.json`, which lists them with their captions.

## Points to confirm with the ashram

- **Motto verse:** पदं गच्छन्त्यनामयम् is Bhagavad Gītā **2.51**. The old site says 2.52, and the redesign uses 2.51.
- **Course dates:** the volunteer page lists the 2026 course dates from the live site. Past dates are struck through automatically and the next one is highlighted. Add the 2027 dates when they are known.
- **Placeholder text on the live site:** the old site still shows lorem ipsum on several pages (see `content/SITE-AUDIT.md`). None of it was carried over.
- **Number of rooms:** the ashram site says 25 guest rooms, the Retreat site says the new guest house has eighteen suites and rooms. The Retreat pages say eighteen; the home page keeps 25.
- **Left out from the Retreat site:** its Research page (Masaru Emoto's water crystals) because it is a scientific claim we could not support with a source, its photograph of Emoto's crystals, and 23 blog posts that are theme placeholders. The chanting film from that page is on the Vedas page.
