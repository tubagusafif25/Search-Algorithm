'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const KKAWidgets = require('../widgets-drill.js');
const drill = KKAWidgets.drill;
const cases = require('../cases.js');

const ASSIGNMENT_STATES = Object.keys(cases.assignment.graph);

// assignment, A*, row 4 (plan PART 4.2): B expanded with g=4, h=7, f=11.
const ROW4 = {
  iteration: 4, selected: 'B', g: 4, h: 7, f: 11, action: 'expand',
  frontier: [
    {state: 'F', g: 7, h: 5, f: 12}, {state: 'E', g: 6, h: 6, f: 12},
    {state: 'D', g: 7, h: 7, f: 14}, {state: 'H', g: 9, h: 5, f: 14}
  ]
};
const ROW4_TEXT = 'F(g=7,h=5,f=12); E(g=6,h=6,f=12); D(g=7,h=7,f=14); H(g=9,h=5,f=14)';
const opts = {states: ASSIGNMENT_STATES};

test('parseFrontierText accepts spacing, comma and semicolon variations', () => {
  const plain = drill.parseFrontierText('A(g=3,h=8,f=11); B(g=5,h=7,f=12)');
  assert.equal(plain.ok, true);
  assert.deepEqual(plain.entries, [{state: 'A', g: 3, h: 8, f: 11}, {state: 'B', g: 5, h: 7, f: 12}]);
  const commas = drill.parseFrontierText('A(g=3,h=8,f=11), B(g=5,h=7,f=12)');
  assert.deepEqual(commas.entries, plain.entries);
  const spaced = drill.parseFrontierText('  A ( g = 3 , h = 8 , f = 11 )  ;B(g=5,h=7,f=12);  ');
  assert.deepEqual(spaced.entries, plain.entries);
  const colon = drill.parseFrontierText('A(g:3,h:8,f:11);B(g:5,h:7,f:12)');
  assert.deepEqual(colon.entries, plain.entries);
});

test('parseFrontierText reads empty frontiers and dash markers as no entries', () => {
  for (const text of ['(kosong)', '  (KOSONG) ', '', '   ', '-', '—']) {
    const parsed = drill.parseFrontierText(text);
    assert.equal(parsed.ok, true, JSON.stringify(text));
    assert.deepEqual(parsed.entries, [], JSON.stringify(text));
  }
});

test('parseFrontierText reads the greedy format and duplicate states', () => {
  assert.deepEqual(drill.parseFrontierText('B(h=2); C(h=6)').entries, [{state: 'B', h: 2}, {state: 'C', h: 6}]);
  assert.deepEqual(drill.parseFrontierText('E(g=9); E(g=10)').entries, [{state: 'E', g: 9}, {state: 'E', g: 10}]);
});

test('parseFrontierText keeps lowercase state names and negative values', () => {
  assert.deepEqual(drill.parseFrontierText('d(g=3); p(g=1)').entries, [{state: 'd', g: 3}, {state: 'p', g: 1}]);
  assert.deepEqual(drill.parseFrontierText('X(g=-1.5)').entries, [{state: 'X', g: -1.5}]);
});

test('parseFrontierText rejects malformed entries with an Indonesian message', () => {
  const broken = drill.parseFrontierText('A(g=3');
  assert.equal(broken.ok, false);
  assert.match(broken.error, /Tidak bisa membaca/);
  const badKey = drill.parseFrontierText('A(x=3)');
  assert.equal(badKey.ok, false);
  assert.match(badKey.error, /tidak dikenali/);
});

test('checkRow accepts the correct astar row 4 of the assignment graph', () => {
  const answer = {selected: 'B', g: '4', h: '7', f: '11', action: 'expand', frontier: ROW4_TEXT};
  const result = drill.checkRow(answer, ROW4, 'astar', opts);
  assert.equal(result.ok, true, result.messages.join(' | '));
  assert.deepEqual(result.messages, []);
});

test('checkRow reports a wrong order with the position and the expected state', () => {
  const answer = {selected: 'B', g: '4', h: '7', f: '11', action: 'expand',
    frontier: 'E(g=6,h=6,f=12); F(g=7,h=5,f=12); D(g=7,h=7,f=14); H(g=9,h=5,f=14)'};
  const result = drill.checkRow(answer, ROW4, 'astar', opts);
  assert.equal(result.ok, false);
  assert.equal(result.fields.frontier.ok, false);
  assert.match(result.fields.frontier.message, /Urutan berbeda pada posisi 1: seharusnya F\./);
});

test('checkRow reports a wrong g for the selected state', () => {
  const answer = {selected: 'B', g: '5', h: '7', f: '12', action: 'expand', frontier: ROW4_TEXT};
  const result = drill.checkRow(answer, ROW4, 'astar', opts);
  assert.equal(result.ok, false);
  assert.match(result.fields.g.message, /Nilai g untuk B seharusnya 4\./);
  assert.match(result.fields.f.message, /Nilai f untuk B seharusnya 11\./);
  assert.equal(result.fields.h.ok, true);
});

test('checkRow reports a missing entry and an entry that should not be there', () => {
  const missing = drill.checkRow({selected: 'B', g: '4', h: '7', f: '11', action: 'expand',
    frontier: 'F(g=7,h=5,f=12); E(g=6,h=6,f=12); D(g=7,h=7,f=14)'}, ROW4, 'astar', opts);
  assert.match(missing.fields.frontier.message, /Entri H\(g=9,h=5,f=14\) belum ditulis\./);
  const extra = drill.checkRow({selected: 'B', g: '4', h: '7', f: '11', action: 'expand',
    frontier: ROW4_TEXT + '; B(g=5,h=7,f=12)'}, ROW4, 'astar', opts);
  assert.match(extra.fields.frontier.message, /Entri B tidak seharusnya ada/);
});

test('checkRow compares the selected state case-insensitively when the name is unique', () => {
  const lower = {iteration: 1, selected: 'd', g: 3, h: null, f: null, action: 'expand',
    frontier: [{state: 'p', g: 1}, {state: 'e', g: 9}]};
  const typedUpper = drill.checkRow({selected: 'D', g: '3', action: 'ekspansi', frontier: 'p(g=1); e(g=9)'}, lower, 'dfs', {states: ['S', 'd', 'p', 'e']});
  assert.equal(typedUpper.fields.selected.ok, true, 'D maps to d because d is the only state with that letter');
  const typedWrong = drill.checkRow({selected: 'p', g: '3', action: 'expand', frontier: 'p(g=1); e(g=9)'}, lower, 'dfs', {states: ['S', 'd', 'p', 'e']});
  assert.match(typedWrong.fields.selected.message, /Dipilih salah: seharusnya d\./);
});

test('checkRow in statesOnly mode accepts wrong numbers but still checks names and order', () => {
  const answer = {selected: 'B', g: '99', h: '0', f: '0', action: 'expand', frontier: 'F(g=0,h=0,f=0); E(g=1,h=1,f=1); D(h=2); H(g=3)'};
  const result = drill.checkRow(answer, ROW4, 'astar', Object.assign({statesOnly: true}, opts));
  assert.equal(result.ok, true, result.messages.join(' | '));
  const wrongOrder = drill.checkRow({selected: 'B', g: '4', h: '7', f: '11', action: 'expand', frontier: 'E(g=6); F(g=7); D(g=7); H(g=9)'},
    ROW4, 'astar', Object.assign({statesOnly: true}, opts));
  assert.equal(wrongOrder.ok, false);
});

test('checkRow checks the action and the goal row', () => {
  const goalRow = {iteration: 9, selected: 'G', g: 9, h: null, f: null, action: 'goal', frontier: []};
  assert.equal(drill.checkRow({selected: 'G', g: '9', action: 'expand', frontier: '(kosong)'}, goalRow, 'ucs', opts).fields.action.ok, false);
  assert.equal(drill.checkRow({selected: 'G', g: '9', action: 'Goal', frontier: '-'}, goalRow, 'ucs', opts).ok, true);
});

test('checkRow for greedy uses h only', () => {
  const row = {iteration: 1, selected: 'S', g: 0, h: 6, f: null, action: 'expand',
    frontier: [{state: 'B', h: 2}, {state: 'C', h: 6}, {state: 'A', h: 7}]};
  const good = drill.checkRow({selected: 'S', h: '6', action: 'expand', frontier: 'B(h=2); C(h=6); A(h=7)'}, row, 'greedy', opts);
  assert.equal(good.ok, true, good.messages.join(' | '));
  const bad = drill.checkRow({selected: 'S', h: '6', action: 'expand', frontier: 'B(h=2); C(h=5); A(h=7)'}, row, 'greedy', opts);
  assert.match(bad.fields.frontier.message, /Nilai h untuk C di frontier seharusnya 6\./);
});

test('checkSummary compares path, cost, expansions and order', () => {
  const expected = {path: ['S', 'A', 'D', 'G'], cost: 9, costTerms: ['2', '2', '5'], expanded: 3, expansionOrder: ['S', 'A', 'D']};
  const good = drill.checkSummary({path: 'S-A-D-G', cost: '9', expanded: '3', order: 'S, A, D'}, expected);
  assert.equal(good.ok, true, good.messages.join(' | '));
  const bad = drill.checkSummary({path: 'S-B-F-G', cost: '15', expanded: '4', order: 'S A B F'}, expected);
  assert.equal(bad.ok, false);
  assert.match(bad.fields.cost.message, /seharusnya 9 \(2 \+ 2 \+ 5\)/);
  assert.match(bad.fields.expanded.message, /seharusnya 3/);
  assert.match(bad.fields.order.message, /seharusnya S, A, D/);
});

test('normalizePath accepts arrows, dashes, commas and spaces', () => {
  assert.deepEqual(drill.normalizePath('S → A → D → G'), ['S', 'A', 'D', 'G']);
  assert.deepEqual(drill.normalizePath('S->A->D->G'), ['S', 'A', 'D', 'G']);
  assert.deepEqual(drill.normalizePath('S-A-D-G'), ['S', 'A', 'D', 'G']);
  assert.deepEqual(drill.normalizePath('S, A, D, G'), ['S', 'A', 'D', 'G']);
  assert.deepEqual(drill.normalizePath('S A D G'), ['S', 'A', 'D', 'G']);
  assert.deepEqual(drill.normalizePath('(kosong)'), []);
  assert.deepEqual(drill.normalizePath(''), []);
});

const TSP_ITER_0 = {
  iteration: 0, route: ['A', 'B', 'C', 'D', 'E'], cost: 23.5638, decision: 'Move',
  neighbors: [
    {index: 1, i: 0, j: 1, cost: 22.5410}, {index: 2, i: 0, j: 2, cost: 27.5791},
    {index: 3, i: 0, j: 3, cost: 22.3760}, {index: 4, i: 0, j: 4, cost: 24.4870},
    {index: 5, i: 1, j: 2, cost: 22.3760}, {index: 6, i: 1, j: 3, cost: 24.4870},
    {index: 7, i: 1, j: 4, cost: 24.4296}, {index: 8, i: 2, j: 3, cost: 24.4296},
    {index: 9, i: 2, j: 4, cost: 22.5410}, {index: 10, i: 3, j: 4, cost: 27.5791}
  ],
  best: {index: 3, cost: 22.3760}
};

test('checkTspStep accepts the first tied neighbour and rejects the later tie with a pointer to #3', () => {
  const good = drill.checkTspStep({best: '3', bestCost: '22.3760', decision: 'Move'}, TSP_ITER_0);
  assert.equal(good.ok, true, good.messages.join(' | '));
  const tied = drill.checkTspStep({best: '5', bestCost: '22.3760', decision: 'Move'}, TSP_ITER_0);
  assert.equal(tied.ok, false);
  assert.match(tied.fields.best.message, /juga berbiaya sama dengan #3/);
  assert.match(tied.fields.best.message, /yaitu #3/);
  assert.equal(tied.fields.bestCost.ok, true, 'the cost of a tied neighbour is still right');
});

test('checkTspStep accepts costs within 0.0002 and rejects larger errors', () => {
  const near = drill.checkTspStep({costs: ['', '', '22.3761'], best: '3', bestCost: '22.376', decision: 'Move'}, TSP_ITER_0);
  assert.equal(near.ok, true, near.messages.join(' | '));
  const far = drill.checkTspStep({costs: ['', '', '22.5000'], best: '3', bestCost: '22.3760', decision: 'Move'}, TSP_ITER_0);
  assert.equal(far.ok, false);
  assert.deepEqual(far.costs.map(c => c.ok), [false]);
  assert.match(far.costs[0].message, /Biaya #3 seharusnya 22\.3760/);
});

test('checkTspStep reports a non-best neighbour and the decision', () => {
  const wrong = drill.checkTspStep({best: '1', bestCost: '22.5410', decision: 'Stop'}, TSP_ITER_0);
  assert.match(wrong.fields.best.message, /bukan yang terbaik. Yang terkecil adalah #3/);
  assert.match(wrong.fields.decision.message, /seharusnya Move/);
  assert.equal(drill.checkTspStep({best: '3', bestCost: '22.3760', decision: 'pindah'}, TSP_ITER_0).ok, true);
});

test('checkTspStep with tie float accepts the notebook choice without the first-rule message', () => {
  const floatIter = Object.assign({}, TSP_ITER_0, {best: {index: 5, cost: 22.3760}});
  const result = drill.checkTspStep({best: '5', bestCost: '22.3760', decision: 'Move'}, floatIter, {tie: 'float'});
  assert.equal(result.ok, true, result.messages.join(' | '));
  const first = drill.checkTspStep({best: '3', bestCost: '22.3760', decision: 'Move'}, floatIter, {tie: 'float'});
  assert.match(first.fields.best.message, /pembulatan notebook/);
});

const MAX_EVENT = {step: 4, node: 'H', nodeType: 'MAX', child: 'P', childValue: 4, nodeValue: 4, alpha: 4, beta: 4, cut: true, prunedChildren: ['Q', 'R'], remaining: true};
const MIN_EVENT = {step: 2, node: 'C', nodeType: 'MIN', child: 'I', childValue: 3, nodeValue: 3, alpha: 4, beta: 3, cut: true, prunedChildren: ['J'], remaining: true};
const NO_PRUNE_EVENT = {step: 1, node: 'B', nodeType: 'MAX', child: 'E', childValue: 8, nodeValue: 8, alpha: 8, beta: 8, cut: false, prunedChildren: [], remaining: false};

test('checkAbEvent uses alpha for MAX nodes and beta for MIN nodes', () => {
  assert.equal(drill.checkAbEvent({value: '4', prune: 'ya'}, MAX_EVENT).ok, true);
  const wrong = drill.checkAbEvent({value: '3', prune: 'ya'}, MAX_EVENT);
  assert.match(wrong.fields.value.message, /α\(H\) seharusnya 4\./);
  const min = drill.checkAbEvent({value: '3', prune: 'ya'}, MIN_EVENT);
  assert.equal(min.ok, true, min.messages.join(' | '));
  const minWrong = drill.checkAbEvent({value: '3'}, MIN_EVENT);
  assert.match(minWrong.fields.prune.message, /Pilih ya atau tidak/);
});

test('checkAbEvent asks for the prune decision only when children remain', () => {
  assert.equal(drill.checkAbEvent({value: '8'}, NO_PRUNE_EVENT).ok, true);
  assert.equal(drill.checkAbEvent({value: '8', prune: 'ya'}, NO_PRUNE_EVENT).ok, true, 'extra answer is ignored');
  const wrongPrune = drill.checkAbEvent({value: '4', prune: 'tidak'}, MAX_EVENT);
  assert.match(wrongPrune.fields.prune.message, /Seharusnya ya/);
  const notCut = Object.assign({}, MAX_EVENT, {cut: false, alpha: 3, beta: 5, prunedChildren: []});
  assert.match(drill.checkAbEvent({value: '4', prune: 'ya'}, notCut).fields.prune.message, /Seharusnya tidak: jendela \[α, β\] = \[3, 5\] masih terbuka/);
});

test('checkPrunedSet compares node sets without order', () => {
  const good = drill.checkPrunedSet('R, Q', ['Q', 'R']);
  assert.equal(good.ok, true);
  const missing = drill.checkPrunedSet('Q', ['Q', 'R']);
  assert.deepEqual(missing.missing, ['R']);
  assert.match(missing.messages[0], /Belum disebut: R\./);
  const extra = drill.checkPrunedSet('Q R Z', ['Q', 'R']);
  assert.deepEqual(extra.extra, ['Z']);
  assert.equal(drill.checkPrunedSet('(tidak ada)', []).ok, true);
});

test('KKAWidgets.drill exposes the checkers with the names used by the content', () => {
  for (const name of ['parseFrontierText', 'compareFrontier', 'checkRow', 'checkSummary', 'checkTspStep', 'checkAbEvent', 'normalizePath']) {
    assert.equal(typeof KKAWidgets.drill[name], 'function', name);
  }
});
