# Athlete passwordless auth + Clerk

## Product

Athletes sign in with **email OTP** (same idea as staff/organizer). Google (Clerk OAuth) remains an alternate path. Passwords are optional/legacy: the UI no longer collects them.

Legacy password APIs remain for recovery (`/login/reset`, `forgot-password` / `reset-password`), but:

- `POST /auth/athlete/login` with no `password_hash` → emails a **login OTP** (`otp_required`), not a password reset
- `POST /auth/athlete/forgot-password` for passwordless accounts → login OTP; password accounts still get a reset code

## Flows

| Step | New athlete | Existing athlete | Social-only (Clerk, no password) |
|------|-------------|------------------|-----------------------------------|
| Email | Profile form (name, DOB, gender) | Send OTP | Show Google / linked provider |
| Code | OTP (`register` purpose) | OTP (`login` purpose) | — |
| Session | After verify | After verify | After Clerk sync |

Endpoints:

- `POST /api/auth/athlete/request-otp`
- `POST /api/auth/athlete/verify-otp`
- `POST /api/auth/athlete/register` — omit `password` → create + OTP (`requiresOtp: true`)

## Clerk Dashboard checklist (keep passwordless)

Configure the **same** Clerk application used by Atleita athletes:

1. **User & authentication → Email / Password**  
   - **Disable** email+password sign-up and sign-in (Atleita owns OTP).  
   - Athletes must never see a Clerk password form.

2. **Social connections**  
   - Enable **Google** (match `VITE_CLERK_OAUTH_PROVIDERS`, default `google`).  
   - Apple/Facebook only if product-supported and wired in `clerkOAuthProviders.ts`.

3. **Paths** (must match `client/config/clerkUrls.ts`)  
   - Sign-in / Sign-up: `/login` (absolute URLs on the app origin).  
   - After sign-in / sign-up: `/sso-callback`.  
   - Do **not** use Clerk Account Portal as the primary athlete UI.

4. **Redirect allow-list**  
   - `https://www.atleita.com/sso-callback`  
   - `https://atleita.com/sso-callback`  
   - Preview / local: matching origins + `/sso-callback`  
   - Backend `azp` parties: `PUBLIC_APP_URL` + optional `CLERK_AUTHORIZED_PARTIES` (`server/clerkConfig.ts`).

5. **Keys**  
   - Production: `pk_live_` / `sk_live_` on Vercel (never `sk_test_` / `pk_test_` on atleita.com).  
   - `VITE_CLERK_JS_URL` / CDN override if custom Frontend API host mis-serves clerk-js (`client/config/clerkRuntime.ts`).

6. **Sessions**  
   - After OAuth, client calls `POST /api/auth/clerk/athlete` with the Clerk session token; Atleita issues its own JWT. Athletes then use Atleita session cookies/headers — not Clerk password.

## P0: Google CORS / `clerk.atleita.com` → Vercel

**Symptom:** Continuar con Google fails with CORS `Access-Control-Allow-Origin: *` on `https://clerk.atleita.com/v1/...`.

**Cause:** Production publishable key’s Frontend API host is `clerk.atleita.com`, but that hostname currently resolves via Vercel’s `*` ALIAS and serves the **Atleita SPA** (not Clerk). Browsers then block credentialed fetches.

**Not caused by** passwordless OTP code.

### Fix (Vercel DNS + Clerk Domains)

1. **Clerk Dashboard** (Production instance) → **Configure → Domains** (Frontend API / custom domain)  
   - Domain: `clerk.atleita.com`  
   - Copy the **CNAME target** Clerk shows (use the exact value from the UI).

2. **Vercel** → Domain `atleita.com` → **DNS**  
   - Today only `*` + apex ALIAS → Vercel (so `clerk.*` hits the app).  
   - **Add** record:  
     - Name: `clerk`  
     - Type: `CNAME`  
     - Value: *(paste Clerk’s target)*  
   - Do **not** point `clerk` at Vercel.

3. Wait for Clerk to show the domain **Verified** (DNS can take a few minutes).

4. **Verify** (must not be Vercel HTML):

```bash
curl -sI https://clerk.atleita.com/v1/environment | head -20
# Expect Clerk/API headers — NOT `server: Vercel` / `content-type: text/html`
```

5. Hard-refresh the event page and retry Google.

### Keep working while DNS propagates

Email OTP (**Continuar** with email) does not need `clerk.atleita.com`.

### Notes

- Athlete-hub project domains include `*.atleita.com` (vanity event hosts). A **specific** `clerk` CNAME overrides the `*` ALIAS for that name only.  
- Production keys embed FAPI host `clerk.atleita.com` — do not switch to `pk_test_` on `atleita.com`.  
- Local `.env` may still use a Clerk **dev** instance (`*.clerk.accounts.dev`); that is separate from production.

## Regression cases

- Unregistered email on event wizard → profile → code (not password).  
- Existing athlete with `password_hash IS NULL` → OTP (not dead password field).  
- Social-only → OAuth buttons, not OTP.  
- Clerk Google still completes registration resume via `returnTo`.  
- **Google from open registration wizard:** do **not** silent-resume an existing Clerk session into a Atleita JWT (that advances auth → next step and flashes the form before Google). Persist session, redirect, reopen via `RegistrationPaymentReturnHandler` (solo + group).  
- Abandoned passwordless register → check-email → `request-otp`.  
- Legacy login without password → `otp_required` + verify-otp.  
- API suite: `api/athleteAuth.integration.test.ts` (passwordless OTP describe).
