export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = n => '$' + Number(n).toFixed(2);
export const cents = n => n > 0 && n < 0.005 ? '<$0.01' : money(n);
export const num = n => n >= 1e9 ? +(n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : (+n.toFixed(2)).toString();
export const short = s => s.replace(/\s*\(.*\)/, '');

// Everything a template needs, computed once.
export function summarize(d) {
  const overage = d.meters.reduce((s, m) => s + m.cost, 0);
  const base = d.plans.reduce((s, p) => s + (p.price || 0), 0);
  const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const year = d.invoices.filter(i => i.date >= yearAgo && i.amount != null);
  const yearTotal = year.reduce((s, i) => s + i.amount, 0);
  const byMonth = {};
  for (const i of year) byMonth[i.date.slice(0, 7)] = (byMonth[i.date.slice(0, 7)] || 0) + i.amount;
  const months = Object.keys(byMonth).sort().map(k => ({ month: k, amount: byMonth[k] }));
  const mMax = Math.max(1, ...months.map(m => m.amount));
  const hot = d.meters.filter(m => m.cost > 0 || (m.pct || 0) >= 0.7);
  const flag = m => m.cost > 0 ? 'bad' : (m.pct || 0) >= 0.7 ? 'warn' : '';
  const doms = d.domains || [];
  const renew12 = doms.filter(x => x.autoRenew && x.days <= 365).reduce((s, x) => s + (x.renewal || 0), 0);
  const renewYear = doms.filter(x => x.autoRenew).reduce((s, x) => s + (x.renewal || 0), 0);
  const soon = doms.filter(x => x.days <= 60);
  const bk = d.buckets || [];
  const r2A = bk.reduce((t, b) => t + b.classA, 0), r2B = bk.reduce((t, b) => t + b.classB, 0);
  return { ...d, r2A, r2B, renew12, renewYear, soon, overage, base, yearTotal, months, mMax, hot, flag };
}

// Shown in place of the domains panel when the token can't read the registrar.
export const DOMAINS_HINT = 'Add "Account → Registrar: Domains → Read" to your cf-cost token to see renewals here.';

// Shown in place of the R2 panel when the token can't read analytics.
export const R2_HINT = 'Add "Account → Account Analytics → Read" to your cf-cost token to see R2 operations per bucket.';
export const R2_NOTE = 'List price per bucket: Class A $4.50/M (writes, lists), Class B $0.36/M (reads). Free tier (1M A + 10M B/mo) applies account-wide, so your bill is lower. Deletes are free.';

// Pre-filled read-only token page (Billing, Analytics, Workers, D1, R2, Registrar).
export const TOKEN_URL = 'https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22billing%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22account_analytics%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22workers_scripts%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22d1%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22workers_r2%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22registrar_domains%22%2C%22type%22%3A%22read%22%7D%5D&name=cf-cost&accountId=*&zoneId=all';
