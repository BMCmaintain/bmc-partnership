import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'tender-watch');
const config = JSON.parse(await fs.readFile(path.join(ROOT, 'config.json'), 'utf8'));
const now = new Date();
const cutoff = new Date(now.getTime() + (config.daysAhead || 120) * 86400000);

const clean = v => (v == null ? '' : String(v)).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const lower = v => clean(v).toLowerCase();
const arr = v => Array.isArray(v) ? v : v ? [v] : [];
const first = (...vals) => vals.find(v => v !== undefined && v !== null && String(v).trim() !== '') ?? '';

function walk(obj, out = []) {
  if (!obj || typeof obj !== 'object') return out;
  if (Array.isArray(obj)) { for (const x of obj) walk(x, out); return out; }
  out.push(obj);
  for (const v of Object.values(obj)) if (v && typeof v === 'object') walk(v, out);
  return out;
}

function normaliseRelease(release, source) {
  const tender = release.tender || release;
  const buyer = release.buyer || arr(release.parties).find(p => arr(p.roles).includes('buyer')) || {};
  const value = tender.value || release.value || {};
  const period = tender.tenderPeriod || tender.contractPeriod || release.tenderPeriod || {};
  const items = arr(tender.items || release.items);
  const classifications = [tender.mainProcurementCategory, ...items.map(i => i.classification?.description), ...items.flatMap(i => arr(i.additionalClassifications).map(c => c.description))].filter(Boolean);
  const docs = arr(tender.documents || release.documents);
  const url = first(
    tender.documents?.find?.(d => d.url)?.url,
    docs.find(d => d.url)?.url,
    release.uri,
    release.url,
    release.id && source.id === 'contracts-finder' ? `https://www.contractsfinder.service.gov.uk/Notice/${release.id}` : ''
  );
  return {
    id: clean(first(release.ocid, release.id, tender.id, `${source.id}-${Math.random()}`)),
    source: source.name,
    sourceId: source.id,
    title: clean(first(tender.title, release.title, tender.description)).slice(0, 350),
    description: clean(first(tender.description, release.description, items.map(i => i.description).join(' '))).slice(0, 5000),
    buyer: clean(first(buyer.name, release.buyer?.name, tender.procuringEntity?.name)),
    location: clean(items.map(i => first(i.deliveryAddresses?.[0]?.region, i.deliveryLocation?.description, i.deliveryAddress?.region)).filter(Boolean).join(', ')),
    classifications: classifications.map(clean).filter(Boolean),
    value: Number(value.amount || value.value || 0) || 0,
    currency: clean(value.currency || 'GBP'),
    published: clean(first(release.date, release.publishedDate, tender.datePublished)),
    deadline: clean(first(period.endDate, tender.tenderPeriod?.endDate, tender.deadline, release.deadline)),
    url: clean(url)
  };
}

function looksLikeNotice(o) {
  return !!(o && typeof o === 'object' && (o.tender || o.ocid || (o.title && (o.description || o.value || o.buyer))));
}

function scoreTender(t) {
  const hay = lower([t.title, t.description, t.buyer, t.location, ...(t.classifications || [])].join(' '));
  let score = 0;
  const reasons = [];
  const matched = [];
  for (const kw of config.includeKeywords || []) {
    if (hay.includes(kw.toLowerCase())) { score += 7; matched.push(kw); }
  }
  for (const kw of config.priorityKeywords || []) {
    if (hay.includes(kw.toLowerCase())) { score += 12; reasons.push(`Priority match: ${kw}`); }
  }
  for (const kw of config.excludeKeywords || []) {
    if (hay.includes(kw.toLowerCase())) { score -= 35; reasons.push(`Excluded/poor fit: ${kw}`); }
  }
  for (const kw of config.buyerBoostKeywords || []) {
    if (lower(t.buyer).includes(kw.toLowerCase())) score += 4;
  }
  if (t.value >= 25000) score += 5;
  if (t.value >= 100000) score += 5;
  if (t.deadline) {
    const d = new Date(t.deadline);
    if (!Number.isNaN(d.getTime()) && d >= now && d <= cutoff) score += 5;
    if (!Number.isNaN(d.getTime()) && d < now) score -= 100;
  }
  score = Math.max(0, Math.min(100, score));
  const stars = score >= 80 ? 5 : score >= 65 ? 4 : score >= 50 ? 3 : score >= 35 ? 2 : 1;
  return { ...t, score, stars, matchedKeywords: [...new Set(matched)].slice(0, 12), reasons: reasons.slice(0, 8) };
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { headers: { 'user-agent': 'BMC-Tender-Watch/1.0', 'accept': 'application/json,text/plain,*/*' }, ...options });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function collect(source) {
  if (!source.enabled) return { source, tenders: [], status: 'disabled' };
  let data;
  if (source.type === 'contracts-finder') {
    const from = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    const u = `${source.url}?publishedFrom=${encodeURIComponent(from)}`;
    data = await fetchJson(u);
  } else if (source.type === 'find-a-tender') {
    const from = new Date(now.getTime() - 7 * 86400000).toISOString();
    const u = `${source.url}?publishedFrom=${encodeURIComponent(from)}&limit=100`;
    data = await fetchJson(u);
  } else if (source.type === 'pcs') {
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    data = await fetchJson(`${source.url}?dateFrom=${mm}-${now.getUTCFullYear()}&noticeType=2&outputType=0`);
  } else if (source.type === 'generic-feed' && source.url) {
    data = await fetchJson(source.url);
  } else {
    return { source, tenders: [], status: 'needs configuration' };
  }

  const objects = walk(data).filter(looksLikeNotice);
  const unique = new Map();
  for (const o of objects) {
    const n = normaliseRelease(o, source);
    if (!n.title) continue;
    const key = `${source.id}|${n.id}|${n.title}`;
    if (!unique.has(key)) unique.set(key, n);
  }
  return { source, tenders: [...unique.values()], status: `ok (${unique.size} notices read)` };
}

const all = [];
const sourceStatus = [];
for (const source of config.sources || []) {
  try {
    const result = await collect(source);
    all.push(...result.tenders);
    sourceStatus.push({ id: source.id, name: source.name, status: result.status, checkedAt: now.toISOString() });
  } catch (err) {
    sourceStatus.push({ id: source.id, name: source.name, status: `error: ${err.message}`, checkedAt: now.toISOString() });
  }
}

const seen = new Map();
for (const t of all.map(scoreTender)) {
  const key = t.url || `${t.source}|${t.title}|${t.buyer}`;
  const previous = seen.get(key);
  if (!previous || t.score > previous.score) seen.set(key, t);
}

const tenders = [...seen.values()]
  .filter(t => t.score >= (config.minimumScore ?? 45))
  .filter(t => !config.minimumValue || !t.value || t.value >= config.minimumValue)
  .sort((a, b) => b.score - a.score || String(a.deadline).localeCompare(String(b.deadline)));

const output = { generatedAt: now.toISOString(), count: tenders.length, sourceStatus, tenders };
await fs.mkdir(path.join(ROOT, 'data'), { recursive: true });
await fs.writeFile(path.join(ROOT, 'data/tenders.json'), JSON.stringify(output, null, 2) + '\n');
console.log(`BMC Tender Watch: ${tenders.length} relevant opportunities retained from ${all.length} candidate notices.`);
