# The API: enquiry form and donations

A small PHP program (PHP 8.1 or newer). It has three jobs: take enquiries from the website (validate, keep a CSV record, e-mail the ashram), create and confirm donations through Razorpay (optional), and receive Razorpay's webhook. It has no database. Libraries: PHPMailer, the Razorpay PHP SDK, phpdotenv.

How to deploy and configure it: [docs/deployment.md](../docs/deployment.md) and [docs/configuration.md](../docs/configuration.md). Why donations work as they do: [docs/legacy-donation-workflow.md](../docs/legacy-donation-workflow.md).

## Run it locally

```bash
cd server
composer install
cp .env.example .env        # then set APP_ENV=local, MAIL_TRANSPORT=log, DONATION_PROVIDER=fake,
                            # CORS_ALLOWED_ORIGINS=http://localhost:8080 and CONTACT_TO=you@example.org
php bin/check.php
php -S localhost:8000 -t public public/index.php
```

In `website/.env` put `API_BASE_URL=http://localhost:8000`, run `npm run build` in `website/`, and serve the site (`node ../serve.mjs . 8080` from `website/`). Messages are written to `storage/mail/`, the ledgers to `storage/ledger/`.

## Tests

```bash
composer test
```

22 checks without any web server or network: settings, the CSV ledger, the enquiry flow (including spam and header-injection cases), CORS, the donation flow (orders, signature checks, webhooks, repeats, states) and the refusal of development settings in production. CI runs them on PHP 8.1, 8.3 and 8.4.

## Endpoints

All answer JSON. Errors look like `{"error":"validation_failed","errors":{"email":"…"}}`. Browsers need the website's address in `CORS_ALLOWED_ORIGINS`.

| Method and path | Purpose | Body or query | Answers |
|---|---|---|---|
| `GET /health` | Is it running | – | `200 {"status":"ok"}` |
| `POST /contact` | An enquiry | `name`, `email`, `message` (10 to 5000 characters), optional `phone`, `interest`, `subject`, `age`, `arrival` (`YYYY-MM-DD`), `channel` (`ashram` or `retreat`), `elapsed` (ms since the page opened), `website` (trap field, must be empty) | `201 {"status":"received"}`, `422` with reasons, `429` too many, `500 delivery_failed` only if neither the e-mail nor the ledger worked |
| `GET /donations/config` | What the donation form needs | – | Amounts, form fields, how to open Checkout. No secrets. `503` if donations are off |
| `POST /donations/orders` | Start a donation | `amount` (whole rupees), `donor{name,email,phone,address,city,state,pincode,pan}` | `201 {orderId, amount (paise), currency, receipt}`, `422`, `429`, `502 provider_unavailable` |
| `POST /donations/verify` | The browser reports a finished checkout | `orderId`, `paymentId`, `signature` | `200 {"status":"paid"}` or `400 unverified` |
| `POST /donations/cancel` | The donor closed the checkout | `orderId` | `200 {status}` |
| `GET /donations/status?order=…` | Where is this order | – | `200 {status}` (`created`, `pending`, `paid`, `failed`, `cancelled`) or `404` |
| `POST /webhooks/razorpay` | Razorpay reports a payment | Razorpay's body and `X-Razorpay-Signature` | `200`, or `400` if the signature is wrong |

## Layout

```
public/index.php            entry point (document root)
src/App.php                 routes, CORS, wiring of settings to services
src/Contact/                the enquiry flow
src/Donation/               the donation flow; PaymentProvider is what a provider must offer, Providers/ has Razorpay (and a fake one for development)
src/Mail/                   SmtpMailer (PHPMailer) and LogMailer (files, development only)
src/Support/                CsvLedger, RateLimiter, Clock
config/donation.php         non-secret donation settings and the donor form fields
bin/check.php               checks the settings
tests/run.php               the tests
```

To add another payment provider, write a class implementing `PaymentProvider`, return it from `App::paymentProvider()`, and add its own settings to `.env.example`. The donation flow does not change.
