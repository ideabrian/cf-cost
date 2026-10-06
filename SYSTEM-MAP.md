# cf-cost — Cloudflare spend command & control

Stack: one Cloudflare Worker (no framework, no DB). Live reads from CF billing API on every request.

Routes (all Basic auth, any username, password = DASH_PASSWORD):
- `/` — HTML: plans, overage this period, 12-mo invoiced, invoices by month, every usage meter vs included, invoice list
- `/api/data` — same data as JSON
- `/favicon.ico` — 204, no auth

CF API used: `/accounts/:id/billable-usage`, `/billing/history`, `/subscriptions`.

Secrets (Forge Vault, category `cloudflare`):
- `CF_BILLING_TOKEN` ← vault `<vault-key>` (user token cf-cost-control: Billing/Analytics/Workers/D1/R2 read)
- `DASH_PASSWORD` ← vault `<vault-key>`

Commands: `npx wrangler deploy`
URL: https://cf-cost.<subdomain>.workers.dev

Account: auto-detected from token unless CF_ACCOUNT_ID set. Templates: src/templates/{ledger,terminal,receipt}.js, pick via ?t= or TEMPLATE var.
Notes: invoice API returns no amount for invoices before 2025-06 (shown as —). No line items via API; large one-offs ≈ domain registrations.
Domains: /registrar/domains (needs Registrar Domains Read; panel shows hint if missing). Renewal price per TLD via POST /registrar/domain-check on a made-up name.
Not here yet: weekly alert cron, per-worker cost attribution.
