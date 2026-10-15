'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Validates the six quiz topics against PLAN2 Part 3.3 / 3.5 / 3.6 and the W4 task list.
// t1-t4 are written by W4 and must pass. t5 and t6 come from W3: they are skipped with a
// message while their file is missing, and validated strictly once the file exists.

const CONTENT_DIR = path.join(__dirname, '..', 'content');
const TOPIC_NUMBERS = [1, 2, 3, 4, 5, 6];
const SECTION_KINDS = ['intuisi', 'aturan', 'contoh', 'menulis', 'latihan', 'cek'];
const WIDGETS = [
  'graph-view', 'search-sim', 'trace-table', 'consistency-table', 'variant-lab', 'heuristic-tuner',
  'minimax-sim', 'queens', 'trace-drill', 'ab-drill', 'tsp-hc'
];
const TRACE_MODES = ['dfs', 'ucs', 'greedy', 'astar'];
const BLOCK_TYPES = ['text', 'intuition', 'list', 'definition', 'formula', 'table', 'pseudocode',
  'note', 'warning', 'example', 'slide', 'template', 'widget'];
const SLIDE_MAX = { 2: 56, 3: 55, 4: 35, 5: 59 };
const HTML_RE = /<\/?[a-z][^>]*>/i;
const FORBIDDEN_RE = /\bBFS\b|\bIDS\b|annealing|genetic|8-puzzle|pancake/i;
const SECTION_ID_RE = /^t[1-6]-s[1-6]$/;
const CHECK_ID_RE = /^t[1-6]-s[1-6]-c[0-9]+$/;
const ESSAY_ID_RE = /^t[1-6]-[ex][1-3]$/;
const DRILL_ID_RE = /^t[1-6]-d[0-9]+$/;

// Engine and cases. Both are loaded once; tests that need them fail with a clear message.
let cases = null;
let casesError = null;
try { cases = require('../cases.js'); } catch (err) { casesError = err; }
let engine = null;
let engineError = null;
try { engine = require('../algorithms.js'); } catch (err) { engineError = err; }

function nonEmpty(value, where) {
  assert.ok(typeof value === 'string' && value.trim().length > 0, `${where}: harus string tidak kosong`);
}

function walkStrings(value, where, out = []) {
  if (typeof value === 'string') out.push([value, where]);
  else if (Array.isArray(value)) value.forEach((v, i) => walkStrings(v, `${where}[${i}]`, out));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => walkStrings(v, `${where}.${k}`, out));
  return out;
}

function assertCaseExists(caseId, where) {
  assert.ok(cases, `cases.js gagal dimuat: ${casesError && casesError.message}`);
  assert.ok(Object.prototype.hasOwnProperty.call(cases, caseId), `${where}: caseId "${caseId}" tidak ada di cases.js`);
}

function assertVariantResolves(caseId, variant, where) {
  assertCaseExists(caseId, where);
  const variants = cases[caseId].variants || {};
  assert.ok(Object.prototype.hasOwnProperty.call(variants, variant),
    `${where}: variant "${variant}" tidak ada di cases.${caseId}.variants`);
}

function validateWidget(widget, props, where) {
  assert.ok(WIDGETS.includes(widget), `${where}: widget "${widget}" tidak dikenal`);
  assert.ok(props && typeof props === 'object' && !Array.isArray(props), `${where}: props harus objek`);
  if (props.caseId !== undefined) assertCaseExists(props.caseId, where);
  if (props.variant !== undefined) {
    assert.equal(typeof props.variant, 'string', `${where}: variant harus string`);
    assertVariantResolves(props.caseId, props.variant, where);
  }
  if (props.presets !== undefined) {
    assert.ok(Array.isArray(props.presets) && props.presets.length > 0, `${where}: presets harus array`);
    props.presets.forEach((p) => assertVariantResolves(props.caseId, p, `${where}.presets`));
  }
  if (props.mode !== undefined && ['trace-table', 'trace-drill', 'variant-lab'].includes(widget)) {
    assert.ok(TRACE_MODES.includes(props.mode), `${where}: mode "${props.mode}" tidak valid`);
  }
  if (widget === 'search-sim' && props.modes !== undefined) {
    assert.ok(Array.isArray(props.modes) && props.modes.length > 0, `${where}: modes harus array`);
    props.modes.forEach((m) => assert.ok(TRACE_MODES.includes(m), `${where}: mode "${m}" tidak valid`));
  }
  if (widget === 'trace-drill' || widget === 'ab-drill' || widget === 'tsp-hc') {
    if (props.drillId !== undefined) {
      assert.ok(DRILL_ID_RE.test(props.drillId), `${where}: drillId "${props.drillId}" tidak sesuai pola`);
    }
  }
  if (widget === 'heuristic-tuner') {
    assert.equal(props.caseId, 'l3-admissible', `${where}: heuristic-tuner dipakai untuk l3-admissible`);
  }
}

function validateBlock(block, where) {
  assert.ok(block && typeof block === 'object', `${where}: blok bukan objek`);
  assert.ok(BLOCK_TYPES.includes(block.type), `${where}: type "${block.type}" tidak dikenal`);
  if (block.caption !== undefined) nonEmpty(block.caption, `${where}.caption`);
  switch (block.type) {
    case 'text': case 'intuition': case 'note': case 'warning': case 'formula':
      nonEmpty(block.text, `${where}.text`); break;
    case 'list':
      assert.ok(Array.isArray(block.items) && block.items.length > 0, `${where}.items harus array tidak kosong`);
      block.items.forEach((it, i) => nonEmpty(it, `${where}.items[${i}]`));
      break;
    case 'definition':
      nonEmpty(block.term, `${where}.term`); nonEmpty(block.text, `${where}.text`); break;
    case 'example': case 'template':
      nonEmpty(block.title, `${where}.title`); nonEmpty(block.text, `${where}.text`); break;
    case 'table':
      assert.ok(Array.isArray(block.headers) && block.headers.length > 0, `${where}.headers harus array`);
      assert.ok(Array.isArray(block.rows) && block.rows.length > 0, `${where}.rows harus array`);
      block.rows.forEach((row, i) => {
        assert.equal(row.length, block.headers.length, `${where}.rows[${i}]: jumlah kolom tidak sama dengan headers`);
      });
      break;
    case 'pseudocode':
      assert.ok(Array.isArray(block.lines) && block.lines.length > 0, `${where}.lines harus array`);
      block.lines.forEach((l, i) => assert.equal(typeof l, 'string', `${where}.lines[${i}]: harus string (boleh kosong)`));
      break;
    case 'slide':
      assert.ok(Object.prototype.hasOwnProperty.call(SLIDE_MAX, block.lecture), `${where}: lecture harus 2..5`);
      assert.ok(Number.isInteger(block.slide) && block.slide >= 1 && block.slide <= SLIDE_MAX[block.lecture],
        `${where}: slide ${block.slide} di luar 1..${SLIDE_MAX[block.lecture]} untuk lecture ${block.lecture}`);
      break;
    case 'widget':
      validateWidget(block.widget, block.props, where);
      break;
    default: break;
  }
  walkStrings(block, where).forEach(([s, w]) => assert.ok(!HTML_RE.test(s), `${w}: mengandung HTML`));
}

function validateQuestion(q, topicNumber, sectionNumber, where, seen) {
  assert.ok(q && typeof q === 'object', `${where}: bukan objek`);
  const expectedPrefix = `t${topicNumber}-s${sectionNumber}-c`;
  assert.ok(CHECK_ID_RE.test(q.id) && q.id.startsWith(expectedPrefix), `${where}: id "${q.id}" tidak sesuai pola`);
  assert.ok(!seen.has(q.id), `${where}: id "${q.id}" duplikat`);
  seen.add(q.id);
  nonEmpty(q.prompt, `${where}.prompt`);
  nonEmpty(q.explanation, `${where}.explanation`);
  if (q.source !== undefined) nonEmpty(q.source, `${where}.source`);
  if (q.type === 'mcq') {
    assert.ok(Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 5,
      `${where}: mcq harus punya 2 sampai 5 pilihan`);
    q.options.forEach((o, i) => nonEmpty(o, `${where}.options[${i}]`));
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length,
      `${where}: answer mcq harus indeks valid`);
  } else if (q.type === 'input') {
    nonEmpty(q.answer, `${where}.answer`);
    if (q.accept !== undefined) {
      assert.ok(Array.isArray(q.accept), `${where}.accept harus array`);
      q.accept.forEach((a, i) => nonEmpty(a, `${where}.accept[${i}]`));
    }
  } else {
    assert.fail(`${where}: type harus mcq atau input`);
  }
  walkStrings(q, where).forEach(([s, w]) => {
    assert.ok(!HTML_RE.test(s), `${w}: mengandung HTML`);
    assert.ok(!FORBIDDEN_RE.test(s), `${w}: mengandung kata yang tidak dipakai di kuis`);
  });
}

function validateEssay(essay, topicNumber, where) {
  assert.ok(essay && typeof essay === 'object', `${where}: bukan objek`);
  assert.ok(ESSAY_ID_RE.test(essay.id) && essay.id.startsWith(`t${topicNumber}-`), `${where}: id "${essay.id}" tidak sesuai pola`);
  nonEmpty(essay.title, `${where}.title`);
  nonEmpty(essay.source, `${where}.source`);
  nonEmpty(essay.prompt, `${where}.prompt`);
  nonEmpty(essay.solution, `${where}.solution`);
  assert.ok([15, 20].includes(essay.minutes), `${where}: minutes harus 15 atau 20`);
  assert.equal(typeof essay.exam, 'boolean', `${where}.exam harus boolean`);
  assert.equal(typeof essay.variant, 'boolean', `${where}.variant harus boolean`);
  if (essay.exam) {
    assert.ok(essay.set === 'A' || essay.set === 'B', `${where}: ujian harus punya set A atau B`);
    const suffix = essay.id.slice(-2);
    assert.equal(suffix, essay.set === 'A' ? 'x1' : 'x2', `${where}: set ${essay.set} harus memakai id ${essay.set === 'A' ? 'x1' : 'x2'}`);
  } else {
    assert.equal(essay.set, undefined, `${where}: latihan tidak punya set`);
    assert.ok(/^e[1-3]$/.test(essay.id.slice(-2)), `${where}: latihan harus memakai id e1 sampai e3`);
  }
  assert.ok(Array.isArray(essay.rubric) && essay.rubric.length >= 2, `${where}: rubrik minimal 2 butir`);
  essay.rubric.forEach((r, i) => {
    nonEmpty(r.text, `${where}.rubric[${i}].text`);
    assert.ok(Number.isInteger(r.points) && r.points > 0, `${where}.rubric[${i}].points harus bilangan bulat positif`);
  });
  const total = essay.rubric.reduce((sum, r) => sum + r.points, 0);
  assert.equal(total, 100, `${where}: total poin rubrik ${total}, harus 100`);
  if (essay.solutionBlocks !== undefined) {
    assert.ok(Array.isArray(essay.solutionBlocks), `${where}.solutionBlocks harus array`);
    essay.solutionBlocks.forEach((b, i) => validateBlock(b, `${where}.solutionBlocks[${i}]`));
  }
  if (essay.figure !== undefined) validateWidget(essay.figure.widget, essay.figure.props, `${where}.figure`);
  if (essay.variant) {
    const widgets = [essay.figure, ...(essay.solutionBlocks || []).filter((b) => b.type === 'widget')].filter(Boolean);
    const usesVariant = widgets.some((w) => w.props && (w.props.variant !== undefined || (w.props.presets || []).length > 0));
    assert.ok(usesVariant, `${where}: esai variasi harus memakai widget dengan variant atau presets`);
  }
  walkStrings(essay, where).forEach(([s, w]) => {
    assert.ok(!HTML_RE.test(s), `${w}: mengandung HTML`);
    assert.ok(!FORBIDDEN_RE.test(s), `${w}: mengandung kata yang tidak dipakai di kuis`);
  });
}

function validateTopicShape(topic, n) {
  assert.equal(topic.id, `t${n}`, 'id topik harus t' + n);
  assert.equal(topic.number, n, 'number harus ' + n);
  nonEmpty(topic.slug, 'slug');
  nonEmpty(topic.title, 'title');
  nonEmpty(topic.short, 'short');
  nonEmpty(topic.summary, 'summary');
  assert.ok(Array.isArray(topic.goals) && topic.goals.length >= 3 && topic.goals.length <= 5, 'goals harus 3 sampai 5');
  topic.goals.forEach((g, i) => nonEmpty(g, `goals[${i}]`));
  assert.ok(Array.isArray(topic.sources) && topic.sources.length >= 1, 'sources minimal 1');
  topic.sources.forEach((s, i) => {
    nonEmpty(s.label, `sources[${i}].label`);
    if (s.lecture !== undefined) {
      assert.ok(Object.prototype.hasOwnProperty.call(SLIDE_MAX, s.lecture), `sources[${i}]: lecture harus 2..5`);
      assert.ok(s.slide >= 1 && s.slide <= SLIDE_MAX[s.lecture], `sources[${i}]: slide di luar jangkauan`);
    }
  });
}

function validateSections(topic, n) {
  assert.ok(Array.isArray(topic.sections) && topic.sections.length === 6, 'harus tepat 6 bagian');
  topic.sections.forEach((s, i) => {
    const k = i + 1;
    assert.ok(SECTION_ID_RE.test(s.id) && s.id === `t${n}-s${k}`, `bagian ${k}: id "${s.id}" harus t${n}-s${k}`);
    assert.equal(s.kind, SECTION_KINDS[i], `bagian ${k}: kind harus ${SECTION_KINDS[i]}`);
    nonEmpty(s.title, `${s.id}.title`);
    assert.ok(Array.isArray(s.blocks) && s.blocks.length > 0, `${s.id}: blocks kosong`);
    assert.ok(Array.isArray(s.checks), `${s.id}: checks harus array`);
    if (k === 6) {
      assert.ok(s.checks.length >= 6 && s.checks.length <= 8, `${s.id}: cek cepat harus 6 sampai 8 soal`);
    } else {
      assert.ok(s.checks.length <= 3, `${s.id}: maksimal 3 soal cek`);
    }
  });
}

function validateEssaySet(topic, n) {
  assert.ok(Array.isArray(topic.essays), 'essays harus array');
  const practice = topic.essays.filter((e) => !e.exam);
  const exam = topic.essays.filter((e) => e.exam);
  assert.equal(practice.length, 3, 'harus tepat 3 esai latihan');
  assert.equal(exam.length, 2, 'harus tepat 2 esai ujian');
  assert.deepEqual(practice.map((e) => e.id.slice(-2)).sort(), ['e1', 'e2', 'e3'], 'latihan harus e1, e2, e3');
  assert.deepEqual(exam.map((e) => e.id.slice(-2)).sort(), ['x1', 'x2'], 'ujian harus x1 dan x2');
  assert.ok(exam.some((e) => e.set === 'A' && e.id.endsWith('x1')), 'x1 harus set A');
  assert.ok(exam.some((e) => e.set === 'B' && e.id.endsWith('x2')), 'x2 harus set B');
  topic.essays.forEach((e, i) => validateEssay(e, n, `essays[${i}] (${e.id})`));
}

function loadTopic(n) {
  const file = path.join(CONTENT_DIR, `t${n}.js`);
  if (!fs.existsSync(file)) return { file, missing: true };
  try {
    return { file, topic: require(file) };
  } catch (err) {
    return { file, error: err };
  }
}

const loaded = {};
for (const n of TOPIC_NUMBERS) loaded[n] = loadTopic(n);

function skipReason(n) {
  if (loaded[n].missing) return `content/t${n}.js belum ada (dikerjakan W3); dilewati sementara`;
  return false;
}

function topicOrFail(n) {
  const entry = loaded[n];
  assert.ok(!entry.error, `content/t${n}.js gagal dimuat: ${entry.error && entry.error.message}`);
  return entry.topic;
}

// Per-topic checks. Each topic gets its own tests so a failure is easy to locate.
for (const n of TOPIC_NUMBERS) {
  const skip = skipReason(n);

  test(`t${n}: file dimuat dan bentuk topik benar`, { skip }, () => {
    validateTopicShape(topicOrFail(n), n);
  });

  test(`t${n}: enam bagian dengan urutan kind yang tetap`, { skip }, () => {
    validateSections(topicOrFail(n), n);
  });

  test(`t${n}: soal cek valid (id, tipe, indeks jawaban, tanpa HTML)`, { skip }, () => {
    const topic = topicOrFail(n);
    const seen = new Set();
    topic.sections.forEach((s, i) => s.checks.forEach((q, j) => {
      validateQuestion(q, n, i + 1, `${s.id}.checks[${j}] (${q.id})`, seen);
    }));
  });

  test(`t${n}: blok isi valid (tipe, field, slide, widget)`, { skip }, () => {
    const topic = topicOrFail(n);
    topic.sections.forEach((s) => s.blocks.forEach((b, j) => validateBlock(b, `${s.id}.blocks[${j}]`)));
  });

  test(`t${n}: 3 esai latihan dan 2 esai ujian, rubrik 100 poin`, { skip }, () => {
    validateEssaySet(topicOrFail(n), n);
  });

  test(`t${n}: tidak ada HTML atau kata yang tidak dipakai di kuis`, { skip }, () => {
    const topic = topicOrFail(n);
    walkStrings(topic, `t${n}`).forEach(([s, where]) => {
      assert.ok(!HTML_RE.test(s), `${where}: mengandung HTML`);
      assert.ok(!FORBIDDEN_RE.test(s), `${where}: mengandung kata yang tidak dipakai di kuis`);
    });
  });
}

// Cross-topic checks. They run only over the topics that are present.
const presentTopics = TOPIC_NUMBERS.filter((n) => !loaded[n].missing && !loaded[n].error);

test('lintas topik: id topik, soal, esai, dan drill unik', () => {
  const topicIds = presentTopics.map((n) => loaded[n].topic.id);
  assert.equal(new Set(topicIds).size, topicIds.length, 'id topik duplikat');
  const questionIds = [];
  const essayIds = [];
  const drillIds = [];
  presentTopics.forEach((n) => {
    const topic = loaded[n].topic;
    topic.sections.forEach((s) => s.checks.forEach((q) => questionIds.push(q.id)));
    topic.essays.forEach((e) => essayIds.push(e.id));
    topic.sections.forEach((s) => s.blocks.forEach((b) => {
      if (b.type === 'widget' && b.props && b.props.drillId) drillIds.push(b.props.drillId);
    }));
  });
  assert.equal(new Set(questionIds).size, questionIds.length, 'id soal cek duplikat');
  assert.equal(new Set(essayIds).size, essayIds.length, 'id esai duplikat');
  assert.equal(new Set(drillIds).size, drillIds.length, 'drillId duplikat');
});

test('lintas topik: setiap drill yang dipakai di blok punya id unik per topik', () => {
  presentTopics.forEach((n) => {
    const ids = [];
    loaded[n].topic.sections.forEach((s) => s.blocks.forEach((b) => {
      if (b.type === 'widget' && b.props && b.props.drillId) ids.push(b.props.drillId);
    }));
    assert.ok(ids.every((id) => id.startsWith(`t${n}-d`)), `t${n}: drill harus memakai awalan t${n}-d`);
  });
});

// Golden spot-check: the engine must reproduce the Part 4 numbers that the content cites.
// Values are copied from PLAN2 Part 4, never recomputed by hand.
const GOLDEN = [
  { caseId: 'intro', mode: 'dfs', path: 'S-A-D-G', cost: 9, expanded: 3 },
  { caseId: 'intro', mode: 'ucs', path: 'S-A-D-G', cost: 9, expanded: 8 },
  { caseId: 'intro', mode: 'greedy', path: 'S-B-F-G', cost: 15, expanded: 3 },
  { caseId: 'intro', mode: 'astar', path: 'S-A-D-G', cost: 9, expanded: 6 },
  { caseId: 'intro', variant: 'D0', mode: 'astar', path: 'S-A-D-G', cost: 9, expanded: 7 },
  { caseId: 'intro', variant: 'A50', mode: 'astar', path: 'S-B-D-G', cost: 10, expanded: 5 },
  { caseId: 'intro', variant: 'H0', mode: 'astar', path: 'S-A-D-G', cost: 9, expanded: 8 },
  { caseId: 'assignment', mode: 'dfs', path: 'S-A-D-I-L-G', cost: 20, expanded: 5 },
  { caseId: 'assignment', mode: 'ucs', path: 'S-C-F-J-M-G', cost: 17, expanded: 13 },
  { caseId: 'assignment', mode: 'greedy', path: 'S-B-F-J-M-G', cost: 21, expanded: 5 },
  { caseId: 'assignment', mode: 'astar', path: 'S-C-F-J-M-G', cost: 17, expanded: 13 },
  { caseId: 'assignment', variant: 'V1', mode: 'greedy', path: 'S-C-F-J-M-G', cost: 17, expanded: 6 },
  { caseId: 'assignment', variant: 'V1', mode: 'astar', path: 'S-C-F-J-M-G', cost: 17, expanded: 13 },
  { caseId: 'assignment', variant: 'V3', mode: 'astar', path: 'S-C-F-J-M-G', cost: 17, expanded: 12 },
  { caseId: 'assignment', variant: 'V4', mode: 'greedy', path: 'S-C-F-J-M-G', cost: 17, expanded: 5 },
  { caseId: 'assignment', variant: 'V6', mode: 'greedy', path: 'S-B-E-J-M-G', cost: 20, expanded: 5 },
  { caseId: 'assignment', variant: 'V6', mode: 'astar', path: 'S-A-B-E-J-M-G', cost: 19, expanded: 10 },
  { caseId: 'assignment', variant: 'E1', mode: 'ucs', path: 'S-C-H-K-M-G', cost: 18, expanded: 13 },
  { caseId: 'assignment', variant: 'E1', mode: 'astar', path: 'S-C-H-K-M-G', cost: 18, expanded: 13 },
  { caseId: 'l2-tiny', mode: 'dfs', path: 'S-d-e-r-f-G', cost: 10, expanded: 11 },
  { caseId: 'l2-tiny', mode: 'ucs', path: 'S-d-e-r-f-G', cost: 10, expanded: 8 },
  { caseId: 'l3-teg', mode: 'dfs', path: 'S-a-d-G', cost: 6, expanded: 5 },
  { caseId: 'l3-teg', mode: 'ucs', path: 'S-a-d-G', cost: 6, expanded: 5 },
  { caseId: 'l3-teg', mode: 'greedy', path: 'S-a-d-G', cost: 6, expanded: 4 },
  { caseId: 'l3-teg', mode: 'astar', path: 'S-a-d-G', cost: 6, expanded: 3 },
  { caseId: 'romania', mode: 'dfs', path: 'A-S-F-B', cost: 450, expanded: 3 },
  { caseId: 'romania', mode: 'ucs', path: 'A-S-R-P-B', cost: 418, expanded: 12 },
  { caseId: 'romania', mode: 'greedy', path: 'A-S-F-B', cost: 450, expanded: 3 },
  { caseId: 'romania', mode: 'astar', path: 'A-S-R-P-B', cost: 418, expanded: 5 }
];

function runGolden(g) {
  assert.ok(engine, `algorithms.js gagal dimuat: ${engineError && engineError.message}`);
  assert.ok(cases, `cases.js gagal dimuat: ${casesError && casesError.message}`);
  let problem = cases[g.caseId];
  if (g.variant) problem = engine.applyVariant(problem, g.variant);
  const result = engine.runCase(problem, g.mode, {});
  const r = result && result.result ? result.result : result;
  return r;
}

test('mesin: jalur, cost, dan jumlah ekspansi cocok dengan angka di materi (PLAN2 Part 4)', () => {
  const failures = [];
  GOLDEN.forEach((g) => {
    const label = `${g.caseId}${g.variant ? ' ' + g.variant : ''} ${g.mode}`;
    const r = runGolden(g);
    const path = Array.isArray(r.path) ? r.path.join('-') : String(r.path);
    const expanded = Array.isArray(r.expanded) ? r.expanded.length : r.expanded;
    if (path !== g.path) failures.push(`${label}: path ${path}, seharusnya ${g.path}`);
    if (r.cost !== g.cost) failures.push(`${label}: cost ${r.cost}, seharusnya ${g.cost}`);
    if (expanded !== g.expanded) failures.push(`${label}: ekspansi ${expanded}, seharusnya ${g.expanded}`);
  });
  assert.deepEqual(failures, [], failures.join('\n'));
});

test('mesin: traceTable memberi satu baris per ekspansi ditambah baris goal', () => {
  assert.ok(engine && typeof engine.traceTable === 'function', 'traceTable belum tersedia di algorithms.js');
  GOLDEN.forEach((g) => {
    const r = runGolden(g);
    const table = engine.traceTable(r, g.mode);
    assert.equal(table.rows.length, g.expanded + 1, `${g.caseId} ${g.mode}: baris trace harus ${g.expanded + 1}`);
    assert.equal(table.rows[table.rows.length - 1].action, 'goal', `${g.caseId} ${g.mode}: baris terakhir harus goal`);
  });
});

test('mesin: setiap trace-table dan trace-drill di konten punya caseId dan mode yang bisa dijalankan', () => {
  assert.ok(engine && typeof engine.runCase === 'function', 'runCase belum tersedia di algorithms.js');
  presentTopics.forEach((n) => {
    const visit = (blocks) => (blocks || []).forEach((b) => {
      if (b.type !== 'widget') return;
      const p = b.props || {};
      if (!['trace-table', 'trace-drill'].includes(b.widget)) return;
      let problem = cases[p.caseId];
      if (p.variant) problem = engine.applyVariant(problem, p.variant);
      const r = engine.runCase(problem, p.mode, {});
      assert.ok(r, `t${n}: ${b.widget} ${p.caseId} ${p.mode} tidak menghasilkan hasil`);
    });
    loaded[n].topic.sections.forEach((s) => visit(s.blocks));
    loaded[n].topic.essays.forEach((e) => {
      visit(e.solutionBlocks);
      if (e.figure) visit([{ type: 'widget', widget: e.figure.widget, props: e.figure.props }]);
    });
  });
});
