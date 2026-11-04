// Exam tips written from the digests' description of Prof Roh's question style.
export const TIPS = [
  { icon: '🧭', title: 'Scenario → place it', body: "Most questions describe a product and ask where it sits. Place it by two things: who starts it, and what it can touch. 'Place it by the job you hand it', not by who is accountable." },
  { icon: '🔧', title: 'Mechanism, not the marketing word', body: "If an option is a buzzword ('agentic', 'autonomous', 'intelligent'), look for the option that names the mechanism: a loop with a stop rule, a permission in the settings, a file between runs." },
  { icon: '📜', title: 'The slide sentence is usually right', body: "When one option is the exact wording from a slide ('a prompt can only ask', 'a run can succeed and still be wrong', 'the gate moves to before the action'), it is nearly always the answer." },
  { icon: '🔁', title: 'Watch the swap distractor', body: 'Two options often look alike with one thing swapped: accuracy vs congruency, Monitor vs Autopilot, workflow-with-an-AI-step vs agent, Draft vs Act with approval. Find what was swapped.' },
  { icon: '🔢', title: 'Numbers are on slides on purpose', body: 'June 2025 / ~130 vendors / >40% by end-2027. IMDA 22 Jan 2026, v1.5 20 May. MAS 7 Oct 2026, 12–24 months. Cut-off 1 point. 4 × 3 = 12 vs 4 + 3 = 7. Say them once out loud.' },
  { icon: '🧑‍⚖️', title: "'What should the manager do?' questions", body: 'One tempting option breaks a rule (use a VPN, raise the limit, remove the gate). One is passive (drop it, wait). The right one keeps the rule and changes the work or the setting.' },
  { icon: '🚪', title: 'Rule in text vs rule in the harness', body: 'A rule written in a prompt can be contradicted by the next thing the agent reads. A rule in a setting (Needs approval, Blocked, Create Draft) cannot. The question usually rewards the setting.' },
  { icon: '🟢', title: "'Green means the machines held'", body: 'A successful run is not a correct run. Evidence = an output matched to the run record by run ID or timestamp. Open the transcript.' },
  { icon: '✍️', title: 'Short answers: who, what, when, and what would move it', body: "Name who checks, what they check, when, and what change would move the product. 'A person checks the output' on its own earns one point." },
  { icon: '🎯', title: 'Final exam weighting', body: 'The later weeks carry the most marks. Six questions (Q1–Q6), the territory map, the ladder, agent washing, the co-collaboration model (E, F, G, cut-off 1). Know those cold, then use the Core set.' },
  { icon: '🚫', title: "'Not examinable' is said out loud", body: 'If the professor flagged a table as not examinable (the Singapore availability table), skip it. Everything else on a slide is fair game, especially Rule, Principle, Decision and Watch-for boxes.' },
  { icon: '🧠', title: 'One philosophy question', body: "Expect one question about the point of it all: calibrated delegation, trust, oversight. The answer is the one that keeps 'a named person keeps the decision'." },
  { icon: '⏱️', title: 'Two hours, pace yourself', body: 'Answer the MCQs you know first, mark the rest, then give the short questions real time: who, what, when, and what would move it. Do not leave any blank; there is no negative marking mentioned.' },
];

export const BEFORE_SUBMIT = [
  'Did I answer every question? Blanks earn nothing.',
  'For each scenario: did I place it by who starts it and what it can touch, not by who is accountable?',
  'Did I pick the mechanism over the marketing word?',
  'Where two options look alike, did I find the swapped word?',
  'Did any option quote a slide sentence exactly? That is probably the one.',
  'Numbers: did I check the date, the count and the percentage against what was on the slide?',
  "Did I avoid the option that breaks a rule (VPN, raise the limit, remove the gate) and the passive one (wait, drop it)?",
  'For a short answer: who checks, what, when, and what would move it?',
  'Reread the stem once more. Is it asking what it is, or what to do?',
  'Breathe. Then click Submit.',
];
