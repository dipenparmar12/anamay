# Configuration: what can be changed without touching code

Three kinds of settings, kept apart on purpose.

| Kind | Where | Who edits it | Takes effect |
|---|---|---|---|
| **Content and public settings** (contact details, links, dates, schedule, videos, donation mode) | Files in [`content/`](../content) | The ashram, in the GitHub web editor | After the next deployment (automatic on every commit to `main`, a couple of minutes) |
| **Differences between deployments** (the site's address, the API address, analytics) | Build variables: `website/.env` locally, *Variables* in the GitHub repository for the deployment | Whoever deploys | Next deployment |
| **Secrets and server settings** (SMTP password, Razorpay keys, recipient addresses, folders) | Environment variables on the PHP host, or `server/.env` there | Whoever runs the host | Immediately (no rebuild) |

No secret is ever needed to build or publish the website, and none is ever written in a file that is committed. `.env` files are ignored by git.

## Files in `content/`

| File | Holds | Notes |
|---|---|---|
| `site.json` | Organisation name, e-mail addresses, phone numbers, WhatsApp number and the messages WhatsApp buttons start with, opening hours, address, social links, the list of "interested in" choices of the enquiry form, the API address, the analytics ID | Used in the header menu, footer, contact pages and the structured data. Pages refer to it with tokens such as `{{site:contact.email}}`, `{{phones}}`, `{{address}}`; an unknown name stops the build and says which |
| `donation.json` | How donations are taken (`mode`), the old donation page, the Razorpay payment button id, the smallest amount shown | See [donations](legacy-donation-workflow.md) |
| `visiting.json` | Everything on the Visiting page, in English and Hindi: room charges, Panchakarma and programme fees, minimum stay, programme times, the attendance policy, the daily schedule, the treatments, the enquiry form | Prices are numbers kept in one block; sentences are `en`/`hi` pairs that refer to them as `{shared}`. See [visiting-content.md](visiting-content.md) |
| `course-dates.csv` | The dates of the 1-week course, for the Visiting page and the Volunteer page | `start,end` per line, in any order. Keep past dates: the page marks them, folds them away and highlights the next one by itself |
| `daily-schedule.csv` | The day at the ashram on the home page | `time` (24-hour `HH:MM`; before noon is the morning, from 17:00 the evening), optional `label` shown instead of the time, `title`, `description` |
| `volunteer-day.csv` | A volunteer's day on the Volunteer page | The same columns as `daily-schedule.csv` |
| `magazine.csv` | The issues of the quarterly magazine on the Journal page | `issue,english,hindi`: the web addresses of the PDFs (kept on anamayashram.org, not in this repository). Leave a language empty if an issue has only one |
| `videos.json`, `video-groups.json` | The YouTube films and which page shows which | A film is added to `videos.json` (id, title) and to a group. Its thumbnail is a picture saved as `website/assets/img/video/<id>.jpg` (YouTube offers one at `https://i.ytimg.com/vi/<id>/hqdefault.jpg`); the link check reports a missing one |
| `images.json` | The photographs and gallery captions that `npm run images` turns into web files | `IMAGE_SOURCE_DIR` says where the originals are |
| `redirects.csv` | Old WordPress addresses and the page each now goes to | Built into small redirecting pages by the deployment |
| `website/src/credits.json` | Credits of the openly licensed photographs | Shown only on the credits page |

CSV files open in Excel or Google Sheets. Keep the first line (the column names). Dates are `2027-03-14` or `14-03-2027` (day first). A mistake stops the build with the file name and line number, so it cannot publish a broken page.

## Build variables (the website)

Read by `website/src/build.mjs` from the environment or from an uncommitted `website/.env` (see `website/.env.example`). All are optional.

| Variable | Overrides | Meaning |
|---|---|---|
| `SITE_URL` | `url` in `site.json` | The public address, no trailing slash. Turns on canonical links, link-preview addresses and `sitemap.xml`. The deployment sets it from GitHub Pages automatically |
| `API_BASE_URL` | `api.base` | Where the PHP API is. Empty: the enquiry form opens the visitor's e-mail or WhatsApp app instead |
| `DONATION_MODE` | `mode` in `donation.json` | `legacy`, `button` or `native` (`native` needs the API) |
| `GA4_ID` | `analytics.ga4` | Google Analytics 4 ID. Empty: no analytics, no cookies |
| `LEGACY_REDIRECTS` | – | `true` builds the pages for the old addresses. The deployment sets it |
| `IMAGE_SOURCE_DIR` | – | Only for `npm run images` |

In GitHub: Settings, Secrets and variables, Actions, **Variables** tab. Use *Variables*, not *Secrets*: these values end up in the public site anyway.

## Server settings (the PHP API)

Set as environment variables in the host's control panel, or in `server/.env` (copy `server/.env.example`). **Check them with `php bin/check.php`**, which lists what is missing for the features that are switched on.

| Variable | Needed when | Default | Meaning |
|---|---|---|---|
| `APP_ENV` | always | `production` | `local`, `testing`, `staging` or `production`. Anything else counts as production |
| `APP_TIMEZONE` | – | `Asia/Kolkata` | Time zone of the date and time columns in the ledgers |
| `APP_BASE_PATH` | API not at the root of its address | empty | For example `/api` |
| `CORS_ALLOWED_ORIGINS` | always | empty | The websites allowed to call the API, comma-separated, as in the address bar (`https://dipenparmar12.github.io`). Include the website's own address |
| `TRUSTED_IP_HEADER` | behind a proxy or CDN | empty | For example `CF-Connecting-IP`, so rate limits see the visitor |
| `STORAGE_DIR`, `LEDGER_DIR` | – | `storage`, `storage/ledger` | Where counters, test mails and the CSV ledgers go. Prefer folders **outside** the web root |
| `CONTACT_TO` | contact form | – | The official address that receives enquiries |
| `CONTACT_TO_RETREAT` | – | `CONTACT_TO` | Receives the Retreat form |
| `CONTACT_MIN_FILL_MS`, `CONTACT_RATE_LIMIT`, `CONTACT_RATE_WINDOW` | – | `2000`, `5`, `600` | Spam guards: time on the page, messages per visitor per window (seconds) |
| `MAIL_TRANSPORT` | – | `smtp` | `smtp`, or `log` (not in production) to write mails to files while developing |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_ENCRYPTION`, `SMTP_USERNAME`, `SMTP_PASSWORD` | `smtp` | `587`, `tls` | The mail account the website sends through. `SMTP_PASSWORD` is needed when `SMTP_USERNAME` is set |
| `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` | `smtp` | – , `Anāmay Ashram website` | The sender shown. The visitor's address is only ever the Reply-To |
| `DONATION_PROVIDER` | donations | empty (off) | `razorpay`, or empty. `fake` exists for development only |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | `razorpay` | – | From the Razorpay dashboard. **`rzp_live_` keys only in production, `rzp_test_` keys everywhere else** (the server refuses otherwise) |
| `RAZORPAY_WEBHOOK_SECRET` | `razorpay` | – | The secret typed into the dashboard's webhook form |
| `DONATION_MIN_AMOUNT`, `DONATION_MAX_AMOUNT`, `DONATION_PRESETS` | – | `100`, `500000`, `500,1100,2100,5100` | Rupees; override `server/config/donation.php` |
| `DONATION_RATE_LIMIT`, `DONATION_RATE_WINDOW` | – | `10`, `3600` | Orders per visitor per window |

`server/config/donation.php` holds the donation settings that are not secret and rarely change: the merchant name, the description, the colour and the donor form fields with their rules.

## Environments

| | local | testing / staging | production |
|---|---|---|---|
| `APP_ENV` | `local` | `testing`, `staging` | `production` |
| Mail | `MAIL_TRANSPORT=log` writes files, no SMTP needed | A real or sandbox SMTP account | SMTP only |
| Donations | `DONATION_PROVIDER=fake` (no Razorpay needed) or Razorpay **test** keys | Razorpay **test** keys | Razorpay **live** keys |
| Site | `npm run build` with `website/.env` pointing at `http://localhost:8000` | A branch deployment or a second repository variable set | The Pages deployment |

## What is deliberately left in the code

- The **structure of the site**: the menu groups and their order (`NAV` in `build.mjs`), which page is which. This is design, not content.
- The **words of each page**: they live in `website/src/pages/*.html`, which is as close to "content" as a hand-written site gets. Contact details, dates and the day's schedule, which change, are not in them.
- Fixed technical addresses of the services the site is built on (YouTube's privacy-enhanced player, Razorpay's script and API hosts, the GSAP and Lenis libraries). They change only if the service does.
- The rules for the donor form (PAN pattern, pincode pattern) are in `server/config/donation.php`, not in the environment, because they follow Indian regulations rather than the deployment.
