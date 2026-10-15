(function (root) {
  'use strict';
  // Positions for trees: leaves spaced evenly, internal nodes centred above their children, y = depth.
  function treePositions(tree) {
    const points = {};
    let leaf = 0;
    function walk(node, depth) {
      const children = node.children || [];
      let x;
      if (children.length) {
        const xs = children.map(child => walk(child, depth + 1));
        x = (xs[0] + xs[xs.length - 1]) / 2;
      } else x = leaf++;
      points[node.id] = [x * 120, depth * 110];
      return x;
    }
    walk(tree, 0);
    return points;
  }
  const withTreePositions = c => ({...c, positions: treePositions(c.tree)});
  const romaniaGraph = {
    A: [['S', 140], ['T', 118], ['Z', 75]], B: [['F', 211], ['G', 90], ['P', 101], ['U', 85]],
    C: [['D', 120], ['P', 138], ['R', 146]], D: [['C', 120], ['M', 75]], E: [['H', 86]],
    F: [['B', 211], ['S', 99]], G: [['B', 90]], H: [['E', 86], ['U', 98]], I: [['N', 87], ['V', 92]],
    L: [['M', 70], ['T', 111]], M: [['D', 75], ['L', 70]], N: [['I', 87]], O: [['S', 151], ['Z', 71]],
    P: [['B', 101], ['C', 138], ['R', 97]], R: [['C', 146], ['P', 97], ['S', 80]],
    S: [['A', 140], ['F', 99], ['O', 151], ['R', 80]], T: [['A', 118], ['L', 111]],
    U: [['B', 85], ['H', 98], ['V', 142]], V: [['I', 92], ['U', 142]], Z: [['A', 75], ['O', 71]]
  };
  const cases = {
    intro: {
      id: 'intro', title: 'Contoh materi · 9 titik', kind: 'search', start: 'S', goal: 'G',
      source: 'KKA-2026 / Searching / Informed / 01_materi_informed_search.ipynb',
      graph: {
        S: [['A', 2], ['B', 4], ['C', 3]], A: [['D', 2], ['E', 5]],
        B: [['F', 2], ['D', 1]], C: [['E', 2], ['H', 3]],
        D: [['G', 5]], E: [['G', 6]], F: [['G', 9]], H: [['G', 7]], G: []
      },
      heuristic: {S: 6, A: 7, B: 2, C: 6, D: 5, E: 6, F: 1, H: 7, G: 0},
      positions: {S: [70, 290], A: [270, 90], B: [270, 290], C: [270, 490],
        D: [490, 70], E: [490, 230], F: [490, 390], H: [490, 550], G: [760, 290]}
    },
    assignment: {
      id: 'assignment', title: 'Graf tugas · 14 titik', kind: 'search', start: 'S', goal: 'G',
      source: 'KKA-2026 / Searching / Informed / 02_tugas_individu.ipynb',
      graph: {
        S: [['A', 3], ['B', 5], ['C', 4]], A: [['D', 4], ['E', 7], ['B', 1]],
        B: [['E', 2], ['F', 6]], C: [['B', 2], ['F', 3], ['H', 5]],
        D: [['I', 4], ['E', 2]], E: [['D', 3], ['I', 5], ['J', 6]],
        F: [['E', 2], ['J', 3], ['K', 7]], H: [['F', 2], ['K', 3]],
        I: [['L', 3], ['J', 2]], J: [['I', 2], ['L', 5], ['M', 4]],
        K: [['J', 2], ['M', 3]], L: [['G', 6], ['M', 2]], M: [['G', 3]], G: []
      },
      heuristic: {S: 9, A: 8, B: 7, C: 7, D: 7, E: 6, F: 5, H: 5,
        I: 5, J: 4, K: 4, L: 3, M: 2, G: 0},
      positions: {S: [60, 300], A: [230, 100], B: [230, 300], C: [230, 500],
        D: [400, 90], E: [400, 260], F: [400, 440], H: [400, 600],
        I: [570, 130], J: [570, 310], K: [570, 510],
        L: [740, 150], M: [740, 430], G: [900, 300]}
    },
    'l2-tiny': {
      id: 'l2-tiny', title: 'Graf kecil CS188 · 12 titik', kind: 'search', start: 'S', goal: 'G',
      source: 'Lecture 2 — Uninformed Search, slide 23, 25, 31, 33, 38, 45, 47',
      note: 'Slide 45 menulis biaya r→f = 2, slide 47 memakai r→f = 1 (lihat pohon UCS: r=7, f=8). Web ini memakai slide 47.',
      graph: {
        S: [['d', 3], ['e', 9], ['p', 1]], d: [['b', 1], ['c', 8], ['e', 2]], b: [['a', 2]], c: [['a', 2]],
        e: [['h', 8], ['r', 2]], h: [['p', 4], ['q', 4]], p: [['q', 15]], r: [['f', 1]], f: [['c', 3], ['G', 2]],
        a: [], q: [], G: []
      },
      positions: {S: [158, 215], a: [255, 97], b: [185, 130], c: [352, 125], d: [265, 183], e: [402, 170],
        f: [480, 190], G: [492, 95], h: [373, 220], p: [225, 257], q: [310, 268], r: [465, 257]}
    },
    'l2-four': {
      id: 'l2-four', title: 'Graf empat titik · siklus a↔b', kind: 'search', start: 'S', goal: 'G',
      source: 'Lecture 2 — Uninformed Search, slide 26',
      note: 'Slide 26 tidak mencantumkan biaya; web ini memakai biaya 1 untuk setiap busur.',
      graph: {S: [['a', 1], ['b', 1]], a: [['b', 1], ['G', 1]], b: [['a', 1], ['G', 1]], G: []},
      start: 'S', goal: 'G',
      positions: {S: [100, 205], a: [153, 158], b: [153, 250], G: [212, 205]}
    },
    romania: {
      id: 'romania', title: 'Peta Romania · 20 kota', kind: 'search', start: 'A', goal: 'B', undirected: true,
      source: 'Lecture 2, slide 17 (peta); Lecture 3, slide 19 (heuristik garis lurus)',
      labels: {A: 'Arad', B: 'Bucharest', C: 'Craiova', D: 'Dobreta', E: 'Eforie', F: 'Fagaras', G: 'Giurgiu',
        H: 'Hirsova', I: 'Iasi', L: 'Lugoj', M: 'Mehadia', N: 'Neamt', O: 'Oradea', P: 'Pitesti', R: 'Rimnicu Vilcea',
        S: 'Sibiu', T: 'Timisoara', U: 'Urziceni', V: 'Vaslui', Z: 'Zerind'},
      graph: romaniaGraph,
      heuristic: {A: 366, B: 0, C: 160, D: 242, E: 161, F: 178, G: 77, H: 151, I: 226, L: 244, M: 241, N: 234,
        O: 380, P: 98, R: 193, S: 253, T: 329, U: 80, V: 199, Z: 374},
      positions: {A: [91, 108], B: [400, 273], C: [253, 312], D: [165, 301], E: [562, 307], F: [305, 151],
        G: [375, 330], H: [534, 250], I: [473, 94], L: [165, 221], M: [168, 261], N: [406, 63], O: [131, 29],
        P: [320, 232], R: [233, 190], S: [207, 143], T: [94, 190], U: [456, 250], V: [509, 156], Z: [108, 69]}
    },
    'l3-teg': {
      id: 'l3-teg', title: 'Contoh Teg Grenager · 7 titik', kind: 'search', start: 'S', goal: 'G',
      source: 'Lecture 3 — Informed Search, slide 26',
      graph: {S: [['a', 1]], a: [['b', 1], ['d', 3], ['e', 8]], b: [['c', 1]], c: [], d: [['G', 2]], e: [['d', 1]], G: []},
      heuristic: {S: 6, a: 5, b: 6, c: 7, d: 2, e: 1, G: 0},
      positions: {S: [37, 215], a: [107, 215], b: [107, 270], c: [37, 270], d: [262, 215], e: [300, 172], G: [357, 215]}
    },
    'l3-admissible': {
      id: 'l3-admissible', title: 'Heuristik admissible · 3 titik', kind: 'search', start: 'S', goal: 'G',
      source: 'Lecture 3 — Informed Search, slide 27',
      graph: {S: [['A', 1], ['G', 5]], A: [['G', 3]], G: []},
      heuristic: {S: 7, A: 6, G: 0},
      positions: {S: [170, 185], A: [333, 110], G: [495, 190]}
    },
    'l4-queens-17': {
      id: 'l4-queens-17', title: 'Delapan ratu · h = 17', kind: 'queens', start: '43254323',
      source: 'Lecture 4 — Local Search, slide 11 (h = 17)'
    },
    'l4-queens-local': {
      id: 'l4-queens-local', title: 'Delapan ratu · h = 1 (minimum lokal)', kind: 'queens', start: '16257483',
      source: 'Lecture 4 — Local Search, slide 13 dan 30 (papan yang sama; h = 1)'
    },
    'l5-minimax': withTreePositions({
      id: 'l5-minimax', title: 'Minimax · empat simpul MIN', kind: 'tree',
      source: 'Lecture 5 — Adversarial Search, slide 17–19',
      tree: {id: 'A', children: [
        {id: 'B', children: [{id: 'F', value: 7}, {id: 'G', value: -5}]},
        {id: 'C', children: [{id: 'H', value: 3}, {id: 'I', value: 9}, {id: 'J', value: -6}]},
        {id: 'D', children: [{id: 'K', value: 0}, {id: 'L', value: 2}]},
        {id: 'E', children: [{id: 'M', value: 1}, {id: 'N', value: 3}, {id: 'O', value: 2}]}
      ]}
    }),
    'l5-rn': withTreePositions({
      id: 'l5-rn', title: 'Minimax · tiga MIN, sembilan daun', kind: 'tree',
      source: 'Lecture 5 — Adversarial Search, slide 9',
      tree: {id: 'A', children: [
        {id: 'B', children: [{id: 'b1', value: 3}, {id: 'b2', value: 12}, {id: 'b3', value: 8}]},
        {id: 'C', children: [{id: 'c1', value: 2}, {id: 'c2', value: 4}, {id: 'c3', value: 6}]},
        {id: 'D', children: [{id: 'd1', value: 14}, {id: 'd2', value: 5}, {id: 'd3', value: 2}]}
      ]}
    }),
    'l5-practice': withTreePositions({
      id: 'l5-practice', title: 'Latihan minimax · sembilan daun', kind: 'tree',
      source: 'Lecture 5 — Adversarial Search, slide 10',
      tree: {id: 'A', children: [
        {id: 'B', children: [{id: 'b1', value: 31}, {id: 'b2', value: 20}, {id: 'b3', value: 12}]},
        {id: 'C', children: [{id: 'c1', value: 2}, {id: 'c2', value: 8}, {id: 'c3', value: 16}]},
        {id: 'D', children: [{id: 'd1', value: 12}, {id: 'd2', value: 1}, {id: 'd3', value: 5}]}
      ]}
    }),
    'tree-lecture': {
      id: 'tree-lecture', title: 'Pohon kuliah · Alpha-Beta Example', kind: 'tree',
      source: '8. Adversarial Search.pdf, slide 27–52; leaf dapat berada pada kedalaman berbeda.',
      tree: {id: 'A', children: [
        {id: 'B', children: [
          {id: 'F', children: [{id: 'N', value: 4}, {id: 'O', children: [{id: 'W', value: -3}, {id: 'X', value: -5}]}]},
          {id: 'G', value: -5}
        ]},
        {id: 'C', children: [{id: 'H', value: -10}, {id: 'I', value: 8},
          {id: 'J', children: [{id: 'P', value: 9}, {id: 'Q', value: -6}, {id: 'R', value: 0}]}]},
        {id: 'D', value: 0},
        {id: 'E', children: [
          {id: 'K', children: [{id: 'S', value: 3}, {id: 'T', value: 5}]},
          {id: 'L', value: 2},
          {id: 'M', children: [{id: 'U', value: -7}, {id: 'V', value: -9}]}
        ]}
      ]},
      positions: {A: [510, 60], B: [130, 185], C: [430, 185], D: [630, 185], E: [845, 185],
        F: [80, 315], G: [200, 315], H: [310, 315], I: [390, 315], J: [495, 315],
        K: [725, 315], L: [845, 315], M: [945, 315],
        N: [30, 445], O: [125, 445], P: [415, 445], Q: [495, 445], R: [575, 445],
        S: [680, 445], T: [765, 445], U: [900, 445], V: [985, 445], W: [85, 565], X: [165, 565]}
    },
    'tree-lecture-e-rtl': withTreePositions({
      id: 'tree-lecture-e-rtl', title: 'Pohon kuliah · urutan kanan→kiri di E', kind: 'tree',
      source: '8. Adversarial Search.pdf, slide 50–51; sama dengan tree-lecture, anak E diurutkan kanan→kiri.',
      tree: {id: 'A', children: [
        {id: 'B', children: [
          {id: 'F', children: [{id: 'N', value: 4}, {id: 'O', children: [{id: 'W', value: -3}, {id: 'X', value: -5}]}]},
          {id: 'G', value: -5}
        ]},
        {id: 'C', children: [{id: 'H', value: -10}, {id: 'I', value: 8},
          {id: 'J', children: [{id: 'P', value: 9}, {id: 'Q', value: -6}, {id: 'R', value: 0}]}]},
        {id: 'D', value: 0},
        {id: 'E', children: [
          {id: 'M', children: [{id: 'V', value: -9}, {id: 'U', value: -7}]},
          {id: 'L', value: 2},
          {id: 'K', children: [{id: 'T', value: 5}, {id: 'S', value: 3}]}
        ]}
      ]}
    }),
    'tsp5': {
      id: 'tsp5', title: 'TSP 5 kota (notebook local search)', kind: 'tsp',
      source: 'KKA-2026 / Searching / Local / 01_materi_local_search.ipynb §4',
      cities: {A: [1, 1], B: [4, 5], C: [7, 2], D: [6, 7], E: [2, 6]}, start: ['A', 'B', 'C', 'D', 'E'],
      starts: {exp1: 'ABCDE', exp2: 'ACBED', exp3: 'DAEBC', x2: 'ADBCE'},
      positions: {A: [80, 560], B: [320, 240], C: [560, 480], D: [480, 80], E: [160, 160]},
      variants: {A13: {label: 'Variasi: kota A dipindah ke (1,3)', cities: {A: [1, 3]}}}
    },
    'tree-uw': withTreePositions({
      id: 'tree-uw', title: 'Pohon UW · alpha-beta (slide 53–56)', kind: 'tree',
      source: 'Lecture 5 — Adversarial Search, slide 53–56 (root MAX, daun dinamai seperti di slide)',
      tree: {id: 'A', children: [
        {id: 'B', children: [
          {id: 'E', value: 8},
          {id: 'F', children: [
            {id: 'N', children: [{id: 'W', value: 10}, {id: 'X', value: 2}, {id: 'Y', value: 9}]},
            {id: 'O', value: 4}]},
          {id: 'G', value: 7},
          {id: 'H', children: [
            {id: 'P', value: 4},
            {id: 'Q', children: [{id: 'Z', value: 2}, {id: 'AA', value: 4}]},
            {id: 'R', value: 8}]}
        ]},
        {id: 'C', children: [{id: 'I', value: 3}, {id: 'J', value: 8}]},
        {id: 'D', children: [
          {id: 'K', children: [
            {id: 'S', children: [{id: 'BB', value: 3}, {id: 'CC', value: 9}]},
            {id: 'T', children: [{id: 'DD', value: 2}, {id: 'EE', value: 8}]}]},
          {id: 'L', value: 4},
          {id: 'M', children: [{id: 'U', value: 6}, {id: 'V', value: 9}]}]}
      ]}
    })
  };
  // Variasi dipakai lewat applyVariant(problem, id); data dasar tidak diubah.
  cases.assignment.variants = {
    V1: {label: 'Variasi V1: h(C)=6, h(F)=4, h(H)=4', h: {C: 6, F: 4, H: 4}, note: 'Tiga nilai diturunkan; tetap consistent dan admissible.'},
    V3: {label: 'Variasi V3: h(C)=12, h(F)=10, h(H)=9', h: {C: 12, F: 10, H: 9}, note: 'Admissible (h ≤ h*), tetapi tidak consistent pada C→B, F→E, F→J, H→K; A* membuka ulang J.'},
    V4: {label: 'Variasi V4: h(B)=9, h(E)=9, h(F)=3', h: {B: 9, E: 9, F: 3}, note: 'Admissible; consistency gagal pada C→F (7 > 3+3).'},
    V6: {label: 'Variasi V6: h(C)=15, h(F)=12, h(H)=12', h: {C: 15, F: 12, H: 12}, note: 'Tidak admissible: h(C)=15 > h*(C)=13, h(F)=12 > 10, h(H)=12 > 9.'},
    E1: {label: 'Variasi E1: biaya C→F = 6 (semula 3)', edges: [['C', 'F', 6]], note: 'Heuristic awal tetap consistent: h(C)=7 ≤ 6 + h(F)=5.'}
  };
  cases.intro.variants = {
    H0: {label: 'Semua h = 0 (null heuristic, notebook §3d)', hAll: 0},
    D0: {label: 'h(D) = 0 (notebook §3h)', h: {D: 0}},
    A50: {label: 'h(A) = 50 (notebook §9b)', h: {A: 50}}
  };
  cases['l3-admissible'].variants = {
    A3: {label: 'h(A)=3', h: {A: 3}},
    A4: {label: 'h(A)=4', h: {A: 4}},
    A5: {label: 'h(A)=5', h: {A: 5}}
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = cases;
  if (root) root.KKA_CASES = cases;
})(typeof window !== 'undefined' ? window : globalThis);
