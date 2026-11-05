# MGMT6110 Exam Prep Quiz

A small, fast study app for **MGMT6110 Human-AI Collaboration** (SMU MBAI, Prof Sungjong Roh).
Practise for the **final exam (Thu 12 Nov 2026, 1 pm — please check the date and venue on eLearn)**: Part A = 10 MCQs × 1 point, Part B = 5 four-part questions × 4 points.

Works on laptop and phone, installs as a PWA, keeps a separate progress record for each person on the same device, and prints clean test papers.

Built with Vite + React (JavaScript) + plain CSS. No backend. Everything is static, so it deploys to Vercel for free.

> **Share the deployed app only within the class.** The official questions (the 40 quiz questions, the 5 Part B practice questions and the studio checkpoints) come from Prof Roh's material, which is for MGMT6110 class use only.

---

## What changed in v3 (5 Nov 2026)

**Fresh start for everyone (new question bank)**
- The question bank was replaced (v3: Prof Roh's official questions first). Progress, profiles and sessions now live under a **new storage namespace** (`mgmt6110quiz3:` in localStorage, IndexedDB `mgmt6110-quiz3-backup` / store `kv3`), so everyone starts fresh. The old `mgmt6110quiz:` keys and the old IndexedDB mirror are **never read**; they are deleted once on first load.
- Backups are now **export format 3**. Import accepts only format-3 files; an older file shows *"This file is from the old question bank, which has been replaced."*
- Service worker `VERSION` bumped to `mgmt6110-quiz-v6-2026-11-05-bank3`.

**Priority order everywhere**
- Every question has a `priority`: **1** Prof Roh's official (the 40 quiz questions, the 5 Part B practice questions), **2** his studio checkpoints, **3** likely questions written for this app. Sessions without shuffle, lists and print go 1 → 2 → 3, then file order. ("Randomise question order" is now **off** by default.)
- A badge on each question: **★ Prof Roh · Quiz 2 · Q3** (gold), **★ Prof Roh · Part B practice 1** (gold), **☆ Prof Roh · Studio checkpoint** (silver), **Likely**.

**Home modes**
| mode | what it does |
|---|---|
| **Prof Roh's 40 quiz questions** | quiz order Q1.1 → Q4.10, no shuffle; after each: *Why each option* |
| **Part B practice (short questions)** | ALL short questions, Prof Roh's 5 first, then the likely ones; tap topic cards to narrow |
| **Mock final** | Part A 10 × 1 point · Part B 5 × 4 points = 30. Priority-weighted random: ≥4 official MCQs and ≥1 official Part B; MCQs first; 2-hour timer; summary shows Part A x/10 · Part B y/20 |
| **Exam core set** | `core: true` questions, priority order |
| **Topic practice** | tap one or many topic cards, then start |
| **Review wrong** / **Review flagged** | last wrong or partly / starred |

**Official MCQs: "Why each option"** — after answering, A–D with ✓/✗ and the `why[i]` text (mapped correctly when options are shuffled), plus trap, tip and "Where we met it".

**Four-part short questions (Part B)** — the case (line breaks kept; simple `| a | b |` pipe tables rendered as tables), then parts (a)–(d) each with its step chip **Define / Explain / Apply / Check**, its task and an optional textarea. *Reveal (a)* … per part or *Reveal all*; mark each part **0 or 1**; when all four are marked the score (e.g. **3/4**) is saved (4/4 = correct, 1–3 = partly with credit 0.75 etc., 0 = wrong). Then *What earns each point*, *Where points are lost* and a tip. Old single-`modelAnswer` short questions still work.

**Print** — *Short questions only (Part B)* in priority order with four-part tables (part | task | model answer); *Hide answers* prints ruled blank lines to write on. *Prof Roh's 40 quiz questions (with answers & why)*. Rows avoid page breaks.

**Exam format & tips page** — Part A/B format, the 4-point rubric with the temperature worked example, the "where Part B answers lose points" table (pack p.152), 10 exam-room tips, how to revise (p.153).

**Foldable** — on the inner screen (785×850 / 850×785) question and parts sit on the left; *Why each option*, model answers and marking on the right. On the cover screen (385×860) everything stacks with each model answer under its part.

**Tests** — `scripts/test-v3.cjs` (Playwright): `npx vite preview --port 4311 --strictPort &` then `PORT=4311 timeout 300 node scripts/test-v3.cjs`.

---

## What changed in v2 (4 Nov 2026)

**Your progress is much safer**
- Every answer, flag and grade is saved **the moment you tap** (not "a bit later"), and again when the app is hidden or closed.
- **Two windows no longer overwrite each other.** Before writing, the app reads what is stored and merges question by question (the newest answer for each question wins; flags carry their own on/off time). Totals are recomputed from the answers, never added up twice. Other open windows pick up the changes at once (`storage` event) and when you come back to them.
- **A session survives a reload.** The questions, option order, current question, answers, timer and mode are saved per profile. Reload (or fold/unfold the phone) and you land on the same question. If the app was closed, Home shows **"Resume your session (Q 7 of 20)"**. Two windows each keep their own session.
- **Second copy in IndexedDB.** Every save is mirrored to IndexedDB; if localStorage is ever empty or corrupt on start-up, it is restored from there.
- **Asks the phone not to clear the data** (`navigator.storage.persist()`); Profiles shows *Storage: protected* or *Storage: may be cleared by the phone*.
- **Back up now** button (Home banner + Profiles), and a gentle reminder when you have answered more than 20 questions and not backed up for 3 days.
- **Import merges by default** (newest answer per question wins, flags combined by newest time); *Add as new profile* and *Replace* are the other choices. Old format-1 files still import.

**Foldable layouts (Honor Magic V3)**
- Cover screen (≈ 385 × 860): compact header, big tap targets, no sideways scrolling, a **sticky bottom bar with Prev / ★ Flag / Next**.
- Inner screen (≈ 785 × 850 or 850 × 785): **two panes** — question and options on the left, **Answer & why** on the right (for short questions the model answer and the examiner box go on the right). Folding/unfolding switches layout without losing your place.
- Uses `dvh` units, `env(safe-area-inset-*)`, `viewport-fit=cover`, and lines the panes up with a hinge where the browser reports one (`horizontal-viewport-segments`). Text stays at 17 px or larger.

**Study features**
- One countdown: **Final exam · Thu 12 Nov 2026 · 1 pm** with days left and an exam-day message.
- **Short questions** mode (all short-answer questions, filter by tapping topic cards). After *Reveal* you see the model answer with keywords highlighted **and** a *What the examiner looks for* box.
- **Exam core set** mode: questions with `"core": true`. The button is hidden until at least one question has it.
- Print view: *All / Short questions only / Exam core set / Only my wrong / Only my flagged / My wrong + flagged*, show or hide answers, **topic checkboxes**, and a one-tap **Print my wrong + flagged**.
- New topics (T17, T18, T19, …) appear automatically from `questions.json`.
- Service worker: content JSON is always fetched fresh (network-first, no-cache), a new deploy takes over immediately and the app shows **"New version available — tap to refresh"**.

---

## 1. Run it locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve dist/ locally
```

---

## 2. Deploy to GitHub + Vercel (no command line needed)

1. **Unzip** `MGMT6110_Exam_Prep_Quiz_App.zip`. You get a folder `quiz-app/` with `index.html`, `package.json`, `public/`, `src/` and so on.
2. **Put it on GitHub.**
   - On github.com click **New** (new repository). Name it e.g. `mgmt6110-exam-prep-quiz`. Do not tick "Add a README". Click **Create repository**.
   - On the empty repo page click the link **"uploading an existing file"**.
   - Open the unzipped folder, select **everything inside it** (the contents, not the folder itself; there is no `node_modules`, and do not add one) and drag it into the browser.
   - Scroll down and click **Commit changes**.
3. **Deploy on Vercel.** Go to vercel.com → **Add New… → Project** → **Import** the `mgmt6110-exam-prep-quiz` repo → Framework Preset **Vite** (build `npm run build`, output `dist` are filled in for you) → **Deploy**. After about a minute you get a URL like `https://mgmt6110-exam-prep-quiz.vercel.app`. On a phone, open it and use *Add to Home Screen*.
4. **Update content later.** On github.com open `public/content/questions.json` (or any `public/content/*.json`) → click the pencil icon → edit → **Commit changes**. Vercel sees the commit and redeploys automatically in about a minute. No code changes needed.

Command-line alternative (if you prefer git):

```bash
git init && git add . && git commit -m "MGMT6110 Exam Prep Quiz"
git branch -M main
git remote add origin https://github.com/<your-username>/mgmt6110-exam-prep-quiz.git
git push -u origin main
```

`vercel.json` already contains the single-page-app rewrite so every route serves `index.html`, and short caching for `/content/*.json` so new questions show up quickly.

---

## 3. Adding questions (no code changes)

All questions are data files in `public/content/`:

```
public/content/
  questions.json          ← the main bank (required)
  index.json              ← optional list of extra files to merge
  questions-week10.json   ← example extra file
```

The app loads `questions.json` first, then every file named in `index.json` and **merges the arrays**. A question with the same `id` in a later file replaces the earlier one, so you can also fix a question without touching the main file.

`index.json`:

```json
{ "files": ["questions-week10.json"] }
```

### Schema (v3: `version` "2026-11-05-v3")

v3 adds `priority` (1 official, 2 checkpoint, 3 likely), `official` (display label, e.g. "Quiz 2 · Q3", "Part B Practice 1"), `why` (one line per MCQ option) and `parts` for short questions:

```json
{ "id": "OQ1-05", "type": "mcq", "priority": 1, "official": "Quiz 1 · Q5", "why": ["…", "…", "…", "…"], "…": "…" }
{ "id": "PB1", "type": "short", "priority": 1, "official": "Part B Practice 1",
  "parts": [ {"label": "(a)", "step": "Define", "task": "…", "model": "…"},
             {"label": "(b)", "step": "Explain", "task": "…", "model": "…"},
             {"label": "(c)", "step": "Apply", "task": "…", "model": "…"},
             {"label": "(d)", "step": "Check", "task": "…", "model": "…"} ],
  "explanation": "what earns each point", "trap": "where points are lost", "tip": "…", "source": "…" }
```

Ids: `OQ{quiz}-{nn}` quiz questions (the 40-question mode orders by these), `PB{n}` Part B, `CP{n}` checkpoints, `M{nnn}`/`S{nn}`/`X{nn}` likely MCQ/short/matching.

Older-style fields (still supported):

```json
{
  "version": "2026-11-01",
  "topics": [
    { "id": "T13", "title": "Week 9 — Mapping the Territory", "week": "Week 9", "color": "#16A34A" }
  ],
  "questions": [
    {
      "id": "Q001", "topic": "T13", "type": "mcq", "difficulty": 2, "core": true,
      "stem": "question text",
      "options": ["A…", "B…", "C…", "D…"],
      "answer": 1,
      "explanation": "why the answer is right, simple English, 2–4 sentences",
      "trap": "what the distractors are testing",
      "source": "Week 9 slide '…'",
      "tip": "optional exam tip"
    },
    {
      "id": "Q120", "topic": "T10", "type": "matching", "difficulty": 2,
      "stem": "Match each example to its quadrant",
      "pairs": [{ "left": "…", "right": "…" }],
      "explanation": "…", "source": "…"
    },
    {
      "id": "Q150", "topic": "T14", "type": "short", "difficulty": 3, "core": true,
      "stem": "scenario + question",
      "modelAnswer": "A+ answer, 3–6 sentences, uses slide wording",
      "keywords": ["agreement", "congruency", "accuracy"],
      "explanation": "what an examiner looks for (shown in the 'What the examiner looks for' box)",
      "source": "…"
    }
  ]
}
```

Field notes:

| field | meaning |
|---|---|
| `id` | unique string, e.g. `Q001`. Progress is stored against this id, so do not renumber. |
| `topic` | `T01`–`T16` are built in (see `src/lib/topics.js`). **New topics such as `T17`–`T19` work automatically**: add them to the `topics` array (title, week, colour) or just use the id on a question and it appears with the id as its title and an automatic colour. |
| `type` | `mcq`, `matching` or `short` |
| `difficulty` | 1 (easy), 2 (medium), 3 (hard) — used by the difficulty filter |
| `core` | **new, optional** boolean. `true` puts the question in the **Exam core set** ("the questions most likely to be examined"). The Core button only appears when at least one question has it. (`quiz4` is ignored now.) |
| `answer` | **0-based** index into `options` (0 = A, 1 = B, …) |
| `keywords` | words highlighted in the model answer and checked against the student's own answer (hint only; the student self-grades) |

The `topics` array in a content file is optional: the app already knows the 16 canonical topics, titles and colours. Add a topic entry only for a new topic (e.g. Week 10) or to override a title.

### Syncing from the shared content folder

`scripts/sync-content.sh` copies `questions.json` (plus `index.json` and any extra files it names) from the shared build folder into `public/content/`:

```bash
npm run sync-content                       # from /home/claude/mgmt6110/build/content
bash scripts/sync-content.sh /some/other/dir
```

---

## 4. Modes and options

See the modes table under *What changed in v3* above (40 quiz questions, Part B practice, Mock final, Exam core set, Topic practice, Review wrong, Review flagged).

Options (saved on the device): randomise question order (off by default, so priority order shows), randomise option order, question-type filter (MCQ / matching / short), difficulty filter, timer on/off.

Keyboard: `1`–`4` or `A`–`D` to answer, `←` `→` to move, `Enter` for next.

Four-part short questions: reveal each part, mark it 0 or 1; the x/4 score is saved. Old single-answer short questions: reveal the model answer, then self-grade *Got it / Partly / Missed* (Partly = half a mark).

---

## 5. Profiles, backup and restore

Progress lives in this browser (`localStorage`, mirrored to IndexedDB). It needs no account and never leaves the device unless you back it up.

- **Profiles**: each person on a shared laptop gets a name + emoji avatar. Switch from the header menu. Each profile has its own answers, flags, streak, best scores, saved session and last summary.
- **Back up now** (Home banner or Profiles page) downloads `mgmt6110-progress-<name>-<date>.json` (export **format 3**; v3 imports only format 3 — older files from the replaced bank are refused with a friendly message). Send it to yourself (WhatsApp, email). The Home banner reminds you when you have answered more than 20 questions and the last backup is older than 3 days; *Later* hides it until the app is reopened.
- **Restore / move to another device**: Profiles → *Import a backup file*. You then choose:
  - **Merge into <current profile>** (recommended, the default): for each question the newest answer wins; flags are combined by their newest on/off time; sessions and best scores are combined. Importing the same file twice changes nothing.
  - **Add as new profile**.
  - **Replace <current profile>'s progress** with the file (asks to confirm).
- **Storage status** on the Profiles page: *Storage: protected* means the browser agreed not to clear the data; *may be cleared by the phone* means back up now and then (installing the app to the home screen usually upgrades this).
- **Reset progress** wipes the current profile's record (also in other open windows). Deleting a profile removes its record too.

Progress format (per profile, key `mgmt6110quiz3:progress:<id>`): `answers {qid: {attempts, correct, wrong, last, lastAt, lastScore?, lastOf?}}` (lastScore/lastOf = the x/4 mark of a four-part short), `flags {qid: {on, at}}`, `totals` (always recomputed from `answers`), `streak`, `best`, `sessions`, `backupAt`, `epoch` (changes on Reset/Replace). The active session is under `mgmt6110quiz3:session:<id>` and the last summary under `mgmt6110quiz3:summary:<id>`.

---

## 6. Print and export

*Print & export* page:

1. Pick what to include: **Short questions only (Part B)** (default) / **Prof Roh's 40 quiz questions (with answers & why)** / all / exam core set / only my wrong / only my flagged / my wrong + flagged.
2. *Show answers* or *Hide answers*: hidden four-part questions print ruled blank lines in the answer column to write on.
3. Tick **topic checkboxes** to print only some topics (none ticked = all).
4. Everything prints in priority order, in sections (Prof Roh's official → studio checkpoints → likely). Four-part tables keep each row on one page.
5. **Print / Save as PDF** or **Download as .md** (same selection, four-part tables as Markdown tables).

## 7. PWA

`public/manifest.webmanifest` and `public/sw.js` make the app installable (any orientation, so the unfolded landscape screen works). The service worker serves `content/*.json` **network-first with a no-cache fetch** (never stale; the cached copy is only for offline), pages network-first, and hashed assets cache-first. It calls `skipWaiting()` + `clients.claim()`, so a new deploy takes over at once and the app shows **"New version available — tap to refresh"** (everything is saved before the reload). Bump `VERSION` in `sw.js` on each release (now `mgmt6110-quiz-v6-2026-11-05-bank3`).

---

## 8. Project layout

```
index.html                 title, manifest link, meta
vite.config.js
vercel.json                SPA rewrite + cache headers
public/
  content/                 questions.json, index.json (+ extras)
  icons/                   PWA icons
  manifest.webmanifest, sw.js
scripts/sync-content.sh
src/
  App.jsx                  hash router, profiles, sessions
  styles.css               all styling (light/dark, print)
  lib/                     content loader, storage (merge-safe), idb (IndexedDB mirror), session (save/restore),
                           useMedia (foldable layouts), topics, tips, markdown export
  components/              Header, Home, Session, Summary, PrintView, Tips, Profiles, Ring, UpdateToast
```

---

## 9. Suggested future improvements

- **Spaced repetition**: schedule each question by how recently and how confidently it was answered (SM-2 style), and surface a "due today" set on the home page.
- **Shared cloud progress via Supabase**: optional sign-in so a profile syncs across phone and laptop automatically, with a real class leaderboard.
- **Question reporting**: a "something is wrong with this question" button that posts to a Google Form or GitHub issue with the question id.
- **Timed Quiz-4 simulation**: exactly 10 questions, 15 minutes, no feedback until the end, with the same look as eLearn.
- **Teacher / study-group dashboard**: which questions the class gets wrong most, by topic.
- **Explanation images**: an optional `image` field per question (diagram of the territory map, the four quadrants) rendered under the explanation.
- **Voice read-aloud**: Web Speech API to read the stem and options for revision while walking.
- **Confidence rating** before revealing the answer, to practise calibration (the course's own theme).
