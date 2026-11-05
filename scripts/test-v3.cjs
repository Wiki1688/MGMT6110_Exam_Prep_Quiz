// Playwright checks for the quiz app v3 (served by vite preview on PORT).
// Run: npx vite preview --port 4311 --strictPort &  then  PORT=4311 timeout 300 node scripts/test-v3.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const PORT = process.env.PORT || 4311;
const BASE = `http://localhost:${PORT}/`;
const SHOTS = process.env.SHOTS || '/home/claude/mgmt6110/out/screens/';
const NS = 'mgmt6110quiz3:';
const BANK = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/content/questions.json'), 'utf8'));
const QS = BANK.questions.map((q, i) => ({ ...q, priority: [1, 2].includes(Number(q.priority)) ? Number(q.priority) : 3, _i: i }));
const byId = new Map(QS.map((q) => [q.id, q]));
const prioOrder = [...QS].sort((a, b) => a.priority - b.priority || a._i - b._i).map((q) => q.id);
const quizKey = (q) => { const m = /^OQ(\d+)-(\d+)$/.exec(q.id); return m ? [Number(m[1]), Number(m[2])] : null; };
const q40 = QS.filter((q) => q.priority === 1 && q.type === 'mcq' && quizKey(q)).sort((a, b) => quizKey(a)[0] - quizKey(b)[0] || quizKey(a)[1] - quizKey(b)[1]).map((q) => q.id);
const shortsPrio = prioOrder.filter((id) => byId.get(id).type === 'short');
const cleanWhy = (w) => String(w || '').replace(/^\s*[✓✗✔✘×]\s*/, '').replace(/^\s*(right|wrong|correct|incorrect)\s*[.:\-–—]\s*/i, '').replace(/^['‘"“](.*)['’"”]$/s, '$1').trim();

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); };
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const progress = (page) => page.evaluate((ns) => {
  const p = JSON.parse(localStorage.getItem(ns + 'profiles'));
  return JSON.parse(localStorage.getItem(ns + 'progress:' + p.currentId) || '{}');
}, NS);
const savedSession = (page) => page.evaluate((ns) => {
  const p = JSON.parse(localStorage.getItem(ns + 'profiles'));
  return JSON.parse(localStorage.getItem(ns + 'session:' + p.currentId) || 'null');
}, NS);

async function createProfile(page, name) {
  await page.goto(BASE);
  await page.waitForSelector('#pname', { timeout: 15000 });
  await page.fill('#pname', name);
  await page.click('form.sheet button[type=submit]');
  await page.waitForSelector('.modes');
}
async function skipNext(page) {
  const before = await page.getAttribute('.session', 'data-index');
  await page.click('[data-testid=next]');
  if (await page.$('.interstitial')) await page.click('.interstitial button');
  await page.waitForFunction((b) => document.querySelector('.session')?.getAttribute('data-index') !== b, before);
}
async function walkSession(page) {
  const out = [];
  const total = Number((await page.textContent('.session-top .small')).split('/')[1]);
  for (let i = 0; i < total; i++) {
    out.push({ id: await page.getAttribute('.session', 'data-qid'), badge: (await page.textContent('[data-testid=pbadge]')).trim(), cls: await page.getAttribute('[data-testid=pbadge]', 'class') });
    if (i < total - 1) await skipNext(page);
  }
  return out;
}
async function goHome(page) {
  await page.goto(BASE + '#/');
  await page.waitForSelector('.modes');
}
async function quitToHome(page) {
  // a session with no answers finishes without a confirm; with answers, accept the confirm
  await page.click('.session-top button:has-text("Finish")');
  await page.waitForSelector('.score-hero, .modes');
  await goHome(page);
}

(async () => {
  const browser = await chromium.launch();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'q3-'));
  try {
    // ===== 1. Cover screen 385×860: fresh namespace =====
    const ctx = await browser.newContext({ viewport: { width: 385, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('dialog', (d) => d.accept().catch(() => {}));
    // seed OLD v2 data (localStorage + the old IndexedDB mirror) on the same origin before the app ever runs
    await page.goto(BASE + 'manifest.webmanifest');
    await page.evaluate(async () => {
      localStorage.setItem('mgmt6110quiz:profiles', JSON.stringify({ profiles: [{ id: 'old1', name: 'Old Wiki', emoji: '🦊' }], currentId: 'old1' }));
      localStorage.setItem('mgmt6110quiz:progress:old1', JSON.stringify({ answers: { Q001: { attempts: 3, correct: 3, last: 'correct', lastAt: 1 } }, flags: { Q002: true } }));
      localStorage.setItem('mgmt6110quiz:settings', JSON.stringify({ shuffleQ: true }));
      await new Promise((res) => { const r = indexedDB.open('mgmt6110-quiz-backup', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); tx.objectStore('kv').put('{"profiles":[{"id":"old1"}],"currentId":"old1"}', 'mgmt6110quiz:profiles'); tx.oncomplete = () => { r.result.close(); res(); }; }; r.onerror = () => res(); });
    });
    await page.goto(BASE);
    await page.waitForSelector('#pname', { timeout: 15000 });
    check('fresh namespace: old v2 profile is ignored (profile sheet asks "Who is studying?")', (await page.textContent('form.sheet h2')).includes('Who is studying'));
    await page.waitForTimeout(400);
    const ls = await page.evaluate(() => Object.keys(localStorage));
    check('fresh namespace: old mgmt6110quiz: keys deleted once', !ls.some((k) => k.startsWith('mgmt6110quiz:')) && ls.includes('mgmt6110quiz3:oldCleared'), ls.join(','));
    const dbs = await page.evaluate(async () => (indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : ['n/a']));
    check('fresh namespace: old IndexedDB mirror deleted', !dbs.includes('mgmt6110-quiz-backup'), dbs.join(','));
    await page.fill('#pname', 'Tester');
    await page.click('form.sheet button[type=submit]');
    await page.waitForSelector('.modes');
    check('new keys use the mgmt6110quiz3: prefix', (await page.evaluate(() => Object.keys(localStorage))).filter((k) => k.startsWith('mgmt6110quiz')).every((k) => k.startsWith('mgmt6110quiz3:')));
    const cd = await page.textContent('[data-testid=countdown]');
    check('countdown "Final exam · Thu 12 Nov 2026 · 1 pm" + eLearn note', cd.includes('Final exam · Thu 12 Nov 2026 · 1 pm') && /check the date and venue on eLearn/i.test(cd), cd);
    const modes = await page.$$eval('.mode .t', (els) => els.map((e) => e.textContent.trim()));
    check('home modes (40 quiz, Part B, Mock final, Core, Topic, Review wrong, Review flagged)', ["Prof Roh's 40 quiz questions", 'Part B practice (short questions)', 'Mock final', 'Exam core set', 'Topic practice', 'Review wrong', 'Review flagged'].every((m) => modes.some((x) => x.startsWith(m))) && !modes.some((m) => /Quick 10/.test(m)), modes.join(' | '));
    check('mock final labelled "Part A 10 × 1 point · Part B 5 × 4 points"', (await page.textContent('[data-testid=mode-mock]')).includes('Part A 10 × 1 point · Part B 5 × 4 points'));
    check('cover: no horizontal scroll (home)', await noHScroll(page));
    await page.screenshot({ path: SHOTS + 'v3-quiz-cover-home.png' });

    // ===== 2. Priority order + badges (Topic practice, no shuffle by default) =====
    await page.click('.mode:has-text("Topic practice")');
    await page.waitForSelector('.qcard');
    const walked = await walkSession(page);
    const ids = walked.map((w) => w.id);
    const prios = ids.map((id) => byId.get(id).priority);
    check('session order = priority then file order', JSON.stringify(ids) === JSON.stringify(prioOrder), ids.join(','));
    check('priorities never go down (1 → 2 → 3)', prios.every((p, i) => i === 0 || p >= prios[i - 1]), prios.join(''));
    const badgeOf = (id) => walked.find((w) => w.id === id);
    const off = QS.find((q) => q.priority === 1 && quizKey(q));
    const [qz, qn] = quizKey(off);
    check('badge "Prof Roh · Quiz n · Qm" (gold) on an official quiz question', badgeOf(off.id).badge.includes(`Prof Roh · Quiz ${qz} · Q${qn}`) && badgeOf(off.id).cls.includes('gold'), badgeOf(off.id).badge);
    const pb = QS.find((q) => q.priority === 1 && q.type === 'short');
    check('badge "Prof Roh · Part B practice" (gold)', badgeOf(pb.id).badge.includes('Prof Roh · Part B practice') && badgeOf(pb.id).cls.includes('gold'), badgeOf(pb.id).badge);
    const cp = QS.find((q) => q.priority === 2);
    if (cp) check('badge "Prof Roh · Studio checkpoint" (silver)', badgeOf(cp.id).badge.includes('Prof Roh · Studio checkpoint') && badgeOf(cp.id).cls.includes('silver'), badgeOf(cp.id).badge);
    const lk = QS.find((q) => q.priority === 3);
    check('badge "Likely" on a priority-3 question', badgeOf(lk.id).badge === 'Likely' && badgeOf(lk.id).cls.includes('likely'), badgeOf(lk.id).badge);
    await quitToHome(page);

    // ===== 3. Prof Roh's 40 quiz questions: quiz order, why each option =====
    await page.click('[data-testid=mode-quiz40]');
    await page.waitForSelector('.qcard');
    const w40 = await walkSession(page);
    check(`40-quiz mode in quiz order Q1.1 → Q4.10 (${q40.length} in this bank)`, JSON.stringify(w40.map((w) => w.id)) === JSON.stringify(q40), w40.map((w) => w.id).join(','));
    await quitToHome(page);
    // option shuffle on: why rows must follow the shuffled letters
    await page.click('details.card summary');
    await page.click('label.toggle:has-text("Randomise option order")');
    await page.click('[data-testid=mode-quiz40]');
    await page.waitForSelector('.qcard');
    let mapOk = true, detail = '';
    for (let i = 0; i < Math.min(3, q40.length); i++) {
      const qid = await page.getAttribute('.session', 'data-qid');
      const q = byId.get(qid);
      await page.click('#opt-1');
      await page.waitForSelector('[data-testid=why-each]');
      const info = await page.evaluate(() => {
        const opts = [...document.querySelectorAll('.options .opt')];
        const correctShown = opts.findIndex((o) => o.classList.contains('correct'));
        const rows = [...document.querySelectorAll('.we-row')].map((r) => ({ k: r.querySelector('.we-k').textContent, right: r.dataset.right === '1', txt: r.querySelector('.we-txt').firstChild.textContent }));
        const optTexts = opts.map((o) => o.querySelector('.txt').textContent);
        return { correctShown, rows, optTexts };
      });
      const rightRows = info.rows.filter((r) => r.right);
      const letter = 'ABCD'[info.correctShown];
      // each row's text must be the why of the option shown under that letter
      const rowsMatch = info.rows.every((r, s) => r.txt === cleanWhy(q.why[q.options.indexOf(info.optTexts[s])]));
      const ok = info.rows.length === 4 && rightRows.length === 1 && rightRows[0].k === letter && rowsMatch;
      if (!ok) { mapOk = false; detail += `${qid}: ${JSON.stringify(info).slice(0, 300)} `; }
      if (i === 0) {
        check('why each option shows A–D with ✓/✗, plus trap, tip and source', info.rows.length === 4 && await page.isVisible('.ap-row.trap') && (await page.textContent('.answer-panel')).includes('Tip:') && await page.isVisible('.ap-row.source'));
        await page.screenshot({ path: SHOTS + 'v3-quiz-cover-why.png', fullPage: true });
      }
      await skipNext(page);
    }
    check('why rows map to the shuffled option letters', mapOk, detail);
    await quitToHome(page);
    await page.click('details.card summary');
    await page.click('label.toggle:has-text("Randomise option order")');

    // ===== 4. Four-part short: reveal per part, self-mark 3/4, survives reload =====
    await page.click('[data-testid=mode-short]');
    await page.waitForSelector('[data-testid=parts]');
    const sw = [];
    const totalShort = Number((await page.textContent('.session-top .small')).split('/')[1]);
    check('Part B practice has ALL short questions', totalShort === shortsPrio.length, `${totalShort} of ${shortsPrio.length}`);
    const firstShort = await page.getAttribute('.session', 'data-qid');
    check("Part B practice starts with Prof Roh's Part B (priority first)", firstShort === shortsPrio[0] && byId.get(firstShort).priority === 1, firstShort);
    const caseQ = byId.get(firstShort);
    if (/\n\|/.test(caseQ.stem)) check('case renders its pipe table as a real table', (await page.$$('.case-table tbody tr')).length >= 2);
    check('four parts with step chips Define / Explain / Apply / Check', JSON.stringify(await page.$$eval('.part .step-chip', (e) => e.map((x) => x.textContent))) === JSON.stringify(['Define', 'Explain', 'Apply', 'Check']));
    check('one textarea per part', (await page.$$('textarea.part-text')).length === 4);
    await page.fill('textarea.part-text >> nth=0', 'A habit of looking for cases that agree with what we believe.');
    await page.click('[data-testid=reveal-0]');
    check('"Reveal (a)" shows only the (a) model answer', await page.isVisible('[data-testid=model-0]') && !(await page.$('[data-testid=model-1]')));
    await page.click('[data-testid=reveal-all]');
    check('"Reveal all" shows all four model answers', (await page.$$('.part-model')).length === 4);
    check('"What earns each point" and "Where points are lost" shown', (await page.textContent('[data-testid=examiner]')).includes('What earns each point') && (await page.textContent('[data-testid=examiner]')).includes('Where points are lost'));
    for (const [i, v] of [[0, 1], [1, 1], [2, 1], [3, 0]]) await page.click(`[data-testid=mark-${i}-${v}]`);
    await page.waitForSelector('[data-testid=verdict]');
    check('verdict shows 3/4 points', (await page.textContent('[data-testid=verdict]')).includes('3/4'));
    let prog = await progress(page);
    const rec = prog.answers[firstShort] || {};
    check('3/4 recorded in progress (lastScore 3, lastOf 4, partly, 0.75 credit)', rec.lastScore === 3 && rec.lastOf === 4 && rec.last === 'partly' && rec.correct === 0.75, JSON.stringify(rec));
    check('cover: no horizontal scroll (four-part short with table)', await noHScroll(page));
    await page.screenshot({ path: SHOTS + 'v3-quiz-cover-short.png', fullPage: true });
    await page.reload();
    await page.waitForSelector('[data-testid=parts]', { timeout: 15000 });
    check('reload: same short question, 3/4 verdict and marks kept', (await page.getAttribute('.session', 'data-qid')) === firstShort && (await page.textContent('[data-testid=verdict]')).includes('3/4') && (await page.$$('.pm-mark .on')).length === 4);
    prog = await progress(page);
    check('reload: progress still has the 3/4 mark', prog.answers[firstShort]?.lastScore === 3);
    await quitToHome(page);
    const homeAns = Number((await page.textContent('[data-stat=answered]')).split('/')[0]);
    check('home counts the short answer', homeAns >= 1, String(homeAns));

    // ===== 5. Mock final composition =====
    await page.click('[data-testid=mode-mock]');
    await page.waitForSelector('.qcard');
    const ms = await savedSession(page);
    const types = ms.qids.map((id) => byId.get(id).type);
    const nM = QS.filter((q) => q.type === 'mcq').length, nS = QS.filter((q) => q.type === 'short').length;
    const wantM = Math.min(10, nM), wantS = Math.min(5, nS);
    const mcqIds = ms.qids.filter((id) => byId.get(id).type === 'mcq');
    const shortIds = ms.qids.filter((id) => byId.get(id).type === 'short');
    const firstShortAt = types.indexOf('short');
    check(`mock final = ${wantM} MCQ + ${wantS} short (Part A first, then Part B)`, mcqIds.length === wantM && shortIds.length === wantS && types.slice(0, wantM).every((t) => t === 'mcq') && firstShortAt === wantM, `${mcqIds.length} mcq + ${shortIds.length} short; full bank gives 10 + 5`);
    const offM = mcqIds.filter((id) => byId.get(id).priority === 1).length;
    check('mock final has ≥4 official MCQs and ≥1 official Part B', offM >= Math.min(4, QS.filter((q) => q.type === 'mcq' && q.priority === 1).length) && shortIds.some((id) => byId.get(id).priority === 1), `${offM} official MCQs`);
    check('mock final has a 2-hour timer and "Part A · 1 point" chip', (await page.textContent('.timer')).includes('120:00') || (await page.textContent('.timer')).includes('119:'));
    check('mock chip "Part A · 1 point"', (await page.textContent('.qhead')).includes('Part A · 1 point'));
    await quitToHome(page);
    check('no page errors (cover)', errors.length === 0, errors.join(' | '));

    // ===== 6. Import: old format kindly rejected, format 3 accepted =====
    const oldFile = path.join(tmp, 'old-v2.json');
    fs.writeFileSync(oldFile, JSON.stringify({ app: 'MGMT6110 Exam Prep Quiz', format: 2, profile: { name: 'Wiki', emoji: '🦊' }, progress: { answers: { Q001: { attempts: 1, correct: 1, last: 'correct', lastAt: 1 } } } }));
    const newFile = path.join(tmp, 'new-v3.json');
    fs.writeFileSync(newFile, JSON.stringify({ app: 'MGMT6110 Exam Prep Quiz', format: 3, bank: 'v3', profile: { name: 'Friend', emoji: '🐼' }, progress: { answers: { [q40[0]]: { attempts: 1, correct: 1, last: 'correct', lastAt: Date.now() } }, flags: {} } }));
    await page.goto(BASE + '#/profiles');
    await page.waitForSelector('[data-testid=backup-card]');
    await page.setInputFiles('[data-testid=import-input]', oldFile);
    await page.waitForSelector('[data-testid=import-msg-inline]');
    const msg = await page.textContent('[data-testid=import-msg-inline]');
    check('old-format (v2) import rejected kindly: "This file is from the old question bank, which has been replaced"', msg.includes('This file is from the old question bank, which has been replaced') && !(await page.$('[data-testid=import-choice]')), msg);
    await page.screenshot({ path: SHOTS + 'v3-quiz-cover-import-old.png' });
    await page.setInputFiles('[data-testid=import-input]', newFile);
    await page.waitForSelector('[data-testid=import-choice]');
    check('format-3 file accepted (merge / new / replace offered)', (await page.textContent('[data-testid=import-choice]')).includes('file format 3'));
    await page.click('[data-testid=import-merge]');
    prog = await progress(page);
    check('format-3 merge keeps the 3/4 mark and adds the imported answer', prog.answers[firstShort]?.lastScore === 3 && !!prog.answers[q40[0]]);

    // ===== 7. Print: short only (4-part tables, hidden-answer mode), 40 quiz questions =====
    await page.goto(BASE + '#/print');
    await page.waitForSelector('.print-sheet');
    const pTypes = await page.$$eval('.print-sheet .pq', (els) => els.map((e) => [e.dataset.qid, e.dataset.type]));
    check('print opens on "Short questions only", all short, in priority order', pTypes.length === shortsPrio.length && pTypes.every((t) => t[1] === 'short') && JSON.stringify(pTypes.map((t) => t[0])) === JSON.stringify(shortsPrio), pTypes.map((t) => t[0]).join(','));
    const nParts = QS.filter((q) => q.type === 'short' && Array.isArray(q.parts)).length;
    const tables = await page.$$eval('[data-testid=pparts]', (els) => els.map((t) => t.querySelectorAll('tbody tr').length));
    check('print: four-part tables (task | model answer) for every four-part short', tables.length === nParts && tables.every((n) => n === 4), tables.join(','));
    const firstModel = byId.get(shortsPrio[0]).parts?.[0]?.model || '';
    check('print: model answers shown by default', (await page.textContent('.print-sheet')).includes(firstModel.slice(0, 40)));
    await page.click('[data-testid=hide-answers]');
    check('print hidden-answer mode: no model answers, blank lines instead', !(await page.textContent('.print-sheet')).includes(firstModel.slice(0, 40)) && (await page.$$('.print-sheet .lines')).length === nParts * 4 && (await page.$$('.print-sheet .pans')).length === 0);
    const avoid = await page.evaluate(() => getComputedStyle(document.querySelector('.pparts tr')).breakInside);
    check('print CSS: table rows avoid page breaks', avoid === 'avoid', avoid);
    await page.screenshot({ path: SHOTS + 'v3-quiz-cover-print-short.png', fullPage: false });
    await page.click('[data-testid=show-answers]');
    await page.click('[data-set=quiz40]');
    const p40 = await page.$$eval('.print-sheet .pq', (els) => els.map((e) => e.dataset.qid));
    check("print: Prof Roh's 40 quiz questions in quiz order with why per option", JSON.stringify(p40) === JSON.stringify(q40) && (await page.$$('.print-sheet .pwhy')).length === q40.length, p40.join(','));
    check('cover: no horizontal scroll (print)', await noHScroll(page));
    // tips page
    await page.goto(BASE + '#/tips');
    await page.waitForSelector('[data-testid=rubric]');
    const tips = await page.textContent('.tips-page');
    check('tips page: Part A/B format, Define→Explain→Apply→Check rubric, temperature example, lose-points table', /Part A: multiple choice/.test(tips) && /Define/.test(tips) && /Check/.test(tips) && /Define temperature/.test(tips) && (await page.$$('[data-testid=lose-points] tbody tr')).length === 6 && (await page.$$('.tip-card')).length >= 8);
    check('cover: no horizontal scroll (tips)', await noHScroll(page));
    await page.screenshot({ path: SHOTS + 'v3-quiz-cover-tips.png' });
    await ctx.close();

    // ===== 8. Inner screen 785×850 and 850×785: two panes =====
    for (const vp of [{ w: 785, h: 850, tag: 'inner' }, { w: 850, h: 785, tag: 'inner-land' }]) {
      const c = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2, hasTouch: true });
      const pg = await c.newPage();
      await pg.emulateMedia({ reducedMotion: 'reduce' });
      const errs = [];
      pg.on('pageerror', (e) => errs.push(e.message));
      pg.on('dialog', (d) => d.accept().catch(() => {}));
      await createProfile(pg, 'Inner');
      check(`${vp.tag}: no horizontal scroll (home)`, await noHScroll(pg));
      await pg.screenshot({ path: SHOTS + `v3-quiz-${vp.tag}-home.png` });
      // MCQ: question left, Answer & why right
      await pg.click('[data-testid=mode-quiz40]');
      await pg.waitForSelector('.qcard');
      check(`${vp.tag}: two-pane grid active`, await pg.evaluate(() => getComputedStyle(document.querySelector('.session-grid')).display === 'grid'));
      await pg.click('#opt-0');
      await pg.waitForSelector('.pane-a [data-testid=why-each]');
      const b1 = await pg.evaluate(() => ({ q: document.querySelector('.pane-q').getBoundingClientRect().right, a: document.querySelector('.pane-a').getBoundingClientRect().left }));
      check(`${vp.tag}: why each option sits in the right pane`, b1.a >= b1.q - 1, JSON.stringify(b1));
      await pg.screenshot({ path: SHOTS + `v3-quiz-${vp.tag}-mcq.png` });
      await quitToHome(pg);
      // four-part short: parts left, reveal right
      await pg.click('[data-testid=mode-short]');
      await pg.waitForSelector('[data-testid=parts]');
      check(`${vp.tag}: answer pane waits before reveal`, await pg.isVisible('.answer-wait'));
      await pg.click('[data-testid=reveal-1]');
      await pg.waitForSelector('.pane-a [data-testid=model-1]');
      check(`${vp.tag}: revealed (b) shows in the right pane, not under the part`, !(await pg.$('.pane-q .part-model')));
      await pg.click('[data-testid=reveal-all]');
      for (const [i, v] of [[0, 1], [1, 0], [2, 1], [3, 1]]) await pg.click(`.pane-a [data-testid=mark-${i}-${v}]`);
      await pg.waitForSelector('[data-testid=verdict]');
      const b2 = await pg.evaluate(() => ({ q: document.querySelector('.pane-q .parts').getBoundingClientRect().right, a: document.querySelector('.pane-a .parts-reveal').getBoundingClientRect().left }));
      check(`${vp.tag}: parts left, model answers + marking right; 3/4 recorded`, b2.a >= b2.q - 1 && (await pg.textContent('[data-testid=verdict]')).includes('3/4'), JSON.stringify(b2));
      await pg.screenshot({ path: SHOTS + `v3-quiz-${vp.tag}-short.png` });
      const qidBefore = await pg.getAttribute('.session', 'data-qid');
      await pg.setViewportSize({ width: 385, height: 860 });
      await pg.waitForTimeout(300);
      check(`${vp.tag}: fold to cover keeps the question and stacks the model answers under each part`, (await pg.getAttribute('.session', 'data-qid')) === qidBefore && (await pg.evaluate(() => getComputedStyle(document.querySelector('.session-grid')).display)) === 'block' && (await pg.$$('.pane-q .part-model')).length === 4);
      await pg.setViewportSize({ width: vp.w, height: vp.h });
      await pg.waitForTimeout(200);
      await quitToHome(pg);
      await pg.goto(BASE + '#/print');
      await pg.waitForSelector('[data-testid=pparts]');
      check(`${vp.tag}: no horizontal scroll (print)`, await noHScroll(pg));
      await pg.screenshot({ path: SHOTS + `v3-quiz-${vp.tag}-print.png` });
      check(`${vp.tag}: no page errors`, errs.length === 0, errs.join(' | '));
      await c.close();
    }
  } catch (e) {
    check('script error', false, e.stack);
  } finally {
    await browser.close();
    const fails = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length - fails}/${results.length} passed`);
    process.exit(fails ? 1 : 0);
  }
})();
