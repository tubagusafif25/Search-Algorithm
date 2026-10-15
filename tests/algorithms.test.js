'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../algorithms.js');
const C = require('../cases.js');

// Canonical notation (PLAN Part 4): "iter selected prio action | frontier [UPD ...] [(skip X g=n)]".
const norm = s => s.replace(/\s+/g, ' ').trim();
function lines(table) {
  return table.rows.map(row => {
    const prio = table.mode === 'greedy' ? 'h' + row.h : table.mode === 'astar' ? row.g + ' ' + row.h + ' ' + row.f : String(row.g);
    let text = row.iteration + ' ' + row.selected + ' ' + prio + ' ' + row.action + ' | ' + row.frontierText;
    for (const u of row.updates) {
      text += ' UPD ' + u.state + ' ' + u.previousG + '→' + u.newG + ' (' + u.previousParent + '→' + u.newParent + ')' + (u.reopened ? ' REOPEN' : '');
    }
    for (const skip of row.skippedAfter) text += ' (skip ' + skip.state + ' g=' + skip.g + ')';
    return norm(text);
  });
}
function searchCase(caseId, mode, variant) {
  const problem = variant ? A.applyVariant(C[caseId], variant) : C[caseId];
  const result = A.runSearch({graph: problem.graph, start: problem.start, goal: problem.goal, heuristic: problem.heuristic, mode});
  return {result, table: A.traceTable(result, mode)};
}
function assertSearch(caseId, mode, variant, expected) {
  const {result, table} = searchCase(caseId, mode, variant);
  assert.equal(result.path.join('-'), expected.path, 'path');
  assert.equal(result.cost, expected.cost, 'cost');
  assert.equal(result.expanded, expected.expanded, 'expanded');
  assert.equal(result.expansionOrder.join(','), expected.order, 'expansion order');
  if (expected.rows) assert.deepEqual(lines(table).map(norm), expected.rows.map(norm));
  return table;
}

test('intro: DFS golden trace (PLAN 4.1)', () => assertSearch('intro', 'dfs', null, {
  path: 'S-A-D-G', cost: 9, expanded: 3, order: 'S,A,D', rows: [
    '1 S 0 expand | A(g=2); B(g=4); C(g=3)',
    '2 A 2 expand | D(g=4); E(g=7); B(g=4); C(g=3)',
    '3 D 4 expand | G(g=9); E(g=7); B(g=4); C(g=3)',
    '4 G 9 goal | E(g=7); B(g=4); C(g=3)']}));

test('intro: UCS golden trace with update and stale skip', () => assertSearch('intro', 'ucs', null, {
  path: 'S-A-D-G', cost: 9, expanded: 8, order: 'S,A,C,B,D,E,H,F', rows: [
    '1 S 0 expand | A(g=2); C(g=3); B(g=4)',
    '2 A 2 expand | C(g=3); B(g=4); D(g=4); E(g=7)',
    '3 C 3 expand | B(g=4); D(g=4); E(g=5); H(g=6) UPD E 7→5 (A→C)',
    '4 B 4 expand | D(g=4); E(g=5); H(g=6); F(g=6)',
    '5 D 4 expand | E(g=5); H(g=6); F(g=6); G(g=9)',
    '6 E 5 expand | H(g=6); F(g=6); G(g=9)',
    '7 H 6 expand | F(g=6); G(g=9)',
    '8 F 6 expand | G(g=9) (skip E g=7)',
    '9 G 9 goal | (kosong)']}));

test('intro: Greedy golden trace (PLAN 4.1)', () => assertSearch('intro', 'greedy', null, {
  path: 'S-B-F-G', cost: 15, expanded: 3, order: 'S,B,F', rows: [
    '1 S h6 expand | B(h=2); C(h=6); A(h=7)',
    '2 B h2 expand | F(h=1); D(h=5); C(h=6); A(h=7)',
    '3 F h1 expand | G(h=0); D(h=5); C(h=6); A(h=7)',
    '4 G h0 goal | D(h=5); C(h=6); A(h=7)']}));

test('intro: A* golden trace with two updates', () => assertSearch('intro', 'astar', null, {
  path: 'S-A-D-G', cost: 9, expanded: 6, order: 'S,B,F,A,C,D', rows: [
    '1 S 0 6 6 expand | B(g=4,h=2,f=6); A(g=2,h=7,f=9); C(g=3,h=6,f=9)',
    '2 B 4 2 6 expand | F(g=6,h=1,f=7); A(g=2,h=7,f=9); C(g=3,h=6,f=9); D(g=5,h=5,f=10)',
    '3 F 6 1 7 expand | A(g=2,h=7,f=9); C(g=3,h=6,f=9); D(g=5,h=5,f=10); G(g=15,h=0,f=15)',
    '4 A 2 7 9 expand | C(g=3,h=6,f=9); D(g=4,h=5,f=9); E(g=7,h=6,f=13); G(g=15,h=0,f=15) UPD D 5→4 (B→A)',
    '5 C 3 6 9 expand | D(g=4,h=5,f=9); E(g=5,h=6,f=11); H(g=6,h=7,f=13); G(g=15,h=0,f=15) UPD E 7→5 (A→C)',
    '6 D 4 5 9 expand | G(g=9,h=0,f=9); E(g=5,h=6,f=11); H(g=6,h=7,f=13) UPD G 15→9 (F→D)',
    '7 G 9 0 9 goal | E(g=5,h=6,f=11); H(g=6,h=7,f=13)']}));

test('intro variant D0 (h(D)=0): A* reopens D; Greedy S-B-D-G cost 10', () => {
  assertSearch('intro', 'astar', 'D0', {
    path: 'S-A-D-G', cost: 9, expanded: 7, order: 'S,B,D,F,A,D,C', rows: [
      '1 S 0 6 6 expand | B(g=4,h=2,f=6); A(g=2,h=7,f=9); C(g=3,h=6,f=9)',
      '2 B 4 2 6 expand | D(g=5,h=0,f=5); F(g=6,h=1,f=7); A(g=2,h=7,f=9); C(g=3,h=6,f=9)',
      '3 D 5 0 5 expand | F(g=6,h=1,f=7); A(g=2,h=7,f=9); C(g=3,h=6,f=9); G(g=10,h=0,f=10)',
      '4 F 6 1 7 expand | A(g=2,h=7,f=9); C(g=3,h=6,f=9); G(g=10,h=0,f=10)',
      '5 A 2 7 9 expand | D(g=4,h=0,f=4); C(g=3,h=6,f=9); G(g=10,h=0,f=10); E(g=7,h=6,f=13) UPD D 5→4 (B→A) REOPEN',
      '6 D 4 0 4 expand | C(g=3,h=6,f=9); G(g=9,h=0,f=9); E(g=7,h=6,f=13) UPD G 10→9 (D→D)',
      '7 C 3 6 9 expand | G(g=9,h=0,f=9); E(g=5,h=6,f=11); H(g=6,h=7,f=13) UPD E 7→5 (A→C)',
      '8 G 9 0 9 goal | E(g=5,h=6,f=11); H(g=6,h=7,f=13)']});
  assertSearch('intro', 'greedy', 'D0', {path: 'S-B-D-G', cost: 10, expanded: 3, order: 'S,B,D'});
});

test('intro variant A50 (h(A)=50): Greedy S-B-F-G 15, A* S-B-D-G 10 with 5 expansions', () => {
  assertSearch('intro', 'greedy', 'A50', {path: 'S-B-F-G', cost: 15, expanded: 3, order: 'S,B,F'});
  assertSearch('intro', 'astar', 'A50', {path: 'S-B-D-G', cost: 10, expanded: 5, order: 'S,B,F,C,D'});
});

test('intro variant H0 (all h = 0) gives UCS result', () => {
  const variant = A.applyVariant(C.intro, 'H0');
  for (const state of Object.keys(variant.heuristic)) assert.equal(variant.heuristic[state], 0);
  const result = A.runSearch({graph: variant.graph, start: 'S', goal: 'G', heuristic: variant.heuristic, mode: 'astar'});
  assert.equal(result.cost, 9);
  assert.equal(result.expanded, 8);
});

test('assignment: DFS golden trace (PLAN 4.2)', () => assertSearch('assignment', 'dfs', null, {
  path: 'S-A-D-I-L-G', cost: 20, expanded: 5, order: 'S,A,D,I,L', rows: [
    '1 S 0 expand | A(g=3); B(g=5); C(g=4)',
    '2 A 3 expand | D(g=7); E(g=10); B(g=4); B(g=5); C(g=4)',
    '3 D 7 expand | I(g=11); E(g=9); E(g=10); B(g=4); B(g=5); C(g=4)',
    '4 I 11 expand | L(g=14); J(g=13); E(g=9); E(g=10); B(g=4); B(g=5); C(g=4)',
    '5 L 14 expand | G(g=20); M(g=16); J(g=13); E(g=9); E(g=10); B(g=4); B(g=5); C(g=4)',
    '6 G 20 goal | M(g=16); J(g=13); E(g=9); E(g=10); B(g=4); B(g=5); C(g=4)']}));

test('assignment: UCS golden trace (PLAN 4.2)', () => assertSearch('assignment', 'ucs', null, {
  path: 'S-C-F-J-M-G', cost: 17, expanded: 13, order: 'S,A,C,B,E,D,F,H,J,I,K,M,L', rows: [
    '1 S 0 expand | A(g=3); C(g=4); B(g=5)',
    '2 A 3 expand | C(g=4); B(g=4); D(g=7); E(g=10) UPD B 5→4 (S→A)',
    '3 C 4 expand | B(g=4); D(g=7); F(g=7); H(g=9); E(g=10)',
    '4 B 4 expand | E(g=6); D(g=7); F(g=7); H(g=9) UPD E 10→6 (A→B) (skip B g=5)',
    '5 E 6 expand | D(g=7); F(g=7); H(g=9); I(g=11); J(g=12)',
    '6 D 7 expand | F(g=7); H(g=9); I(g=11); J(g=12)',
    '7 F 7 expand | H(g=9); J(g=10); I(g=11); K(g=14) UPD J 12→10 (E→F)',
    '8 H 9 expand | J(g=10); I(g=11); K(g=12) UPD K 14→12 (F→H) (skip E g=10)',
    '9 J 10 expand | I(g=11); K(g=12); M(g=14); L(g=15)',
    '10 I 11 expand | K(g=12); M(g=14); L(g=14) UPD L 15→14 (J→I) (skip J g=12)',
    '11 K 12 expand | M(g=14); L(g=14) (skip K g=14)',
    '12 M 14 expand | L(g=14); G(g=17)',
    '13 L 14 expand | G(g=17) (skip L g=15)',
    '14 G 17 goal | (kosong)']}));

test('assignment: Greedy golden trace (PLAN 4.2)', () => assertSearch('assignment', 'greedy', null, {
  path: 'S-B-F-J-M-G', cost: 21, expanded: 5, order: 'S,B,F,J,M', rows: [
    '1 S h9 expand | B(h=7); C(h=7); A(h=8)',
    '2 B h7 expand | F(h=5); E(h=6); C(h=7); A(h=8)',
    '3 F h5 expand | J(h=4); K(h=4); E(h=6); C(h=7); A(h=8)',
    '4 J h4 expand | M(h=2); L(h=3); K(h=4); I(h=5); E(h=6); C(h=7); A(h=8)',
    '5 M h2 expand | G(h=0); L(h=3); K(h=4); I(h=5); E(h=6); C(h=7); A(h=8)',
    '6 G h0 goal | L(h=3); K(h=4); I(h=5); E(h=6); C(h=7); A(h=8)']}));

test('assignment: A* golden trace (PLAN 4.2)', () => assertSearch('assignment', 'astar', null, {
  path: 'S-C-F-J-M-G', cost: 17, expanded: 13, order: 'S,A,C,B,F,E,D,H,J,I,K,M,L', rows: [
    '1 S 0 9 9 expand | A(g=3,h=8,f=11); C(g=4,h=7,f=11); B(g=5,h=7,f=12)',
    '2 A 3 8 11 expand | C(g=4,h=7,f=11); B(g=4,h=7,f=11); D(g=7,h=7,f=14); E(g=10,h=6,f=16) UPD B 5→4 (S→A)',
    '3 C 4 7 11 expand | B(g=4,h=7,f=11); F(g=7,h=5,f=12); D(g=7,h=7,f=14); H(g=9,h=5,f=14); E(g=10,h=6,f=16)',
    '4 B 4 7 11 expand | F(g=7,h=5,f=12); E(g=6,h=6,f=12); D(g=7,h=7,f=14); H(g=9,h=5,f=14) UPD E 10→6 (A→B) (skip B g=5)',
    '5 F 7 5 12 expand | E(g=6,h=6,f=12); D(g=7,h=7,f=14); H(g=9,h=5,f=14); J(g=10,h=4,f=14); K(g=14,h=4,f=18)',
    '6 E 6 6 12 expand | D(g=7,h=7,f=14); H(g=9,h=5,f=14); J(g=10,h=4,f=14); I(g=11,h=5,f=16); K(g=14,h=4,f=18)',
    '7 D 7 7 14 expand | H(g=9,h=5,f=14); J(g=10,h=4,f=14); I(g=11,h=5,f=16); K(g=14,h=4,f=18)',
    '8 H 9 5 14 expand | J(g=10,h=4,f=14); I(g=11,h=5,f=16); K(g=12,h=4,f=16) UPD K 14→12 (F→H)',
    '9 J 10 4 14 expand | I(g=11,h=5,f=16); K(g=12,h=4,f=16); M(g=14,h=2,f=16); L(g=15,h=3,f=18) (skip E g=10)',
    '10 I 11 5 16 expand | K(g=12,h=4,f=16); M(g=14,h=2,f=16); L(g=14,h=3,f=17) UPD L 15→14 (J→I)',
    '11 K 12 4 16 expand | M(g=14,h=2,f=16); L(g=14,h=3,f=17)',
    '12 M 14 2 16 expand | L(g=14,h=3,f=17); G(g=17,h=0,f=17)',
    '13 L 14 3 17 expand | G(g=17,h=0,f=17)',
    '14 G 17 0 17 goal | (kosong)']}));

test('assignment variant V1: Greedy golden trace; A* result 17 with 13 expansions', () => {
  assertSearch('assignment', 'greedy', 'V1', {path: 'S-C-F-J-M-G', cost: 17, expanded: 6, order: 'S,C,F,H,J,M', rows: [
    '1 S h9 expand | C(h=6); B(h=7); A(h=8)',
    '2 C h6 expand | F(h=4); H(h=4); B(h=7); A(h=8)',
    '3 F h4 expand | H(h=4); J(h=4); K(h=4); E(h=6); B(h=7); A(h=8)',
    '4 H h4 expand | J(h=4); K(h=4); E(h=6); B(h=7); A(h=8)',
    '5 J h4 expand | M(h=2); L(h=3); K(h=4); I(h=5); E(h=6); B(h=7); A(h=8)',
    '6 M h2 expand | G(h=0); L(h=3); K(h=4); I(h=5); E(h=6); B(h=7); A(h=8)',
    '7 G h0 goal | L(h=3); K(h=4); I(h=5); E(h=6); B(h=7); A(h=8)']});
  assertSearch('assignment', 'astar', 'V1', {path: 'S-C-F-J-M-G', cost: 17, expanded: 13, order: 'S,C,A,F,B,E,H,D,J,I,K,M,L'});
});

test('assignment variant V3: A* reopens J; Greedy 20 with 5 expansions', () => {
  assertSearch('assignment', 'astar', 'V3', {path: 'S-C-F-J-M-G', cost: 17, expanded: 12, order: 'S,A,B,E,D,C,I,J,F,J,M,L', rows: [
    '1 S 0 9 9 expand | A(g=3,h=8,f=11); B(g=5,h=7,f=12); C(g=4,h=12,f=16)',
    '2 A 3 8 11 expand | B(g=4,h=7,f=11); D(g=7,h=7,f=14); C(g=4,h=12,f=16); E(g=10,h=6,f=16) UPD B 5→4 (S→A)',
    '3 B 4 7 11 expand | E(g=6,h=6,f=12); D(g=7,h=7,f=14); C(g=4,h=12,f=16); F(g=10,h=10,f=20) UPD E 10→6 (A→B) (skip B g=5)',
    '4 E 6 6 12 expand | D(g=7,h=7,f=14); C(g=4,h=12,f=16); I(g=11,h=5,f=16); J(g=12,h=4,f=16); F(g=10,h=10,f=20)',
    '5 D 7 7 14 expand | C(g=4,h=12,f=16); I(g=11,h=5,f=16); J(g=12,h=4,f=16); F(g=10,h=10,f=20)',
    '6 C 4 12 16 expand | I(g=11,h=5,f=16); J(g=12,h=4,f=16); F(g=7,h=10,f=17); H(g=9,h=9,f=18) UPD F 10→7 (B→C) (skip E g=10)',
    '7 I 11 5 16 expand | J(g=12,h=4,f=16); F(g=7,h=10,f=17); L(g=14,h=3,f=17); H(g=9,h=9,f=18)',
    '8 J 12 4 16 expand | F(g=7,h=10,f=17); L(g=14,h=3,f=17); H(g=9,h=9,f=18); M(g=16,h=2,f=18)',
    '9 F 7 10 17 expand | J(g=10,h=4,f=14); L(g=14,h=3,f=17); H(g=9,h=9,f=18); M(g=16,h=2,f=18); K(g=14,h=4,f=18) UPD J 12→10 (E→F) REOPEN',
    '10 J 10 4 14 expand | M(g=14,h=2,f=16); L(g=14,h=3,f=17); H(g=9,h=9,f=18); K(g=14,h=4,f=18) UPD M 16→14 (J→J)',
    '11 M 14 2 16 expand | L(g=14,h=3,f=17); G(g=17,h=0,f=17); H(g=9,h=9,f=18); K(g=14,h=4,f=18)',
    '12 L 14 3 17 expand | G(g=17,h=0,f=17); H(g=9,h=9,f=18); K(g=14,h=4,f=18)',
    '13 G 17 0 17 goal | H(g=9,h=9,f=18); K(g=14,h=4,f=18)']});
  assertSearch('assignment', 'greedy', 'V3', {path: 'S-B-E-J-M-G', cost: 20, expanded: 5, order: 'S,B,E,J,M'});
});

test('assignment variant V4: Greedy golden trace; A* 17 with 13 expansions', () => {
  assertSearch('assignment', 'greedy', 'V4', {path: 'S-C-F-J-M-G', cost: 17, expanded: 5, order: 'S,C,F,J,M', rows: [
    '1 S h9 expand | C(h=7); A(h=8); B(h=9)',
    '2 C h7 expand | F(h=3); H(h=5); A(h=8); B(h=9)',
    '3 F h3 expand | J(h=4); K(h=4); H(h=5); A(h=8); B(h=9); E(h=9)',
    '4 J h4 expand | M(h=2); L(h=3); K(h=4); H(h=5); I(h=5); A(h=8); B(h=9); E(h=9)',
    '5 M h2 expand | G(h=0); L(h=3); K(h=4); H(h=5); I(h=5); A(h=8); B(h=9); E(h=9)',
    '6 G h0 goal | L(h=3); K(h=4); H(h=5); I(h=5); A(h=8); B(h=9); E(h=9)']});
  assertSearch('assignment', 'astar', 'V4', {path: 'S-C-F-J-M-G', cost: 17, expanded: 13, order: 'S,A,C,F,B,D,H,J,E,I,K,M,L'});
});

test('assignment variant V6 (inadmissible): A* returns S-A-B-E-J-M-G cost 19; Greedy cost 20', () => {
  assertSearch('assignment', 'astar', 'V6', {path: 'S-A-B-E-J-M-G', cost: 19, expanded: 10, order: 'S,A,B,E,D,I,J,L,M,C', rows: [
    '1 S 0 9 9 expand | A(g=3,h=8,f=11); B(g=5,h=7,f=12); C(g=4,h=15,f=19)',
    '2 A 3 8 11 expand | B(g=4,h=7,f=11); D(g=7,h=7,f=14); E(g=10,h=6,f=16); C(g=4,h=15,f=19) UPD B 5→4 (S→A)',
    '3 B 4 7 11 expand | E(g=6,h=6,f=12); D(g=7,h=7,f=14); C(g=4,h=15,f=19); F(g=10,h=12,f=22) UPD E 10→6 (A→B) (skip B g=5)',
    '4 E 6 6 12 expand | D(g=7,h=7,f=14); I(g=11,h=5,f=16); J(g=12,h=4,f=16); C(g=4,h=15,f=19); F(g=10,h=12,f=22)',
    '5 D 7 7 14 expand | I(g=11,h=5,f=16); J(g=12,h=4,f=16); C(g=4,h=15,f=19); F(g=10,h=12,f=22) (skip E g=10)',
    '6 I 11 5 16 expand | J(g=12,h=4,f=16); L(g=14,h=3,f=17); C(g=4,h=15,f=19); F(g=10,h=12,f=22)',
    '7 J 12 4 16 expand | L(g=14,h=3,f=17); M(g=16,h=2,f=18); C(g=4,h=15,f=19); F(g=10,h=12,f=22)',
    '8 L 14 3 17 expand | M(g=16,h=2,f=18); C(g=4,h=15,f=19); G(g=20,h=0,f=20); F(g=10,h=12,f=22)',
    '9 M 16 2 18 expand | C(g=4,h=15,f=19); G(g=19,h=0,f=19); F(g=10,h=12,f=22) UPD G 20→19 (L→M)',
    '10 C 4 15 19 expand | G(g=19,h=0,f=19); F(g=7,h=12,f=19); H(g=9,h=12,f=21) UPD F 10→7 (B→C)',
    '11 G 19 0 19 goal | F(g=7,h=12,f=19); H(g=9,h=12,f=21)']});
  assertSearch('assignment', 'greedy', 'V6', {path: 'S-B-E-J-M-G', cost: 20, expanded: 5, order: 'S,B,E,J,M', rows: [
    '1 S h9 expand | B(h=7); A(h=8); C(h=15)',
    '2 B h7 expand | E(h=6); A(h=8); F(h=12); C(h=15)',
    '3 E h6 expand | J(h=4); I(h=5); D(h=7); A(h=8); F(h=12); C(h=15)',
    '4 J h4 expand | M(h=2); L(h=3); I(h=5); D(h=7); A(h=8); F(h=12); C(h=15)',
    '5 M h2 expand | G(h=0); L(h=3); I(h=5); D(h=7); A(h=8); F(h=12); C(h=15)',
    '6 G h0 goal | L(h=3); I(h=5); D(h=7); A(h=8); F(h=12); C(h=15)']});
});

test('assignment variant E1 (C→F = 6): UCS and A* both give S-C-H-K-M-G cost 18 with 13 expansions', () => {
  assertSearch('assignment', 'ucs', 'E1', {path: 'S-C-H-K-M-G', cost: 18, expanded: 13, order: 'S,A,C,B,E,D,H,F,I,J,K,L,M', rows: [
    '1 S 0 expand | A(g=3); C(g=4); B(g=5)',
    '2 A 3 expand | C(g=4); B(g=4); D(g=7); E(g=10) UPD B 5→4 (S→A)',
    '3 C 4 expand | B(g=4); D(g=7); H(g=9); E(g=10); F(g=10)',
    '4 B 4 expand | E(g=6); D(g=7); H(g=9); F(g=10) UPD E 10→6 (A→B) (skip B g=5)',
    '5 E 6 expand | D(g=7); H(g=9); F(g=10); I(g=11); J(g=12)',
    '6 D 7 expand | H(g=9); F(g=10); I(g=11); J(g=12)',
    '7 H 9 expand | F(g=10); I(g=11); J(g=12); K(g=12) (skip E g=10)',
    '8 F 10 expand | I(g=11); J(g=12); K(g=12)',
    '9 I 11 expand | J(g=12); K(g=12); L(g=14)',
    '10 J 12 expand | K(g=12); L(g=14); M(g=16)',
    '11 K 12 expand | L(g=14); M(g=15) UPD M 16→15 (J→K)',
    '12 L 14 expand | M(g=15); G(g=20)',
    '13 M 15 expand | G(g=18) UPD G 20→18 (L→M) (skip M g=16)',
    '14 G 18 goal | (kosong)']});
  assertSearch('assignment', 'astar', 'E1', {path: 'S-C-H-K-M-G', cost: 18, expanded: 13, order: 'S,A,C,B,E,D,H,F,I,J,K,L,M'});
});

test('slide graph l2-tiny: DFS and UCS golden traces (PLAN 4.3)', () => {
  assertSearch('l2-tiny', 'dfs', null, {path: 'S-d-e-r-f-G', cost: 10, expanded: 11, order: 'S,d,b,a,c,e,h,p,q,r,f', rows: [
    '1 S 0 expand | d(g=3); e(g=9); p(g=1)',
    '2 d 3 expand | b(g=4); c(g=11); e(g=5); e(g=9); p(g=1)',
    '3 b 4 expand | a(g=6); c(g=11); e(g=5); e(g=9); p(g=1)',
    '4 a 6 expand | c(g=11); e(g=5); e(g=9); p(g=1)',
    '5 c 11 expand | e(g=5); e(g=9); p(g=1)',
    '6 e 5 expand | h(g=13); r(g=7); p(g=1)',
    '7 h 13 expand | p(g=17); q(g=17); r(g=7); p(g=1)',
    '8 p 17 expand | q(g=32); q(g=17); r(g=7)',
    '9 q 32 expand | r(g=7) (skip q g=17)',
    '10 r 7 expand | f(g=8)',
    '11 f 8 expand | G(g=10)',
    '12 G 10 goal | (kosong)']});
  assertSearch('l2-tiny', 'ucs', null, {path: 'S-d-e-r-f-G', cost: 10, expanded: 8, order: 'S,p,d,b,e,a,r,f', rows: [
    '1 S 0 expand | p(g=1); d(g=3); e(g=9)',
    '2 p 1 expand | d(g=3); e(g=9); q(g=16)',
    '3 d 3 expand | b(g=4); e(g=5); c(g=11); q(g=16) UPD e 9→5 (S→d)',
    '4 b 4 expand | e(g=5); a(g=6); c(g=11); q(g=16)',
    '5 e 5 expand | a(g=6); r(g=7); c(g=11); h(g=13); q(g=16)',
    '6 a 6 expand | r(g=7); c(g=11); h(g=13); q(g=16)',
    '7 r 7 expand | f(g=8); c(g=11); h(g=13); q(g=16)',
    '8 f 8 expand | G(g=10); c(g=11); h(g=13); q(g=16) (skip e g=9)',
    '9 G 10 goal | c(g=11); h(g=13); q(g=16)']});
});

test('slide graph l3-teg: DFS, UCS, Greedy and A* golden traces (PLAN 4.3)', () => {
  assertSearch('l3-teg', 'dfs', null, {path: 'S-a-d-G', cost: 6, expanded: 5, order: 'S,a,b,c,d', rows: [
    '1 S 0 expand | a(g=1)',
    '2 a 1 expand | b(g=2); d(g=4); e(g=9)',
    '3 b 2 expand | c(g=3); d(g=4); e(g=9)',
    '4 c 3 expand | d(g=4); e(g=9)',
    '5 d 4 expand | G(g=6); e(g=9)',
    '6 G 6 goal | e(g=9)']});
  assertSearch('l3-teg', 'ucs', null, {path: 'S-a-d-G', cost: 6, expanded: 5, order: 'S,a,b,c,d', rows: [
    '1 S 0 expand | a(g=1)',
    '2 a 1 expand | b(g=2); d(g=4); e(g=9)',
    '3 b 2 expand | c(g=3); d(g=4); e(g=9)',
    '4 c 3 expand | d(g=4); e(g=9)',
    '5 d 4 expand | G(g=6); e(g=9)',
    '6 G 6 goal | e(g=9)']});
  assertSearch('l3-teg', 'greedy', null, {path: 'S-a-d-G', cost: 6, expanded: 4, order: 'S,a,e,d', rows: [
    '1 S h6 expand | a(h=5)',
    '2 a h5 expand | e(h=1); d(h=2); b(h=6)',
    '3 e h1 expand | d(h=2); b(h=6)',
    '4 d h2 expand | G(h=0); b(h=6)',
    '5 G h0 goal | b(h=6)']});
  assertSearch('l3-teg', 'astar', null, {path: 'S-a-d-G', cost: 6, expanded: 3, order: 'S,a,d', rows: [
    '1 S 0 6 6 expand | a(g=1,h=5,f=6)',
    '2 a 1 5 6 expand | d(g=4,h=2,f=6); b(g=2,h=6,f=8); e(g=9,h=1,f=10)',
    '3 d 4 2 6 expand | G(g=6,h=0,f=6); b(g=2,h=6,f=8); e(g=9,h=1,f=10)',
    '4 G 6 0 6 goal | b(g=2,h=6,f=8); e(g=9,h=1,f=10)']});
});

test('slide graph l3-admissible: A* gives S-G 5 (wrong), UCS gives S-A-G 4; variants A3, A4, A5', () => {
  assertSearch('l3-admissible', 'astar', null, {path: 'S-G', cost: 5, expanded: 1, order: 'S', rows: [
    '1 S 0 7 7 expand | G(g=5,h=0,f=5); A(g=1,h=6,f=7)',
    '2 G 5 0 5 goal | A(g=1,h=6,f=7)']});
  assertSearch('l3-admissible', 'ucs', null, {path: 'S-A-G', cost: 4, expanded: 2, order: 'S,A', rows: [
    '1 S 0 expand | A(g=1); G(g=5)',
    '2 A 1 expand | G(g=4) UPD G 5→4 (S→A)',
    '3 G 4 goal | (kosong)']});
  assertSearch('l3-admissible', 'astar', 'A3', {path: 'S-A-G', cost: 4, expanded: 2, order: 'S,A'});
  assertSearch('l3-admissible', 'astar', 'A4', {path: 'S-A-G', cost: 4, expanded: 2, order: 'S,A'});
  assertSearch('l3-admissible', 'astar', 'A5', {path: 'S-G', cost: 5, expanded: 1, order: 'S'});
});

test('Romania: DFS, UCS, Greedy and A* golden traces (PLAN 4.3)', () => {
  assertSearch('romania', 'dfs', null, {path: 'A-S-F-B', cost: 450, expanded: 3, order: 'A,S,F', rows: [
    '1 A 0 expand | S(g=140); T(g=118); Z(g=75)',
    '2 S 140 expand | F(g=239); O(g=291); R(g=220); T(g=118); Z(g=75)',
    '3 F 239 expand | B(g=450); O(g=291); R(g=220); T(g=118); Z(g=75)',
    '4 B 450 goal | O(g=291); R(g=220); T(g=118); Z(g=75)']});
  assertSearch('romania', 'ucs', null, {path: 'A-S-R-P-B', cost: 418, expanded: 12, order: 'A,Z,T,S,O,R,L,F,M,P,C,D', rows: [
    '1 A 0 expand | Z(g=75); T(g=118); S(g=140)',
    '2 Z 75 expand | T(g=118); S(g=140); O(g=146)',
    '3 T 118 expand | S(g=140); O(g=146); L(g=229)',
    '4 S 140 expand | O(g=146); R(g=220); L(g=229); F(g=239)',
    '5 O 146 expand | R(g=220); L(g=229); F(g=239)',
    '6 R 220 expand | L(g=229); F(g=239); P(g=317); C(g=366)',
    '7 L 229 expand | F(g=239); M(g=299); P(g=317); C(g=366)',
    '8 F 239 expand | M(g=299); P(g=317); C(g=366); B(g=450)',
    '9 M 299 expand | P(g=317); C(g=366); D(g=374); B(g=450)',
    '10 P 317 expand | C(g=366); D(g=374); B(g=418) UPD B 450→418 (F→P)',
    '11 C 366 expand | D(g=374); B(g=418)',
    '12 D 374 expand | B(g=418)',
    '13 B 418 goal | (kosong)']});
  assertSearch('romania', 'greedy', null, {path: 'A-S-F-B', cost: 450, expanded: 3, order: 'A,S,F', rows: [
    '1 A h366 expand | S(h=253); T(h=329); Z(h=374)',
    '2 S h253 expand | F(h=178); R(h=193); T(h=329); Z(h=374); O(h=380)',
    '3 F h178 expand | B(h=0); R(h=193); T(h=329); Z(h=374); O(h=380)',
    '4 B h0 goal | R(h=193); T(h=329); Z(h=374); O(h=380)']});
  assertSearch('romania', 'astar', null, {path: 'A-S-R-P-B', cost: 418, expanded: 5, order: 'A,S,R,P,F', rows: [
    '1 A 0 366 366 expand | S(g=140,h=253,f=393); T(g=118,h=329,f=447); Z(g=75,h=374,f=449)',
    '2 S 140 253 393 expand | R(g=220,h=193,f=413); F(g=239,h=178,f=417); T(g=118,h=329,f=447); Z(g=75,h=374,f=449); O(g=291,h=380,f=671)',
    '3 R 220 193 413 expand | P(g=317,h=98,f=415); F(g=239,h=178,f=417); T(g=118,h=329,f=447); Z(g=75,h=374,f=449); C(g=366,h=160,f=526); O(g=291,h=380,f=671)',
    '4 P 317 98 415 expand | F(g=239,h=178,f=417); B(g=418,h=0,f=418); T(g=118,h=329,f=447); Z(g=75,h=374,f=449); C(g=366,h=160,f=526); O(g=291,h=380,f=671)',
    '5 F 239 178 417 expand | B(g=418,h=0,f=418); T(g=118,h=329,f=447); Z(g=75,h=374,f=449); C(g=366,h=160,f=526); O(g=291,h=380,f=671)',
    '6 B 418 0 418 goal | T(g=118,h=329,f=447); Z(g=75,h=374,f=449); C(g=366,h=160,f=526); O(g=291,h=380,f=671)']});
});

test('trace table: costs along the path, frontier formatting and an empty frontier', () => {
  const {table} = searchCase('intro', 'astar');
  assert.deepEqual(table.costTerms, [2, 2, 5]);
  assert.equal(table.rows[0].frontier[0].state, 'B');
  assert.equal(table.rows[0].frontier[0].f, 6);
  assert.equal(table.rows[0].h, 6);
  assert.equal(A.formatFrontier([], 'astar'), '(kosong)');
  assert.equal(A.formatFrontier([{state: 'X', g: 3, h: 8, f: 11}], 'astar'), 'X(g=3,h=8,f=11)');
  assert.equal(A.formatFrontier([{state: 'X', g: 3, h: 7}], 'greedy'), 'X(h=7)');
  assert.equal(A.formatFrontier([{state: 'X', g: 3}, {state: 'Y', g: 1}], 'dfs'), 'X(g=3); Y(g=1)');
  // DFS keeps stack order (top first); other modes sort by priority, then FIFO.
  assert.equal(A.formatFrontier([{state: 'Y', g: 9}, {state: 'X', g: 1}], 'ucs'), 'X(g=1); Y(g=9)');
});

test('trace table is deterministic and its snapshots are deeply frozen', () => {
  const first = searchCase('assignment', 'astar').result;
  const second = searchCase('assignment', 'astar').result;
  assert.deepEqual(first.trace, second.trace);
  assert.ok(Object.isFrozen(first.trace[0]) && Object.isFrozen(first.trace[0].frontier[0]));
});

test('TSP: distances, route cost and routeText', () => {
  assert.equal(A.tspDistance(C.tsp5.cities, 'A', 'B'), 5);
  assert.equal(A.tspRouteCost(C.tsp5.cities, ['A', 'B', 'C', 'D', 'E']).toFixed(4), '23.5638');
  assert.equal(A.routeText(['A', 'B', 'C', 'D', 'E']), 'A → B → C → D → E → A');
});

test('TSP Exp1 (notebook start ABCDE): default tie rule takes the first tied neighbour', () => {
  const r = A.runCase(C.tsp5, 'tsp', {route: 'ABCDE'});
  assert.equal(A.routeText(r.finalRoute), 'B → D → C → A → E → B');
  assert.equal(r.finalCost.toFixed(4), '21.3453');
  assert.equal(r.moves, 2);
  const [it0, it1, it2] = r.iterations;
  assert.deepEqual(it0.neighbors.map(n => n.cost.toFixed(4)), ['22.5410', '27.5791', '22.3760', '24.4870', '22.3760', '24.4870', '24.4296', '24.4296', '22.5410', '27.5791']);
  assert.equal(it0.cost.toFixed(4), '23.5638');
  assert.equal(it0.best.index, 3); assert.equal(it0.decision, 'Move');
  assert.deepEqual(it1.neighbors.map(n => n.cost.toFixed(4)), ['21.3453', '26.3835', '23.5638', '24.4948', '23.5638', '24.4948', '24.4374', '24.4374', '21.3453', '26.3835']);
  assert.equal(it1.best.index, 1); assert.equal(it1.decision, 'Move');
  assert.deepEqual(it2.neighbors.map(n => n.cost.toFixed(4)), ['22.3760', '24.4296', '24.4870', '22.5410', '24.4870', '22.5410', '25.3606', '25.3606', '22.3760', '24.4296']);
  assert.equal(it2.best.index, 1); assert.equal(it2.decision, 'Stop');
});

test('TSP Exp1 float mode reproduces the notebook: last row prints neighbour #9', () => {
  const r = A.runCase(C.tsp5, 'tsp', {route: 'ABCDE', tie: 'float'});
  assert.equal(A.routeText(r.finalRoute), 'B → D → C → A → E → B');
  assert.equal(r.iterations[2].best.index, 9);
  assert.equal(r.iterations[2].best.cost.toFixed(4), '22.3760');
});

test('TSP Exp2 (ACBED): neighbour costs, decisions and final tour', () => {
  const r = A.runCase(C.tsp5, 'tsp', {route: 'ACBED'});
  const [it0, it1, it2] = r.iterations;
  assert.equal(it0.cost.toFixed(4), '24.4948');
  assert.deepEqual(it0.neighbors.map(n => n.cost.toFixed(4)), ['22.5410', '22.3760', '27.5791', '24.4870', '27.5791', '24.4870', '25.3606', '25.3606', '22.5410', '22.3760']);
  assert.equal(it0.best.index, 2);
  assert.deepEqual(it1.neighbors.map(n => n.cost.toFixed(4)), ['23.5638', '24.4948', '24.4374', '21.3453', '24.4374', '21.3453', '26.3835', '26.3835', '23.5638', '24.4948']);
  assert.equal(it1.best.index, 4); assert.equal(it1.decision, 'Move');
  assert.deepEqual(it2.neighbors.map(n => n.cost.toFixed(4)), ['24.4870', '22.5410', '25.3606', '22.3760', '25.3606', '22.3760', '24.4296', '24.4296', '24.4870', '22.5410']);
  assert.equal(it2.decision, 'Stop');
  assert.equal(A.routeText(r.finalRoute), 'D → C → A → E → B → D');
  assert.equal(r.moves, 2);
  assert.equal(A.routeText(A.runCase(C.tsp5, 'tsp', {route: 'ACBED', tie: 'float'}).finalRoute), 'B → E → A → C → D → B');
});

test('TSP Exp3 (DAEBC): one move, final tour C-A-E-B-D', () => {
  const r = A.runCase(C.tsp5, 'tsp', {route: 'DAEBC'});
  assert.equal(r.iterations[0].cost.toFixed(4), '24.4870');
  assert.deepEqual(r.iterations[0].neighbors.map(n => n.cost.toFixed(4)), ['24.4948', '26.3835', '23.5638', '21.3453', '23.5638', '21.3453', '26.5485', '26.5485', '24.4948', '26.3835']);
  assert.equal(r.iterations[0].best.index, 4);
  assert.equal(r.iterations[1].best.index, 2); assert.equal(r.iterations[1].decision, 'Stop');
  assert.equal(A.routeText(r.finalRoute), 'C → A → E → B → D → C');
  assert.equal(r.moves, 1);
  assert.equal(A.routeText(A.runCase(C.tsp5, 'tsp', {route: 'DAEBC', tie: 'float'}).finalRoute), 'C → A → E → B → D → C');
});

test('TSP x2 (ADBCE): neighbour costs and final tour', () => {
  const r = A.runCase(C.tsp5, 'tsp', {route: 'ADBCE'});
  assert.equal(r.iterations[0].cost.toFixed(4), '26.3835');
  assert.deepEqual(r.iterations[0].neighbors.map(n => n.cost.toFixed(4)), ['27.5791', '25.3606', '24.4296', '22.3760', '24.4296', '22.3760', '24.4870', '24.4870', '27.5791', '25.3606']);
  assert.equal(r.iterations[0].best.index, 4);
  assert.equal(r.iterations[1].best.index, 3);
  assert.equal(r.iterations[2].decision, 'Stop');
  assert.equal(A.routeText(r.finalRoute), 'C → D → B → E → A → C');
  assert.equal(r.moves, 2);
});

test('TSP variant A13 (A at (1,3)): ABCDE is a local optimum; ACBED and DAEBC reach 19.4086', () => {
  const variant = A.applyVariant(C.tsp5, 'A13');
  assert.equal(variant.isVariant, true);
  assert.match(variant.title, /A13|kota A dipindah/);
  const stuck = A.runCase(variant, 'tsp', {route: 'ABCDE'});
  assert.equal(stuck.iterations[0].cost.toFixed(4), '20.2326');
  assert.equal(stuck.iterations[0].best.index, 3);
  assert.equal(stuck.iterations[0].best.cost.toFixed(4), '20.4392');
  assert.equal(stuck.iterations[0].decision, 'Stop');
  assert.equal(stuck.moves, 0);
  const fromAcbed = A.runCase(variant, 'tsp', {route: 'ACBED'});
  assert.equal(fromAcbed.iterations[0].cost.toFixed(4), '23.0877');
  assert.equal(fromAcbed.iterations[0].best.index, 2);
  assert.equal(fromAcbed.finalCost.toFixed(4), '19.4086');
  assert.equal(fromAcbed.moves, 2);
  const fromDaebc = A.runCase(variant, 'tsp', {route: 'DAEBC'});
  assert.equal(fromDaebc.iterations[0].best.index, 4);
  assert.equal(fromDaebc.finalCost.toFixed(4), '19.4086');
  assert.equal(fromDaebc.moves, 1);
});

test('queens: slide 11 steepest path 43254323 → 36251473 with five moves', () => {
  const r = A.runCase(C['l4-queens-17'], 'queens', {});
  assert.deepEqual(r.path, ['43254323', '46254323', '46251323', '46251373', '46251473', '36251473']);
  assert.deepEqual(r.moves.map(m => [m.col, m.row]), [[2, 6], [5, 1], [7, 7], [6, 4], [1, 3]]);
  assert.equal(r.steps, 5);
  assert.equal(r.finalState, '36251473');
  assert.equal(r.h, 1);
  assert.equal(r.solved, false);
  assert.equal(A.queensAttacks('43254323'), 17);
  assert.equal(A.queensAttackingPairs('43254323').length, 17);
});

test('queens: slide 13 board 16257483 is a local minimum (h = 1, no move)', () => {
  const r = A.runCase(C['l4-queens-local'], 'queens', {});
  assert.equal(A.queensAttacks('16257483'), 1);
  assert.equal(r.steps, 0);
  assert.equal(r.finalState, '16257483');
  assert.equal(r.solved, false);
});

// Minimax: exact values (prune off), pruned sets, roots and event sequences (PLAN 4.6).
const sym = event => event.nodeType === 'MAX' ? 'α' : 'β';
function eventLines(result) {
  return result.events.map(e => e.node + '←' + e.child + '=' + e.childValue + ' ' + sym(e) + '(' + e.node + ')=' + e.nodeValue + (e.cut ? ' → CUT ' + e.prunedChildren.join(', ') : ''));
}
function minimax(caseId, options) { return A.runCase(C[caseId], 'tree', options); }

test('minimax exact values with pruning off (PLAN 4.6)', () => {
  const rn = minimax('l5-rn', {prune: false});
  assert.equal(rn.cost, 3); assert.equal(rn.values.B, 3); assert.equal(rn.values.C, 2); assert.equal(rn.values.D, 2); assert.equal(rn.values.A, 3);
  assert.equal(rn.bestMove, 'B');
  const practice = minimax('l5-practice', {prune: false});
  assert.equal(practice.values.B, 12); assert.equal(practice.values.C, 2); assert.equal(practice.values.D, 1); assert.equal(practice.values.A, 12);
  const mm = minimax('l5-minimax', {prune: false});
  assert.equal(mm.values.B, -5); assert.equal(mm.values.C, -6); assert.equal(mm.values.D, 0); assert.equal(mm.values.E, 1); assert.equal(mm.values.A, 1);
  assert.equal(mm.bestMove, 'E');
  const lecture = minimax('tree-lecture', {prune: false});
  assert.equal(lecture.values.F, 4); assert.equal(lecture.values.O, -5); assert.equal(lecture.values.B, -5); assert.equal(lecture.values.C, -10);
  assert.equal(lecture.values.J, 9); assert.equal(lecture.values.E, -7); assert.equal(lecture.values.K, 5); assert.equal(lecture.values.M, -7);
  assert.equal(lecture.cost, 0); assert.equal(lecture.bestMove, 'D');
  const uw = minimax('tree-uw', {prune: false});
  assert.equal(uw.cost, 4); assert.equal(uw.values.B, 4); assert.equal(uw.values.C, 3); assert.equal(uw.values.D, 3); assert.equal(uw.bestMove, 'B');
});

test('minimax pruned sets for both traversal orders and both pruneOn rules (PLAN 4.6)', () => {
  const rn = minimax('l5-rn', {order: 'left'});
  assert.deepEqual(rn.prunedRoots, ['c2', 'c3']); assert.deepEqual([...rn.pruned].sort(), ['c2', 'c3']);
  assert.deepEqual(minimax('l5-rn', {order: 'right'}).pruned, []);
  assert.deepEqual(minimax('l5-rn', {order: 'left', pruneOn: 'gt'}).pruned, ['c2', 'c3']);

  const practiceGte = minimax('l5-practice', {pruneOn: 'gte'});
  assert.deepEqual([...practiceGte.pruned].sort(), ['c2', 'c3', 'd2', 'd3']);
  assert.deepEqual(practiceGte.evaluatedLeaves, ['b1', 'b2', 'b3', 'c1', 'd1']);
  const practiceGt = minimax('l5-practice', {pruneOn: 'gt'});
  assert.deepEqual([...practiceGt.pruned].sort(), ['c2', 'c3', 'd3']);
  assert.equal(practiceGt.cost, 12);

  assert.deepEqual(minimax('l5-minimax', {order: 'left'}).pruned, []);
  for (const pruneOn of ['gte', 'gt']) {
    const mm = minimax('l5-minimax', {order: 'right', pruneOn});
    assert.deepEqual([...mm.pruned].sort(), ['F', 'H', 'I']);
    assert.equal(mm.cost, 1);
  }

  const lecture = minimax('tree-lecture', {order: 'left'});
  assert.deepEqual([...lecture.pruned].sort(), ['I', 'J', 'P', 'Q', 'R', 'X']);
  assert.deepEqual([...lecture.prunedRoots].sort(), ['I', 'J', 'X']);
  assert.deepEqual([...lecture.evaluatedLeaves].sort(), ['D', 'G', 'H', 'L', 'N', 'S', 'T', 'U', 'V', 'W']);
  assert.equal(lecture.cost, 0); assert.equal(lecture.bestMove, 'D');

  const rtl = minimax('tree-lecture-e-rtl', {order: 'left'});
  assert.deepEqual([...rtl.pruned].sort(), ['I', 'J', 'K', 'L', 'P', 'Q', 'R', 'S', 'T', 'X']);
  assert.deepEqual([...rtl.evaluatedLeaves].sort(), ['D', 'G', 'H', 'N', 'U', 'V', 'W']);
  assert.equal(rtl.cost, 0);

  const uwGte = minimax('tree-uw', {order: 'left', pruneOn: 'gte'});
  assert.deepEqual([...uwGte.pruned].sort(), ['AA', 'CC', 'EE', 'J', 'L', 'M', 'Q', 'R', 'U', 'V', 'Z'].sort());
  assert.deepEqual([...uwGte.prunedRoots].sort(), ['CC', 'EE', 'J', 'L', 'M', 'Q', 'R']);
  assert.equal(uwGte.cost, 4);
  const uwGt = minimax('tree-uw', {order: 'left', pruneOn: 'gt'});
  assert.deepEqual([...uwGt.pruned].sort(), ['AA', 'CC', 'EE', 'J', 'L', 'M', 'U', 'V']);
  assert.equal(uwGt.cost, 4);
  for (const pruneOn of ['gte', 'gt']) {
    const rightToLeft = minimax('tree-uw', {order: 'right', pruneOn});
    assert.deepEqual([...rightToLeft.pruned].sort(), ['W', 'Z']);
    assert.equal(rightToLeft.cost, 4);
    assert.equal(rightToLeft.bestMove, 'B');
  }
});

test('minimax event sequence for tree-lecture (PLAN 4.6, left to right)', () => {
  assert.deepEqual(eventLines(minimax('tree-lecture', {order: 'left'})), [
    'F←N=4 α(F)=4',
    'O←W=-3 β(O)=-3 → CUT X',
    'F←O=-3 α(F)=4',
    'B←F=4 β(B)=4',
    'B←G=-5 β(B)=-5',
    'A←B=-5 α(A)=-5',
    'C←H=-10 β(C)=-10 → CUT I, J',
    'A←C=-10 α(A)=-5',
    'A←D=0 α(A)=0',
    'K←S=3 α(K)=3',
    'K←T=5 α(K)=5',
    'E←K=5 β(E)=5',
    'E←L=2 β(E)=2',
    'M←U=-7 α(M)=-7',
    'M←V=-9 α(M)=-7',
    'E←M=-7 β(E)=-7',
    'A←E=-7 α(A)=0']);
});

test('minimax event sequence for tree-uw (PLAN 4.6): left to right with ≥, and right to left', () => {
  assert.deepEqual(eventLines(minimax('tree-uw', {order: 'left', pruneOn: 'gte'})), [
    'B←E=8 β(B)=8',
    'N←W=10 β(N)=10',
    'N←X=2 β(N)=2',
    'N←Y=9 β(N)=2',
    'F←N=2 α(F)=2',
    'F←O=4 α(F)=4',
    'B←F=4 β(B)=4',
    'B←G=7 β(B)=4',
    'H←P=4 α(H)=4 → CUT Q, R',
    'B←H=4 β(B)=4',
    'A←B=4 α(A)=4',
    'C←I=3 β(C)=3 → CUT J',
    'A←C=3 α(A)=4',
    'S←BB=3 β(S)=3 → CUT CC',
    'K←S=3 α(K)=3',
    'T←DD=2 β(T)=2 → CUT EE',
    'K←T=2 α(K)=3',
    'D←K=3 β(D)=3 → CUT L, M',
    'A←D=3 α(A)=4']);
  const rtl = [
    'M←V=9 α(M)=9', 'M←U=6 α(M)=9', 'D←M=9 β(D)=9', 'D←L=4 β(D)=4', 'T←EE=8 β(T)=8', 'T←DD=2 β(T)=2',
    'K←T=2 α(K)=2', 'S←CC=9 β(S)=9', 'S←BB=3 β(S)=3', 'K←S=3 α(K)=3', 'D←K=3 β(D)=3', 'A←D=3 α(A)=3',
    'C←J=8 β(C)=8', 'C←I=3 β(C)=3', 'A←C=3 α(A)=3', 'H←R=8 α(H)=8', 'Q←AA=4 β(Q)=4 → CUT Z', 'H←Q=4 α(H)=8',
    'H←P=4 α(H)=8', 'B←H=8 β(B)=8', 'B←G=7 β(B)=7', 'F←O=4 α(F)=4', 'N←Y=9 β(N)=9', 'N←X=2 β(N)=2 → CUT W',
    'F←N=2 α(F)=4', 'B←F=4 β(B)=4', 'B←E=8 β(B)=4', 'A←B=4 α(A)=4'];
  assert.deepEqual(eventLines(minimax('tree-uw', {order: 'right', pruneOn: 'gte'})), rtl);
  assert.deepEqual(eventLines(minimax('tree-uw', {order: 'right', pruneOn: 'gt'})), rtl);
});

test('minimax tree-uw ≥ vs > at H (PLAN 4.6): ≥ cuts Q and R; > cuts only AA and keeps R', () => {
  const gt = eventLines(minimax('tree-uw', {order: 'left', pruneOn: 'gt'}));
  assert.ok(gt.includes('Q←Z=2 β(Q)=2 → CUT AA'));
  assert.ok(gt.includes('H←R=8 α(H)=8'));
});

test('minimax validation: pruneOn and order are checked', () => {
  assert.throws(() => A.runMinimax(C['l5-rn'].tree, {pruneOn: 'eq'}), /pruneOn/);
  assert.throws(() => A.runMinimax(C['l5-rn'].tree, {order: 'middle'}), /order/);
});

test('search validation and runCase dispatch', () => {
  assert.throws(() => A.runSearch({graph: C.intro.graph, start: 'S', goal: 'G', heuristic: C.intro.heuristic, mode: 'ids'}), /mode/);
  assert.throws(() => A.runCase({kind: 'ga'}, 'steepest'), /kind/);
  assert.throws(() => A.applyVariant(C.intro, 'Z9'), /variant/);
  const search = A.runCase(C.intro, 'astar');
  assert.equal(search.cost, 9);
  assert.equal(A.runCase(C['l4-queens-17'], 'hill').finalState, '36251473');
});

test('frontier and trace checks run on the public engine: determinism and independence', () => {
  const a = A.runMinimax(C['tree-lecture'].tree, {order: 'left'});
  const b = A.runMinimax(C['tree-lecture'].tree, {order: 'left'});
  assert.deepEqual(a.events, b.events);
  const again = A.runSearch({graph: C.intro.graph, start: 'S', goal: 'G', heuristic: C.intro.heuristic, mode: 'ucs'});
  assert.equal(again.pathCosts.reduce((s, v) => s + v, 0), 9);
});

test('classic browser script exposes the same engine without a module loader', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(__dirname, '..', 'algorithms.js'), 'utf8');
  const sandbox = {window: {}};
  sandbox.window.window = sandbox.window;
  new Function('window', source)(sandbox.window);
  assert.equal(typeof sandbox.window.KKAAlgorithms.runSearch, 'function');
  assert.equal(typeof sandbox.window.KKAAlgorithms.traceTable, 'function');
});
