// SLB Coveo Atomic result adapter. Read-only; no search, pagination or apply actions.
const SLB_HOST = 'careers.slb.com';
const SLB_JOB_PATH = '/jobdescription.aspx';

export function isSlbListing(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === SLB_HOST &&
      u.pathname.toLowerCase() === '/job-listing';
  } catch { return false; }
}

export function normalizeCoveoResults(records, max = 200) {
  const jobs = [];
  const seen = new Set();
  const cap = Number.isInteger(max) && max >= 0 ? max : 200;
  for (const r of Array.isArray(records) ? records : []) {
    if (jobs.length >= cap) break;
    const title = typeof r?.title === 'string' ? r.title.trim().replace(/\s+/g, ' ') : '';
    if (title.length < 3) continue;
    let url;
    try { url = new URL(r?.clickUri); } catch { continue; }
    if (url.protocol !== 'https:' || url.hostname !== SLB_HOST ||
        url.pathname.toLowerCase() !== SLB_JOB_PATH) continue;
    if (seen.has(url.href)) continue;
    seen.add(url.href);
    jobs.push({ title, url: url.href });
  }
  return jobs;
}

// Only read already-present public Coveo results from open shadow roots.
// Playwright's locator pierces open Shadow DOM; evaluateAll reads result objects.
export async function readSlbCoveoResults(page, max = 200) {
  try {
    await page.locator('atomic-result').first().waitFor({
      state: 'attached', timeout: 8000,
    });
  } catch {
    return [];
  }
  const records = await page.locator('atomic-result').evaluateAll(elements =>
    elements.map(el => ({
      title: el.result?.title,
      clickUri: el.result?.clickUri,
    }))
  );
  return normalizeCoveoResults(records, max);
}
