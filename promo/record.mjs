// Records /try/demo?t=exploded at 1280x720 for DUR+1.5 s, re-detonating once mid-way. Writes $OUT/raw.webm.
import { chromium } from 'playwright';
import { renameSync, writeFileSync } from 'node:fs';
const dur = +process.env.DUR, out = process.env.OUT;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, recordVideo: { dir: out, size: { width: 1280, height: 720 } } });
const t0 = Date.now();
const p = await ctx.newPage();
await p.goto('https://cfcost.com/try/demo?t=exploded&thumb=1');
// Frame the diagram: hide chrome, fit svg to viewport
await p.addStyleTag({ content: '.w>p,.w>button,nav,footer,body>div:last-child:not(.w),h1{display:none!important}.w{max-width:none;padding:8px 0}.fig{overflow:hidden}.fig svg{height:704px;width:auto!important;min-width:0;margin:0 auto}' });
await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
writeFileSync(`${out}/start.txt`, String((Date.now() - t0) / 1000));
await p.evaluate(() => document.getElementById('again').click());
await p.waitForTimeout(dur * 1000 * 0.55);
await p.evaluate(() => document.getElementById('again').click());
await p.waitForTimeout(dur * 1000 * 0.45 + 1500);
const v = p.video(); await ctx.close(); renameSync(await v.path(), `${out}/raw.webm`); await b.close();
