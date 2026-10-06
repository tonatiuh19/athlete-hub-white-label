# Stripe Connect MX — Atleita (white-label)

## Overview

Paid registrations use **Stripe Connect** (Mexico) with **destination charges** when the organizer is payout-ready.

Organizers are **recipients** (receive transfers), not card merchants. New accounts use:

- Accounts v2 **recipient** with `dashboard: "none"` (preferred), or
- Accounts v1 **controller** with `stripe_dashboard.type: "none"` + `transfers` only

Atleita owns the organizer UI (embedded Connect components). Organizers do **not** use the Express Dashboard.

When Connect is active (destination charges):

- Athlete pays inscription + platform service fee.
- Stripe **automatically** transfers `registration_amount_cents` to the organizer Connect balance.
- Atleita retains `service_fee_cents` as `application_fee_amount`.
- Organizer bank deposit (CLABE) follows the payout schedule.

## White-label UX

1. Copy frames verification as **“connect your bank”** / payments partner — not a Stripe product tour.
2. Embedded components: `account_onboarding`, `notification_banner`, `payouts`, `account_management`.
3. AccountSessions set `disable_stripe_user_authentication` **only** when Stripe allows it (`requirement_collection: application` / `dashboard=none`). Express accounts omit the flag (with retry-without-flag on failure).
4. No “Open Express Dashboard” CTA for `dashboard=none` accounts; **legacy Express** accounts keep Express login / hosted Account Link.
5. Payouts, balance, and account settings stay on `/staff/payouts` for white-label accounts.
6. Publish/paid-category gates accept **any ready rail** (Stripe, Mercado Pago, or manual SPEI); Stripe PaymentIntents still require Stripe destination readiness **or** platform mode when the effective rail is `manual` (see `docs/MANUAL_PAYOUT_ACCOUNTS.md`).

Stripe may still appear in legal ToS links inside the embedded form — that cannot be fully removed.

## Organizer flow

1. Overview → Atleita terms → Connect bank (embedded).
2. Webhook `account.updated` syncs status.
3. When `payoutReady`, paid events use destination charges.

## Event MSI (meses sin intereses)

Optional per-event flag `events.msi_enabled` (Event Edit, only when Stripe payouts are ready):

- Athlete Stripe checkout with one-shot total ≥ **$1,000 MXN** can choose contado / **3 / 6 / 9**.
- Contado keeps the **base** Atleita fee; MSI applies **Y2** uplift (`shared/msi.ts`) so Stripe’s MSI % on the full charge is funded inside `application_fee_amount`, plus **+2%** Atleita margin.
- `POST /api/events/:slug/register/checkout/msi-plan` updates the PaymentIntent amount, fee, and installment plan before confirm.
- Mercado Pago installments and group checkout MSI are out of scope for this release.

## APIs

| Endpoint | Purpose |
|----------|---------|
| `GET /api/organizer/payouts/status` | Status + checklists + publishable key |
| `POST /api/organizer/payouts/onboard` | Ensure account + AccountSession |
| `POST /api/organizer/payouts/account-session` | Fresh AccountSession `clientSecret` |
| `POST /api/organizer/payouts/sync` | Live sync from Stripe |
| `POST /api/organizer/payouts/login` | Legacy Express login only (blocked for dashboard=none) |

## Sync / recovery

Live Connect sync (`syncOrganizerConnectFromStripe`) **never deletes** `stripe_account_id`.
If Stripe retrieve fails (including `account_invalid` / revoked-looking errors), Atleita
**keeps the last known Connect status** and does not auto-mark `restricted` — test vs live
platform key mismatch looks identical to revoked access and was poisoning ready organizers
when a public event page synced with the wrong key. Successful retrieves still overwrite
status from Stripe capabilities. Explicit admin disable / deauthorize can still set
`restricted` while keeping the acct_* link.
