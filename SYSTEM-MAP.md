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

CF API used: `/accounts/:id/billable-usage`, `/billing/history`, `/subscriptions`, GraphQL `r2OperationsAdaptiveGroups` (R2 ops per bucket+action, billing period → today; needs Account Analytics Read; panel shows hint if missing).
R2 panel: Class A/B per bucket at list price ($4.50/M A, $0.36/M B; deletes free; free tier account-wide so per-bucket $ is list, not billed). Top action = top billable action. Totals run ~1 day ahead of billing meter.

Secrets (Forge Vault, category `cloudflare`):
- `CF_BILLING_TOKEN` ← vault `<vault-key>` (user token cf-cost-control: Billing/Analytics/Workers/D1/R2 read)
- `DASH_PASSWORD` ← vault `<vault-key>`

Commands: `npx wrangler deploy`
URL: https://cfcost.com (custom domain attached in CF dash/API, deliberately NOT in wrangler.jsonc so forks/Deploy-button users don't try to claim it; survives deploys) · https://cf-cost.<subdomain>.workers.dev

Account: auto-detected from token unless CF_ACCOUNT_ID set. Onboarding page: src/try.js. Templates: src/templates/{ledger,terminal,receipt}.js, pick via ?t= or TEMPLATE var.
Notes: invoice API returns no amount for invoices before 2025-06 (shown as —). No line items via API; large one-offs ≈ domain registrations.
Domains: /registrar/domains (needs Registrar Domains Read; panel shows hint if missing). Renewal price per TLD via POST /registrar/domain-check on a made-up name.
Not here yet: R2 storage GB per bucket, rate limit on /try/render, Deploy-to-CF button, weekly alert cron, per-worker cost attribution.
