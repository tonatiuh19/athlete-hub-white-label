# Atleita — Agent Guide

White-label sports event platform (passwordless). Architecture matches athlete-hub / optimum-credit / groundwork: Vite SPA + Express API on Vercel serverless.

## Critical rules

- **npm only** — never pnpm or yarn
- **Schema first**: check `database/schema.sql` before SQL; never assume columns
- **Never edit `database/schema.sql` directly** — migration in `database/migrations/` first, apply, then update `schema.sql`
- **API entry**: all routes/runtime logic in `api/index.ts`. Allowed runtime imports: `../server/**`, `../shared/**`, `./testHooks` only. Run `npm run check:api-inline`
- **Redux only for data**: no axios/fetch in components; `createAsyncThunk` in slices
- **i18n**: default **Spanish** (`es`); EN+ES catalogs; browser detect + stored preference + session/DB preference. Never hardcode UI copy — use `t('key')` in `app/i18n/locales/{es,en}.json`
- **Auth**: passwordless email OTP via Resend only (no Clerk in product)
- **Payments v1**: Stripe + manual SPEI rails only; Mercado Pago removed from product surface (historical `payments.provider='mercadopago'` rows kept)
- **Frontend folder**: `app/` (alias `@/*`), not `client/`
- **Design**: Atleita evergreen + citron — see `DESIGN.md` and `app/global.css` (`.pace-site`)
- **Mobile first (NO EXCEPTIONS)**: every UI change must work at **320–390px**; **no page-level horizontal scroll** — vertical scroll only. See `.cursor/rules/mobile.mdc`
- **Deploy**: `npm run deploy:prod` only
- **Tests**: ship regression tests with behavior changes; see `.cursor/rules/testing.mdc`

## Mobile / no horizontal scroll (mandatory)

Applies to **marketing, microsites, athlete portal, organizer console, and platform staff/admin**.

1. Page shells use `w-full max-w-full min-w-0 overflow-x-clip`
2. Wide tables/toolbars scroll **inside** `.table-scroll` / `overflow-x-auto` — never widen `body`/`#root`
3. Prefer `flex-col` → `md:flex-row`; avoid fixed `min-w-[Npx]` without a mobile fallback
4. Long strings: `break-words` / `truncate` + `min-w-0` on flex children
5. Avoid `100vw` / `w-screen` for full-bleed (scrollbar gutter causes sideways scroll) — use `width: 100%`
6. Before finishing any UI turn: mental check at ~375px; no new body overflow

## Structure

```
app/           # React SPA (pages, components, store, i18n)
api/index.ts   # Express monolith → Vercel serverless
server/        # API helpers (imported by api/index.ts)
shared/        # Isomorphic types/utils
database/      # schema.sql + migrations/ (TiDB / MySQL 8)
scripts/       # deploy-prod, check-api-inline, migrations helpers
tests/         # unit / smoke / integration harness
```

## White-label (Atleita-specific)

- Organizer microsites on `{subdomain}.` + host derived from `PUBLIC_APP_URL` / `VITE_PUBLIC_APP_URL` (same pattern as athlete-hub event vanity hosts)
- Site editor: theme kit + section toggles + legal pages
- Email templates: editable athlete-facing + broadcasts; OTP platform-controlled with optional org chrome + “Powered by Atleita”
- Always send via platform `RESEND_API_KEY` + `SMTP_FROM`

## Commands

- `npm run dev` — Vite :8080 + Express API :8081
- `npm test` / `npm run test:api` / `npm run check:api-inline`
- `npm run deploy:prod`
