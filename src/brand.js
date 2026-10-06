// CF Cost brand bits shared by every page. Unofficial: not affiliated with Cloudflare.
export const LOGO = `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#f38020"/><text x="16" y="23" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="700" font-size="20" fill="#fff">$</text></svg>`;
export const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#f38020"/><text x="16" y="23" text-anchor="middle" font-family="monospace" font-weight="700" font-size="20" fill="#fff">$</text></svg>`;
export const ICON_LINK = '<link rel="icon" href="/favicon.svg" type="image/svg+xml">';
export const FOOTER = `<p style="text-align:center;font:13px system-ui;opacity:.7;padding:8px 16px 24px;margin:0"><a href="https://cfcost.com" style="color:inherit;font-weight:600;text-decoration:none">CF Cost</a> · cfcost.com · not affiliated with Cloudflare</p>`;
// Add favicon + title prefix + footer to any full HTML page.
export const brand = h => h.replace('<title>Cloudflare Spend</title>', '<title>CF Cost · Cloudflare spend</title>' + ICON_LINK).replace(/<\/body>/, FOOTER + '</body>');
