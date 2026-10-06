# Manual payout accounts (Cuenta de Pago / SPEI)

## Overview

Organizers can choose **manual** as their preferred payout rail instead of Stripe Connect destination charges or Mercado Pago OAuth.

When the effective checkout rail is `manual`:

1. Athlete checkout still uses **Stripe PaymentIntents on the Atleita platform account** (no `transfer_data`, no `application_fee_amount` destination charge).
2. `resolveCheckoutConnectMode` returns `{ mode: "platform" }`.
3. Ops settle the organizer’s net registration revenue offline via **SPEI** to the verified default Cuenta de Pago CLABE.

`manualReady` requires:

- A row in `organizer_payout_accounts` with `status = verified` and `is_default = 1`
- Atleita checklist complete (terms + legal_name + billing_email), same gate as Stripe

Rail resolution (`shared/payoutRail.ts`) prefers the organizer’s `payout_rail` when ready, else falls back across stripe → mercadopago → manual.

## Data & security

- Full CLABE is stored encrypted (`clabe_enc` via `encryptSecret` / AES-GCM).
- List/status APIs return only `clabe_last4` (never the full CLABE).
- Admin SPEI reveal: `POST /api/admin/organizers/:id/payout-accounts/:id/reveal-clabe` (audited log; submitted or verified only).
- `clabe_hash` is SHA-256 of the normalized 18-digit CLABE for duplicate detection.
- After `submitted` / `verified`, the account is locked (`locked_at`). Rejected accounts unlock for edit.
- Organizers cannot create another draft while a verified default already exists.

## Ops flow

1. Organizer submits Cuenta de Pago (bank + tax + constancia + bank statement URLs).
2. Admin reviews in **People → organizer detail → Cuenta de Pago review**, or via API:  
   `POST /api/admin/organizers/:organizerId/payout-accounts/:id/verify|reject`
3. On verify, the account becomes default and `manualReady` can unlock paid events.
4. For SPEI, admin uses **Reveal CLABE** (UI clears after ~60s):  
   `POST /api/admin/organizers/:organizerId/payout-accounts/:id/reveal-clabe`  
   Each reveal is persisted in `organizer_payout_account_clabe_reveals` (admin_id, account, last4, timestamp).
5. Finance runs SPEI from Atleita’s operating account to the organizer CLABE on the agreed schedule.
6. To revoke a verified account: **Unverify** →  
   `POST .../unverify` (sets rejected, clears default; organizer can edit/resubmit).

## Related APIs

| Endpoint | Purpose |
|----------|---------|
| `GET/POST /api/organizer/payouts/accounts` | List / create draft |
| `PATCH /api/organizer/payouts/accounts/:id` | Update draft / rejected |
| `POST /api/organizer/payouts/accounts/:id/submit` | Lock + submit for review |
| `POST /api/organizer/payouts/accounts/:id/default` | Set verified account as default |
| `POST /api/organizer/payouts/rail` | Preferred rail includes `manual` |
| `GET /api/admin/organizers/:id/payout-accounts` | Admin list |
| `POST .../verify` / `.../reject` | Admin review |
| `POST .../reveal-clabe` | Admin SPEI CLABE (audited table) |
| `POST .../unverify` | Revoke verified account |

See also `docs/STRIPE_CONNECT_MX.md` for destination-charge behavior when the cards/bank rail is effective.
