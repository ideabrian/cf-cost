export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = n => '$' + Number(n).toFixed(2);
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
  return { ...d, renew12, renewYear, soon, overage, base, yearTotal, months, mMax, hot, flag };
}

// Shown in place of the domains panel when the token can't read the registrar.
export const DOMAINS_HINT = 'Add "Account → Registrar: Domains → Read" to your cf-cost token to see renewals here.';
