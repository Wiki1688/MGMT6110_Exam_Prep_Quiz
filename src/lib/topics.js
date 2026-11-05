// Canonical topic index (from SPEC.md). Order here = display order everywhere.
export const TOPICS = [
  { id: 'T01', short: 'From Predictive to Generative AI', title: 'From Predictive to Generative AI', week: 'Week 1', color: '#2563EB' },
  { id: 'T02', short: 'Reasoning LLMs', title: 'Reasoning LLMs — mechanisms of enhanced intelligence', week: 'Week 1/3–4', color: '#7C3AED' },
  { id: 'T03', short: 'PS1 — Building the Front End', title: 'PS1 — Building the Front End (Stitch → Claude Code → GitHub → Vercel)', week: 'Week 2 studio', color: '#0891B2' },
  { id: 'T04', short: 'PS2 — Connecting the Back End', title: 'PS2 — Connecting the Back End (LTA bus API, keys that never leak)', week: 'Week 3 studio', color: '#0D9488' },
  { id: 'T05', short: 'PS3 — Clarity + Disqus', title: 'PS3 — Tracking User Behaviour (Microsoft Clarity + Disqus)', week: 'Week 4 studio', color: '#65A30D' },
  { id: 'T06', short: 'PS4 — Usability Heuristics', title: 'PS4 — Ten Usability Heuristics & adversarial collaboration', week: 'Week 5 studio', color: '#CA8A04' },
  { id: 'T07', short: 'From Chatbots to Agents', title: 'From Chatbots to Agents', week: 'Week 5 lecture', color: '#EA580C' },
  { id: 'T08', short: 'An Agent That Works While You Do Not', title: 'An Agent That Works While You Do Not', week: 'Week 6', color: '#DC2626' },
  { id: 'T09', short: 'Building AI Agents I', title: 'Building AI Agents I — model, loop, reasoning', week: 'Week 7 lecture', color: '#DB2777' },
  { id: 'T10', short: 'The Map of Human-AI Collaboration', title: 'The Map of Human-AI Collaboration', week: 'Week 7', color: '#9333EA' },
  { id: 'T11', short: 'PS5 — Zapier automation', title: 'PS5 — Automating a task with Zapier', week: 'Week 7 studio', color: '#4F46E5' },
  { id: 'T12', short: 'Week 8 — Four Agents, Four Roles', title: 'Week 8 — Four Agents, Four Roles for People (memory, hands, clock, gate)', week: 'Week 8', color: '#0EA5E9' },
  { id: 'T13', short: 'Week 9 — Mapping the Territory', title: 'Week 9 — Building AI Agents III: Mapping the Territory (Q1–Q6, ladder, territory map, IMDA/MAS)', week: 'Week 9', color: '#16A34A' },
  { id: 'T14', short: 'PS6 — Earnings Watch + Co-Collaboration Model', title: "PS6 — Earnings Watch + Prof Roh's Co-Collaboration Model", week: 'Week 9', color: '#F59E0B' },
  { id: 'T15', short: 'Group showcases 1–6', title: 'Group showcases 1–6 as exam scenarios', week: 'Weeks 3–9', color: '#64748B' },
  { id: 'T17', short: 'Human-AI Co-Collaboration Model', title: 'Human-AI Co-Collaboration Model', week: 'Week 10', color: '#BE185D' },
  { id: 'T18', short: 'PS7 — The Same But Different', title: 'PS7 — The Same But Different: one job, different families of AI agents', week: 'Week 9–10', color: '#0F766E' },
  { id: 'T19', short: 'PS8 — Within the Policy (Muse)', title: "PS8 — Within the Policy: a business trip planned by Meta's Muse", week: 'Week 10 studio', color: '#B45309' },
  { id: 'T20', short: 'Week 10 — The harness', title: 'Week 10 — Building AI Agents IV: inside the harness', week: 'Week 10', color: '#475569' },
  { id: 'T16', short: 'Exam strategy', title: 'Exam strategy — how Prof Roh writes questions', week: '—', color: '#111827' },
];

export const TOPIC_ORDER = TOPICS.map((t) => t.id);

// Colours for new topics (T17, T18, T19, ...) that are not in the list above.
const EXTRA_COLORS = ['#0F766E', '#B45309', '#BE185D', '#1D4ED8', '#15803D', '#7E22CE'];

/** Merge topics found in content with the canonical list; canonical order first, new ids (T17+) appended in id order. */
export function mergeTopics(contentTopics = []) {
  const byId = new Map(TOPICS.map((t) => [t.id, { ...t }]));
  for (const t of contentTopics) {
    if (!t || !t.id) continue;
    const base = byId.get(t.id) || {};
    byId.set(t.id, { ...base, ...t, color: t.color || base.color || '' });
  }
  const known = TOPIC_ORDER.filter((id) => byId.has(id)).map((id) => byId.get(id));
  const extra = [...byId.values()].filter((t) => !TOPIC_ORDER.includes(t.id)).sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  extra.forEach((t, i) => { if (!t.color) t.color = EXTRA_COLORS[i % EXTRA_COLORS.length]; if (!t.week) t.week = ''; });
  return [...known, ...extra];
}

export function shortTitle(t) {
  if (!t) return '';
  if (t.short) return t.short;
  const title = t.title || t.id;
  return title.length <= 48 ? title : title.slice(0, 45) + '…';
}
