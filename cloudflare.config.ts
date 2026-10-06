import { bindings, defineConfig } from "cf/config";

// Deployed with `cf deploy`. wrangler.jsonc stays only for the Deploy-to-Cloudflare button; keep the two in sync.
// Custom domain (cfcost.com) is attached on the account, not here, so forks don't try to claim it.
export default defineConfig({
	worker: {
		name: "cf-cost",
		compatibilityDate: "2026-10-01",
		entrypoint: "src/index.js",
		env: {
			TEMPLATE: bindings.text("ledger"),
			// /try/render: 10 renders per minute per IP
			TRY_LIMIT: bindings.rateLimit({ namespace: "1001", simple: { limit: 10, period: 60 } }),
			// Feedback chat (src/chat.js). Bound by name so no IDs live in this public repo.
			CHAT: bindings.d1({ name: "cf-cost-chat" }),
			CF_BILLING_TOKEN: bindings.secret(),
			DASH_PASSWORD: bindings.secret(),
		},
	},
});
