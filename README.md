# MGMT6110 Exam Prep Quiz

A small, fast study app for **MGMT6110 Human-AI Collaboration** (SMU MBAI, Prof Sungjong Roh).
Practice MCQs, matching and short-scenario questions for **Quiz 4 (Wed 4 Nov 2026)** and the **final exam (Thu 12 Nov 2026, 1 pm)**.

Works on laptop and phone, installs as a PWA, keeps a separate progress record for each person on the same device, and prints clean test papers.

Built with Vite + React (JavaScript) + plain CSS. No backend. Everything is static, so it deploys to Vercel for free.

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

### Schema

```json
{
  "version": "2026-11-01",
  "topics": [
    { "id": "T13", "title": "Week 9 — Mapping the Territory", "week": "Week 9", "color": "#16A34A" }
  ],
  "questions": [
    {
      "id": "Q001", "topic": "T13", "type": "mcq", "difficulty": 2, "quiz4": true,
      "stem": "question text",
      "options": ["A…", "B…", "C…", "D…"],
      "answer": 1,
      "explanation": "why the answer is right, simple English, 2–4 sentences",
      "trap": "what the distractors are testing",
      "source": "Week 9 slide '…'",
      "tip": "optional exam tip"
    },
    {
      "id": "Q120", "topic": "T10", "type": "matching", "difficulty": 2, "quiz4": false,
      "stem": "Match each example to its quadrant",
      "pairs": [{ "left": "…", "right": "…" }],
      "explanation": "…", "source": "…"
    },
    {
      "id": "Q150", "topic": "T14", "type": "short", "difficulty": 3, "quiz4": true,
      "stem": "scenario + question",
      "modelAnswer": "A+ answer, 3–6 sentences, uses slide wording",
      "keywords": ["agreement", "congruency", "accuracy"],
      "explanation": "what an examiner looks for",
      "source": "…"
    }
  ]
}
```

Field notes:

| field | meaning |
|---|---|
| `id` | unique string, e.g. `Q001`. Progress is stored against this id, so do not renumber. |
| `topic` | one of the canonical ids `T01`–`T16` (see `src/lib/topics.js`). Unknown ids are appended after the known ones; questions with a topic that is not listed anywhere are skipped with a console warning. |
| `type` | `mcq`, `matching` or `short` |
| `difficulty` | 1 (easy), 2 (medium), 3 (hard) — used by the difficulty filter |
| `quiz4` | `true` puts the question in the **Quiz 4 set (4 Nov)** mode |
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

| mode | what it does |
|---|---|
| **Quiz 4 set (4 Nov)** | only questions flagged `quiz4: true` |
| **Quick 10** | 10 random questions, 15-minute timer, like the real quiz |
| **Full mock exam** | 30 random questions, 45 min, always shuffled |
| **Topic practice** | tap one or many topic cards, then start |
| **Review wrong** | every question you last got wrong (or partly) |
| **Review flagged** | every question you starred |

Options (saved on the device): randomise question order, randomise option order, question-type filter (MCQ / matching / short), difficulty filter, timer on/off.

Keyboard: `1`–`4` or `A`–`D` to answer, `←` `→` to move, `Enter` for next.

Short-answer questions: write your own answer, reveal the model answer (keywords highlighted), then self-grade *Got it / Partly / Missed*. Partly counts as half a mark.

---

## 5. Profiles and syncing between devices

Progress lives in the browser's `localStorage`, so it never leaves the device and needs no account.

- **Profiles**: each person on a shared laptop gets a name + emoji avatar. Switch from the header menu. Each profile has its own answers, wrong/right history, flags, streak and best scores.
- **Leaderboard (this device)**: Profiles page → best mock, best Quiz 4 set, best Quick 10, questions answered, streak.
- **Carry progress from phone to laptop**: Profiles page → *Export progress (.json)*, send the file to yourself, then *Import a progress file* on the other device. You can add it as a new profile or merge it into the current one (merge keeps the higher counts, the union of flags and the best scores).
- **Reset progress** wipes the current profile's record. Deleting a profile removes its record too.

Clearing site data in the browser erases everything, so export first if it matters.

---

## 6. Print and export

*Print & export* page:

1. Pick what to include: all questions / Quiz 4 set / only my wrong ones / only my flagged.
2. Choose *Show answers & why* (study notes) or *Hide (test paper)*.
3. **Print / Save as PDF** opens the browser print dialog. The print stylesheet is black on white, hides the app chrome, keeps each question on one page and starts each topic on a new page.
4. **Download as .md** saves the same selection as a Markdown file (handy for Notion/Obsidian or for pasting into a group chat).

---

## 7. PWA

`public/manifest.webmanifest` and `public/sw.js` make the app installable. The service worker caches the app shell and serves `content/*.json` network-first, so new questions appear on the next load and the last copy still works offline. If a change ever looks stuck, bump `VERSION` in `sw.js`.

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
  lib/                     content loader, storage, topics, tips, markdown export
  components/              Header, Home, Session, Summary, PrintView, Tips, Profiles, Ring
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
