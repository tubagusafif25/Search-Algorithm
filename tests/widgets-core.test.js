'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const KKAWidgets = require('../widgets-core.js');
require('../widgets-drill.js');
const engine = require('../algorithms.js');
const cases = require('../cases.js');
const {util} = KKAWidgets;

const NAMES = ['search-sim', 'graph-view', 'trace-table', 'consistency-table', 'variant-lab', 'heuristic-tuner',
  'minimax-sim', 'queens', 'trace-drill', 'ab-drill', 'tsp-hc'];

// ---- minimal DOM so widgets can mount in Node -------------------------------------
function makeNode() {
  return {
    className: '', innerHTML: '', dataset: {}, children: [], listeners: {},
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter(f => f !== fn); },
    contains() { return true; },
    querySelector() { return null; },
    replaceChildren(...kids) { this.children = kids; },
    closest() { return null; }
  };
}
global.document = {activeElement: null, createElement: () => makeNode()};

function fakeForm(formName, values) {
  const inputs = Object.entries(values).map(([name, value]) => ({name, value: String(value), type: 'text'}));
  const elements = {};
  for (const input of inputs) elements[input.name] = input;
  return {dataset: {form: formName}, elements, querySelectorAll: () => inputs, closest: () => null};
}

function mountWidget(name, props = {}, extraCtx = {}) {
  const reports = [], announcements = [];
  const el = makeNode();
  const ctx = Object.assign({uid: 'u1', report: (...args) => reports.push(args), saved: () => null, announce: m => announcements.push(m)}, extraCtx);
  const handle = KKAWidgets.mount(el, name, props, ctx);
  const wrap = el.children[0];
  return {
    el, wrap, handle, reports, announcements,
    html: () => wrap ? wrap.innerHTML : el.innerHTML,
    submit(formName, values) {
      const form = fakeForm(formName, values);
      wrap.listeners.submit.forEach(fn => fn({target: form, preventDefault() {}}));
      return form;
    },
    change(field, value, form = null) {
      const target = {dataset: {field}, value, checked: !!value, closest: sel => sel === 'form' ? form : null};
      wrap.listeners.change.forEach(fn => fn({target}));
    },
    act(action, form = null) {
      const target = {dataset: {action}, disabled: false, closest: sel => sel === 'form' ? form : sel === '[data-action]' ? target : null};
      wrap.listeners.click.forEach(fn => fn({target}));
    }
  };
}

test('registry lists exactly the eleven widgets of the plan', () => {
  assert.deepEqual(KKAWidgets.names().slice().sort(), NAMES.slice().sort());
});

test('graphSVG output contains every node id and label for every search and tree case, with no script', () => {
  const searchCases = Object.values(cases).filter(c => c.kind === 'search');
  const treeCases = Object.values(cases).filter(c => c.kind === 'tree');
  assert.ok(searchCases.length >= 7 && treeCases.length >= 5);
  for (const c of searchCases) {
    const svg = util.graphSVG(c, {}, {showLegend: false});
    assert.ok(!svg.includes('<script'), c.id);
    for (const id of Object.keys(c.graph)) assert.ok(svg.includes('>' + id + '<'), c.id + ' node ' + id);
    if (c.labels) for (const label of Object.values(c.labels)) assert.ok(svg.includes(label), c.id + ' label ' + label);
    assert.ok(svg.includes('<details'), c.id + ' has a text alternative');
  }
  for (const c of treeCases) {
    const svg = util.graphSVG(c, {}, {showLegend: false});
    assert.ok(svg.includes('class="kka-graph"'), c.id);
    assert.ok(svg.includes('>' + c.tree.id + '<'), c.id + ' root');
  }
});

test('undirected graphs draw one line per pair with no arrowheads', () => {
  const svg = util.graphSVG(cases.romania, {}, {showLegend: false});
  assert.equal((svg.match(/<g class="edge/g) || []).length, 23);
  assert.ok(!svg.includes('marker-end'));
});

test('unknown widget name renders a readable placeholder and returns a noop handle', () => {
  const el = makeNode();
  const handle = KKAWidgets.mount(el, 'does-not-exist', {}, {uid: 'w1'});
  assert.match(el.innerHTML, /Widget belum tersedia: does-not-exist/);
  assert.doesNotThrow(() => handle.destroy());
});

test('a widget with a bad case id shows an error message instead of throwing', () => {
  const widget = mountWidget('trace-table', {caseId: 'tidak-ada', mode: 'ucs'});
  assert.match(widget.el.innerHTML, /Widget gagal dimuat: Kasus tidak ditemukan/);
});

test('loading the engine, cases and widget files in a context without a DOM does not throw', () => {
  const context = {window: undefined};
  const scripts = ['algorithms.js', 'cases.js', 'widgets-core.js', 'widgets-drill.js'].map(f => fs.readFileSync(require.resolve('../' + f), 'utf8'));
  assert.doesNotThrow(() => vm.runInNewContext(scripts.join('\n;\n'), context));
  assert.ok(context.KKAWidgets && typeof context.KKAWidgets.register === 'function');
  assert.ok(context.KKAWidgets.drill && typeof context.KKAWidgets.drill.checkRow === 'function');
});

test('trace-table lists the UCS rows of intro with the skipped stale pop and the summary', () => {
  const html = mountWidget('trace-table', {caseId: 'intro', mode: 'ucs'}).html();
  assert.ok(!html.includes('gagal dimuat'));
  assert.match(html, /Dilewati tanpa nomor iterasi: E\(g=7\)/);
  assert.match(html, /Frontier sesudah/);
  assert.match(html, /S → A → D → G/);
  assert.match(html, /Pembaruan jalur/);
  assert.match(html, /<td>E<\/td>/);
});

test('trace-table uses the DFS stack column and the A* g/h/f columns', () => {
  const dfs = mountWidget('trace-table', {caseId: 'intro', mode: 'dfs'}).html();
  assert.match(dfs, /Stack sesudah \(atas → bawah\)/);
  const astar = mountWidget('trace-table', {caseId: 'assignment', mode: 'astar'}).html();
  assert.match(astar, /<th scope="col">f<\/th>/);
  assert.match(astar, /B\(g=4,h=7,f=11\)/);
});

test('search-sim mounts in every mode and steps through to the result', () => {
  const widget = mountWidget('search-sim', {caseId: 'intro', modes: ['dfs', 'ucs', 'greedy', 'astar']});
  assert.ok(!widget.html().includes('gagal dimuat'));
  assert.match(widget.html(), /Frontier sesudah langkah ini/);
  for (let i = 0; i < 40; i++) widget.act('next');
  assert.match(widget.html(), /Hasil akhir/);
  assert.match(widget.html(), /S → B → F → G|S → A → D → G/);
  assert.doesNotThrow(() => widget.handle.destroy());
});

test('search-sim with a variant applies the variant heuristic', () => {
  const plain = mountWidget('search-sim', {caseId: 'assignment', modes: ['astar']}).html();
  const variant = mountWidget('search-sim', {caseId: 'assignment', variant: 'V3', modes: ['astar']}).html();
  assert.notEqual(plain, variant);
  assert.match(variant, /Variasi V3/);
});

test('graph-view with a variant shows the variant title', () => {
  const html = mountWidget('graph-view', {caseId: 'assignment', variant: 'E1'}).html();
  assert.match(html, /Variasi E1/);
});

test('consistency-table: the baseline has no violations and V3 lists four', () => {
  const base = mountWidget('consistency-table', {caseId: 'assignment'}).html();
  assert.match(base, /Tidak ada pelanggaran/);
  assert.match(base, /Semua h ≤ h\*/);
  const v3 = mountWidget('consistency-table', {caseId: 'assignment', variant: 'V3'}).html();
  assert.match(v3, /4 pelanggaran/);
  for (const [from, to] of [['C', 'B'], ['F', 'E'], ['F', 'J'], ['H', 'K']]) assert.match(v3, new RegExp('<td>' + from + '</td><td>' + to + '</td>'));
});

test('variant-lab with V3 shows J reopened and cost 17 in the comparison', () => {
  const widget = mountWidget('variant-lab', {caseId: 'assignment', mode: 'astar', presets: ['V1', 'V3', 'V4', 'V6', 'E1']});
  assert.match(widget.html(), /Variasi dari graf tugas — bukan soal resmi/);
  widget.change('preset', 'V3');
  assert.match(widget.html(), /J \(iterasi 9\)/);
  assert.match(widget.html(), /<td>Cost<\/td><td>17<\/td><td>17<\/td>/);
});

test('variant-lab preset select changes the variant and the comparison', () => {
  const widget = mountWidget('variant-lab', {caseId: 'assignment', mode: 'greedy', presets: ['V1', 'V6']});
  assert.match(widget.html(), /<td>Cost<\/td><td>21<\/td><td>17<\/td>/);
  widget.change('preset', 'V6');
  assert.match(widget.html(), /<td>Cost<\/td><td>21<\/td><td>20<\/td>/);
});

test('variant-lab custom edit applies typed h values and labels the variant as custom', () => {
  const widget = mountWidget('variant-lab', {caseId: 'assignment', mode: 'astar', presets: ['V1']});
  const values = {};
  for (const s of Object.keys(cases.assignment.graph)) if (s !== 'G') values['h-' + s] = String(cases.assignment.heuristic[s]);
  values['h-C'] = '15';
  let i = 0;
  for (const list of Object.values(cases.assignment.graph)) for (const [, cost] of list) values['e-' + i++] = String(cost);
  widget.submit('variant', values);
  assert.match(widget.html(), /Variasi kustom/);
  assert.match(widget.html(), /Melebihi h\* \(tidak admissible\)<\/td><td>tidak ada<\/td><td>C<\/td>/);
});

test('heuristic-tuner shows the admissibility badge for h(A)', () => {
  const html = mountWidget('heuristic-tuner', {caseId: 'l3-admissible', node: 'A', min: 0, max: 8}).html();
  assert.match(html, /h\(A\) = <strong>6<\/strong>/);
  assert.match(html, /tidak admissible/);
});

test('minimax-sim event table uses slide notation and marks the O cut in tree-lecture', () => {
  const widget = mountWidget('minimax-sim', {caseId: 'tree-lecture', prune: true, allowToggle: true, order: 'left'});
  const html = widget.html();
  assert.match(html, /Tabel peristiwa \(notasi slide\)/);
  assert.match(html, /β\(O\) = -3|β\(O\) = −3/);
  assert.match(html, /ya: X/);
  for (let i = 0; i < 60; i++) widget.act('next');
  assert.match(widget.html(), /Nilai root: 0/);
  assert.match(widget.html(), /langkah terbaik: D/);
});

test('minimax-sim with pruning off reports the same root as pruning on', () => {
  const on = mountWidget('minimax-sim', {caseId: 'tree-uw', prune: true, allowToggle: true, allowPruneOnToggle: true});
  const off = mountWidget('minimax-sim', {caseId: 'tree-uw', prune: false, allowToggle: true});
  for (let i = 0; i < 200; i++) { on.act('next'); off.act('next'); }
  assert.match(on.html(), /Nilai root: 4/);
  assert.match(off.html(), /Nilai root: 4/);
  assert.match(on.html(), /Aturan pangkas/);
});

test('queens hill mode reaches the 8-queens steepest-ascent result from slide 11', () => {
  const widget = mountWidget('queens', {start: '43254323', mode: 'hill', showGrid: true});
  assert.match(widget.html(), /h = <strong>17<\/strong>/);
  for (let i = 0; i < 20; i++) widget.act('next');
  assert.match(widget.html(), /Susunan: <strong>36251473<\/strong>/);
  assert.match(widget.html(), /h = <strong>1<\/strong>/);
});

test('queens explore mode lists the 56 neighbour h values in the text alternative', () => {
  const html = mountWidget('queens', {start: '43254323', mode: 'explore'}).html();
  assert.match(html, /Pindah ke tetangga terbaik/);
  assert.match(html, /Alternatif teks: h untuk setiap baris dan kolom/);
});

// ---- drill widgets through the fake DOM -----------------------------------------
function engineRows(caseId, mode) {
  const c = cases[caseId];
  return engine.traceTable(engine.runSearch({graph: c.graph, start: c.start, goal: c.goal, heuristic: c.heuristic, mode, maxExpansions: 1000}), mode);
}
function rowValues(row, mode) {
  const v = {selected: row.selected, action: row.action, frontier: row.frontierText};
  if (mode === 'greedy') v.h = String(row.h);
  else if (mode === 'astar') { v.g = String(row.g); v.h = String(row.h); v.f = String(row.f); }
  else v.g = String(row.g);
  return v;
}

test('trace-drill: a wrong first try gives field feedback, the right answer advances, and the drill completes', () => {
  const table = engineRows('intro', 'ucs');
  const widget = mountWidget('trace-drill', {caseId: 'intro', mode: 'ucs', drillId: 't2-d1'});
  assert.match(widget.html(), /Baris 1/);
  assert.match(widget.html(), /Frontier sebelum baris ini: <span class="mono">S\(g=0\)<\/span>/);
  const first = table.rows[0];
  widget.submit('row', {selected: 'S', g: '0', action: 'expand', frontier: 'C(g=3); A(g=2); B(g=4)'});
  assert.match(widget.html(), /Urutan berbeda pada posisi 1: seharusnya A\./);
  assert.match(widget.html(), /Belum benar/);
  widget.submit('row', Object.assign({}, rowValues(first, 'ucs'), {selected: first.selected, frontier: first.frontierText}));
  assert.match(widget.html(), /Baris 2/);
  assert.deepEqual(widget.reports.at(-1), ['t2-d1', {completed: false, correctFirstTry: 0, total: table.rows.length + 1}]);
  for (const row of table.rows.slice(1)) widget.submit('row', rowValues(row, 'ucs'));
  const summary = {path: table.path.join('-'), cost: String(table.cost), expanded: String(table.expanded), order: table.expansionOrder.join(', ')};
  widget.submit('summary', summary);
  assert.match(widget.html(), /Latihan selesai/);
  const last = widget.reports.at(-1);
  assert.equal(last[0], 't2-d1');
  assert.equal(last[1].completed, true);
  assert.equal(last[1].correctFirstTry, table.rows.length);
  assert.equal(last[1].total, table.rows.length + 1);
});

test('trace-drill reveals the key of a row and records it as not first try', () => {
  const widget = mountWidget('trace-drill', {caseId: 'intro', mode: 'dfs', drillId: 't1-d1'});
  widget.act('reveal');
  assert.match(widget.html(), /Kunci baris 1: S/);
  assert.match(widget.html(), /Baris 2/);
  assert.equal(widget.reports.at(-1)[1].correctFirstTry, 0);
});

test('trace-drill mentions skipped entries after the row where they are popped', () => {
  const table = engineRows('intro', 'ucs');
  const widget = mountWidget('trace-drill', {caseId: 'intro', mode: 'ucs'});
  const withSkip = table.rows.findIndex(r => r.skippedAfter.length > 0);
  for (const row of table.rows.slice(0, withSkip + 1)) widget.submit('row', rowValues(row, 'ucs'));
  assert.match(widget.html(), /Dilewati tanpa nomor iterasi|di-pop dan dilewati/);
});

test('trace-drill accepts spacing and separator variations in the frontier', () => {
  const table = engineRows('assignment', 'astar');
  const widget = mountWidget('trace-drill', {caseId: 'assignment', mode: 'astar', drillId: 't4-d2'});
  for (const row of table.rows.slice(0, 3)) {
    const v = rowValues(row, 'astar');
    v.frontier = v.frontier.replace(/; /g, ',  ').replace(/\(/g, ' (');
    widget.submit('row', v);
  }
  assert.match(widget.html(), /Baris 4/);
  assert.equal(widget.reports.at(-1)[1].correctFirstTry, 3);
});

test('trace-drill with statesOnly accepts wrong numbers but not wrong states', () => {
  const table = engineRows('intro', 'greedy');
  const widget = mountWidget('trace-drill', {caseId: 'intro', mode: 'greedy', statesOnlyOption: true});
  const r = table.rows[0];
  const form = fakeForm('row', {selected: r.selected, h: '99', action: 'expand', frontier: r.frontierText});
  widget.change('statesOnly', 'on', form);
  widget.submit('row', {selected: r.selected, h: '99', action: 'expand', frontier: r.frontierText});
  assert.match(widget.html(), /Baris 2/);
  widget.submit('row', {selected: 'X', h: '99', action: 'expand', frontier: r.frontierText});
  assert.match(widget.html(), /Dipilih salah: seharusnya/);
});

test('trace-drill: destroy removes listeners and empties the element', () => {
  const widget = mountWidget('trace-drill', {caseId: 'intro', mode: 'ucs'});
  widget.handle.destroy();
  assert.equal(widget.wrap.listeners.submit.length, 0);
  assert.equal(widget.wrap.listeners.click.length, 0);
  assert.deepEqual(widget.el.children, []);
  assert.doesNotThrow(() => widget.handle.destroy());
});

test('ab-drill: answering every event with the engine values completes the drill on tree-lecture', () => {
  const tree = cases['tree-lecture'];
  const result = engine.runMinimax(tree.tree, {prune: true, order: 'left', pruneOn: 'gte'});
  const widget = mountWidget('ab-drill', {caseId: 'tree-lecture', order: 'left', pruneOn: 'gte', drillId: 't6-d2'});
  for (const e of result.events) {
    const values = {value: String(e.nodeValue)};
    if (e.remaining) values.prune = e.cut ? 'ya' : 'tidak';
    widget.submit('event', values);
  }
  assert.match(widget.html(), /Hasil akhir/);
  widget.submit('final', {value: String(result.value), best: result.bestMove, pruned: result.pruned.join(', ')});
  assert.match(widget.html(), /Latihan selesai/);
  assert.equal(widget.reports.at(-1)[1].completed, true);
});

test('ab-drill: a wrong prune answer explains the window and does not advance', () => {
  const result = engine.runMinimax(cases['l5-rn'].tree, {prune: true});
  const k = result.events.findIndex(e => e.remaining);
  assert.ok(k >= 0, 'l5-rn has an event with children remaining');
  const widget = mountWidget('ab-drill', {caseId: 'l5-rn', order: 'left', pruneOn: 'gte'});
  for (const e of result.events.slice(0, k)) widget.submit('event', Object.assign({value: String(e.nodeValue)}, e.remaining ? {prune: e.cut ? 'ya' : 'tidak'} : {}));
  const cut = result.events[k];
  widget.submit('event', {value: String(cut.nodeValue), prune: cut.cut ? 'tidak' : 'ya'});
  assert.match(widget.html(), /Seharusnya (ya|tidak)/);
  assert.match(widget.html(), /Langkah 1|Langkah /);
});

test('tsp-hc replay shows the first iteration with the tie rule and the decision', () => {
  const widget = mountWidget('tsp-hc', {caseId: 'tsp5', start: 'ABCDE', mode: 'replay'});
  const html = widget.html();
  assert.match(html, /Iterasi 0/);
  assert.match(html, /Seri: #3 dan #5 sama\. Aturan: pilih yang pertama dalam urutan, yaitu #3\./);
  assert.match(html, /Move: biaya terbaik 22\.3760/);
  for (let i = 0; i < 5; i++) widget.act('next');
  assert.match(widget.html(), /Hasil akhir/);
  assert.match(widget.html(), /21\.3453/);
});

test('tsp-hc drill: picking the tied #5 at iteration 0 points to #3', () => {
  const widget = mountWidget('tsp-hc', {caseId: 'tsp5', start: 'ABCDE', mode: 'drill', drillId: 't5-d1'});
  widget.submit('tsp', {best: '5', bestCost: '22.3760', decision: 'Move'});
  assert.match(widget.html(), /Neighbor #5 juga berbiaya sama dengan #3/);
  assert.match(widget.html(), /Belum benar/);
  widget.submit('tsp', {best: '3', bestCost: '22.3760', decision: 'Move'});
  assert.match(widget.html(), /Iterasi 1/);
  assert.equal(widget.reports.at(-1)[1].correctFirstTry, 0, 'the wrong first try is not counted');
});

test('tsp-hc float toggle switches the tie to the notebook choice', () => {
  const widget = mountWidget('tsp-hc', {caseId: 'tsp5', start: 'ABCDE', mode: 'replay'});
  const float = engine.runTSP({cities: cases.tsp5.cities, route: ['A', 'B', 'C', 'D', 'E'], tie: 'float'});
  widget.change('tie', 'float');
  assert.match(widget.html(), new RegExp('neighbor terbaik: <strong>#' + float.iterations[0].best.index + '</strong>|Neighbor terbaik: <strong>#' + float.iterations[0].best.index + '</strong>'));
});

test('every drill and simulator widget can be mounted and destroyed without leaving listeners', () => {
  const mounts = [
    ['trace-drill', {caseId: 'intro', mode: 'astar'}],
    ['ab-drill', {caseId: 'l5-rn'}],
    ['tsp-hc', {caseId: 'tsp5', start: 'ABCDE', mode: 'drill'}],
    ['variant-lab', {caseId: 'intro', mode: 'astar', presets: ['D0']}],
    ['search-sim', {caseId: 'l3-teg', modes: ['ucs', 'greedy', 'astar']}],
    ['minimax-sim', {caseId: 'l5-minimax'}],
    ['queens', {start: '43254323', mode: 'hill'}],
    ['trace-table', {caseId: 'l3-teg', mode: 'greedy'}],
    ['consistency-table', {caseId: 'intro'}]
  ];
  for (const [name, props] of mounts) {
    const widget = mountWidget(name, props);
    assert.ok(!widget.html().includes('gagal dimuat'), name);
    widget.handle.destroy();
    assert.deepEqual(widget.el.children, [], name);
    if (widget.wrap) for (const list of Object.values(widget.wrap.listeners)) assert.equal(list.length, 0, name);
  }
});

test('the old prediction helpers are gone and the trace utility is exported', () => {
  assert.equal(util.predictionMatches, undefined);
  assert.equal(typeof util.traceTableHTML, 'function');
  assert.equal(typeof util.makeStepper, 'function');
});
