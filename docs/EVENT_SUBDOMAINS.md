# Event vanity subdomains (`*.atleita.com`)

Event drafts claim a globally unique `events.subdomain` at create time. Athletes can open `https://{subdomain}.atleita.com`, which resolves to the **canonical** public path `https://atleita.com/events/{slug}`.

## Product rules

| Rule | Behavior |
|------|----------|
| Required | Must be set on create (wizard step 1 + admin create) |
| Unique | Global across all rows (soft-deleted labels stay reserved; unique index) |
| Immutable | PATCH rejects subdomain changes (`subdomain_immutable`) |
| Format | `[a-z0-9-]+`, length 3–63, hard deny-list (`www`, `api`, `staff`, `sandbox`, …) + `sim-*` / `www-*` |
| Canonical | Path `/events/{slug}` remains SEO / share canonical |
| Nice link | Subdomain host hard-redirects to apex `/events/{slug}` (any path except `/api`) |
| Visibility | Resolve only for `public` / `unlisted` published|completed |
| Sandbox | Not supported (no `*.sandbox…` hosts) |

## Ops: DNS + Vercel (prod)

1. In your DNS provider for `atleita.com`, add a **wildcard** record:
   - Type: `CNAME` (or ALIAS/ANAME if apex tooling requires it)
   - Name: `*`
   - Value: `cname.vercel-dns.com` (or the target Vercel shows for the project)
2. In Vercel → Project → Domains, add:
   - `atleita.com`
   - `www.atleita.com`
   - `*.atleita.com`
3. Wait for TLS. Vercel issues wildcard certificates for `*.atleita.com`.
4. Confirm apex + `www` still serve the main app; event labels must not collide with the reserved deny-list.

No app redeploy is required for DNS alone once this code is live.

Routing: Vercel already serves `index.html` for all hosts on the project. `EventSubdomainHostRedirect` detects `{subdomain}.atleita.com`, resolves via `GET /api/events/subdomain/:subdomain`, then **hard-redirects to the apex** `VITE_PUBLIC_APP_URL` + `/events/{slug}` so cookies, OG, and canonical stay on the main host.

## Existing events

Migration `database/migrations/20260825_215900_events_subdomain.sql`:

- Adds `events.subdomain`
- Backfills from slug (fallback `e{id}` for reserved/short/collisions)
- Adds unique index `uk_events_subdomain`

Ugly backfills stay forever unless you add a one-time admin rename tool later (product chose immutable).

## Local / dev

- Apex: `localhost` / `127.0.0.1` — normal app
- Optional vanity: `mi-carrera.localhost` (browser support varies); SPA parses `*.localhost` the same way

## API

- `GET /api/events/subdomain-available?subdomain=`
- `GET /api/events/subdomain/:subdomain` → `{ slug, canonical_path, … }` (published/completed only)
- `POST /api/organizer/events` / `POST /api/admin/events` require `subdomain`
- Organizer/admin PATCH rejects subdomain mutations
