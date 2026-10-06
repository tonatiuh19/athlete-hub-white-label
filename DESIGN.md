# Visual Design Contract — Atleita

## Non-negotiable

- **Light only** — Atleita has **no dark mode**. Never add a theme toggle, `forcedTheme` other than `light`, or OS-preference dark styling for the product UI.
- Brand first: evergreen + citron (`#214B3A`, `#D7ED70`, ink `#18231F`) on crisp cool-white neutrals.
- No third-party sports-marketplace branding, orange/red legacy gradients, or foreign logo assets in product UI, emails, or legal defaults.
- Mobile first: no page-level horizontal scroll (320–390px).

## Direction

- Product mode: `persuade` — help event organizers understand the platform and start a white-label setup
- Audience: Race and endurance-event organizers
- Visual world: Race-day operations — capable, outdoorsy, confident, premium
- Palette: Evergreen with citron accents over cool white neutrals
- Type: Archivo sans; oversized, tightly tracked display headlines
- Composition: Organizer-first hero, capabilities, storefront preview, pricing, setup CTA
- Shape language: Crisp components, restrained radii, evergreen borders, citron accents
- Anti-references: Attendee ticket marketplaces, purple gradients, glassmorphism, decorative status badges, admin-dashboard chrome in marketing, **dark-mode product shells**, Triboo athlete-marketplace chrome (floating mobile tab bar, communities, public/staff blog, XP/achievements, theme toggle)


## Tokens

See `app/global.css` (`.pace-site` / `:root`) and `tailwind.config.ts`. Prefer `atleita-*` / semantic tokens (`primary`, `accent`, `background`).

## Guardrails

- Keep semantic token names; express brand through token values.
- Marketing heroes use light surfaces with evergreen/citron atmosphere — not full-bleed black panels.
- Emails may use an ink/citron branded shell; the SPA remains light-only.
- **No emoji glyphs in product UI** — use Lucide (`lucide-react`) or existing React icon components for arrows, checks, medals, flags, and CTAs. Do not put ↗ ↓ ↑ ← → ✓ ★ 🏅 🏁 (or similar) in JSX text or i18n copy.
