'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const app = require('../app.js');
const {
  esc, parseRoute, normalizeAnswer, checkAnswer, fresh, validateState, normalizeQuizDate,
  sectionDone, topicProgress, rubricScore, examScore, examPicks, timerInfo, clock,
  daysUntil, countdownText, longDate, mergeDrill, exportText, legacyText, slideSrc, pdfHref, PLAN_STEPS
} = app;

/* Small fixture topic, independent of content/*.js, for the unit tests. */
const fixture = [{
  id: 't1', number: 1, slug: 'uji', title: 'Uji', short: 'Uji', summary: 'x', goals: ['a'], sources: [],
  sections: [
    { id: 't1-s1', kind: 'intuisi', title: 'Satu', blocks: [], checks: [
      { id: 't1-s1-c1', type: 'mcq', prompt: 'P1', options: ['a', 'b'], answer: 1, explanation: 'e' },
      { id: 't1-s1-c2', type: 'input', prompt: 'P2', answer: '450', accept: ['450 km'], explanation: 'e' }
    ] },
    { id: 't1-s2', kind: 'aturan', title: 'Dua', blocks: [], checks: [] },
    { id: 't1-s3', kind: 'contoh', title: 'Tiga', blocks: [{ type: 'widget', widget: 'trace-table', props: { caseId: 'intro', mode: 'dfs', drillId: 't1-d1' } }], checks: [] },
    { id: 't1-s4', kind: 'menulis', title: 'Empat', blocks: [], checks: [] },
    { id: 't1-s5', kind: 'latihan', title: 'Lima', blocks: [], checks: [] },
    { id: 't1-s6', kind: 'cek', title: 'Enam', blocks: [], checks: [{ id: 't1-s6-c1', type: 'input', prompt: 'P3', answer: '17', explanation: 'e' }] }
  ],
  essays: [
    { id: 't1-e1', title: 'Latihan', exam: false, variant: false, source: 's', minutes: 15, prompt: 'Esai', solution: 'S', rubric: [{ text: 'r1', points: 60 }, { text: 'r2', points: 40 }] },
    { id: 't1-x1', title: 'Set A', exam: true, set: 'A', variant: false, source: 's', minutes: 20, prompt: 'Ujian A', solution: 'S', rubric: [{ text: 'r1', points: 50 }, { text: 'r2', points: 50 }] },
    { id: 't1-x2', title: 'Set B', exam: true, set: 'B', variant: false, source: 's', minutes: 20, prompt: 'Ujian B', solution: 'S', rubric: [{ text: 'r1', points: 100 }] }
  ]
}];
const fixtureTopics = [fixture[0], ...[2, 3, 4, 5, 6].map(n => ({
  id: 't' + n, number: n, slug: 'x', title: 'T' + n, short: 'T' + n, summary: 'x', goals: [], sources: [],
  sections: [1, 2, 3, 4, 5, 6].map(k => ({ id: 't' + n + '-s' + k, kind: 'cek', title: 's' + k, blocks: [], checks: [] })),
  essays: [
    { id: 't' + n + '-e1', title: 'e', exam: false, variant: false, source: 's', minutes: 15, prompt: 'p', solution: 's', rubric: [{ text: 'r', points: 100 }] },
    { id: 't' + n + '-x1', title: 'x1', exam: true, set: 'A', variant: false, source: 's', minutes: 20, prompt: 'p', solution: 's', rubric: [{ text: 'r', points: 100 }] },
    { id: 't' + n + '-x2', title: 'x2', exam: true, set: 'B', variant: false, source: 's', minutes: 20, prompt: 'p', solution: 's', rubric: [{ text: 'r', points: 100 }] }
  ]
}))];

test('parseRoute covers every route form and sends junk home', () => {
  assert.deepEqual(parseRoute('#/'), { view: 'home' });
  assert.deepEqual(parseRoute(''), { view: 'home' });
  assert.deepEqual(parseRoute('#/ringkasan'), { view: 'summary' });
  assert.deepEqual(parseRoute('#/progres'), { view: 'progress' });
  assert.deepEqual(parseRoute('#/ujian'), { view: 'exam-setup' });
  assert.deepEqual(parseRoute('#/ujian/u1700000000000'), { view: 'exam', eid: 'u1700000000000' });
  assert.deepEqual(parseRoute('#/t/t2'), { view: 'topic', tid: 't2' });
  assert.deepEqual(parseRoute('#/t/t2/esai'), { view: 'essays', tid: 't2' });
  assert.deepEqual(parseRoute('#/t/t2/t2-s5'), { view: 'section', tid: 't2', sid: 't2-s5' });
  for (const junk of ['#/t/t9', '#/t/t2/abc', '#/t/t2/t2-s5/x', '#/t/t2/t3-s1', '#/nope', '#/t', '<script>', '#/t/t2/../../x', '#/ujian/abc', '#/ujian/u1/extra', '#/l/l2', '#/l/l2/kuis']) {
    assert.deepEqual(parseRoute(junk), { view: 'home' }, junk);
  }
});

test('normalizeAnswer treats arrows, dashes, commas and spaces as one separator', () => {
  assert.equal(normalizeAnswer('S → d → e'), normalizeAnswer('s,d,e'));
  assert.equal(normalizeAnswer('S-d-e'), 's,d,e');
  assert.equal(normalizeAnswer('  S  ->  d '), 's,d');
  assert.equal(normalizeAnswer('-3,0'), '-3,0');
});

test('checkAnswer accepts equivalent numbers and listed alternatives', () => {
  assert.equal(checkAnswer({ type: 'input', answer: '11.2' }, '11,2'), true);
  assert.equal(checkAnswer({ type: 'input', answer: '11.2' }, '11.18'), false);
  assert.equal(checkAnswer({ type: 'input', answer: '23.5638', accept: ['23,5637'] }, '23,5637'), true);
  assert.equal(checkAnswer({ type: 'input', answer: '450', accept: ['450 km'] }, '450 km'), true);
  assert.equal(checkAnswer({ type: 'input', answer: '450' }, '2 nodes'), false);
  assert.equal(checkAnswer({ type: 'input', answer: 'S,d,e' }, ''), false);
  assert.equal(checkAnswer({ type: 'mcq', answer: 2 }, 2), true);
  assert.equal(checkAnswer({ type: 'mcq', answer: 2 }, 0), false);
});

test('validateState rejects version 2 and drops unknown ids and wrong types', () => {
  assert.deepEqual(validateState({ schemaVersion: 2, sections: { 't1-s1': { done: true } } }, fixtureTopics, 100), fresh());
  assert.deepEqual(validateState('junk', fixtureTopics, 100), fresh());
  const raw = {
    schemaVersion: 3,
    quizDate: '2026-10-21',
    plan: { d1: true, d2: 'yes', d9: true },
    sections: {
      't1-s1': { done: true, checks: { 't1-s1-c1': { choice: 1, correct: true, solved: true, attempts: 1 }, 'ghost': { choice: 0 }, 't1-s1-c2': { choice: {} } } },
      'ghost-sec': { done: true }
    },
    drills: { 't1-d1': { completed: true, correctFirstTry: 9, total: 4, bestPercent: 250, updatedAt: 5 }, 'x-d1': { completed: true } },
    essays: { 't1-e1': { draft: 'x', revealed: true, rubric: [true, 'yes'], assessment: 'mastered' }, 'nope': { draft: 'x' } },
    last: '#/t/t1/t1-s1'
  };
  const restored = validateState(raw, fixtureTopics, 100);
  assert.equal(restored.schemaVersion, 3);
  assert.equal(restored.quizDate, '2026-10-21');
  assert.equal(restored.plan.d1, true);
  assert.equal(restored.plan.d2, false);
  assert.equal(Object.prototype.hasOwnProperty.call(restored.plan, 'd9'), false);
  assert.deepEqual(Object.keys(restored.sections), ['t1-s1']);
  assert.deepEqual(Object.keys(restored.sections['t1-s1'].checks), ['t1-s1-c1']);
  assert.equal(restored.drills['t1-d1'].correctFirstTry, 4, 'first-try score cannot exceed the total');
  assert.equal(restored.drills['t1-d1'].bestPercent, 100);
  assert.equal(restored.drills['x-d1'], undefined);
  assert.equal(restored.essays['t1-e1'].revealed, true);
  assert.deepEqual(restored.essays['t1-e1'].rubric, [true, false]);
  assert.equal(restored.essays['t1-e1'].assessment, 'mastered');
  assert.equal(restored.essays.nope, undefined);
  assert.equal(restored.last, '#/t/t1/t1-s1');
});

test('validateState keeps only valid exams and the last ten', () => {
  const exam = (i, extra) => Object.assign({
    id: 'u' + (1700000000000 + i), set: 'A', picks: ['t1-x1', 't2-x1', 't3-x1', 't4-x1', 't5-x1', 't6-x1'],
    startedAt: 1700000000000 + i, durationMin: 60, answers: { 't1-x1': 'jawaban' }, submittedAt: null, rubric: {}
  }, extra || {});
  const rawExams = Array.from({ length: 12 }, (_, i) => exam(i));
  rawExams.push(exam(50, { set: 'Z' }), exam(51, { picks: ['t1-x1'] }), exam(52, { durationMin: 45 }));
  const restored = validateState({ schemaVersion: 3, exams: rawExams }, fixtureTopics, 2e12);
  assert.equal(restored.exams.length, 10);
  assert.equal(restored.exams[0].id, 'u' + (1700000000000 + 2));
  assert.equal(restored.exams.some(e => e.set === 'Z'), false);
});

test('validateState trims an exam rubric array to the length of the essay rubric', () => {
  const picks = ['t1-x1', 't2-x1', 't3-x1', 't4-x1', 't5-x1', 't6-x1'];
  const raw = { schemaVersion: 3, exams: [{ id: 'u1700000000000', set: 'A', picks, startedAt: 1700000000000, durationMin: 0, answers: {}, submittedAt: 1700000100000, rubric: { 't2-x1': [true, true, true] } }] };
  const restored = validateState(raw, fixtureTopics, 2e12);
  assert.equal(restored.exams.length, 1);
  assert.equal(restored.exams[0].submittedAt, 1700000100000);
  assert.equal(restored.exams[0].rubric['t2-x1'].length, 1);
});

test('a revealed essay with an empty draft becomes unrevealed on restore', () => {
  const restored = validateState({ schemaVersion: 3, essays: { 't1-e1': { draft: '   ', revealed: true, rubric: [] } } }, fixtureTopics, 100);
  assert.equal(restored.essays['t1-e1'].revealed, false);
});

test('quiz dates must be real calendar dates', () => {
  assert.equal(normalizeQuizDate('2026-10-21'), '2026-10-21');
  assert.equal(normalizeQuizDate('2026-02-30'), null);
  assert.equal(normalizeQuizDate('21/10/2026'), null);
  assert.equal(normalizeQuizDate(''), null);
  assert.equal(validateState({ schemaVersion: 3, quizDate: '2026-13-01' }, fixtureTopics, 100).quizDate, null);
});

test('countdown counts days in local dates and stays silent without a date', () => {
  const now = new Date(2026, 9, 15, 9, 30).getTime(); // 15 Oct 2026, local time
  assert.equal(daysUntil('2026-10-21', now), 6);
  assert.equal(daysUntil('2026-10-15', now), 0);
  assert.equal(daysUntil('2026-10-14', now), -1);
  assert.equal(daysUntil(null, now), null);
  assert.equal(countdownText(6), 'Tinggal 6 hari lagi');
  assert.equal(countdownText(1), 'Besok');
  assert.equal(countdownText(0), 'Hari ini');
  assert.equal(countdownText(-2), 'Tanggal ini sudah lewat');
  assert.equal(countdownText(null), '');
  assert.equal(longDate('2026-10-21'), 'Rabu, 21 Oktober 2026');
});

test('the study plan is an ordered list of six steps with no dates', () => {
  assert.equal(PLAN_STEPS.length, 6);
  assert.deepEqual(PLAN_STEPS.map(s => s.text), ['DFS + UCS', 'Greedy', 'A*', 'Hill Climbing', 'Alpha-Beta', 'Mock quiz Set A → review → Set B']);
  assert.deepEqual(PLAN_STEPS.map(s => s.key), ['d1', 'd2', 'd3', 'd4', 'd5', 'd6']);
  for (const s of PLAN_STEPS) assert.ok(!/\d{4}-\d{2}-\d{2}|Kamis|Jumat|Sabtu|Minggu|Senin|Selasa|Rabu/.test(s.text), s.text);
});

test('sectionDone requires solved checks, or the manual flag when there are none', () => {
  const [topic] = fixture;
  const state = fresh();
  const withChecks = topic.sections[0];
  assert.equal(sectionDone(withChecks, state), false);
  state.sections['t1-s1'] = { done: true, checks: { 't1-s1-c1': { choice: 0, correct: false, solved: false, attempts: 1 } } };
  assert.equal(sectionDone(withChecks, state), false);
  state.sections['t1-s1'].checks = { 't1-s1-c1': { choice: 1, correct: true, solved: true, attempts: 1 }, 't1-s1-c2': { choice: '450', correct: true, solved: true, attempts: 1 } };
  assert.equal(sectionDone(withChecks, state), true);
  const manual = topic.sections[1];
  assert.equal(sectionDone(manual, state), false);
  state.sections['t1-s2'] = { done: true, checks: {} };
  assert.equal(sectionDone(manual, state), true);
});

test('topicProgress counts sections, checks, drills and mastered essays', () => {
  const [topic] = fixture;
  const state = fresh();
  state.sections['t1-s2'] = { done: true, checks: {} };
  state.drills['t1-d1'] = { completed: true, correctFirstTry: 3, total: 4, bestPercent: 75, updatedAt: 1 };
  state.essays['t1-e1'] = { draft: 'x', revealed: true, rubric: [true, true], assessment: 'mastered' };
  const p = topicProgress(topic, state);
  assert.equal(p.sectionsDone, 1);
  assert.equal(p.sectionsTotal, 6);
  assert.equal(p.drillsTotal, 1);
  assert.equal(p.drillsDone, 1);
  assert.equal(p.essaysMastered, 1);
  assert.equal(p.essaysTotal, 3);
  assert.equal(p.checksTotal, 3);
});

test('rubric scores add the points of ticked items, and an exam totals out of 600', () => {
  const essays = new Map(fixtureTopics.flatMap(t => t.essays).map(e => [e.id, e]));
  assert.equal(rubricScore(fixture[0].essays[0], [true, false]), 60);
  assert.equal(rubricScore(fixture[0].essays[0], [true, true]), 100);
  assert.equal(rubricScore(fixture[0].essays[0], []), 0);
  const picks = examPicks(fixtureTopics, 'A');
  assert.equal(picks.length, 6);
  const exam = { picks, rubric: { [picks[0]]: [true, true], [picks[1]]: [false] } };
  const score = examScore(exam, essays);
  assert.equal(score.max, 600);
  assert.equal(score.perEssay[0].score, 100);
  assert.equal(score.perEssay[1].score, 0);
  assert.equal(score.total, 100);
  assert.equal(score.percent, 17);
});

test('examPicks gives one exam essay per topic in quiz order, and acak mixes A and B', () => {
  const a = examPicks(fixtureTopics, 'A');
  const b = examPicks(fixtureTopics, 'B');
  assert.deepEqual(a, ['t1-x1', 't2-x1', 't3-x1', 't4-x1', 't5-x1', 't6-x1']);
  assert.deepEqual(b, ['t1-x2', 't2-x2', 't3-x2', 't4-x2', 't5-x2', 't6-x2']);
  assert.deepEqual(examPicks(fixtureTopics, 'acak', () => 0.1), a);
  assert.deepEqual(examPicks(fixtureTopics, 'acak', () => 0.9), b);
});

test('exam timer: remaining time, no limit, and clock format', () => {
  const exam = { startedAt: 1000000, durationMin: 60 };
  assert.deepEqual(timerInfo(exam, 1000000 + 60000), { limitMs: 3600000, elapsedMs: 60000, remainingMs: 3540000 });
  assert.ok(timerInfo(exam, 1000000 + 3600000 + 5).remainingMs < 0);
  assert.equal(timerInfo({ startedAt: 0, durationMin: 0 }, 5000).remainingMs, null);
  assert.equal(clock(65000), '01:05');
  assert.equal(clock(3725000), '1:02:05');
  assert.equal(clock(-5), '00:00');
});

test('mergeDrill keeps the first completed run and the best percentage', () => {
  let rec = mergeDrill(null, { completed: false, correctFirstTry: 1, total: 4 }, 10);
  assert.equal(rec.completed, false);
  assert.equal(rec.correctFirstTry, 0, 'an unfinished run does not fix the first-try score');
  rec = mergeDrill(rec, { completed: true, correctFirstTry: 3, total: 4 }, 20);
  assert.equal(rec.completed, true);
  assert.equal(rec.correctFirstTry, 3);
  assert.equal(rec.total, 4);
  assert.equal(rec.bestPercent, 75);
  rec = mergeDrill(rec, { completed: true, correctFirstTry: 4, total: 4 }, 30);
  assert.equal(rec.correctFirstTry, 3, 'the first-try score is not overwritten');
  assert.equal(rec.bestPercent, 100);
  assert.equal(rec.updatedAt, 30);
});

test('slide and PDF paths follow the contract', () => {
  assert.equal(slideSrc(4, 7), 'slides/L4-07.jpg');
  assert.equal(slideSrc(5, 59), 'slides/L5-59.jpg');
  assert.equal(pdfHref(5, 9), '../8.%20Adversarial%20Search.pdf#page=9');
});

test('esc escapes HTML so restored drafts cannot inject markup', () => {
  assert.equal(esc('<img src=x onerror="alert(1)"> & \''), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;');
  assert.equal(esc(null), '');
});

test('the export contains saved answers, rubric choices, drills and mock quiz answers', () => {
  const state = fresh();
  state.quizDate = '2026-10-21';
  state.essays['t1-e1'] = { draft: 'Jawaban saya', revealed: true, rubric: [true, false], assessment: 'review' };
  state.drills['t1-d1'] = { completed: true, correctFirstTry: 2, total: 4, bestPercent: 50, updatedAt: 1 };
  state.exams.push({ id: 'u1700000000000', set: 'A', picks: fixtureTopics.map(t => t.essays[1].id), startedAt: 1700000000000, durationMin: 60, answers: { 't1-x1': 'Jawaban ujian' }, submittedAt: 1700000600000, rubric: { 't1-x1': [true, false] } });
  const text = exportText(state, fixtureTopics, new Date('2026-10-15T00:00:00Z'));
  assert.match(text, /Jawaban saya/);
  assert.match(text, /2026-10-15/);
  assert.match(text, /Tanggal kuis: 2026-10-21/);
  assert.match(text, /\[x\] r1 \(60 poin\)/);
  assert.match(text, /skor percobaan pertama 2 dari 4/);
  assert.match(text, /Jawaban ujian/);
  assert.match(text, /Skor: 50 dari 600/);
});

test('legacy text keeps v2 essay drafts only', () => {
  const legacy = legacyText({ essays: { 'l1-e1': { draft: 'lama' }, 'l2-e1': { draft: '   ' } }, drafts: { ignored: 'x' } }, new Date('2026-10-14T00:00:00Z'));
  assert.match(legacy, /\[l1-e1\]/);
  assert.match(legacy, /lama/);
  assert.doesNotMatch(legacy, /ignored/);
  assert.match(legacyText({}, new Date('2026-10-14T00:00:00Z')), /tidak ada jawaban tersimpan/);
});

/* ----- integration: real files in contract order, loaded into a vm context ----- */
const ORDER = ['algorithms.js', 'cases.js', 'widgets-core.js', 'widgets-drill.js', 'content/cheatsheet.js',
  'content/t1.js', 'content/t2.js', 'content/t3.js', 'content/t4.js', 'content/t5.js', 'content/t6.js'];
const missing = ORDER.filter(f => !fs.existsSync(path.join(ROOT, f)));
const skipReason = missing.length ? 'skip: belum ada ' + missing.join(', ') + ' (menunggu worker lain)' : false;

function loadAll() {
  const ctx = {};
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const file of ORDER) vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
  return ctx;
}

test('script order in index.html matches the contract', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const srcs = [...html.matchAll(/<script[^>]*src="([^"?]+)/g)].map(m => m[1]);
  assert.deepEqual(srcs, [...ORDER, 'app.js']);
  assert.match(html, /<dialog id="slide-dialog"/);
  assert.match(html, /id="topic-nav"/);
  assert.match(html, /id="main"/);
});

test('integration: six topics, 6 sections each, essays and drills are well formed', { skip: skipReason }, () => {
  const ctx = loadAll();
  const topics = Array.from(ctx.KKA_TOPICS).sort((a, b) => a.number - b.number);
  assert.equal(JSON.stringify(topics.map(t => t.number)), JSON.stringify([1, 2, 3, 4, 5, 6]));
  const kinds = ['intuisi', 'aturan', 'contoh', 'menulis', 'latihan', 'cek'];
  const widgetNames = ctx.KKAWidgets && typeof ctx.KKAWidgets.names === 'function' ? ctx.KKAWidgets.names() : null;
  const drillIds = new Set();
  for (const t of topics) {
    assert.equal(t.sections.length, 6, t.id);
    assert.equal(JSON.stringify(t.sections.map(s => s.kind)), JSON.stringify(kinds), t.id);
    assert.ok(t.sections[5].checks.length >= 6 && t.sections[5].checks.length <= 8, t.id + ' s6 checks');
    assert.equal(t.essays.filter(e => !e.exam).length, 3, t.id + ' practice essays');
    const x1 = t.essays.find(e => e.id === t.id + '-x1');
    const x2 = t.essays.find(e => e.id === t.id + '-x2');
    assert.ok(x1 && x1.exam && x1.set === 'A', t.id + ' x1');
    assert.ok(x2 && x2.exam && x2.set === 'B', t.id + ' x2');
    for (const e of t.essays) {
      assert.equal(e.rubric.reduce((sum, r) => sum + r.points, 0), 100, e.id + ' rubric');
      assert.ok(e.minutes === 15 || e.minutes === 20, e.id + ' minutes');
    }
    for (const s of t.sections) {
      for (const b of s.blocks) {
        if (b.type === 'slide') {
          assert.ok(b.lecture >= 2 && b.lecture <= 5, s.id + ' lecture');
          const img = path.join(ROOT, app.slideSrc(b.lecture, b.slide));
          assert.ok(fs.existsSync(img), 'missing ' + img);
        }
        if (b.type === 'widget') {
          if (widgetNames) assert.ok(widgetNames.includes(b.widget), 'unknown widget ' + b.widget + ' in ' + s.id);
          const props = b.props || {};
          if (props.caseId) {
            const c = ctx.KKA_CASES[props.caseId];
            assert.ok(c, 'missing caseId ' + props.caseId + ' in ' + s.id);
            if (props.variant) assert.ok(c.variants && c.variants[props.variant], 'missing variant ' + props.variant);
          }
          if (props.drillId) {
            assert.match(props.drillId, /^t[1-6]-d[0-9]+$/);
            assert.ok(!drillIds.has(props.drillId), 'duplicate drill ' + props.drillId);
            drillIds.add(props.drillId);
          }
        }
      }
    }
  }
  assert.ok(ctx.KKA_CHEATSHEET && typeof ctx.KKA_CHEATSHEET === 'object', 'cheat sheet loaded');
});

test('content t5 and t6 contain no HTML tags and no removed-topic words', { skip: false }, () => {
  for (const file of ['content/t5.js', 'content/t6.js']) {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.doesNotMatch(text, /<\/?[a-z][a-z0-9]*(\s[^>\n]*)?\/?>/i, file + ' has an HTML-like tag');
    assert.doesNotMatch(text, /\bBFS\b|\bIDS\b|annealing|genetic|8-puzzle|pancake/i, file);
  }
});

test('no shipped js or html file mentions removed video or data globals', () => {
  const files = [];
  for (const dir of ['', 'content']) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    for (const f of fs.readdirSync(full)) if (/\.(js|html)$/.test(f)) files.push(path.join(full, f));
  }
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const banned of ['youtube', 'KKA_DATA', 'short-videos']) {
      assert.ok(!text.toLowerCase().includes(banned.toLowerCase()), path.basename(file) + ' mentions ' + banned);
    }
  }
});
