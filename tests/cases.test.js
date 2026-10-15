'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const cases = require('../cases.js');
const algorithms = require('../algorithms.js');
const cheatsheet = require('../content/cheatsheet.js');

const searchCases = Object.values(cases).filter(c => c.kind === 'search');

test('case ids are the fixed Part 3.5 set; deleted cases are gone', () => {
  assert.deepEqual(Object.keys(cases).sort(), [
    'assignment', 'intro', 'l2-four', 'l2-tiny', 'l3-admissible', 'l3-teg', 'l4-queens-17', 'l4-queens-local',
    'l5-minimax', 'l5-practice', 'l5-rn', 'tree-lecture', 'tree-lecture-e-rtl', 'tree-uw', 'tsp5', 'romania'].sort());
  for (const removed of ['l4-landscape', 'l4-ga', 'l5-ttt', 'l5-xy']) assert.equal(cases[removed], undefined, removed);
});

test('every search case has valid successors, finite costs, positions and heuristic coverage', () => {
  for (const c of searchCases) {
    const nodes = Object.keys(c.graph);
    for (const [from, edges] of Object.entries(c.graph)) {
      for (const [to, cost] of edges) {
        assert.ok(nodes.includes(to), c.id + ': successor ' + to + ' of ' + from + ' missing');
        assert.ok(Number.isFinite(cost) && cost >= 0, c.id + ': bad cost');
      }
    }
    for (const n of nodes) assert.ok(c.positions[n], c.id + ': no position for ' + n);
    if (c.heuristic) for (const n of nodes) assert.ok(Number.isFinite(c.heuristic[n]), c.id + ': heuristic ' + n);
    assert.ok(nodes.includes(c.start) && nodes.includes(c.goal), c.id + ': start/goal');
  }
});

test('Romania is symmetric, has 23 roads, exact heuristic values and alphabetical successors', () => {
  const r = cases.romania;
  const pairs = new Set();
  for (const [from, edges] of Object.entries(r.graph)) {
    const targets = edges.map(([to]) => to);
    assert.deepEqual(targets, [...targets].sort(), 'alphabetical ' + from);
    for (const [to, cost] of edges) {
      const back = r.graph[to].find(([x]) => x === from);
      assert.ok(back && back[1] === cost, 'symmetric ' + from + '-' + to);
      pairs.add([from, to].sort().join('-') + ':' + cost);
    }
  }
  assert.equal(pairs.size, 23);
  assert.deepEqual(Object.values(r.heuristic), [366, 0, 160, 242, 161, 178, 77, 151, 226, 244, 241, 234, 380, 98, 193, 253, 329, 80, 199, 374]);
  assert.equal(r.heuristic.F, 178); assert.equal(r.heuristic.P, 98);
  assert.equal(Object.keys(r.labels).length, 20);
});

test('existing graph data is intact: intro heuristic and assignment shape', () => {
  assert.deepEqual(cases.intro.heuristic, {S: 6, A: 7, B: 2, C: 6, D: 5, E: 6, F: 1, H: 7, G: 0});
  assert.equal(Object.keys(cases.assignment.graph).length, 14);
  assert.equal(Object.values(cases.assignment.graph).reduce((n, edges) => n + edges.length, 0), 31); // PLAN says 30; the counted edges are 31
});

test('queen strings match the 1–8 pattern', () => {
  for (const c of Object.values(cases).filter(c => c.kind === 'queens')) assert.match(c.start, /^[1-8]{8}$/);
});

test('tsp5 holds the notebook cities, start tours and positions', () => {
  const t = cases.tsp5;
  assert.equal(t.kind, 'tsp');
  assert.deepEqual(t.cities, {A: [1, 1], B: [4, 5], C: [7, 2], D: [6, 7], E: [2, 6]});
  assert.deepEqual(t.start, ['A', 'B', 'C', 'D', 'E']);
  assert.deepEqual(t.starts, {exp1: 'ABCDE', exp2: 'ACBED', exp3: 'DAEBC', x2: 'ADBCE'});
  assert.deepEqual(Object.keys(t.positions).sort(), ['A', 'B', 'C', 'D', 'E']);
  assert.equal(t.positions.A[0], 80);
  assert.equal(t.positions.A[1], 560);
  assert.equal(t.variants.A13.cities.A[1], 3);
});

test('tree-uw has the slide 53–56 leaves, a MAX root and positions for every node', () => {
  const uw = cases['tree-uw'];
  const leaves = [];
  const walk = node => { if (Object.hasOwn(node, 'value')) leaves.push([node.id, node.value]); (node.children || []).forEach(walk); };
  walk(uw.tree);
  assert.equal(leaves.length, 19);
  assert.deepEqual(leaves.find(([id]) => id === 'AA'), ['AA', 4]);
  assert.deepEqual(leaves.find(([id]) => id === 'CC'), ['CC', 9]);
  assert.equal(uw.tree.children.length, 3);
  const ids = [];
  walk({id: 'x', children: [uw.tree]});
  const collect = node => { ids.push(node.id); (node.children || []).forEach(collect); };
  collect(uw.tree);
  for (const id of ids) assert.ok(uw.positions[id], 'position for ' + id);
  assert.equal(uw.tree.children.length, 3);
});

test('every ttt-free tree case: leaf values are finite and no tree has a bare internal node without children', () => {
  for (const c of Object.values(cases).filter(c => c.kind === 'tree')) {
    const walk = node => {
      if (Object.hasOwn(node, 'value')) assert.ok(Number.isFinite(node.value), c.id + ' ' + node.id);
      else assert.ok(Array.isArray(node.children) && node.children.length > 0, c.id + ' ' + node.id);
      (node.children || []).forEach(walk);
    };
    walk(c.tree);
  }
});

test('variants: each variant applies cleanly and changes only what it names', () => {
  const v3 = algorithms.applyVariant(cases.assignment, 'V3');
  assert.equal(v3.heuristic.C, 12); assert.equal(v3.heuristic.F, 10); assert.equal(v3.heuristic.H, 9);
  assert.equal(v3.heuristic.B, 7);
  assert.equal(cases.assignment.heuristic.C, 7, 'original not mutated');
  const e1 = algorithms.applyVariant(cases.assignment, 'E1');
  assert.equal(e1.graph.C.find(([to]) => to === 'F')[1], 6);
  const d0 = algorithms.applyVariant(cases.intro, 'D0');
  assert.equal(d0.heuristic.D, 0); assert.equal(d0.heuristic.A, 7);
  const h0 = algorithms.applyVariant(cases.intro, 'H0');
  assert.ok(Object.values(h0.heuristic).every(v => v === 0));
  const a50 = algorithms.applyVariant(cases.intro, 'A50');
  assert.equal(a50.heuristic.A, 50);
  for (const [id, variants] of [['assignment', ['V1', 'V3', 'V4', 'V6', 'E1']], ['intro', ['H0', 'D0', 'A50']], ['l3-admissible', ['A3', 'A4', 'A5']]]) {
    assert.deepEqual(Object.keys(cases[id].variants), variants);
    for (const v of variants) assert.ok(cases[id].variants[v].label.length > 0, id + ' ' + v);
  }
  assert.deepEqual(Object.keys(cases.tsp5.variants), ['A13']);
});

test('every case has a title and a source that cites a slide or notebook', () => {
  for (const c of Object.values(cases)) {
    assert.ok(typeof c.title === 'string' && c.title.length > 0, c.id + ' title');
    assert.ok(/slide|notebook|KKA-2026/i.test(c.source), c.id + ' source: ' + c.source);
  }
});

test('cheat sheet has the comparison table, six topic rule sets, formulas, mistakes and a checklist', () => {
  assert.deepEqual(cheatsheet.comparison.headers, ['Aspek', 'DFS', 'UCS', 'Greedy', 'A*', 'Hill climbing', 'Alpha-beta']);
  for (const row of cheatsheet.comparison.rows) assert.equal(row.length, cheatsheet.comparison.headers.length, row[0]);
  assert.deepEqual(cheatsheet.rules.map(r => r.topicId), ['t1', 't2', 't3', 't4', 't5', 't6']);
  for (const rule of cheatsheet.rules) assert.ok(rule.items.length >= 3, rule.topicId);
  assert.ok(cheatsheet.formulas.length >= 5);
  assert.ok(cheatsheet.mistakes.length >= 5);
  assert.ok(cheatsheet.checklist.length >= 4);
});
