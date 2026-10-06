# cf-cost

**See what Cloudflare is actually charging you.** A password-protected dashboard on your own Cloudflare account: every usage meter against what's included, plans, invoices by month, domain renewal dates and prices, and a warning when anything passes 70%.

**Just want to see your bill?** https://cfcost.com (paste a read-only token, nothing stored).

Three looks, switch with `?t=`:

| `ledger` | `terminal` | `receipt` |
|---|---|---|
| Clean cards, light/dark | Green phosphor, ASCII meters | Paper till slip with stamp |

## Install (1 click)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ideabrian/cf-cost)

It asks for a token (link to a pre-filled read-only one included) and a password, then deploys to your account.

## Install (2 minutes, with Claude Code)

Copy the prompt in [SETUP-PROMPT.md](SETUP-PROMPT.md) into Claude Code. It opens a pre-filled, read-only token page, deploys the worker, and gives you the password.

## Install by hand

1. Create a token from this pre-filled link (read-only Billing, Analytics, Workers, D1, R2):
   https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22billing%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22account_analytics%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22workers_scripts%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22d1%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22workers_r2%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22registrar_domains%22%2C%22type%22%3A%22read%22%7D%5D&name=cf-cost&accountId=*&zoneId=all
2. `npx degit ideabrian/cf-cost cf-cost && cd cf-cost`
3. `npx wrangler deploy`
4. `npx wrangler secret put CF_BILLING_TOKEN` (paste token) and `npx wrangler secret put DASH_PASSWORD`
5. Domains panel needs Registrar: Domains → Read (the link above includes it; older tokens: edit and add it).
6. Open `https://cf-cost.<you>.workers.dev/me`. Any username, your password. (`/` is the public paste-a-token page.)

Options (`wrangler.jsonc` vars): `TEMPLATE` = `ledger` | `terminal` | `receipt`. `CF_ACCOUNT_ID` if your token sees more than one account.

## What it can't see

Cloudflare's billing API has no invoice line items, so one-off charges (usually domain registrations) show as totals only. Invoices before mid-2025 come back without amounts.

`/api/data` returns everything as JSON.

MIT license.
