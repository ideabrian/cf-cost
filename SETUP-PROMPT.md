# Paste this into your AI agent (Claude Code, Codex, Cursor)

Also at https://cfcost.com/diy.txt. Source of truth: src/diy.js.

```
Set up "cf-cost", a password-protected Cloudflare spend dashboard, on MY Cloudflare account.
Source: https://github.com/ideabrian/cf-cost (open source, MIT). Nothing should be sent to cfcost.com.

1. Make sure the Cloudflare CLI is logged in (`npx cf auth whoami`; if not, `npx cf auth create default`) and note my account ID.
2. Open this pre-filled token page for me (read-only: Billing, Account Analytics, Workers Scripts, D1, R2, Registrar):
   https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22billing%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22account_analytics%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22workers_scripts%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22d1%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22workers_r2%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22registrar_domains%22%2C%22type%22%3A%22read%22%7D%5D&name=cf-cost&accountId=*&zoneId=all
   Tell me to click Create Token and paste it back. Never echo it.
3. Test it: GET https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/billing/history must return success.
4. Get the code: `npx degit ideabrian/cf-cost cf-cost && cd cf-cost`, then `npm install`.
5. Ask me which look I want: exploded (default; diagram of every charge), ledger (clean cards), terminal (green phosphor), receipt (paper till slip). Set TEMPLATE in cloudflare.config.ts.
6. Write .dev.vars (gitignored) with CF_BILLING_TOKEN=<token> and DASH_PASSWORD=<random 20 chars>, then `npx cf deploy --secrets-file .dev.vars`. Don't print either.
7. Open the URL + /me. Login is any username + that password; give me the password once, and tell me to store it in my password manager.
```
