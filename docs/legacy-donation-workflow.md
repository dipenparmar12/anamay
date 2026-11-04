# Donations on the old website, and how the new site takes over

This is the reference for replacing the donation page of anamayashram.org. It was written before any payment code, from what the old site and the payment service publish. Where something could only be seen from the Razorpay dashboard or WordPress admin, it says so instead of guessing.

## In short

- The old site takes donations with a **Razorpay Payment Button**, a no-code product of Razorpay, pasted into the donation page. **No WordPress donation plugin is active.** Payment, receipts and records all happen at Razorpay.
- The button is for **one-time gifts of any amount from ₹100**. It asks the donor for name, email, mobile, address, city, state, pincode and PAN.
- Nothing about donations is stored in WordPress, so there is **nothing to migrate out of WordPress**. The donation records live in the Razorpay dashboard and stay there.
- The new site can show the **same button on its own donation page** today, with no server and no credentials. A donation form of our own (our server makes the order, Razorpay Checkout takes the payment, our server confirms it) is built and tested but switched off until Razorpay test keys and a PHP host exist.

## How this was checked

| Question | Source | Result |
|---|---|---|
| Which pages take donations? | The saved copy of the old site (`offline-site/`) | `/donation/` and `/how-can-i-contribute/` embed the button. The privacy policy names Razorpay as the payment processor. |
| Which donation plugin runs? | The page source, and the REST API index of the live site | None. The pages `donation-confirmation`, `donation-failed`, `donation-history`, `donor-dashboard` and `donation-causes` show raw `[give_receipt]`, `[donation_history]` and `[give_form_grid]` text: they are leftovers of GiveWP, which is no longer active (the live REST API lists no `give` namespace). |
| How is the button configured? | The two public, read-only endpoints Razorpay's own script reads in every visitor's browser: `payment_buttons/<id>/button_preferences` and `payment_buttons/<id>/button_details` on `api.razorpay.com` | Table below. |
| Does it work on another website? | The button was embedded in a test page on `localhost`, and its overlay opened (no details were entered, no payment was made) | Yes. It renders and opens the payment form as an overlay on the page, so the donor does not leave the site. |
| What could not be seen? | The Razorpay dashboard and WordPress admin were not available | Listed under "Needs the ashram" below. |

## What the old donation page loads

```html
<form><script src="https://checkout.razorpay.com/v1/payment-button.js"
  data-payment_button_id="pl_JAo3R2PjQsqjx7" async></script></form>
```

The button id is public (it is in the page source). The script draws the button, and on a click opens Razorpay's hosted payment form (`razorpay.com/payment-button/<id>/view`) in an overlay. Razorpay's hosted form takes the payment and shows the result. The merchant is **Shree Anamay Nyas**, in **live mode**, currency **INR**.

## The button's configuration

| Setting | Value |
|---|---|
| Template | Donation |
| Button text, colour | "Contribute", Razorpay blue (brand colour `rgb(35,113,236)`), "Secured by Razorpay" shown |
| Item | "Donate an Amount of your Choice": the donor types the amount, **minimum ₹100, no maximum**, mandatory |
| Fields asked | Email\*, mobile\*, name\*, address\*, city\*, pincode\*, state\*, **PAN number**\* (all required) |
| Receipts | The setting is on at Razorpay (`enable_receipt`); what is sent, and when, is Razorpay's |
| 80G details | Switched off (`enable_80g_details`): the site must make no tax-exemption claim |
| After payment | **No success message and no redirect back to the website** are set. The donor stays on Razorpay's own success screen. The `/thank-you/` page of the old site is not connected to the button. |
| Limits | Unlimited payments, no expiry, status active |
| Recurring | **None.** The item has no plan: this is not a subscription |
| Protection | Razorpay's form uses reCAPTCHA (v3 with a v2 fallback) |

## Success, failed and pending payments on the old site

All three are handled inside Razorpay's hosted form and its dashboard. WordPress never sees a payment: there is no callback, no webhook handler and no order table on the old site. What a donor sees after a failed or pending payment is decided by Razorpay's form; the website has no say in it.

## Records to preserve

Every transaction, with the donor's details (including PAN and address), is in the **Razorpay dashboard** (Payments, and the Payment Button under Payment Pages). Keep that account as it is. If a local copy is wanted, export it from the dashboard.

## Needs the ashram

These can only be read in the Razorpay dashboard or WordPress admin:

1. Which payment methods are enabled (UPI, cards, net banking, wallets), and the settlement account.
2. Whether a webhook is already set up (Dashboard, Settings, Webhooks). An account-wide webhook also reports button payments.
3. Whether payment receipts are what the ashram wants donors to receive, and the wording to use about tax benefits (none is claimed on the site today).
4. For the own-form option only: the **API keys** (key id and secret, from Dashboard, Settings, API keys) in test mode first, then live mode.

## The options, and the recommendation

| | A. Link to the old page | B. The same button, embedded (**default**) | C. Our own form and server |
|---|---|---|---|
| Donor leaves the new site | Yes | No (overlay) | No (overlay) |
| Needs credentials or a server | No | **No** | Yes: API keys, a PHP host, a webhook |
| Same Razorpay account, receipts and records as today | Yes | **Yes** | Yes (records also in our ledger) |
| Same fields (including PAN) | Yes | **Yes** | Yes, but PAN and address pass through our server |
| Control over amounts, wording, states | None | Only Razorpay's dashboard | Full |
| Verified here | Link works | **Renders and opens on another origin** | **Tested against a stand-in provider only** |

**Recommendation.** Use **B** now: it removes the redirect to the old site and keeps every existing behaviour and record, with no new risk. Keep **A** selectable for a quick rollback. Build **C** behind a switch so it can be adopted later, after a test-mode rehearsal with real Razorpay test keys. C is the right long-term shape if the ashram wants preset amounts, its own wording and its own ledger, but it makes the ashram's server a handler of donors' PAN and address, which the button never did (see "Privacy" in [deployment](deployment.md)).

The choice is one setting, `mode` in [`content/donation.json`](../content/donation.json) (`legacy`, `button` or `native`), or the `DONATION_MODE` build variable.

## The own-form flow (option C)

1. The browser asks the server for the form's settings (`GET /donations/config`): amounts, fields, how to open Checkout.
2. The donor fills the form. The server validates it, makes an order at Razorpay with the **secret key** (`POST /donations/orders`), and writes a `created` row to the donations ledger.
3. The browser opens Razorpay Checkout for that order. Card or bank details go to Razorpay only.
4. The browser reports the result (`POST /donations/verify`), but is not believed: the server checks Razorpay's signature (`HMAC-SHA256` of `order_id|payment_id` with the secret key). Only then is the order `paid`.
5. Razorpay also calls the server's webhook (`POST /webhooks/razorpay`) with `payment.authorized`, `payment.captured`, `order.paid` or `payment.failed`. The webhook is checked with its own secret, repeated deliveries are ignored, and it settles the cases where the donor closed the page before step 4.

| State | Meaning | Set by | What the donor sees |
|---|---|---|---|
| `created` | Order made, payment not finished | Order creation | The checkout opens |
| `pending` | Authorised but not captured yet | Webhook `payment.authorized` | "Confirming your payment…", then the page asks the server until it knows |
| `paid` | Money captured, or the checkout signature is valid | Signature check or webhook | "Thank you for your contribution". **Terminal: a late failed attempt never undoes it** |
| `failed` | Razorpay reported a failed attempt | Webhook `payment.failed` | "The payment did not go through" with Razorpay's reason and "Try again" (the order stays usable) |
| `cancelled` | The donor closed the checkout | The browser (not authoritative) | "Payment window closed", with "Try again" |

Details that follow from this:

- Orders are in rupees, whole numbers, between `DONATION_MIN_AMOUNT` (100, as on the old button) and `DONATION_MAX_AMOUNT`. They are sent to Razorpay in paise.
- Name, email, mobile, address, city, state, pincode and PAN are checked on the server, sent to Razorpay as order notes (the old form kept them at Razorpay too), and **not written to our ledger**. The ledger keeps only the order id, status, amount, payment id and the donor's name and email.
- A webhook for a payment that did not start on this site (for example one made with the old button) is still recorded, marked "not created on this website".
- Live and test keys cannot be mixed up: production accepts only `rzp_live_` keys, every other environment only `rzp_test_` keys.
- Recurring gifts, refunds and 80G receipts are **not** part of the old button and are not built.
