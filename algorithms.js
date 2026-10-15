(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KKAAlgorithms = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  function requireThat(condition, message) {
    if (!condition) throw new Error('Input tidak valid: ' + message);
  }
  const dictionary = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const SEARCH_MODES = ['dfs', 'bfs', 'ucs', 'greedy', 'astar'];
  const TSP_EPSILON = 1e-9;
  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (dictionary(value)) {
      const result = {};
      for (const key of Object.keys(value)) Object.defineProperty(result, key, {value: clone(value[key]), enumerable: true, writable: true, configurable: true});
      return result;
    }
    return value;
  }
  function freeze(value) {
    if (value && typeof value === 'object') {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  function recorder() {
    const trace = [];
    return {trace, add(type, current, reason, extras = {}) {
      trace.push(freeze(clone({...extras, step: trace.length, type, current, reason})));
    }};
  }
  function validateGraph(graph, start, goal, heuristic, mode) {
    requireThat(dictionary(graph) && Object.keys(graph).length > 0, 'graph harus berupa kamus adjacency yang tidak kosong.');
    requireThat(typeof start === 'string' && own(graph, start), 'start harus merupakan simpul graph.');
    requireThat(typeof goal === 'string' && own(graph, goal), 'goal harus merupakan simpul graph.');
    for (const [state, edges] of Object.entries(graph)) {
      requireThat(Array.isArray(edges), 'successor ' + state + ' harus berupa array.');
      for (const edge of edges) requireThat(Array.isArray(edge) && edge.length === 2 && typeof edge[0] === 'string' && own(graph, edge[0]) && finite(edge[1]) && edge[1] >= 0, 'setiap edge harus [simpul yang ada, biaya finite nonnegatif].');
    }
    if (mode === 'greedy' || mode === 'astar') {
      requireThat(dictionary(heuristic), 'heuristic diperlukan untuk Greedy/A*.');
      for (const state of Object.keys(graph)) requireThat(own(heuristic, state) && finite(heuristic[state]), 'heuristic ' + state + ' harus finite.');
    }
  }
  function pathTo(state, parents) {
    const path = [], seen = new Set();
    while (state !== null && state !== undefined) {
      requireThat(!seen.has(state), 'rantai parent mengandung siklus.');
      seen.add(state); path.unshift(state); state = parents[state];
    }
    return path;
  }
  // Cheapest edge between two adjacent states; used for the cost terms printed under a path.
  function pathCosts(graph, path) {
    return path.slice(1).map((state, i) => {
      let best = Infinity;
      for (const [next, cost] of graph[path[i]]) if (next === state && cost < best) best = cost;
      return best;
    });
  }

  function runSearch(input) {
    requireThat(dictionary(input), 'parameter pencarian harus berupa objek.');
    const {graph, start, goal, heuristic = {}, mode = 'ucs', treeSearch = false, maxExpansions = 1000} = input;
    requireThat(SEARCH_MODES.includes(mode), 'mode pencarian tidak dikenal.');
    validateGraph(graph, start, goal, heuristic, mode);
    if (treeSearch) return runTreeSearch(graph, start, goal, heuristic, mode, maxExpansions);
    const log = recorder(), queue = [], closed = new Set(), discovered = new Set([start]);
    const bestG = Object.create(null), parents = Object.create(null), expansionOrder = [];
    bestG[start] = 0; parents[start] = null;
    let sequence = 0;
    const h = state => mode === 'greedy' || mode === 'astar' ? heuristic[state] : 0;
    function push(state, g, parent) {
      const estimate = h(state), f = g + estimate;
      requireThat(finite(g) && finite(f), 'biaya atau prioritas melampaui batas angka finite.');
      queue.push({state, g, h: estimate, f, priority: mode === 'greedy' ? estimate : mode === 'astar' ? f : mode === 'ucs' ? g : 0, order: sequence++, parent});
    }
    const active = entry => !closed.has(entry.state) && (mode === 'dfs' || mode === 'bfs' || mode === 'greedy' || entry.g === bestG[entry.state]);
    const ordered = () => mode === 'dfs' ? queue.slice().reverse() : queue.slice().sort((a, b) => a.priority - b.priority || a.order - b.order);
    function view(extra = {}) {
      return {frontier: ordered().filter(active).map(({parent, ...entry}) => entry), expanded: expansionOrder, visited: [...closed], parents, ...extra};
    }
    push(start, 0, null);
    log.add('initial', null, 'Mulai dengan simpul awal di frontier.', view());
    while (queue.length) {
      let entry;
      if (mode === 'dfs') entry = queue.pop();
      else {
        queue.sort((a, b) => a.priority - b.priority || a.order - b.order);
        entry = queue.shift();
      }
      const {state, g} = entry;
      if ((mode === 'ucs' || mode === 'astar') && g !== bestG[state]) {
        log.add('skip', state, 'Lewati entri stale: tersedia g yang lebih kecil.', view({g, bestG: bestG[state]})); continue;
      }
      if (closed.has(state)) {
        log.add('skip', state, 'Lewati simpul yang sudah dikunjungi.', view({g})); continue;
      }
      if (mode === 'dfs' || mode === 'bfs') { parents[state] = entry.parent; bestG[state] = g; }
      closed.add(state);
      const selectedPath = pathTo(state, parents);
      log.add('select', state, 'Ambil simpul valid berikutnya dari frontier.', view({g, h: entry.h, f: entry.f, path: selectedPath, prediction: {prompt: 'Simpul mana yang diambil berikutnya?', answer: state}}));
      if (state === goal) {
        log.add('goal', state, 'Goal ditemukan ketika diambil dari frontier.', view({path: selectedPath, cost: g, g, h: entry.h, f: entry.f}));
        return {path: selectedPath, cost: g, pathCosts: pathCosts(graph, selectedPath), expanded: expansionOrder.length, expansionOrder, visited: [...closed], parents: clone(parents), trace: log.trace};
      }
      expansionOrder.push(state);
      const updates = [], successors = mode === 'dfs' ? graph[state].slice().reverse() : graph[state];
      for (const [next, edgeCost] of successors) {
        const candidate = g + edgeCost;
        requireThat(finite(candidate), 'biaya lintasan melampaui batas angka finite.');
        if (mode === 'dfs' || mode === 'bfs') {
          if (!closed.has(next)) { discovered.add(next); push(next, candidate, state); }
        } else if (mode === 'greedy') {
          if (!discovered.has(next)) {
            discovered.add(next); parents[next] = state; bestG[next] = candidate;
            updates.push({state: next, previousG: null, newG: candidate, previousParent: null, newParent: state}); push(next, candidate, state);
          }
        } else if (!own(bestG, next) || candidate < bestG[next]) {
          const previousG = own(bestG, next) ? bestG[next] : null, previousParent = own(parents, next) ? parents[next] : null;
          const reopened = closed.delete(next);
          bestG[next] = candidate; parents[next] = state; discovered.add(next);
          updates.push({state: next, previousG, newG: candidate, previousParent, newParent: state, reopened}); push(next, candidate, state);
        }
      }
      log.add('expand', state, 'Proses successor sesuai urutan yang ditetapkan' + (updates.some(update => update.reopened) ? '; simpul dengan g membaik dibuka kembali.' : '.'), view({g, h: entry.h, f: entry.f, path: selectedPath, updates}));
    }
    log.add('failure', null, 'Frontier habis; goal tidak dapat dicapai.', view({path: [], cost: Infinity}));
    return {path: [], cost: Infinity, pathCosts: [], expanded: expansionOrder.length, expansionOrder, visited: [...closed], parents: clone(parents), trace: log.trace};
  }

  function runTreeSearch(graph, start, goal, heuristic, mode, maxExpansions) {
    requireThat(Number.isInteger(maxExpansions) && maxExpansions >= 1, 'maxExpansions harus bilangan bulat positif.');
    const log = recorder(), queue = [], expansionOrder = [], discovered = new Set([start]);
    let sequence = 0;
    const h = state => mode === 'greedy' || mode === 'astar' ? heuristic[state] : 0;
    function push(state, g, path) {
      const estimate = h(state), f = g + estimate;
      requireThat(finite(g) && finite(f), 'biaya atau prioritas melampaui batas angka finite.');
      queue.push({state, g, h: estimate, f, priority: mode === 'greedy' ? estimate : mode === 'astar' ? f : mode === 'ucs' ? g : 0, order: sequence++, path});
      discovered.add(state);
    }
    const ordered = () => mode === 'dfs' ? queue.slice().reverse() : queue.slice().sort((a, b) => a.priority - b.priority || a.order - b.order);
    const frontierView = () => ordered().map(entry => ({...entry, pathLabel: entry.path.join('→')}));
    const view = (extra = {}) => ({frontier: frontierView(), expanded: expansionOrder, visited: [...new Set(expansionOrder)], discovered: [...discovered], parents: {}, ...extra});
    push(start, 0, [start]);
    log.add('initial', null, 'Mulai dengan jalur awal di frontier; pohon tanpa daftar tertutup.', view());
    while (queue.length) {
      let entry;
      if (mode === 'dfs') entry = queue.pop();
      else { queue.sort((a, b) => a.priority - b.priority || a.order - b.order); entry = queue.shift(); }
      const {state, g, path} = entry;
      log.add('select', state, 'Ambil jalur berikutnya dari frontier.', view({g, h: entry.h, f: entry.f, path, prediction: {prompt: 'Simpul mana yang diambil berikutnya?', answer: state}}));
      if (state === goal) {
        log.add('goal', state, 'Goal ditemukan ketika jalurnya diambil dari frontier.', view({path, cost: g, g, h: entry.h, f: entry.f}));
        return {path, cost: g, pathCosts: pathCosts(graph, path), expanded: expansionOrder.length, expansionOrder, visited: [...new Set(expansionOrder)], parents: {}, trace: log.trace};
      }
      expansionOrder.push(state);
      const successors = mode === 'dfs' ? graph[state].slice().reverse() : graph[state];
      for (const [next, edgeCost] of successors) {
        const candidate = g + edgeCost;
        requireThat(finite(candidate), 'biaya lintasan melampaui batas angka finite.');
        push(next, candidate, [...path, next]);
      }
      log.add('expand', state, 'Tambahkan semua successor sebagai jalur baru; tidak ada daftar tertutup.', view({g, h: entry.h, f: entry.f, path}));
      if (expansionOrder.length >= maxExpansions) {
        log.add('limit', null, 'Batas ekspansi ' + maxExpansions + ' tercapai; pencarian dihentikan.', view({path: [], cost: Infinity, limitReached: true}));
        return {path: [], cost: Infinity, limitReached: true, pathCosts: [], expanded: expansionOrder.length, expansionOrder, visited: [...new Set(expansionOrder)], parents: {}, trace: log.trace};
      }
    }
    log.add('failure', null, 'Frontier habis; goal tidak dapat dicapai.', view({path: [], cost: Infinity}));
    return {path: [], cost: Infinity, pathCosts: [], expanded: expansionOrder.length, expansionOrder, visited: [...new Set(expansionOrder)], parents: {}, trace: log.trace};
  }

  // Frontier entries in display order: DFS lists the top of the stack first; other modes list priority then FIFO.
  function formatFrontier(entries, mode) {
    requireThat(Array.isArray(entries), 'frontier harus berupa array.');
    requireThat(SEARCH_MODES.includes(mode), 'mode pencarian tidak dikenal.');
    let list = entries.map((entry, index) => ({entry, index}));
    if (mode !== 'dfs' && mode !== 'bfs') {
      const key = entry => mode === 'greedy' ? entry.h : mode === 'astar' ? entry.f ?? entry.g + entry.h : entry.g;
      list.sort((a, b) => key(a.entry) - key(b.entry) || a.index - b.index);
    }
    if (!list.length) return '(kosong)';
    return list.map(({entry: e}) => {
      if (mode === 'greedy') return e.state + '(h=' + e.h + ')';
      if (mode === 'astar') return e.state + '(g=' + e.g + ',h=' + e.h + ',f=' + (e.f ?? e.g + e.h) + ')';
      return e.state + '(g=' + e.g + ')';
    }).join('; ');
  }

  // Rows follow the notebook convention: one row per valid pop (iteration 1-based); stale or closed pops are
  // listed in skippedAfter of the row before them. Frontier is the state after the row's successors are processed.
  function traceTable(result, mode) {
    requireThat(dictionary(result) && Array.isArray(result.trace), 'traceTable memerlukan hasil runSearch.');
    requireThat(SEARCH_MODES.includes(mode), 'mode pencarian tidak dikenal.');
    const informed = mode === 'greedy' || mode === 'astar';
    const frontierRows = entries => entries.map(e => ({state: e.state, g: e.g, h: informed ? e.h : null, f: mode === 'astar' ? e.f ?? e.g + e.h : null}));
    const rows = [];
    let current = null;
    for (const entry of result.trace) {
      if (entry.type === 'select') {
        current = {iteration: rows.length + 1, selected: entry.current, g: entry.g, h: informed ? entry.h : null,
          f: mode === 'astar' ? entry.f : null, action: null, frontier: [], frontierText: '', updates: [], skippedAfter: []};
        rows.push(current);
      } else if (entry.type === 'skip') {
        if (current) current.skippedAfter.push({state: entry.current, g: entry.g});
      } else if ((entry.type === 'expand' || entry.type === 'goal') && current) {
        current.action = entry.type;
        current.frontier = frontierRows(entry.frontier);
        current.frontierText = formatFrontier(entry.frontier, mode);
        current.updates = (entry.updates || []).filter(update => update.previousG !== null).map(update => ({
          state: update.state, previousG: update.previousG, newG: update.newG,
          previousParent: update.previousParent, newParent: update.newParent, reopened: update.reopened === true}));
      }
    }
    return {mode, rows, path: result.path, cost: result.cost, costTerms: (result.pathCosts || []).slice(),
      expanded: result.expanded, expansionOrder: (result.expansionOrder || []).slice()};
  }

  function applyVariant(problem, variant) {
    requireThat(dictionary(problem), 'problem harus berupa objek.');
    let spec = variant, id = null;
    if (typeof variant === 'string') {
      requireThat(dictionary(problem.variants) && own(problem.variants, variant), 'variant ' + variant + ' tidak ada pada problem.');
      spec = problem.variants[variant]; id = variant;
    }
    requireThat(dictionary(spec), 'variant harus berupa id string atau objek.');
    const out = clone(problem);
    out.isVariant = true;
    out.variantId = id;
    if (typeof spec.label === 'string') out.title = problem.title + ' · ' + spec.label;
    if (dictionary(spec.h)) {
      requireThat(dictionary(out.heuristic), 'variant h memerlukan heuristic pada problem.');
      for (const [state, value] of Object.entries(spec.h)) {
        requireThat(own(out.heuristic, state) && finite(value), 'heuristic ' + state + ' tidak valid untuk variant.');
        out.heuristic[state] = value;
      }
    }
    if (finite(spec.hAll)) {
      requireThat(dictionary(out.heuristic), 'variant hAll memerlukan heuristic pada problem.');
      for (const state of Object.keys(out.heuristic)) out.heuristic[state] = spec.hAll;
    }
    if (Array.isArray(spec.edges)) {
      for (const [from, to, cost] of spec.edges) {
        requireThat(dictionary(out.graph) && own(out.graph, from), 'edge variant dari ' + from + ' tidak ada.');
        const edge = out.graph[from].find(([next]) => next === to);
        requireThat(edge && finite(cost) && cost >= 0, 'edge ' + from + '→' + to + ' tidak ada pada graph.');
        edge[1] = cost;
      }
    }
    if (dictionary(spec.cities)) {
      requireThat(dictionary(out.cities), 'variant cities memerlukan problem tsp.');
      for (const [city, xy] of Object.entries(spec.cities)) {
        requireThat(own(out.cities, city) && Array.isArray(xy) && xy.length === 2 && xy.every(finite), 'kota ' + city + ' tidak valid untuk variant.');
        out.cities[city] = xy.slice();
      }
    }
    if (dictionary(spec.leaves)) {
      const found = new Set();
      const walk = node => {
        if (own(node, 'value') && own(spec.leaves, node.id)) { requireThat(finite(spec.leaves[node.id]), 'nilai leaf ' + node.id + ' harus finite.'); node.value = spec.leaves[node.id]; found.add(node.id); }
        (node.children || []).forEach(walk);
      };
      walk(out.tree);
      for (const leaf of Object.keys(spec.leaves)) requireThat(found.has(leaf), 'leaf ' + leaf + ' tidak ada pada tree.');
    }
    if (typeof spec.note === 'string') out.variantNote = spec.note;
    return out;
  }

  function consistencyViolations(graph, h) {
    requireThat(dictionary(graph) && dictionary(h), 'consistencyViolations memerlukan graph dan heuristic.');
    const violations = [];
    for (const [from, edges] of Object.entries(graph)) for (const [to, cost] of edges) {
      requireThat(finite(h[from]) && finite(h[to]), 'heuristic ' + from + ' atau ' + to + ' tidak ada.');
      const limit = cost + h[to];
      if (h[from] > limit) violations.push({from, to, hFrom: h[from], cost, hTo: h[to], limit});
    }
    return violations;
  }

  function trueCosts(graph, goal) {
    requireThat(dictionary(graph) && own(graph, goal), 'trueCosts memerlukan goal pada graph.');
    const dist = {};
    for (const state of Object.keys(graph)) dist[state] = Infinity;
    dist[goal] = 0;
    // Bellman-Ford on reversed edges: relax until no change (at most |V| rounds for nonnegative costs).
    for (let round = 0; round < Object.keys(graph).length; round++) {
      let changed = false;
      for (const [from, edges] of Object.entries(graph)) for (const [to, cost] of edges) {
        if (dist[to] + cost < dist[from]) { dist[from] = dist[to] + cost; changed = true; }
      }
      if (!changed) break;
    }
    return dist;
  }

  function tspDistance(cities, a, b) {
    requireThat(dictionary(cities) && own(cities, a) && own(cities, b), 'kota tidak ada.');
    const p = cities[a], q = cities[b];
    const dx = p[0] - q[0], dy = p[1] - q[1];
    return Math.sqrt(dx * dx + dy * dy);
  }
  function tspRouteCost(cities, route) {
    requireThat(Array.isArray(route) && route.length >= 2, 'route harus array minimal dua kota.');
    let total = 0;
    for (let i = 0; i < route.length; i++) total += tspDistance(cities, route[i], route[(i + 1) % route.length]);
    requireThat(finite(total), 'biaya tour melampaui batas angka finite.');
    return total;
  }
  function routeText(route) {
    requireThat(Array.isArray(route) && route.length > 0, 'route harus array tidak kosong.');
    return route.concat(route[0]).join(' → ');
  }

  function runTSP(input) {
    requireThat(dictionary(input), 'parameter TSP harus berupa objek.');
    const {cities, route, tie = 'first'} = input;
    requireThat(['first', 'float'].includes(tie), 'tie harus first atau float.');
    requireThat(dictionary(cities) && Object.keys(cities).length >= 2 && Array.isArray(route), 'TSP memerlukan minimal dua kota dan route array.');
    for (const coordinates of Object.values(cities)) requireThat(Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every(finite), 'koordinat kota harus [x,y] finite.');
    requireThat(route.length === Object.keys(cities).length && new Set(route).size === route.length && route.every(city => typeof city === 'string' && own(cities, city)), 'route harus memuat setiap kota tepat satu kali.');
    const epsilon = tie === 'first' ? TSP_EPSILON : 0;
    const log = recorder(), iterations = [];
    let current = route.slice(), cost = tspRouteCost(cities, current), moves = 0;
    for (let iteration = 0; ; iteration++) {
      const neighbors = [];
      for (let i = 0; i < current.length; i++) for (let j = i + 1; j < current.length; j++) {
        const next = current.slice(); [next[i], next[j]] = [next[j], next[i]];
        neighbors.push({index: neighbors.length + 1, i, j, route: next, cost: tspRouteCost(cities, next)});
      }
      let best = neighbors[0];
      for (const candidate of neighbors) if (candidate.cost < best.cost - epsilon) best = candidate;
      const decision = best.cost < cost - epsilon ? 'Move' : 'Stop';
      iterations.push({iteration, route: current.slice(), cost, neighbors, best, decision});
      log.add('evaluate', routeText(current), 'Evaluasi semua swap i < j; pilih neighbor terbaik.', {iteration, route: current.slice(), cost, bestIndex: best.index, decision});
      if (decision === 'Stop') break;
      current = best.route.slice(); cost = best.cost; moves++;
    }
    return {iterations, finalRoute: current.slice(), finalCost: cost, moves, trace: log.trace};
  }

  function runMinimax(tree, options = {}) {
    requireThat(dictionary(options), 'opsi minimax harus berupa objek.');
    const {prune = true, order = 'left', pruneOn = 'gte'} = options;
    requireThat(typeof prune === 'boolean' && ['left', 'right'].includes(order), 'prune harus boolean; order left/right.');
    requireThat(['gte', 'gt'].includes(pruneOn), 'pruneOn harus gte atau gt.');
    const ids = new Set(), objects = new Set();
    function validate(node) {
      requireThat(dictionary(node) && typeof node.id === 'string' && node.id.length > 0 && !ids.has(node.id) && !objects.has(node), 'tree harus acyclic dengan id unik.');
      ids.add(node.id); objects.add(node);
      if (own(node, 'value')) requireThat(finite(node.value) && !own(node, 'children'), 'leaf harus value finite tanpa children.');
      else { requireThat(Array.isArray(node.children) && node.children.length > 0, 'node internal harus punya children.'); node.children.forEach(validate); }
    }
    validate(tree);
    const cutHolds = (alpha, beta) => pruneOn === 'gte' ? alpha >= beta : alpha > beta;
    const log = recorder(), values = Object.create(null), bounds = Object.create(null), pruned = [], prunedRoots = [], events = [], evaluatedLeaves = [], expansionOrder = [];
    let bestMove = null;
    const view = extra => ({values, bounds, pruned, evaluatedLeaves, expanded: expansionOrder, ...extra});
    function markPruned(node) { pruned.push(node.id); if (node.children) node.children.forEach(markPruned); }
    function visit(node, maximize, alpha, beta, activePath) {
      const originalAlpha = alpha, originalBeta = beta;
      activePath = [...activePath, node.id];
      bounds[node.id] = {alpha, beta, value: null, bound: 'pending'};
      log.add('enter', node.id, 'Masuk node ' + (maximize ? 'MAX' : 'MIN') + ' dengan bounds dari parent.', view({activePath, maximize}));
      if (own(node, 'value')) {
        evaluatedLeaves.push(node.id); values[node.id] = node.value;
        bounds[node.id] = {alpha, beta, value: node.value, bound: 'exact'};
        log.add('leaf', node.id, 'Evaluasi nilai leaf secara tepat.', view({activePath, value: node.value}));
        return {value: node.value, bound: 'exact'};
      }
      expansionOrder.push(node.id);
      const children = order === 'right' ? node.children.slice().reverse() : node.children;
      let value = maximize ? -Infinity : Infinity, move = null, cut = false;
      for (let index = 0; index < children.length; index++) {
        const child = children[index], result = visit(child, !maximize, alpha, beta, activePath);
        if (move === null || (maximize ? result.value > value : result.value < value)) { value = result.value; move = child.id; }
        if (maximize) alpha = Math.max(alpha, value); else beta = Math.min(beta, value);
        bounds[node.id] = {alpha, beta, value, bound: 'pending'};
        log.add('update', node.id, 'Perbarui nilai sementara dan ' + (maximize ? 'alpha' : 'beta') + '.', view({activePath, value, bestMove: move, maximize}));
        const remaining = children.slice(index + 1);
        const willCut = prune && remaining.length > 0 && cutHolds(alpha, beta);
        events.push({step: events.length, node: node.id, nodeType: maximize ? 'MAX' : 'MIN', child: child.id, childValue: result.value,
          nodeValue: value, alpha, beta, cut: willCut, prunedChildren: willCut ? remaining.map(c => c.id) : [], remaining: remaining.length > 0});
        if (willCut) {
          remaining.forEach(markPruned);
          remaining.forEach(c => prunedRoots.push(c.id));
          cut = true;
          bounds[node.id] = {alpha, beta, value, bound: maximize ? 'lower' : 'upper'};
          log.add('cutoff', node.id, (maximize ? 'alpha' : 'beta') + ' ' + (pruneOn === 'gte' ? '≥' : '>') + ' ' + (maximize ? 'beta' : 'alpha') + ': cabang tersisa dipangkas; nilai node adalah batas ' + (maximize ? 'bawah' : 'atas') + '.', view({activePath, value, prediction: {prompt: 'Apakah cabang berikutnya dipangkas?', answer: 'ya'}}));
          break;
        }
      }
      // A fail-low/high return is still a bound even when no sibling remains.
      const bound = !prune ? 'exact' : cut ? (maximize ? 'lower' : 'upper') : value <= originalAlpha ? 'upper' : value >= originalBeta ? 'lower' : 'exact';
      bounds[node.id] = {alpha, beta, value, bound};
      if (bound === 'exact') values[node.id] = value;
      if (node === tree) bestMove = move;
      const returnedLabel = bound === 'exact' ? 'nilai minimax tepat' : bound === 'lower' ? 'batas bawah' : 'batas atas';
      log.add('return', node.id, bound === 'exact' ? 'Kembalikan nilai minimax tepat.' : 'Kembalikan batas nilai minimax.', view({activePath, value, bestMove: move, bound, prediction: {prompt: 'Berapa ' + returnedLabel + ' yang dikembalikan node ' + node.id + '?', answer: String(value)}}));
      return {value, bound};
    }
    const result = visit(tree, true, -Infinity, Infinity, []);
    log.add('complete', tree.id, 'Evaluasi root selesai.', view({activePath: [tree.id], value: result.value, bestMove}));
    return {path: bestMove ? [tree.id, bestMove] : [tree.id], cost: result.value, value: result.value, bestMove, evaluatedLeaves,
      pruned, prunedRoots, events, values: clone(values), bounds: clone(bounds), expanded: expansionOrder.length, expansionOrder, trace: log.trace};
  }

  const QUEEN_RE = /^[1-8]{8}$/;
  function requireQueens(state) {
    requireThat(typeof state === 'string' && QUEEN_RE.test(state), 'keadaan ratu harus 8 digit 1–8.');
  }
  function queensAttacks(state) {
    requireQueens(state);
    let count = 0;
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
      const a = +state[i], b = +state[j];
      if (a === b || Math.abs(a - b) === j - i) count++;
    }
    return count;
  }
  function queensAttackingPairs(state) {
    requireQueens(state);
    const pairs = [];
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
      const a = +state[i], b = +state[j];
      if (a === b || Math.abs(a - b) === j - i) pairs.push([i + 1, j + 1]);
    }
    return pairs;
  }
  function setQueen(state, col, row) { return state.slice(0, col) + row + state.slice(col + 1); }
  function queensNeighborGrid(state) {
    requireQueens(state);
    const grid = [];
    for (let row = 8; row >= 1; row--) {
      const line = [];
      for (let col = 0; col < 8; col++) line.push(+state[col] === row ? null : queensAttacks(setQueen(state, col, row)));
      grid.push(line);
    }
    return grid;
  }
  // Scan order: column 1..8, then row 1..8; the first best neighbour in this order is taken.
  function queensScan(state) {
    const out = [];
    for (let c = 0; c < 8; c++) for (let row = 1; row <= 8; row++) {
      if (+state[c] === row) continue;
      const next = setQueen(state, c, row);
      out.push({col: c + 1, row, h: queensAttacks(next), state: next});
    }
    return out;
  }
  function runQueens(input) {
    requireThat(dictionary(input), 'parameter queens harus berupa objek.');
    const {start, mode = 'steepest'} = input;
    requireQueens(start);
    requireThat(mode === 'steepest', 'mode queens tidak dikenal; hanya steepest.');
    const log = recorder();
    let cur = start, h = queensAttacks(cur);
    const states = [cur], moves = [];
    log.add('initial', cur, 'Mulai dari susunan awal.', {state: cur, h});
    while (true) {
      if (h === 0) { log.add('goal', cur, 'Tidak ada pelanggaran; ratu tidak saling menyerang.', {state: cur, h}); break; }
      const scan = queensScan(cur);
      const bestH = Math.min(...scan.map(m => m.h));
      const bestMoves = scan.filter(m => m.h === bestH);
      log.add('evaluate', cur, 'Evaluasi 56 tetangga dan ambil h terkecil; seri memilih yang pertama.', {state: cur, h, bestH, bestMoves: bestMoves.map(({col, row, h: value}) => ({col, row, h: value})), prediction: {prompt: 'Berapa h terbaik di antara 56 tetangga?', answer: String(bestH)}});
      if (bestH >= h) {
        log.add('stop', cur, 'Tidak ada tetangga yang lebih baik; berhenti pada minimum lokal atau plateau.', {state: cur, h, bestH});
        break;
      }
      const chosen = bestMoves[0];
      cur = chosen.state; h = chosen.h; states.push(cur);
      moves.push({col: chosen.col, row: chosen.row, state: cur, h});
      log.add('move', cur, 'Pindah ke tetangga dengan h terkecil.', {state: cur, h, col: chosen.col, row: chosen.row});
    }
    return {path: states, moves, finalState: cur, h, solved: h === 0, steps: moves.length, trace: log.trace};
  }

  function runCase(problem, mode, options = {}) {
    requireThat(dictionary(problem), 'problem harus berupa objek.');
    if (problem.kind === 'search') {
      return runSearch({graph: problem.graph, start: problem.start, goal: problem.goal, heuristic: problem.heuristic,
        mode, treeSearch: options.treeSearch === true, maxExpansions: options.maxExpansions});
    }
    if (problem.kind === 'queens') return runQueens({start: problem.start, mode: 'steepest'});
    if (problem.kind === 'tsp') {
      const route = options.route === undefined ? problem.start : typeof options.route === 'string' ? options.route.split('') : options.route;
      return runTSP({cities: problem.cities, route, tie: options.tie || 'first'});
    }
    if (problem.kind === 'tree') return runMinimax(problem.tree, options);
    throw new Error('Input tidak valid: kind problem tidak dikenal.');
  }

  return {
    runSearch, runQueens, queensAttacks, queensAttackingPairs, queensNeighborGrid, runTSP, runMinimax, runCase,
    formatFrontier, traceTable, applyVariant, consistencyViolations, trueCosts, tspDistance, tspRouteCost, routeText
  };
});
