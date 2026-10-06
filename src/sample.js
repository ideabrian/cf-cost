// Made-up account for /try/demo previews. Shapes match data() in index.js; numbers are illustrative only.
export function sample() {
  const day = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  const inc = (service, family, unit, used, included, cost = 0) => ({ service, family, unit, used, cost, included, pct: used / included });
  const invoices = [];
  for (let m = 0; m < 12; m++) {
    const d = new Date(); d.setUTCDate(25); d.setUTCMonth(d.getUTCMonth() - m - (new Date().getUTCDate() < 25 ? 1 : 0)); // last 25th on or before today, then back m months
    invoices.push({ date: d.toISOString().slice(0, 10), amount: m === 0 ? 7.85 : m === 4 ? 25 : 5, receipt: 'IN-SAMPLE' + (100 + m), status: 'paid' });
  }
  invoices.splice(3, 0, { date: day(-100), amount: 10.44, receipt: 'IN-SAMPLE099', status: 'paid' });
  return {
    periodStart: day(-11),
    plans: [{ name: 'Workers Paid', price: 5, freq: 'monthly' }, { name: 'R2 Paid', price: 0, freq: 'monthly' }],
    meters: [
      inc('Workers Standard Requests (first 10M are included)', 'Workers', 'Requests', 12.4e6, 10e6, 0.72),
      inc('Workers CPU ms (first 30M are included)', 'Workers', 'ms', 21.9e6, 30e6),
      inc('R2 Data Storage (first 10 GB-month are included)', 'R2', 'GB-month', 6.1, 10),
      inc('D1 - Rows Read (first 25B are included)', 'D1', 'Rows', 3.2e9, 25e9),
      inc('KV Read Operations (first 10M are included)', 'KV', 'Reads', 0.4e6, 10e6),
    ],
    buckets: [
      { bucket: 'photos', classA: 412e3, classB: 2.9e6, free: 1200, cost: 412e3 / 1e6 * 4.5 + 2.9e6 / 1e6 * 0.36, top: 'PutObject', topN: 398e3 },
      { bucket: 'backups', classA: 21e3, classB: 40e3, free: 300, cost: 21e3 / 1e6 * 4.5 + 40e3 / 1e6 * 0.36, top: 'ListObjects', topN: 20e3 },
    ],
    invoices,
    domains: [
      { name: 'example-shop.dev', expires: day(38), autoRenew: false, renewal: 12.18, days: 38 },
      { name: 'example-app.com', expires: day(140), autoRenew: true, renewal: 10.46, days: 140 },
      { name: 'example-ai.ai', expires: day(520), autoRenew: true, renewal: 80, days: 520 },
    ],
    at: new Date().toISOString(),
  };
}
