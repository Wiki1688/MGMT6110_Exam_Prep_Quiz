// Playwright checks for the quiz app (served by vite preview on PORT).
const { chromium } = require('playwright');
const PORT = process.env.PORT || 4301;
const BASE = `http://localhost:${PORT}/`;
const SHOTS = '/home/claude/mgmt6110/out/screens/';
const WIKI = '/home/claude/mgmt6110/new_src/mgmt6110-progress-Wiki.json';
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); };

async function createProfile(page, name) {
  await page.goto(BASE);
  await page.waitForSelector('#pname', { timeout: 15000 });
  await page.fill('#pname', name);
  await page.click('form.sheet button[type=submit]');
  await page.waitForSelector('.modes');
}
async function startTopicPractice(page) {
  await page.click('.mode:has-text("Topic practice")');
  await page.waitForSelector('.qcard');
}
async function answerCurrent(page) {
  const qid = await page.getAttribute('.session', 'data-qid');
  if (await page.$('#opt-0')) {
    await page.click('#opt-0');
  } else if (await page.$('.match-row select')) {
    const sels = await page.$$('.match-row select');
    for (const s of sels) {
      const vals = await s.$$eval('option', (os) => os.map((o) => o.value).filter(Boolean));
      await s.selectOption(vals[0]);
    }
    await page.click('button:has-text("Check matches")');
  } else {
    await page.fill('textarea.short', 'A probability distribution and sampling; a named person checks the output.');
    await page.click('button:has-text("Reveal model answer")');
    await page.click('button:has-text("Got it")');
  }
  await page.waitForSelector('.answer-panel');
  return qid;
}
const lsAnswers = (page) => page.evaluate(() => {
  const p = JSON.parse(localStorage.getItem('mgmt6110quiz:profiles'));
  const prog = JSON.parse(localStorage.getItem('mgmt6110quiz:progress:' + p.currentId) || '{}');
  return { answers: Object.keys(prog.answers || {}), flags: Object.entries(prog.flags || {}).filter(([, v]) => v === true || v.on).map(([k]) => k), totals: prog.totals };
});
const stat = async (page, k) => Number((await page.textContent(`[data-stat="${k}"]`)).split('/')[0].trim());
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

(async () => {
  const browser = await chromium.launch();
  try {
    // ---------- 1. Cover screen: answer 3, flag one, reload mid-session ----------
    const ctx = await browser.newContext({ viewport: { width: 385, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await createProfile(page, 'Tester');
    check('cover: no Quiz 4 text on home', !(await page.textContent('body')).match(/Quiz 4/i));
    check('cover: final countdown shown', (await page.textContent('[data-testid=countdown]')).includes('Thu 12 Nov 2026'));
    check('cover: Core button shown (bank has core questions)', !!(await page.$('.mode:has-text("Exam core set")')));
    check('cover: no horizontal scroll (home)', await noHScroll(page));
    await page.screenshot({ path: SHOTS + 'v2-quiz-cover-home.png', fullPage: false });
    await startTopicPractice(page);
    const answered = [];
    for (let i = 0; i < 3; i++) {
      answered.push(await answerCurrent(page));
      if (i === 1) await page.click('[data-testid=nav-flag]');
      await page.click('[data-testid=next]');
      if (await page.$('.interstitial')) await page.click('.interstitial button');
      await page.waitForSelector('.qcard');
    }
    const beforeQid = await page.getAttribute('.session', 'data-qid');
    const beforeIdx = await page.getAttribute('.session', 'data-index');
    // show an answered state for the screenshot: answer the 4th too
    answered.push(await answerCurrent(page));
    check('cover: sticky bottom bar visible', await page.isVisible('.session-nav [data-testid=nav-flag]'));
    check('cover: no horizontal scroll (session)', await noHScroll(page));
    await page.screenshot({ path: SHOTS + 'v2-quiz-cover-session.png', fullPage: false });
    let ls = await lsAnswers(page);
    check('answers written to localStorage at once', answered.every((q) => ls.answers.includes(q)), `${ls.answers.length} stored`);
    check('flag stored as {on, at}', ls.flags.includes(answered[1]));
    await page.reload();
    await page.waitForSelector('.qcard', { timeout: 15000 });
    const afterQid = await page.getAttribute('.session', 'data-qid');
    const afterIdx = await page.getAttribute('.session', 'data-index');
    check('reload mid-session restores same question', afterQid === answered[3] && afterIdx === String(Number(beforeIdx)), `before ${beforeQid}#${beforeIdx}, after ${afterQid}#${afterIdx}`);
    check('reload keeps answered state of current question', await page.isVisible('.answer-panel'));
    ls = await lsAnswers(page);
    check('reload keeps all answers', answered.every((q) => ls.answers.includes(q)) && ls.answers.length === 4, `${ls.answers.length}`);
    // Home resume card
    await page.goto(BASE + '#/');
    await page.waitForSelector('[data-testid=resume-card]');
    check('home shows "Resume your session (Q n of m)"', /Resume your session \(Q \d+ of \d+\)/.test(await page.textContent('[data-testid=resume-card]')));
    check('home answered = 4, flagged = 1', (await stat(page, 'answered')) === 4 && (await stat(page, 'flagged')) === 1);

    // ---------- 2. Two windows of the same profile ----------
    const p2 = await ctx.newPage();
    await p2.goto(BASE);
    await p2.waitForSelector('.modes');
    await page.click('[data-testid=resume-card] button:has-text("Resume")');
    await page.waitForSelector('.qcard');
    await page.click('[data-testid=next]');
    if (await page.$('.interstitial')) await page.click('.interstitial button');
    await page.waitForSelector('.qcard');
    const qa = await answerCurrent(page);
    await startTopicPractice(p2);
    let qb = await p2.getAttribute('.session', 'data-qid');
    let guard = 0;
    while ((answered.includes(qb) || qb === qa) && guard++ < 20) {
      await p2.click('[data-testid=next]');
      if (await p2.$('.interstitial')) await p2.click('.interstitial button');
      await p2.waitForSelector('.qcard');
      qb = await p2.getAttribute('.session', 'data-qid');
    }
    await answerCurrent(p2);
    // page A answers one more AFTER B wrote (A's memory is older than storage)
    await page.click('[data-testid=next]');
    if (await page.$('.interstitial')) await page.click('.interstitial button');
    await page.waitForSelector('.qcard');
    let qa2 = await page.getAttribute('.session', 'data-qid');
    guard = 0;
    while ((qa2 === qb) && guard++ < 20) { await page.click('[data-testid=next]'); if (await page.$('.interstitial')) await page.click('.interstitial button'); await page.waitForSelector('.qcard'); qa2 = await page.getAttribute('.session', 'data-qid'); }
    await answerCurrent(page);
    await page.reload(); await p2.reload();
    await page.waitForSelector('.qcard'); await p2.waitForSelector('.qcard');
    check('two windows: each reloads into its own session', (await page.getAttribute('.session', 'data-qid')) === qa2 && (await p2.getAttribute('.session', 'data-qid')) === qb);
    const la = await lsAnswers(page);
    const lb = await lsAnswers(p2);
    const want = [...answered, qa, qb, qa2];
    check('two windows: all answers from both present after reload', want.every((q) => la.answers.includes(q)) && want.every((q) => lb.answers.includes(q)), `${la.answers.length} stored, want ${new Set(want).size}`);
    await page.goto(BASE + '#/'); await p2.goto(BASE + '#/');
    await page.waitForSelector('[data-stat=answered]'); await p2.waitForSelector('[data-stat=answered]');
    const n1 = await stat(page, 'answered'), n2 = await stat(p2, 'answered');
    check('two windows: both Home screens agree', n1 === n2 && n1 === new Set(want).size, `${n1} vs ${n2}`);
    check('totals recomputed (attempts = sum of answer attempts)', la.totals.answered === new Set(want).size, JSON.stringify(la.totals));
    check('no page errors (cover)', errors.length === 0, errors.join(' | '));
    await ctx.close();

    // ---------- 3. Import the real Wiki export ----------
    for (const vp of [{ w: 785, h: 850, tag: 'inner' }, { w: 850, h: 785, tag: 'inner-land' }]) {
      const c = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2, hasTouch: true });
      const pg = await c.newPage();
      await pg.emulateMedia({ reducedMotion: 'reduce' });
      const errs = [];
      pg.on('pageerror', (e) => errs.push(e.message));
      await createProfile(pg, 'Wiki');
      await pg.goto(BASE + '#/profiles');
      await pg.waitForSelector('[data-testid=backup-card]');
      check(`${vp.tag}: storage status shown`, /Storage: (protected|may be cleared by the phone)/.test(await pg.textContent('[data-testid=persist-status]')), await pg.textContent('[data-testid=persist-status]'));
      await pg.setInputFiles('[data-testid=import-input]', WIKI);
      await pg.waitForSelector('[data-testid=import-choice]');
      check(`${vp.tag}: import reads format 1`, (await pg.textContent('[data-testid=import-choice]')).includes('format 1'));
      await pg.click('[data-testid=import-merge]');
      await pg.goto(BASE + '#/');
      await pg.waitForSelector('[data-stat=answered]');
      const a = await stat(pg, 'answered'), cr = await stat(pg, 'correct'), f = await stat(pg, 'flagged');
      check(`${vp.tag}: Wiki import counts (answered 64, correct 53, flagged 25 — retired questions ignored)`, a === 64 && cr === 53 && f === 25, `answered ${a}, correct ${cr}, flagged ${f}`);
      const acc = await pg.textContent('.stat:has([data-stat=correct]) .l');
      check(`${vp.tag}: accuracy recomputed 67/77 = 87%`, acc.includes('87%'), acc);
      // merge the same file again: counts must not double
      await pg.goto(BASE + '#/profiles');
      await pg.setInputFiles('[data-testid=import-input]', WIKI);
      await pg.click('[data-testid=import-merge]');
      const tot = await pg.evaluate(() => { const p = JSON.parse(localStorage.getItem('mgmt6110quiz:profiles')); return JSON.parse(localStorage.getItem('mgmt6110quiz:progress:' + p.currentId)).totals; });
      check(`${vp.tag}: importing twice does not double counts`, tot.answered === 107 && tot.correct === 97, JSON.stringify(tot));
      await pg.reload();
      await pg.goto(BASE + '#/');
      await pg.waitForSelector('[data-stat=answered]');
      check(`${vp.tag}: Wiki counts survive reload`, (await stat(pg, 'answered')) === 64 && (await stat(pg, 'correct')) === 53 && (await stat(pg, 'flagged')) === 25);
      check(`${vp.tag}: backup reminder shows (>20 answers, no backup)`, await pg.isVisible('[data-testid=backup-banner]'));
      check(`${vp.tag}: no horizontal scroll`, await noHScroll(pg));
      await pg.screenshot({ path: SHOTS + `v2-quiz-${vp.tag}-home.png` });
      // IndexedDB mirror restore: wipe localStorage, reload
      await pg.evaluate(() => localStorage.clear());
      await pg.reload();
      await pg.waitForSelector('[data-stat=answered]', { timeout: 15000 });
      check(`${vp.tag}: restore from IndexedDB after localStorage wiped`, (await stat(pg, 'answered')) === 64);
      // split session
      await startTopicPractice(pg);
      check(`${vp.tag}: two-pane layout active`, await pg.evaluate(() => getComputedStyle(document.querySelector('.session-grid')).display === 'grid'));
      check(`${vp.tag}: answer pane placeholder before answering`, await pg.isVisible('.answer-wait'));
      await answerCurrent(pg);
      const boxes = await pg.evaluate(() => { const q = document.querySelector('.pane-q').getBoundingClientRect(); const a = document.querySelector('.pane-a').getBoundingClientRect(); return { q: q.left, a: a.left, qr: q.right }; });
      check(`${vp.tag}: answer panel sits right of the question`, boxes.a >= boxes.qr - 1, JSON.stringify(boxes));
      await pg.screenshot({ path: SHOTS + `v2-quiz-${vp.tag}-session.png` });
      // fold → cover without losing state
      const qidBefore = await pg.getAttribute('.session', 'data-qid');
      await pg.setViewportSize({ width: 385, height: 860 });
      await pg.waitForTimeout(300);
      check(`${vp.tag}: fold to cover keeps the same question, stacks panes`, (await pg.getAttribute('.session', 'data-qid')) === qidBefore && (await pg.evaluate(() => getComputedStyle(document.querySelector('.session-grid')).display)) === 'block');
      await pg.setViewportSize({ width: vp.w, height: vp.h });
      // short-answer session with examiner box
      await pg.goto(BASE + '#/');
      await pg.waitForSelector('[data-testid=mode-short]');
      await pg.click('[data-testid=mode-short]');
      await pg.waitForSelector('textarea.short');
      check(`${vp.tag}: short mode only has short questions`, (await pg.textContent('.qhead')).includes('Short answer'));
      await pg.fill('textarea.short', 'temperature 0.7 sampling from a probability distribution');
      await pg.click('button:has-text("Reveal model answer")');
      check(`${vp.tag}: short reveal shows highlighted model answer + examiner box`, (await pg.$$('.ma-text mark')).length > 0 && await pg.isVisible('[data-testid=examiner]'));
      await pg.screenshot({ path: SHOTS + `v2-quiz-${vp.tag}-short.png` });
      // print short only
      await pg.goto(BASE + '#/print');
      await pg.click('[data-set=short]');
      const types = await pg.$$eval('.print-sheet .pq > .pmeta', (els) => els.map((e) => e.textContent));
      check(`${vp.tag}: print "Short questions only" renders only short`, types.length > 0 && types.every((t) => t.includes('· short ·')), `${types.length} questions`);
      await pg.click('button:has-text("Hide model answers")');
      check(`${vp.tag}: print short with model answers hidden`, (await pg.$$('.print-sheet .pans')).length === 0 && (await pg.$$('.print-sheet .blank')).length === types.length);
      await pg.click('.check:has-text("T01") input');
      const t01 = await pg.$$eval('.print-sheet h2', (els) => els.map((e) => e.textContent));
      check(`${vp.tag}: print topic filter`, t01.length === 1 && t01[0].startsWith('T01'), t01.join(','));
      await pg.click('button:has-text("Clear topics")');
      await pg.click('[data-set=wrongflagged]');
      const wf = await pg.$$eval('.print-sheet .pq', (els) => els.length);
      check(`${vp.tag}: print wrong + flagged`, wf >= 25, `${wf} questions`);
      check(`${vp.tag}: no Quiz 4 in print view`, !(await pg.textContent('body')).match(/Quiz ?4/i));
      await pg.screenshot({ path: SHOTS + `v2-quiz-${vp.tag}-print.png` });
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
