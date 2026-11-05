// The final exam: format, the 4-point rubric and where Part B loses points.
// Source: Prof Roh's Comprehensive Course Revision Pack (5 Nov 2026), pp. 3, 4, 146, 152, 153.

export const FORMAT = {
  head: ['', 'Part A: multiple choice', 'Part B: concept definition and problem solving'],
  rows: [
    ['Questions', '10', '5'],
    ['Points', '1 each = 10', '4 each = 20 · parts (a)–(d), 1 point each'],
    ['Form', 'A short business case and 4 options, one right. Written like the 40 quiz questions.', 'Define a course concept in your own words, then use it on a short business problem: read a table, place a task or product on a map, name the state two teams are in, choose a setting, or say what a person should check before an agent acts.'],
  ],
  facts: [
    '15 questions · 30 points · 30% of the course grade.',
    'Covers the whole course, Weeks 1–10: lectures, AI in Action Studios and problem sets.',
    'Closed book, no AI tools.',
    'No quiz question came from Week 6 or Week 10, but the final covers both: Week 6 (an agent that works while you do not) and Week 10 (the harness, the co-collaboration model).',
  ],
};

export const RUBRIC = [
  { pt: '(a)', step: 'Define', what: "State the concept in our course's terms, in one or two sentences, and name its parts if it has any." },
  { pt: '(b)', step: 'Explain', what: 'Say what happens inside it, or why it matters, with the mechanism we studied: the spread of next tokens, the judge built from rankings, the trigger, the gate.' },
  { pt: '(c)', step: 'Apply', what: 'Use it on the case in front of you. Compute the rate, place the task, name the state or choose the setting, and show the step that gets you there.' },
  { pt: '(d)', step: 'Check', what: 'Say what a person should check or do before relying on the result, and why: the source to open, the gate to set, the evidence that would change the decision.' },
];

export const WORKED = {
  q: 'Define temperature. A bank runs the same model for two jobs: rewriting approved disclosure text, which must read the same on every run, and drafting campaign taglines, where sameness is the problem. How should it set temperature for each job, and what should a person still check?',
  parts: [
    ['Define', 'Temperature controls how the model picks from its spread of candidate next tokens: at 0 it takes the top token every time, and higher values flatten the spread, so less likely tokens are picked more often.'],
    ['Explain', 'It changes the picking and leaves what the model learned untouched, so the same prompt gives varied text at a higher temperature.'],
    ['Apply', 'Set it at or near 0 for the disclosure text, so the wording repeats, and raise it moderately for the taglines.'],
    ['Check', 'A person still compares the disclosure with the approved text, because a low temperature makes output repeatable rather than correct, and reviews each tagline before use.'],
  ],
  note: 'Parts (a) to (d) of each question follow these four steps in this order. An answer that only defines the term earns one point, however well it is written. (Revision pack p.4, Quiz 1 Question 5)',
};

export const LOSE_POINTS = [
  ['defined the term and stopped', 'the definition earns one point of the four', 'use it on the case, and say what a person checks'],
  ['said "the model knows" or "the AI decided"', 'it describes a person, and hides what the system did', 'say what it did: predicted the next token, called a tool, returned a score'],
  ['read one cell of a table', 'a single cell cannot show an association', 'compute the rate in each row and compare them'],
  ['placed a product by its name', 'the map reads settings, and the same product moves when a setting changes', 'answer Q1 (Who starts a run?) and Q3 (What can it touch?) from its settings'],
  ['put the gate in the prompt', 'a sentence in the prompt cannot hold a call', 'put the gate in the settings: drafts only, a narrower key, an approval before the action'],
  ['named no check', 'the fourth point is the person\'s step', 'say what a person opens, compares or approves, and when'],
];

export const TIPS = [
  { icon: '🧭', title: 'Part B: write the four labels first', body: 'Before you write, put (a) Define, (b) Explain, (c) Apply, (d) Check down the margin. Fill each one. A short answer that does all four parts earns more than a long one that only defines.' },
  { icon: '🔢', title: 'Show your working', body: 'Where there is a number or a placement, show the step: 90 of 120 = 75% against 40 of 80 = 50%; "a schedule starts it (right), it sends email (top), so Autopilot". Never report one cell or the diagonal.' },
  { icon: '⚙️', title: 'Say what the system did', body: 'Not "the AI decided" or "the model knows". It predicted the next token, called a tool, returned a score. A language model does no arithmetic: it predicts tokens.' },
  { icon: '🗺️', title: 'Place one task by its settings', body: 'Week 7 map: place one task, never a whole job. Week 9 map: answer Q1 (Who starts a run?) and Q3 (What can it touch?) from the settings, not the product name. Ask / Delegate / Monitor / Autopilot.' },
  { icon: '🚪', title: 'The gate goes in the settings', body: 'A prompt can only ask. In Autopilot the gate moves to before the action: drafts only, remove the send tool, a narrower key, an approval before the action. Name the person who answers for it.' },
  { icon: '🤝', title: 'Co-collaboration: write E, F, G', body: 'E (my own answer), F (my estimate of the other side), G (the other side\'s actual answer) for both teams. Agreement = E vs E, congruency = E vs F, accuracy = F vs G. Then name the state.' },
  { icon: '🔁', title: 'Part A: find the swapped word', body: 'Two options often look alike with one thing swapped: accuracy vs congruency, Monitor vs Autopilot, workflow vs agent, repeatable vs correct. Read all four options before you choose.' },
  { icon: '✅', title: 'Green is not done', body: 'A successful run only means nothing broke. The evidence is the record: the commit, runs.json, the transcript, the email sent or held. Low temperature makes output repeatable, not correct.' },
  { icon: '📅', title: 'Facts about products are not tested', body: 'Plans, prices and the countries a product reaches change every week. The exam tests whether you can read a model, a table, a task or an agent with the ideas of the course, and say what a person should do next.' },
  { icon: '⏱️', title: 'Pace yourself', body: 'Part A is 10 of 30 points. Answer it steadily, then give Part B most of your time: about ten minutes per question. Leave nothing blank: each part (a)–(d) is a separate point.' },
];

export const BEFORE_SUBMIT = [
  'Did I answer all 10 MCQs? Blanks earn nothing.',
  'Every Part B question: do (a), (b), (c) and (d) each have their own sentences?',
  '(c) Apply: did I show the step — the rate in each row, the placement with Q1 and Q3, the state from E, F, G?',
  '(d) Check: did I name what a person opens, compares or approves, and when?',
  'Did I write what the system did, not "the AI decided"?',
  'Is any gate in the settings, not in the prompt?',
  'Reread each stem once more. Is it asking what it is, or what to do?',
  'Breathe. Then hand it in.',
];

export const REVISE = [
  'Test yourself on the quizzes: the 40 questions with answers covered; commit to an option before opening each answer; note the ones you missed.',
  'Go back to the source: for each miss, read its concept slide, then one source under "Where we met it".',
  'Write Part B by hand: the five practice answers on paper, about ten minutes each, marked against define, explain, apply, check.',
  'Read one agent\'s record: rerun one agent from this term, read its record top to bottom, and place it on the map with Q1 to Q6.',
];
