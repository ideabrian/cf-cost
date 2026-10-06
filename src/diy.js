// DIY prompt: paste into your own AI agent to run CF Cost on your own account. Nothing passes through cfcost.com.
// Keep in sync with SETUP-PROMPT.md. Served at /diy.txt and in the DIY card on / and /try.
import { TOKEN_URL } from './lib.js';

export const DIY_PROMPT = `Set up "cf-cost", a password-protected Cloudflare spend dashboard, on MY Cloudflare account.
Source: https://github.com/ideabrian/cf-cost (open source, MIT). Nothing should be sent to cfcost.com.

1. Make sure the Cloudflare CLI is logged in (\`npx cf auth whoami\`; if not, \`npx cf auth create default\`) and note my account ID.
2. Open this pre-filled token page for me (read-only: Billing, Account Analytics, Workers Scripts, D1, R2, Registrar):
   ${TOKEN_URL}
   Tell me to click Create Token and paste it back. Never echo it.
3. Test it: GET https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/billing/history must return success.
4. Get the code: \`npx degit ideabrian/cf-cost cf-cost && cd cf-cost\`, then \`npm install\`.
5. Ask me which look I want: exploded (default; diagram of every charge), ledger (clean cards), terminal (green phosphor), receipt (paper till slip). Set TEMPLATE in cloudflare.config.ts.
6. Write .dev.vars (gitignored) with CF_BILLING_TOKEN=<token> and DASH_PASSWORD=<random 20 chars>, then \`npx cf deploy --secrets-file .dev.vars\`. Don't print either.
7. Open the URL + /me. Login is any username + that password; give me the password once, and tell me to store it in my password manager.`;
