# Deploying the website and the API

The website is static files. The contact form and the donation form (if used) need a small PHP program, the API in [`server/`](../server). GitHub Pages serves only static files, so **the API has to run somewhere that runs PHP**. This page covers both.

## Which setup

| | A. Website on GitHub Pages, API on a PHP host (**recommended**) | B. Everything on one PHP host |
|---|---|---|
| Website | Published by GitHub on every commit to `main` ([workflow](../.github/workflows/pages.yml)) | Upload the contents of `website/` after `npm run build` |
| API | `server/` on a PHP host, for example the hosting the old WordPress site is on, at a sub-domain such as `api.anamayashram.org` | `server/` next to the website, at `/api` |
| `api.base` / `API_BASE_URL` | `https://api.anamayashram.org` | `https://anamayashram.org/api` |
| `CORS_ALLOWED_ORIGINS` | the website's origin, for example `https://anamayashram.org,https://dipenparmar12.github.io` | the website's origin |
| Needs | A GitHub repository variable `API_BASE_URL` | A way to upload files |

Without an API nothing breaks: the enquiry form opens the visitor's e-mail app and the donation page shows the Razorpay button (or the link to the old page). The API is only needed for the enquiry form to send by itself, a CSV record of enquiries, and the own-form donation option.

## 1. The website on GitHub Pages

1. Repository Settings, **Pages**, Source: **GitHub Actions** (once).
2. Push to `main`. [`pages.yml`](../.github/workflows/pages.yml) installs, builds and publishes `website/`. The public address is shown in the workflow run, and the build gets it as `SITE_URL`.
3. Optional build variables, under Settings, Secrets and variables, Actions, **Variables**: `API_BASE_URL`, `DONATION_MODE`, `GA4_ID` (see [configuration](configuration.md)).
4. To use the ashram's own domain: Settings, Pages, Custom domain, then point the domain's DNS at GitHub (the ashram's DNS is at Cloudflare). The deployment also builds a redirecting page for each old WordPress address (`content/redirects.csv`), so old links and search results keep working.

Only one workflow may publish Pages. If a "Deploy static content to Pages" workflow is added from GitHub's template, delete it: it publishes the repository root and replaces the site with a 404.

## 2. The API on a PHP host

### Requirements

PHP **8.1 or newer** with the extensions `curl`, `json`, `mbstring` and `openssl` (nearly every host has them), HTTPS, and the ability to set environment variables or to put a `.env` file next to `composer.json`. Apache or LiteSpeed (the `.htaccess` files are included); nginx needs the equivalent rewrite to `public/index.php`.

### Install

Either (with SSH):

```bash
cd server
composer install --no-dev --optimize-autoloader
```

or (no SSH): in GitHub, Actions, **Package the API for upload**, Run workflow. Download the `anamay-api` zip, unzip it on the host. It already contains the PHP libraries.

Point the web server's **document root at `server/public`**. If the host cannot do that, upload the whole `server` folder under the web root: its `.htaccess` hides everything except `public/`. In both cases check from outside that `https://…/health` answers `{"status":"ok"}` and that `https://…/.env` and `https://…/composer.json` do **not** answer. (These rules were written for Apache and LiteSpeed and could not be run against either here; the check is the proof.)

### Configure

Copy `server/.env.example` to `server/.env` on the host (or set the same names in the host's panel) and fill it in: see the table in [configuration](configuration.md). Then:

```bash
php bin/check.php
```

It lists everything missing for the features that are switched on, wrong time zone names, folders that cannot be written, a Razorpay key of the wrong kind for the environment, and exits with a non-zero code if anything is wrong.

### SMTP (the e-mail the form sends)

Use an SMTP account that may send as `MAIL_FROM_ADDRESS`. Common choices:

- The host's own mailbox (for example `mail.anamayashram.org`, port 587, `tls`): simplest, and mail comes from the domain.
- Gmail (`smtp.gmail.com`, port 587, `tls`): needs 2-step verification and an **app password** as `SMTP_PASSWORD`; `MAIL_FROM_ADDRESS` must be that Gmail address.
- A transactional service (Brevo, Mailgun, Amazon SES): best delivery, needs a verified domain.

The enquiry arrives from `MAIL_FROM_ADDRESS`; replying answers the visitor, whose address is in Reply-To. These could not be tried against a real mail provider here: send one test enquiry after set-up and check the spam folder.

### The enquiry ledger (CSV)

Every accepted enquiry is appended to `contact-submissions.csv` in `LEDGER_DIR`: id, date, time (in `APP_TIMEZONE`), the time in UTC, channel, name, email, phone, interest, subject, age, arrival, message, and `mail_status` (`sent` or `failed`). It opens in Excel with Devanagari intact. **Check for `failed` rows now and then**: the visitor was told "thank you" because the message was safely kept, but no e-mail went out.

- **Keep it out of reach.** Put `LEDGER_DIR` outside the web root. The `.htaccess` in `server/storage` also denies access, but a folder the web server cannot serve is better than a rule.
- **Permissions.** Writable by the web server's user only (`chmod 750` on the folder, `640` on the files).
- **Backup.** It is the only copy of enquiries besides the e-mail. Copy `LEDGER_DIR` to a safe place regularly (the host's backup, or a weekly download).
- **Excel.** Text starting with `=`, `+`, `-` or `@` is stored with a leading apostrophe, so a hostile message cannot run as a formula. That is also why phone numbers appear as `'+91…`.

### Razorpay (only for the own-form donation option)

1. Dashboard, Settings, **API keys**: generate **test** keys. Put them in `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` with `APP_ENV=staging` and `DONATION_PROVIDER=razorpay`.
2. Dashboard, Settings, **Webhooks**, Add: URL `https://<api address>/webhooks/razorpay` (HTTPS is required), a secret of your choosing (put the same in `RAZORPAY_WEBHOOK_SECRET`), events `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`. A webhook added in test mode applies to test payments only; add it again in live mode.
3. Set the website's `DONATION_MODE=native` and `API_BASE_URL`. Make a test donation with Razorpay's test card or UPI details and watch `donations.csv`: a `created` row, then `checkout_verified` / `paid`, and a `webhook:payment.captured` row.
4. Go live: generate live keys, set `APP_ENV=production`, the live keys and a live webhook. The server refuses to start the donation flow if a test key is used in production or a live key outside it.
5. Keep `mode: button` (or `legacy`) until step 3 has passed. To roll back, set `DONATION_MODE` back and re-run the deployment.

An account-wide webhook also reports payments made with the old button. They are recorded in the ledger too, marked "not created on this website".

### Donation ledger

`donations.csv` in `LEDGER_DIR` is append-only: one row per step of an order (created, signature checked, webhook received), with the amount and the donor's name and email. It never contains card details, PAN, address or mobile number. Treat it like the enquiry ledger: outside the web root, restricted, backed up. **Razorpay's dashboard remains the financial record**; the ledger is a convenience and an audit trail.

## Privacy

- **Enquiries** hold personal data (name, email, phone, age, message). They are kept only in the ledger and the ashram's mailbox. Decide how long to keep them and delete old rows.
- **Donations, own-form option.** The donor's PAN, address and mobile number pass through the server in memory on their way to Razorpay and are not written anywhere by this program; the web server's own request logs do not include request bodies. The old payment button never exposed the ashram's server to this data. If that is not wanted, stay on `button` mode.
- **The donation page in `button` mode** loads Razorpay's script, which in turn contacts Razorpay's servers and, as far as the script shows, its analytics and Google Fonts. This happens on `donate.html` only, as it did on the old site. The own-form option loads Razorpay Checkout only when a donor presses Donate.
- **Analytics** are off until `analytics.ga4` is set.
- Rate limiting keeps small files named by a hash of the visitor's address and the form; they are cleared out automatically once they are a day old.

## Checklist before going live

- [ ] `php bin/check.php` ends with "Settings look complete".
- [ ] `https://<api>/health` answers; `https://<api>/.env` does not.
- [ ] One enquiry sent from the live site arrives in the inbox and in `contact-submissions.csv`.
- [ ] The Pages address (or the domain) shows the site, and an old address such as `/visiting/` leads to the new page.
- [ ] Donations: the button opens the Razorpay form on the live site; for the own form, the test-mode rehearsal above has passed.
- [ ] `.env` is not in the repository (`git ls-files | grep .env` shows only `.env.example` files).
- [ ] The ledger folder is backed up.
