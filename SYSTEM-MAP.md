# cf-cost — Cloudflare spend command & control

Stack: one Cloudflare Worker (no framework, no DB). Live reads from CF billing API on every request.

Public routes (no auth):
- `/` and `/try` — onboarding: pre-filled token link → paste token → pick look → dashboard. Token in sessionStorage only.
- `POST /try/render?t=` — header `X-CF-Token`; rate-limited 10/min/IP (binding TRY_LIMIT, approximate); renders dashboard with visitor's token. Not stored/logged; guest account lookup not cached.

- `/try/demo?t=` — template rendered with made-up data (src/sample.js), orange 'sample' banner; `&thumb=1` = no banner (landing thumbnails).

Owner routes (Basic auth, any username, password = DASH_PASSWORD):
- `/me` — HTML: plans, overage this period, 12-mo invoiced, invoices by month, every usage meter vs included, invoice list
- `/api/data` — same data as JSON
- `/favicon.ico` — 204, no auth
- `/card.png` — 1200×630 social card (og:image), no auth. Source: src/card.js, regen via `python3 scripts/make-card.py`

CF API used: `/accounts/:id/billable-usage`, `/billing/history`, `/subscriptions`, GraphQL `r2OperationsAdaptiveGroups` (R2 ops per bucket+action, billing period → today; needs Account Analytics Read; panel shows hint if missing).
R2 panel: Class A/B per bucket at list price ($4.50/M A, $0.36/M B; deletes free; free tier account-wide so per-bucket $ is list, not billed). Top action = top billable action. Totals run ~1 day ahead of billing meter.

Secrets (worker secrets; owner's source mapping is in local HANDOFF.md):
- `CF_BILLING_TOKEN`: read-only user token (Billing/Analytics/Workers/D1/R2/Registrar read)
- `DASH_PASSWORD`: owner dashboard password

Commands: `npm run deploy` (= `cf deploy`, Cloudflare CLI, reads `cloudflare.config.ts`) · `npm run dev` (= `cf dev`). Wrangler is only a devDependency (cf delegates builds to it). `wrangler.jsonc` kept ONLY for the Deploy-to-Cloudflare button; mirror binding changes there.
URL: https://cfcost.com (custom domain attached in CF dash/API, deliberately NOT in wrangler.jsonc so forks/Deploy-button users don't try to claim it; survives deploys; www.cfcost.com also attached (once, via wrangler --domain), 301 → apex)

Brand: src/brand.js (logo, /favicon.svg, title prefix "CF Cost", footer "not affiliated with Cloudflare" on every dashboard render).
Feedback chat: src/chat.js. Widget /chat.js (floating button on / and every render; skipped in iframes). Public: GET/POST /api/chat (vid = random id in localStorage; POST rate-limited via TRY_LIMIT). Admin (Basic auth): GET /api/admin/threads, GET /api/admin/thread?vid=, POST /api/admin/reply. D1 `cf-cost-chat` bound as CHAT by name; schema migrations/0001_chat.sql (messages, threads). Local inbox: `npm run inbox` → http://localhost:4747 (scripts/inbox.mjs; proxies admin API; DASH_PASSWORD from env or .dev.vars, value in Forge Vault CF_COST_DASH_PASSWORD).
Promo video: `promo/make-video.sh [voice]` → promo/out/exploded.mp4 (Kokoro TTS + Playwright recording of /try/demo?t=exploded + ffmpeg; out/ gitignored).
Account: auto-detected from token unless CF_ACCOUNT_ID set. Onboarding page: src/try.js. Templates: src/templates/{ledger,terminal,receipt,exploded}.js (exploded = default; SVG exploded-view, fixed-gutter layout so labels never collide; black READ-ONLY bar under cloud opens safety panel + copy-prompt, links to receipt), pick via ?t= or TEMPLATE var.
Notes: invoice API returns no amount for invoices before 2025-06 (shown as —). No line items via API; large one-offs ≈ domain registrations.
Domains: /registrar/domains (needs Registrar Domains Read; panel shows hint if missing). Renewal price per TLD via POST /registrar/domain-check on a made-up name.
Not here yet: R2 storage GB per bucket, rate limit on /try/render, Deploy-to-CF button, weekly alert cron, per-worker cost attribution.
