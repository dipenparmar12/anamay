# Leaving WordPress: what it did, and what replaces it

The old site (anamayashram.org) runs on WordPress with many plugins. This page lists what each one does and what takes its place in the new site, so nothing is lost by accident and nothing is rebuilt without a reason.

## How this was audited, and its limits

Only what the public site shows was inspected: the saved copy of all 107 pages (`offline-site/`), the page source, the HTTP headers and the REST API index of the live site. **WordPress admin, the database and the server files were not available.** So:

- The list below is of plugins that **show themselves in the public site**. A plugin that only works in the admin area, or one that is installed but switched off, would not appear. Please compare with Plugins, Installed Plugins in WordPress admin.
- Plugin settings (for example the e-mail address Contact Form 7 sends to) are not public and are listed under "Needs the ashram".
- Custom code in the theme's `functions.php` or a child theme cannot be seen from outside.

Platform: WordPress 7.1.4, PHP 8.3 on a LiteSpeed server, behind Cloudflare (DNS, CDN and e-mail-address obfuscation), theme **Samadhi** (ThemeREX, a Buddhist-monastery demo theme).

## The mapping

| Old plugin or service | What it did on the site | Still needed? | Replaced by |
|---|---|---|---|
| Elementor 3.33.6 (+ Xpro Elementor Addons, Essential Addons for Elementor Lite) | Builds every page | No: the pages are now written once, as HTML | `website/src/pages/*.html` and `build.mjs` |
| Samadhi theme + ThemeREX Addons (`trx_addons`) | Look, header, footer, shortcodes, team and "layouts" pages | No | `style.css`, the shared header and footer in `build.mjs` |
| Slider Revolution 6.5.17 | Home page slider | No | The Himalaya hero and the sliders on the home page |
| Essential Grid, Portfolio Filter Gallery | Photo galleries | No | `{{gallery}}`, `{{strip}}` and the photo viewer; photos listed in `content/images.json` |
| Animated Fullscreen Menu | The menu overlay | No | The full-screen menu in `main.js` |
| Custom Fonts (Brainstorm Force) | Uploaded fonts | No | Fonts are self-hosted in `assets/fonts` |
| **Contact Form 7 6.1.4** (+ Akismet) | The "Contact Us" form on `/visiting/` and the volunteer "Application Form" | **Yes** | The enquiry form, posting to the PHP API (`/contact`) |
| **My Sticky Elements** | Floating contact tab (name, phone, email, message) on every page | Partly: a way to reach the ashram from every page | The WhatsApp button on every page and the Visit & Contact link in the menu |
| weForms | A "Registration Form" page (yoga teacher training questions) | Unclear: see below | Not carried over; can be added on the same API |
| Mailchimp for WP | Newsletter form on the home page, showing demo text ("Samadhi Monastery") | No evidence it was used | Not carried over |
| Akismet | Spam filter for comments and forms | Yes, the function | Trap field, minimum fill time and rate limit in the API |
| **Razorpay Payment Button** (not a plugin) | Donations | **Yes** | The same button on the new donation page, or our own form: see [donations](legacy-donation-workflow.md) |
| GiveWP (switched off), WooCommerce pages (cart, checkout, shop) | Leftover demo pages showing raw shortcode text | No | Not carried over |
| MP Timetable | Weekly timetable and events pages, empty on the live site | No | The day at the ashram and the course dates come from CSV files |
| GTranslate | Google-Translate language switcher in 11 languages | Optional | Not carried over (see below) |
| LiteSpeed Cache 7.7 | Page cache, speed optimisations | No | Static files on a CDN; photos already converted to WebP at build time |
| Site Kit by Google 1.168.0 | Google Analytics 4 (and its dashboard) | Optional | One setting, `analytics.ga4` |
| Cloudflare | DNS, CDN, e-mail-address obfuscation | Keep for DNS | Unchanged |
| WordPress core REST API, oEmbed, site health | Internals | No | n/a |

## Decisions that need the ashram

- **Contact form recipient.** Contact Form 7 sends to an address set in its Mail tab. The new form sends to `CONTACT_TO` (anamayashram@gmail.com, the published address) and, for the Retreat form, `CONTACT_TO_RETREAT` (anamayvedicretreat@gmail.com). Confirm these.
- **Volunteer application and yoga teacher training registration.** The old site had two longer forms. The new Volunteer page asks applicants to send the same details by e-mail or WhatsApp (as the old page also offered). If a form is wanted, it is a small addition to the same API.
- **Existing enquiries.** Contact Form 7 does not keep messages unless a plugin such as Flamingo is installed (none was seen). My Sticky Elements normally keeps its leads in the WordPress database: export them (Sticky Elements, Contact Form Leads) before WordPress is switched off, if they matter.
- **Languages.** GTranslate offered Arabic, Chinese (two scripts), English, French, German, Hindi, Italian, Nepali, Russian and Spanish by machine translation. The new site is in English; browsers can translate it. Real Hindi pages would be a content project, not a plugin.
- **Analytics.** The old site reports to Google Analytics 4 property `G-6V915Z31DG`. The new site collects **nothing** until `analytics.ga4` is set in `content/site.json` (or `GA4_ID` in the deployment). Setting it keeps the same property but also brings back cookies, which some visitors (Europe) expect a notice for. A cookie-free alternative that fits an existing Cloudflare account is Cloudflare Web Analytics.
- **Newsletter.** There is none on the new site. A hosted Mailchimp sign-up page could be linked.

## What the new site uses instead, feature by feature

**Pages, design, galleries, menu.** Plain HTML, CSS and JavaScript made by one build script. Two libraries do the standard work: GSAP (scroll animation) and Lenis (smooth scrolling), both copied into the site so it runs offline. Nothing needs a database.

**Enquiry form** (replaces Contact Form 7, Sticky Elements' form and Akismet). The form in `visit.html` and `retreat.html` posts JSON to `POST /contact` of the PHP API in `server/`.
- Libraries: **PHPMailer** (the standard PHP mailer, for SMTP) and **vlucas/phpdotenv** (reads `.env`). The CSV ledger, validation and spam checks are about 300 lines of our own code: no package was needed.
- Spam: a hidden trap field, a minimum time on the page (2 seconds), and 5 messages per visitor address per 10 minutes. If bots get through, the next step is Cloudflare Turnstile (free, and the ashram is on Cloudflare): add its token check to `ContactService`.
- Settings: `CONTACT_TO`, `CONTACT_TO_RETREAT`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_ENCRYPTION`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`, `CONTACT_*` limits, `LEDGER_DIR`, `CORS_ALLOWED_ORIGINS`.
- Without the API (`api.base` empty) the form falls back to opening the visitor's e-mail or WhatsApp app, as the old Volunteer page did.

**Donations.** See [the donation document](legacy-donation-workflow.md). Library: Razorpay's **official PHP SDK** (`razorpay/razorpay`) for the own-form option only. Settings: `DONATION_PROVIDER`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `DONATION_MIN_AMOUNT`, `DONATION_MAX_AMOUNT`, `DONATION_PRESETS`; public side `mode` and `razorpay.paymentButtonId` in `content/donation.json`.

**Search and sharing.** The old site had no SEO plugin (only WordPress's own sitemap at `/wp-sitemap.xml`; its `robots.txt` pointed at a `sitemap.xml` that did not exist). The new build writes each page's title and description, a canonical address, a link-preview image, a `sitemap.xml`, a `robots.txt` and structured data about the organisation. **Old addresses keep working** after the domain moves: `content/redirects.csv` lists 50 old WordPress paths (`/about-us/`, `/visiting/`, `/donation/`, …) and the deployment builds a small redirecting page for each.

**Speed.** Static files served from a CDN replace the page cache. Photos are WebP, fonts are self-hosted, and the site makes no database queries.

**Analytics.** One optional setting (see above).

## Environment variables and configuration at a glance

Public, non-secret values are edited in files under `content/` and need a rebuild; secrets are environment variables on the PHP host only. The full list, with defaults, is in [configuration](configuration.md).
