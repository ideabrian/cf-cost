# Paste this into Claude Code

```
Set up "cf-cost", a password-protected Cloudflare spend dashboard, on MY Cloudflare account.

1. Make sure wrangler is logged in (`npx wrangler whoami`) and note my account ID.
2. Open this pre-filled token page for me (read-only: Billing, Account Analytics, Workers Scripts, D1, R2):
   https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22billing%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22account_analytics%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22workers_scripts%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22d1%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22workers_r2%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22registrar_domains%22%2C%22type%22%3A%22read%22%7D%5D&name=cf-cost&accountId=*&zoneId=all
   Tell me to click Create Token and paste it back. Never echo it.
3. Test it: GET https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/billing/history must return success.
4. Get the code: `npx degit ideabrian/cf-cost cf-cost && cd cf-cost`
5. Ask me which look I want: ledger (clean cards), terminal (green phosphor), receipt (paper till slip). Set vars.TEMPLATE.
6. `npx wrangler deploy`, then pipe the token into `wrangler secret put CF_BILLING_TOKEN` and a random 20-char password into `wrangler secret put DASH_PASSWORD`. Don't print either.
7. Open the URL. Login is any username + that password; give me the password once, and tell me to store it in my password manager.
```
