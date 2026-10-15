(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && !!module.exports;
  const engine = isNode ? require('./algorithms.js') : root.KKAAlgorithms;
  const caseBook = isNode ? require('./cases.js') : root.KKA_CASES;
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const number = value => value === Infinity ? '∞' : value === -Infinity ? '−∞' : value == null ? '—' : typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(2) : String(value);
  const noop = {destroy() {}};
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  let sequence = 0;

  function table(headers, rows) {
    return '<div class="table-wrap"><table class="data-table"><thead><tr>' + headers.map(h => '<th scope="col">' + esc(h) + '</th>').join('') +
      '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  }
  function button(label, action, attrs = '', cls = '') {
    return '<button type="button" class="button' + (cls ? ' ' + cls : '') + '" data-action="' + esc(action) + '" ' + attrs + '>' + esc(label) + '</button>';
  }
  function select(field, label, options, value, id) {
    return '<label for="' + esc(id) + '">' + esc(label) + '</label><select id="' + esc(id) + '" data-field="' + esc(field) + '">' +
      options.map(([v, text]) => '<option value="' + esc(v) + '"' + (String(v) === String(value) ? ' selected' : '') + '>' + esc(text) + '</option>').join('') + '</select>';
  }
  // The problem a widget should show: the case itself, or the case with a named or inline variant applied.
  function problemFor(caseId, variant) {
    const base = caseBook[caseId];
    if (!base) throw new Error('Kasus tidak ditemukan: ' + caseId);
    return variant ? engine.applyVariant(base, variant) : base;
  }
  function searchRun(problem, mode, treeSearch) {
    return engine.runSearch({graph: problem.graph, start: problem.start, goal: problem.goal, heuristic: problem.heuristic, mode,
      treeSearch: !!treeSearch, maxExpansions: treeSearch ? 50 : 1000});
  }

  // Layout and graph drawing. Positions are used as given; the viewBox is their bounding box plus padding.
  function layoutFor(problem) {
    let ids = [];
    if (problem.kind === 'tree') {
      const walk = node => { ids.push(node.id); (node.children || []).forEach(walk); };
      walk(problem.tree);
    } else if (problem.kind === 'search') ids = Object.keys(problem.graph);
    else ids = Object.keys(problem.positions || {});
    const points = {};
    for (const id of ids) {
      const p = problem.positions && problem.positions[id];
      points[id] = Array.isArray(p) && p.every(Number.isFinite) ? p : null;
    }
    ids.forEach((id, i) => { if (!points[id]) points[id] = [Math.cos(2 * Math.PI * i / ids.length) * 200 + 300, Math.sin(2 * Math.PI * i / ids.length) * 200 + 300]; });
    const xs = ids.map(id => points[id][0]), ys = ids.map(id => points[id][1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const box = {x: minX - 60, y: minY - 60, w: Math.max(maxX - minX, 1) + 120, h: Math.max(maxY - minY, 1) + 120};
    return {ids, points, box};
  }
  function edgesOf(problem) {
    const edges = [];
    if (problem.kind === 'tree') {
      const walk = node => (node.children || []).forEach(child => { edges.push([node.id, child.id, null]); walk(child); });
      walk(problem.tree);
      return {edges, undirected: false};
    }
    for (const [id, nbs] of Object.entries(problem.graph)) nbs.forEach(([to, cost]) => edges.push([id, to, cost]));
    return {edges, undirected: !!problem.undirected};
  }
  function nodeDetail(problem, id, snapshot) {
    const bound = snapshot.bounds && snapshot.bounds[id];
    if (problem.kind === 'tree') {
      let detail = '';
      if (bound && bound.bound === 'exact') detail = '=' + number(bound.value);
      else if (bound && bound.bound === 'lower') detail = '≥' + number(bound.value);
      else if (bound && bound.bound === 'upper') detail = '≤' + number(bound.value);
      else if (bound && bound.bound === 'pending' && bound.value !== undefined) detail = number(bound.value);
      const leafValue = findLeafValue(problem.tree, id);
      if (!detail && leafValue !== undefined) detail = number(leafValue);
      if (bound && bound.bound !== 'pending' && (bound.alpha !== undefined)) detail += ' α' + number(bound.alpha) + ' β' + number(bound.beta);
      return detail;
    }
    if (problem.heuristic && own(problem.heuristic, id)) return 'h=' + number(problem.heuristic[id]);
    return '';
  }
  function findLeafValue(node, id) {
    if (!node) return undefined;
    if (node.id === id) return node.value;
    for (const child of node.children || []) { const v = findLeafValue(child, id); if (v !== undefined) return v; }
    return undefined;
  }
  function graphSVG(problem, snapshot = {}, options = {}) {
    // Heuristic values are drawn only when the caller asks for them (greedy/A* views, graph-view with showHeuristic).
    if (!options.showHeuristic && problem.heuristic) problem = Object.assign({}, problem, {heuristic: undefined});
    const showLegend = options.showLegend !== false, showCosts = options.showCosts !== false;
    const uid = options.uid || ('g' + (++sequence));
    const layout = layoutFor(problem), p = layout.points;
    const {edges, undirected} = edgesOf(problem);
    const pruned = new Set(snapshot.pruned || []), expanded = new Set(snapshot.expanded || snapshot.visited || []);
    const frontier = new Set((snapshot.frontier || []).map(x => x.state));
    const path = snapshot.path || snapshot.activePath || [];
    const seenPairs = new Set();
    const markerId = 'arrow-' + uid;
    const directedEdges = new Set(edges.map(([a, b]) => a + '>' + b));
    const edgeSVG = edges.filter(([a, b]) => p[a] && p[b]).map(([a, b, cost]) => {
      if (undirected) {
        const key = [a, b].sort().join('|');
        if (seenPairs.has(key)) return '';
        seenPairs.add(key);
      }
      const [x1, y1] = p[a], [x2, y2] = p[b];
      const dx = x2 - x1, dy = y2 - y1, dist = Math.hypot(dx, dy) || 1;
      const sx = x1 + dx / dist * 26, sy = y1 + dy / dist * 26, ex = x2 - dx / dist * 30, ey = y2 - dy / dist * 30;
      const reverse = directedEdges.has(b + '>' + a) && !undirected;
      const off = reverse ? 22 : 0;
      const mx = (x1 + x2) / 2 - dy / dist * off, my = (y1 + y2) / 2 + dx / dist * off;
      const d = a === b ? 'M ' + (x1 - 10) + ' ' + (y1 - 22) + ' C ' + (x1 - 60) + ' ' + (y1 - 85) + ' ' + (x1 + 60) + ' ' + (y1 - 85) + ' ' + (x1 + 12) + ' ' + (y1 - 25)
        : (undirected || off === 0 ? 'M ' + sx + ' ' + sy + ' L ' + ex + ' ' + ey : 'M ' + sx + ' ' + sy + ' Q ' + mx + ' ' + my + ' ' + ex + ' ' + ey);
      const isPath = path.some((id, i) => (id === a && path[i + 1] === b) || (undirected && id === b && path[i + 1] === a));
      const labelX = (sx + 2 * mx + ex) / 4, labelY = (sy + 2 * my + ey) / 4 - 7;
      const cls = 'edge' + (isPath ? ' path' : '') + (pruned.has(b) ? ' pruned' : '');
      const label = showCosts && cost != null ? '<text x="' + labelX + '" y="' + labelY + '" text-anchor="middle" class="edge-label">' + esc(number(cost)) + '</text>' : '';
      return '<g class="' + cls + '"><path d="' + d + '"' + (undirected ? '' : ' marker-end="url(#' + markerId + ')"') + '/>' + label + '</g>';
    }).join('');
    const nodeSVG = layout.ids.map(id => {
      const [x, y] = p[id];
      const cls = ['node'];
      if (expanded.has(id)) cls.push('expanded');
      if (frontier.has(id)) cls.push('frontier');
      if (path.includes(id)) cls.push('path');
      if (snapshot.current === id) cls.push('current');
      if (pruned.has(id)) cls.push('pruned');
      const detail = nodeDetail(problem, id, snapshot);
      const label = problem.labels && problem.labels[id] ? problem.labels[id] : '';
      const shape = '<circle cx="' + x + '" cy="' + y + '" r="23"/>';
      const text = '<text x="' + x + '" y="' + (y + 6) + '" class="node-id">' + esc(id) + '</text>';
      const detailText = detail ? '<text x="' + x + '" y="' + (y + 40) + '" class="node-detail">' + esc(detail) + '</text>' : '';
      const labelText = label ? '<text x="' + x + '" y="' + (y + 56) + '" class="node-label">' + esc(label) + '</text>' : '';
      return '<g class="' + cls.join(' ') + '"><title>' + esc(id + (label ? ' ' + label : '') + (detail ? ' ' + detail : '') + (pruned.has(id) ? ' · dipangkas' : '')) + '</title>' + shape + text + detailText + labelText + '</g>';
    }).join('');
    const xs = layout.box;
    const altRows = edges.map(([a, b, c]) => [a, b, c == null ? '—' : number(c)]);
    const alt = '<details class="alt-text"><summary>Alternatif teks: simpul dan sisi</summary>' +
      table(['Dari', 'Ke', 'Biaya'], altRows.length ? altRows : [[layout.ids.join(', '), '—', '—']]) + '</details>';
    const many = layout.ids.length > 12;
    return '<div class="graph-wrap' + (many ? ' many-nodes' : '') + '">' + (many ? '<p class="scroll-hint" aria-hidden="true">geser →</p>' : '') +
      '<svg class="kka-graph" viewBox="' + xs.x + ' ' + xs.y + ' ' + xs.w + ' ' + xs.h + '" role="img" aria-label="' + esc(problem.title || 'Diagram') + '. Lihat alternatif teks di bawah."><defs><marker id="' + markerId + '" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" class="arrowhead"/></marker></defs>' + edgeSVG + nodeSVG + '</svg>' +
      (showLegend ? '<p class="muted legend-note">Legenda: biru = saat ini · amber = frontier · hijau = sudah diperiksa · hijau tebal = jalur · abu putus = dipangkas. Pada pohon, = berarti nilai tepat; ≥ / ≤ berarti batas.</p>' : '') + alt + '</div>';
  }

  // Simple index stepper over a trace. Navigation only; the drills carry the practice.
  function makeStepper(trace) {
    const st = {index: 0, trace};
    st.atEnd = () => st.index >= trace.length - 1;
    st.next = () => { if (!st.atEnd()) st.index++; return st.atEnd() ? 'end' : 'advanced'; };
    st.prev = () => { st.index = Math.max(0, st.index - 1); };
    st.reset = () => { st.index = 0; };
    return st;
  }

  // Trace table in the tugas format. Columns depend on the mode; skipped pops appear as a note row.
  function traceColumns(mode) {
    const frontierHead = mode === 'dfs' ? 'Stack sesudah (atas → bawah)' : 'Frontier sesudah';
    const cols = [['Iterasi', r => r.iteration], ['Dipilih', r => r.selected]];
    if (mode === 'greedy') cols.push(['h', r => number(r.h)]);
    else if (mode === 'astar') cols.push(['g', r => number(r.g)], ['h', r => number(r.h)], ['f', r => number(r.f)]);
    else cols.push(['g', r => number(r.g)]);
    cols.push(['Aksi', r => r.action === 'goal' ? 'goal' : 'expand'], [frontierHead, r => r.frontierText]);
    return cols;
  }
  function traceTableHTML(traceTable, options = {}) {
    const cols = traceColumns(traceTable.mode);
    const rows = options.rows || traceTable.rows;
    const body = rows.map(r => {
      let out = '<tr>' + cols.map(([, get]) => '<td>' + esc(get(r)) + '</td>').join('') + '</tr>';
      if (options.showSkips !== false && r.skippedAfter && r.skippedAfter.length) {
        const note = r.skippedAfter.map(s => esc(s.state) + '(g=' + esc(number(s.g)) + ')').join(', ');
        out += '<tr class="skip-row"><td colspan="' + cols.length + '">Dilewati tanpa nomor iterasi: ' + note +
          (traceTable.mode === 'dfs' ? ' (sudah closed)' : ' (entri usang)') + '</td></tr>';
      }
      return out;
    }).join('');
    const head = cols.map(([label]) => '<th scope="col">' + esc(label) + '</th>').join('');
    return '<div class="table-wrap"><table class="data-table trace-table"><caption class="visually-hidden">Tabel trace ' + esc(traceTable.mode) + '</caption><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }
  function updatesHTML(traceTable) {
    const rows = [];
    for (const r of traceTable.rows) for (const u of r.updates || []) {
      rows.push([r.iteration, u.state, number(u.previousG), number(u.newG), u.previousParent || '—', u.newParent || '—', u.reopened ? 'dibuka ulang' : '']);
    }
    return rows.length ? table(['Iterasi', 'Titik', 'g lama', 'g baru', 'Induk lama', 'Induk baru', 'Catatan'], rows)
      : '<p class="muted">Tidak ada pembaruan jalur.</p>';
  }
  function resultHTML(traceTable) {
    const cost = traceTable.path && traceTable.path.length && (traceTable.costTerms || []).length
      ? traceTable.costTerms.join(' + ') + ' = ' + number(traceTable.cost) : number(traceTable.cost);
    return '<dl class="result-list"><dt>Path</dt><dd>' + esc(traceTable.path && traceTable.path.length ? traceTable.path.join(' → ') : 'tidak ditemukan') + '</dd>' +
      '<dt>Total cost</dt><dd>' + esc(traceTable.path && traceTable.path.length ? cost : '—') + '</dd>' +
      '<dt>Jumlah ekspansi</dt><dd>' + esc(traceTable.expanded) + '</dd>' +
      '<dt>Urutan ekspansi</dt><dd>' + esc(traceTable.expansionOrder.length ? traceTable.expansionOrder.join(', ') : '(kosong)') + '</dd></dl>';
  }

  // ---- shared runtime -------------------------------------------------------
  // Every widget is a setup function that returns {title, html(), actions, fields, submit, destroy}.
  // Event handling is delegated to one wrapper per widget, so destroy() removes everything the widget added.
  function focusKey(wrap) {
    const a = document.activeElement;
    return a && wrap.contains(a) && a.dataset && a.dataset.key ? a.dataset.key : null;
  }
  const registry = {};
  function register(name, definition) { registry[name] = definition; }
  function defineWidget(name, setup) {
    register(name, {
      mount(el, props, ctx) {
        const wrap = document.createElement('div');
        wrap.className = 'widget-host';
        el.replaceChildren(wrap);
        const timers = new Set();
        let view = null, destroyed = false;
        const host = {
          props: props || {}, ctx: ctx || {},
          render() {
            if (destroyed || !view) return;
            const key = focusKey(wrap);
            wrap.innerHTML = '<div class="widget widget-' + esc(name) + '"><div class="widget-title">' + esc(view.title) + '</div>' + view.html() + '</div>';
            if (key) { const target = wrap.querySelector('[data-key="' + key.replace(/["\\]/g, '\\$&') + '"]'); if (target) target.focus({preventScroll: true}); }
          },
          timer(fn, ms) { const id = setTimeout(() => { timers.delete(id); if (!destroyed) fn(); }, ms); timers.add(id); return id; },
          clearTimers() { timers.forEach(clearTimeout); timers.clear(); },
          announce(message) { if (host.ctx.announce && message) host.ctx.announce(message); }
        };
        const onClick = event => {
          const target = event.target.closest && event.target.closest('[data-action]');
          if (!target || !wrap.contains(target) || target.disabled || !view || !view.actions) return;
          const fn = view.actions[target.dataset.action];
          if (fn) fn(target.dataset, event, target);
        };
        const onKey = event => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          const target = event.target;
          if (target.getAttribute && target.getAttribute('role') === 'button' && target.dataset.action) { event.preventDefault(); onClick({target}); }
        };
        const onChange = event => {
          const target = event.target;
          if (target.dataset && target.dataset.field && view && view.fields && view.fields[target.dataset.field]) view.fields[target.dataset.field](target.value, target, event);
        };
        const onSubmit = event => {
          if (!view || !view.submit) return;
          event.preventDefault();
          view.submit(event.target, event);
        };
        wrap.addEventListener('click', onClick);
        wrap.addEventListener('keydown', onKey);
        wrap.addEventListener('change', onChange);
        wrap.addEventListener('submit', onSubmit);
        const teardown = () => {
          destroyed = true;
          host.clearTimers();
          wrap.removeEventListener('click', onClick);
          wrap.removeEventListener('keydown', onKey);
          wrap.removeEventListener('change', onChange);
          wrap.removeEventListener('submit', onSubmit);
        };
        try {
          view = setup(host);
          host.render();
        } catch (error) {
          teardown();
          el.innerHTML = '<p class="feedback">Widget gagal dimuat: ' + esc(error.message) + '</p>';
          return noop;
        }
        return {
          destroy() {
            if (destroyed) return;
            teardown();
            if (view && view.destroy) view.destroy();
            el.replaceChildren();
          }
        };
      }
    });
  }
  function mount(el, name, props, ctx) {
    const def = registry[name];
    if (!def) {
      el.innerHTML = '<p class="feedback">Widget belum tersedia: ' + esc(name) + '</p>';
      return {destroy() {}};
    }
    const context = Object.assign({}, ctx || {}, {uid: (ctx && ctx.uid) || ('w' + (++sequence)), reducedMotion: !!(ctx && ctx.reducedMotion), announce: (ctx && ctx.announce) || (() => {})});
    try {
      return def.mount(el, props || {}, context);
    } catch (error) {
      el.innerHTML = '<p class="feedback">Widget gagal dimuat: ' + esc(error.message) + '</p>';
      return {destroy() {}};
    }
  }
  // ---- search-sim -------------------------------------------------------
  const MODE_LABELS = {dfs: 'DFS', bfs: 'BFS', ids: 'IDS', ucs: 'UCS', greedy: 'Greedy', astar: 'A*'};
  defineWidget('search-sim', host => {
    const props = host.props;
    const base = caseBook[props.caseId];
    if (!base) throw new Error('Kasus tidak ditemukan: ' + props.caseId);
    const problem = problemFor(props.caseId, props.variant);
    const modes = props.modes && props.modes.length ? props.modes : ['ucs'];
    const uid = host.ctx.uid;
    const state = {mode: modes[0], tree: !!props.treeSearch, playing: false, speed: 1100, index: 0};
    let result = null, table = null, stepper = null;
    function run() {
      state.playing = false;
      result = searchRun(problem, state.mode, state.tree);
      table = engine.traceTable(result, state.mode);
      stepper = makeStepper(result.trace);
      state.index = 0;
    }
    run();
    function tick() {
      if (!state.playing) return;
      stepper.next();
      if (stepper.atEnd()) { state.playing = false; host.render(); return; }
      state.index = stepper.index;
      host.render();
      host.timer(tick, state.speed);
    }
    const view = {
      title: 'Simulator pencarian · ' + (problem.title || props.caseId),
      html() {
        const trace = result.trace, index = state.index, step = trace[index], final = index >= trace.length - 1;
        const upto = trace.slice(0, index + 1);
        const shownRows = table.rows.slice(0, upto.filter(s => s.type === 'expand' || s.type === 'goal').length);
        const expandedNow = [...new Set(upto.filter(s => s.type === 'expand' || s.type === 'goal').map(s => s.current))];
        const frontierNow = Array.isArray(step.frontier) ? engine.formatFrontier(step.frontier, state.mode) : '—';
        const showHeuristic = state.mode === 'greedy' || state.mode === 'astar';
        let out = '<div class="control-row">';
        if (modes.length > 1) out += select('mode', 'Algoritma', modes.map(m => [m, MODE_LABELS[m] || m]), state.mode, uid + '-mode');
        if (props.allowTreeToggle) out += '<label><input type="checkbox" data-field="tree" data-key="tree" ' + (state.tree ? 'checked' : '') + '> Tree search (tanpa daftar tertutup)</label>';
        out += '</div><div class="control-row">' +
          button('← Sebelumnya', 'prev', 'data-key="prev"' + (index === 0 ? ' disabled' : ''), 'ghost') +
          (host.ctx.reducedMotion ? '' : button(state.playing ? 'Jeda' : 'Putar otomatis', 'play', 'data-key="play"' + (final ? ' disabled' : ''), 'secondary')) +
          button('Berikutnya →', 'next', 'data-key="next"' + (final ? ' disabled' : '')) +
          button('Ulangi', 'reset', 'data-key="reset"', 'ghost') + '</div>';
        out += '<div class="control-row"><label for="' + uid + '-speed">Kecepatan</label><select id="' + uid + '-speed" data-field="speed">' +
          [[600, 'Cepat'], [1100, 'Normal'], [2000, 'Lambat']].map(([v, t]) => '<option value="' + v + '"' + (state.speed === v ? ' selected' : '') + '>' + t + '</option>').join('') +
          '</select></div>';
        out += '<p class="muted step-count" aria-live="polite">Langkah ' + (index + 1) + ' / ' + trace.length + ' · ' + esc(step.type) + '</p>';
        const snapshot = {frontier: step.frontier || [], expanded: expandedNow, path: final ? result.path : [], current: step.current};
        out += '<div class="simulator-grid"><div>' + graphSVG(problem, snapshot, {uid, showHeuristic}) + '</div><div>' +
          '<h3>Keadaan saat ini</h3><p><strong>' + esc(step.current || '—') + '</strong></p><p>' + esc(step.reason || '') + '</p>' +
          (step.g !== undefined ? '<p>Biaya sejauh ini (g) = ' + esc(number(step.g)) + (showHeuristic && step.h !== undefined ? ' · h = ' + esc(number(step.h)) : '') + (state.mode === 'astar' && step.f !== undefined ? ' · f = ' + esc(number(step.f)) : '') + '</p>' : '') +
          '<p>Frontier sesudah langkah ini: <span class="mono">' + esc(frontierNow) + '</span></p>' +
          '<p>Sudah diekspansi: ' + esc(expandedNow.join(' → ') || 'belum ada') + '</p></div></div>';
        out += '<details class="alt-text"><summary>Tabel trace sampai langkah ini</summary>' +
          (shownRows.length ? traceTableHTML(table, {rows: shownRows}) : '<p class="muted">Belum ada baris.</p>') + '</details>';
        if (final) {
          out += '<div class="feedback"><h3>Hasil akhir</h3>' + resultHTML(table) + '</div>';
        }
        return out;
      },
      actions: {
        prev() { host.clearTimers(); state.playing = false; stepper.prev(); state.index = stepper.index; host.render(); },
        next() { stepper.next(); state.index = stepper.index; if (stepper.atEnd()) state.playing = false; host.render(); },
        play() {
          if (state.playing) { state.playing = false; host.clearTimers(); host.render(); return; }
          if (stepper.atEnd()) return;
          state.playing = true; host.render(); host.timer(tick, state.speed);
        },
        reset() { host.clearTimers(); state.playing = false; stepper.reset(); state.index = 0; host.render(); }
      },
      fields: {
        mode(value) { host.clearTimers(); state.mode = value; run(); host.render(); },
        tree(value, target) { host.clearTimers(); state.tree = target.checked; run(); host.render(); },
        speed(value) { state.speed = Number(value); host.render(); }
      },
      destroy() { state.playing = false; }
    };
    return view;
  });

  // ---- graph-view ----------------------------------------------------------
  defineWidget('graph-view', host => {
    const problem = problemFor(host.props.caseId, host.props.variant);
    const showCosts = host.props.showCosts !== false;
    const showHeuristic = !!host.props.showHeuristic;
    return {
      title: 'Diagram graf · ' + (problem.title || host.props.caseId),
      html() {
        const rows = Object.entries(problem.graph).map(([from, edges]) => [from, edges.map(([to, c]) => to + (showCosts ? ' (' + number(c) + ')' : '')).join(', ') || '—']);
        return graphSVG(problem, {}, {showLegend: false, showCosts, showHeuristic}) +
          '<details class="alt-text"><summary>Alternatif teks: daftar tetangga</summary>' + table(['Dari', 'Ke'], rows) + '</details>';
      }
    };
  });

  // ---- trace-table ---------------------------------------------------------
  defineWidget('trace-table', host => {
    const props = host.props;
    const problem = problemFor(props.caseId, props.variant);
    const mode = props.mode || 'ucs';
    const traceTable = engine.traceTable(searchRun(problem, mode), mode);
    return {
      title: 'Tabel trace · ' + (MODE_LABELS[mode] || mode) + ' · ' + (problem.title || props.caseId),
      html() {
        let out = '<div class="scroll-x">' + traceTableHTML(traceTable, {showSkips: props.showSkips !== false}) + '</div>';
        if (props.showUpdates !== false) out += '<h3>Pembaruan jalur</h3>' + updatesHTML(traceTable);
        if (props.showSummary !== false) out += '<h3>Hasil</h3>' + resultHTML(traceTable);
        return out;
      }
    };
  });

  // ---- consistency-table ---------------------------------------------------
  defineWidget('consistency-table', host => {
    const problem = problemFor(host.props.caseId, host.props.variant);
    const h = problem.heuristic || {};
    const violations = engine.consistencyViolations(problem.graph, h);
    const hStar = engine.trueCosts(problem.graph, problem.goal);
    return {
      title: 'Konsistensi dan admissibility · ' + (problem.title || host.props.caseId),
      html() {
        let out = '<h3>Konsistensi: h(n) ≤ c(n,n\') + h(n\')</h3>';
        out += violations.length
          ? table(['Dari', 'Ke', 'h(dari)', 'Biaya', 'h(ke)', 'Batas c + h(ke)'],
            violations.map(v => [v.from, v.to, number(v.hFrom), number(v.cost), number(v.hTo), number(v.limit)])) +
            '<p class="feedback incorrect">' + violations.length + ' pelanggaran: h(dari) melebihi batas, sehingga heuristik tidak konsisten.</p>'
          : '<p class="feedback correct">Tidak ada pelanggaran: h konsisten pada semua sisi.</p>';
        const rows = Object.keys(problem.graph).map(s => {
          const ok = h[s] === undefined || h[s] <= hStar[s];
          return [s, number(h[s]), number(hStar[s]), ok ? 'ya' : 'tidak'];
        });
        const admissible = rows.every(r => r[3] === 'ya');
        out += '<h3>Admissibility: h(n) ≤ h*(n)</h3>' + table(['Titik', 'h', 'h* (biaya sebenarnya)', 'Admissible?'], rows) +
          '<p>' + (admissible ? 'Semua h ≤ h*, sehingga heuristik admissible.' : 'Ada h yang melebihi h*, sehingga heuristik tidak admissible.') + '</p>';
        return out;
      }
    };
  });

  // ---- variant-lab ---------------------------------------------------------
  defineWidget('variant-lab', host => {
    const props = host.props, base = caseBook[props.caseId], uid = host.ctx.uid;
    if (!base) throw new Error('Kasus tidak ditemukan: ' + props.caseId);
    const mode = props.mode || 'astar';
    const presets = (props.presets || []).filter(id => base.variants && own(base.variants, id));
    const states = Object.keys(base.graph);
    const hasH = !!base.heuristic;
    const edgeList = [];
    for (const [from, list] of Object.entries(base.graph)) for (const [to, cost] of list) edgeList.push({from, to, cost});
    const state = {choice: presets.length ? presets[0] : 'asli', custom: null, editing: false};
    const presetLabel = id => id === 'asli' ? 'Asli (tanpa variasi)' : (base.variants[id].label || id);
    const activeVariant = () => state.choice === 'asli' ? null : state.choice === 'kustom' ? state.custom : state.choice;
    const analyse = problem => {
      const h = problem.heuristic || {};
      const violations = hasH ? engine.consistencyViolations(problem.graph, h) : [];
      const hStar = engine.trueCosts(problem.graph, problem.goal);
      const inadmissible = hasH ? states.filter(s => h[s] > hStar[s]) : [];
      return {violations, inadmissible};
    };
    const summaryOf = traceTable => {
      const counts = {};
      for (const r of traceTable.rows) counts[r.selected] = (counts[r.selected] || 0) + 1;
      const reopened = [];
      for (const r of traceTable.rows) for (const u of r.updates || []) if (u.reopened) reopened.push(u.state + ' (iterasi ' + r.iteration + ')');
      return {
        path: traceTable.path.length ? traceTable.path.join(' → ') : 'tidak ditemukan',
        cost: traceTable.path.length ? number(traceTable.cost) : '—',
        expanded: traceTable.expanded,
        order: traceTable.expansionOrder.join(', ') || '(kosong)',
        reopened: reopened.length ? reopened.join(', ') : 'tidak ada',
        repeated: Object.keys(counts).filter(s => counts[s] > 1).join(', ') || 'tidak ada'
      };
    };
    function run() {
      const variant = activeVariant();
      const problem = variant ? engine.applyVariant(base, variant) : base;
      return {
        problem, variant,
        original: engine.traceTable(searchRun(base, mode), mode),
        modified: engine.traceTable(searchRun(problem, mode), mode)
      };
    }
    let current = run();
    const refresh = () => { current = run(); };
    return {
      title: 'Variasi · ' + (base.title || props.caseId) + ' · ' + (MODE_LABELS[mode] || mode),
      html() {
        const {problem, variant, original, modified} = current;
        const a = summaryOf(original), b = summaryOf(modified);
        const diagA = analyse(base), diagB = analyse(problem);
        const note = typeof state.choice === 'string' && base.variants && base.variants[state.choice] && base.variants[state.choice].note;
        let out = '<p class="badge">Variasi dari graf tugas — bukan soal resmi</p>';
        out += '<div class="control-row">' + select('preset', 'Variasi', [['asli', presetLabel('asli')]].concat(presets.map(id => [id, presetLabel(id)])).concat(state.choice === 'kustom' ? [['kustom', 'Variasi kustom']] : []), state.choice, uid + '-preset') + '</div>';
        if (note) out += '<p class="muted">' + esc(note) + '</p>';
        out += '<h3>Perbandingan: asli dan variasi</h3>' + table(['Aspek', 'Asli', 'Variasi'], [
          ['Urutan ekspansi', a.order, b.order],
          ['Jumlah ekspansi', a.expanded, b.expanded],
          ['Path', a.path, b.path],
          ['Cost', a.cost, b.cost],
          ['State dibuka ulang', a.reopened, b.reopened],
          ['Pelanggaran konsistensi', diagA.violations.length, diagB.violations.length],
          ['Melebihi h* (tidak admissible)', diagA.inadmissible.join(', ') || 'tidak ada', diagB.inadmissible.join(', ') || 'tidak ada']
        ]);
        if (diagB.violations.length) {
          out += '<h3>Pelanggaran konsistensi (variasi)</h3>' + table(['Dari', 'Ke', 'h(dari)', 'Biaya', 'h(ke)'],
            diagB.violations.map(v => [v.from, v.to, number(v.hFrom), number(v.cost), number(v.hTo)]));
        }
        out += '<details class="alt-text"><summary>Tabel trace variasi</summary>' + traceTableHTML(modified) + '</details>';
        out += '<details class="alt-text"><summary>Tabel trace asli</summary>' + traceTableHTML(original) + '</details>';
        if (props.allowCustom !== false && hasH) {
          out += '<details class="custom-variant"' + (state.editing ? ' open' : '') + '><summary>Edit h dan biaya sisi (variasi kustom)</summary>' +
            '<form class="custom-form" data-variant-form="1"><div class="h-grid">' +
            states.filter(s => s !== base.goal).map(s => '<label class="h-field">h(' + esc(s) + ')<input name="h-' + esc(s) + '" inputmode="decimal" value="' + esc(number(variant && variant.h && own(variant.h, s) ? variant.h[s] : base.heuristic[s])) + '"></label>').join('') +
            '</div><div class="h-grid">' +
            edgeList.map((e, i) => {
              const edited = problem.graph[e.from].find(([t]) => t === e.to);
              return '<label class="h-field">' + esc(e.from + '→' + e.to) + '<input name="e-' + i + '" inputmode="decimal" value="' + esc(edited ? number(edited[1]) : number(e.cost)) + '"></label>';
            }).join('') +
            '</div><div class="control-row"><button type="submit" class="button" data-key="apply">Terapkan variasi</button>' +
            button('Kembali ke asli', 'reset', 'data-key="reset"', 'secondary') + '</div></form></details>';
        }
        return out;
      },
      actions: {
        reset() { state.choice = presets.length ? presets[0] : 'asli'; state.custom = null; state.editing = false; refresh(); host.render(); }
      },
      fields: {
        preset(value) { state.choice = value; refresh(); host.render(); }
      },
      submit(form) {
        const h = {}, edges = [];
        for (const s of states) {
          if (s === base.goal || !hasH) continue;
          const raw = form.elements['h-' + s] && form.elements['h-' + s].value.trim();
          if (raw && Number.isFinite(Number(raw.replace(',', '.'))) && Number(raw.replace(',', '.')) !== base.heuristic[s]) h[s] = Number(raw.replace(',', '.'));
        }
        edgeList.forEach((e, i) => {
          const raw = form.elements['e-' + i] && form.elements['e-' + i].value.trim();
          const value = raw ? Number(raw.replace(',', '.')) : NaN;
          if (Number.isFinite(value) && value >= 0 && value !== e.cost) edges.push([e.from, e.to, value]);
        });
        state.custom = {label: 'Variasi kustom', h, edges};
        state.choice = 'kustom';
        state.editing = true;
        refresh();
        host.render();
      }
    };
  });

  // ---- heuristic-tuner -----------------------------------------------------
  defineWidget('heuristic-tuner', host => {
    const problem = caseBook[host.props.caseId];
    const node = host.props.node || 'A';
    const min = Number.isFinite(host.props.min) ? host.props.min : 0;
    const max = Number.isFinite(host.props.max) ? host.props.max : 8;
    const state = {h: clamp(problem.heuristic[node], min, max)};
    function evaluate() {
      const heuristic = Object.assign({}, problem.heuristic, {[node]: state.h});
      const astar = engine.runSearch({graph: problem.graph, start: problem.start, goal: problem.goal, heuristic, mode: 'astar'});
      const hstar = engine.runSearch({graph: problem.graph, start: node, goal: problem.goal, heuristic, mode: 'ucs'}).cost;
      return {astar, hstar, admissible: state.h <= hstar};
    }
    return {
      title: 'Penyetel heuristik · h(' + node + ')',
      html() {
        const {astar, hstar, admissible} = evaluate();
        return '<div class="slider-row"><label for="h-' + host.ctx.uid + '">h(' + esc(node) + ') = <strong>' + state.h + '</strong></label>' +
          '<input id="h-' + host.ctx.uid + '" type="range" min="' + min + '" max="' + max + '" step="1" value="' + state.h + '" data-field="h" data-key="h"></div>' +
          '<p>h*(' + esc(node) + ') = ' + esc(number(hstar)) + ' (jarak sebenarnya ke tujuan, dihitung dengan UCS)</p>' +
          '<p><span class="badge ' + (admissible ? 'correct' : 'incorrect') + '">' + (admissible ? 'admissible' : 'tidak admissible') + '</span></p>' +
          '<p>A* dengan heuristik ini: jalur ' + esc(astar.path.join(' → ')) + ' · biaya ' + esc(number(astar.cost)) + '</p>' +
          (admissible ? '' : '<p class="muted">Heuristik melebihi jarak sebenarnya, sehingga A* tidak lagi menjamin jalur optimal.</p>');
      },
      fields: {h(value) { state.h = Number(value); host.render(); }}
    };
  });

  // ---- minimax-sim --------------------------------------------------------
  const BOUND_LABEL = {exact: 'Tepat', lower: 'Batas bawah (≥)', upper: 'Batas atas (≤)', pending: 'Belum selesai'};
  const cloneWithLeaves = (node, overrides) => {
    const copy = Object.assign({}, node);
    if (node.children) copy.children = node.children.map(child => cloneWithLeaves(child, overrides));
    else if (own(overrides, node.id)) copy.value = overrides[node.id];
    return copy;
  };
  const leavesOf = node => node.children ? node.children.flatMap(leavesOf) : [node];
  defineWidget('minimax-sim', host => {
    const props = host.props;
    const base = caseBook[props.caseId];
    if (!base) throw new Error('Kasus tidak ditemukan: ' + props.caseId);
    const uid = host.ctx.uid;
    const state = {prune: props.prune !== false, order: props.order || 'left', pruneOn: props.pruneOn || 'gte', overrides: {}, index: 0};
    let result = null, plain = null, tree = null, stepper = null;
    function run() {
      tree = Object.keys(state.overrides).length ? cloneWithLeaves(base.tree, state.overrides) : base.tree;
      result = engine.runMinimax(tree, {prune: state.prune, order: state.order, pruneOn: state.pruneOn});
      plain = engine.runMinimax(tree, {prune: false, order: state.order});
      stepper = makeStepper(result.trace);
      state.index = 0;
    }
    run();
    const showStack = props.showCallStack !== false;
    const view = {
      title: 'Simulator minimax · ' + (base.title || props.caseId),
      html() {
        const trace = result.trace, index = state.index, step = trace[index], final = index >= trace.length - 1;
        let out = '<div class="control-row">';
        if (props.allowToggle !== false) out += '<label><input type="checkbox" data-field="prune" data-key="prune" ' + (state.prune ? 'checked' : '') + '> Pangkas alpha–beta</label>';
        if (props.allowOrder) out += select('order', 'Urutan', [['left', 'Kiri → kanan'], ['right', 'Kanan → kiri']], state.order, uid + '-order');
        if (props.allowPruneOnToggle) out += select('pruneOn', 'Aturan pangkas', [['gte', 'α ≥ β (memangkas saat sama)'], ['gt', 'α > β (sama tidak dipangkas)']], state.pruneOn, uid + '-pruneon');
        out += '</div><div class="control-row">' +
          button('← Sebelumnya', 'prev', 'data-key="prev"' + (index === 0 ? ' disabled' : ''), 'ghost') +
          button('Berikutnya →', 'next', 'data-key="next"' + (final ? ' disabled' : '')) +
          button('Ulangi', 'reset', 'data-key="reset"', 'secondary') + '</div>';
        out += '<p class="muted step-count" aria-live="polite">Langkah ' + (index + 1) + ' / ' + trace.length + ' · ' + esc(step.type) + '</p>';
        const stack = (step.activePath || []).slice().reverse();
        out += '<div class="simulator-grid"><div>' + graphSVG(base.kind === 'tree' ? Object.assign({}, base, {tree}) : base, step, {uid}) + '</div><div>';
        out += '<h3>Keadaan saat ini</h3><p><strong>' + esc(step.current || '—') + '</strong></p><p>' + esc(step.reason || '') + '</p>';
        if (showStack && stack.length) out += '<h3>Call stack</h3><p class="muted">Teratas di atas, seperti pada slide.</p><ol class="call-stack">' + stack.map(id => '<li>' + esc(id) + '</li>').join('') + '</ol>';
        out += '</div></div>';
        const rows = Object.entries(step.bounds || {}).map(([id, b]) => [id, number(b.value), BOUND_LABEL[b.bound] || b.bound, number(b.alpha), number(b.beta)]);
        if (rows.length) out += '<h3>Nilai dan batas saat ini</h3>' + table(['Simpul', 'Nilai', 'Jenis', 'α', 'β'], rows);
        out += '<p>Dipangkas: ' + esc((step.pruned || []).join(', ') || 'belum ada') + '. Nilai node yang dipangkas tidak dihitung.</p>';
        if (final) {
          const count = r => r.evaluatedLeaves.length;
          out += '<div class="feedback"><h3>Hasil akhir</h3><p>Nilai root: ' + esc(number(result.value)) + ' · langkah terbaik: ' + esc(result.bestMove || '—') + ' · daun dievaluasi: ' + count(result) + '</p></div>';
          out += '<h3>Bandingkan minimax dan alpha–beta</h3>' + table(['Metode', 'Nilai root', 'Daun dievaluasi', 'Simpul dipangkas'],
            [['Minimax', number(plain.value), count(plain), 0], ['Alpha–beta', number(result.value), count(result), result.pruned.length]]) +
            '<p class="muted">Urutan traversal memengaruhi pemangkasan, sedangkan nilai minimax root tetap sama.</p>';
        }
        out += '<details class="alt-text"><summary>Tabel peristiwa (notasi slide)</summary>' + eventsHTML(result.events || []) + '</details>';
        if (props.editableLeaves) {
          out += '<details class="custom-variant"><summary>Variasi: ubah nilai daun (bukan soal resmi)</summary>' +
            '<form class="custom-form" data-leaves-form="1"><div class="h-grid">' +
            leavesOf(base.tree).map(leaf => '<label class="h-field">' + esc(leaf.id) + '<input name="leaf-' + esc(leaf.id) + '" inputmode="decimal" value="' + esc(number(own(state.overrides, leaf.id) ? state.overrides[leaf.id] : leaf.value)) + '"></label>').join('') +
            '</div><div class="control-row"><button type="submit" class="button" data-key="apply-leaves">Terapkan nilai daun</button>' + button('Kembali ke slide', 'resetLeaves', 'data-key="reset-leaves"', 'secondary') + '</div></form></details>';
        }
        return out;
      },
      actions: {
        prev() { stepper.prev(); state.index = stepper.index; host.render(); },
        next() { stepper.next(); state.index = stepper.index; host.render(); },
        reset() { stepper.reset(); state.index = 0; host.render(); },
        resetLeaves() { state.overrides = {}; run(); host.render(); }
      },
      fields: {
        prune(value, target) { state.prune = target.checked; run(); host.render(); },
        order(value) { state.order = value; run(); host.render(); },
        pruneOn(value) { state.pruneOn = value; run(); host.render(); }
      },
      submit(form) {
        const overrides = {};
        for (const leaf of leavesOf(base.tree)) {
          const raw = form.elements['leaf-' + leaf.id] && form.elements['leaf-' + leaf.id].value.trim();
          const value = raw ? Number(raw.replace(',', '.')) : NaN;
          if (Number.isFinite(value) && value !== leaf.value) overrides[leaf.id] = value;
        }
        state.overrides = overrides;
        run();
        host.render();
      }
    };
    return view;
  });

  // Events in slide notation: node ← child = value, α or β of the node, window, and cut.
  function eventsHTML(events) {
    if (!events.length) return '<p class="muted">Tidak ada peristiwa.</p>';
    return table(['Langkah', 'Node', 'Anak = nilai', 'Nilai node', 'Jendela [α, β]', 'Pangkas?'], events.map(e => [
      e.step, e.node + ' (' + e.nodeType + ')', e.child + ' = ' + number(e.childValue),
      (e.nodeType === 'MAX' ? 'α' : 'β') + '(' + e.node + ') = ' + number(e.nodeValue),
      '[' + number(e.alpha) + ', ' + number(e.beta) + ']',
      !e.remaining ? 'tidak ada anak tersisa' : e.cut ? 'ya: ' + (e.prunedChildren || []).join(', ') : 'tidak'
    ]));
  }

  // ---- queens (steepest ascent only) ------------------------------------------
  const QUEEN_MODES = [['explore', 'Jelajahi (klik kotak)'], ['hill', 'Hill climbing (steepest ascent)']];
  defineWidget('queens', host => {
    const props = host.props, uid = host.ctx.uid;
    const start = props.start || '43254323';
    const state = {board: start, mode: QUEEN_MODES.some(([m]) => m === props.mode) ? props.mode : 'explore', index: 0, run: null};
    function startRun() {
      state.index = 0;
      state.run = state.mode === 'explore' ? null : engine.runQueens({start, mode: 'steepest'});
      if (state.run) state.board = state.run.trace[0].state || start;
    }
    if (state.mode !== 'explore') startRun();
    const current = () => state.run ? (state.run.trace[state.index].state || state.board) : state.board;
    function bestNeighbour(board) {
      let best = null;
      for (let c = 0; c < 8; c++) for (let r = 1; r <= 8; r++) {
        if (+board[c] === r) continue;
        const next = board.slice(0, c) + r + board.slice(c + 1), h = engine.queensAttacks(next);
        if (!best || h < best.h) best = {state: next, h, col: c + 1, row: r};
      }
      return best;
    }
    function boardHTML(board) {
      const h = engine.queensAttacks(board), locked = state.mode !== 'explore';
      let out = '<div class="queen-board" role="group" aria-label="Papan 8 ratu, h = ' + h + '">';
      for (let r = 8; r >= 1; r--) {
        out += '<div class="queen-row">';
        for (let c = 0; c < 8; c++) {
          const isQueen = +board[c] === r;
          const hv = isQueen ? null : engine.queensAttacks(board.slice(0, c) + r + board.slice(c + 1));
          const label = isQueen ? 'Kolom ' + (c + 1) + ' baris ' + r + ', ratu di sini' : 'Kolom ' + (c + 1) + ' baris ' + r + ', h jika ratu dipindah ke sini = ' + hv;
          const attrs = 'aria-label="' + esc(label) + '" data-key="q-' + (c + 1) + '-' + r + '"' + (isQueen || locked ? ' disabled' : ' data-action="move" data-col="' + (c + 1) + '" data-row="' + r + '"');
          out += '<button type="button" class="queen-cell' + ((r + c) % 2 ? ' dark' : '') + (isQueen ? ' queen' : '') + '" ' + attrs + '>' + (isQueen ? '♛' : '<span class="queen-h">' + hv + '</span>') + '</button>';
        }
        out += '</div>';
      }
      return out + '</div>';
    }
    return {
      title: 'Delapan ratu · ' + (state.mode === 'explore' ? 'jelajahi' : 'hill climbing'),
      html() {
        const board = current(), h = engine.queensAttacks(board);
        let out = '<div class="control-row">' + select('mode', 'Mode', QUEEN_MODES, state.mode, uid + '-mode') +
          button('Reset ke slide', 'reset', 'data-key="reset"', 'ghost') + '</div>';
        out += '<p>Susunan: <strong>' + esc(board) + '</strong> · h = <strong>' + h + '</strong> · ' + (h === 0 ? 'solusi' : 'belum solusi') + '</p>';
        out += boardHTML(board);
        if (state.mode === 'explore') {
          out += '<div class="control-row">' + button('Pindah ke tetangga terbaik', 'best', 'data-key="best"', 'secondary') + '</div>';
        } else {
          out += '<div class="control-row">' + button('Langkah berikutnya', 'next', 'data-key="next"' + (state.index >= state.run.trace.length - 1 ? ' disabled' : '')) +
            button('Jalankan semua', 'all', 'data-key="all"', 'secondary') + button('Ulangi', 'restart', 'data-key="restart"', 'ghost') + '</div>';
          const step = state.run.trace[state.index];
          out += '<div class="feedback" role="status">' + esc(step.reason) + '</div>';
          if (step.bestMoves) out += '<h3>Tetangga terbaik</h3>' + table(['Kolom', 'Baris', 'h'], step.bestMoves.slice(0, 12).map(m => [m.col, m.row, m.h]));
        }
        const pairs = engine.queensAttackingPairs(board);
        out += '<details class="alt-text"><summary>Alternatif teks: pasangan yang saling menyerang (' + pairs.length + ')</summary>' +
          (pairs.length ? table(['Kolom A', 'Kolom B'], pairs) : '<p>Tidak ada pasangan yang saling menyerang.</p>') + '</details>';
        const grid = engine.queensNeighborGrid(board);
        out += '<details class="alt-text"><summary>Alternatif teks: h untuk setiap baris dan kolom</summary>' +
          table(['Baris'].concat(Array.from({length: 8}, (_, c) => 'Kolom ' + (c + 1))),
            grid.map((line, i) => ['Baris ' + (8 - i)].concat(line.map(v => v === null ? 'ratu' : v)))) + '</details>';
        return out;
      },
      actions: {
        move(d) {
          if (state.mode !== 'explore') return;
          const col = Number(d.col) - 1, row = Number(d.row);
          state.board = state.board.slice(0, col) + row + state.board.slice(col + 1);
          host.render();
        },
        best() {
          const next = bestNeighbour(state.board);
          if (next && next.h < engine.queensAttacks(state.board)) state.board = next.state;
          host.render();
        },
        next() { if (state.run) state.index = Math.min(state.run.trace.length - 1, state.index + 1); host.render(); },
        all() { if (state.run) state.index = state.run.trace.length - 1; host.render(); },
        restart() { startRun(); host.render(); },
        reset() { state.board = start; state.index = 0; if (state.mode !== 'explore') startRun(); host.render(); }
      },
      fields: {
        mode(value) { state.mode = value; state.board = start; startRun(); host.render(); }
      }
    };
  });

  const util = {esc, number, graphSVG, table, button, select, makeStepper, traceTableHTML, updatesHTML, resultHTML, eventsHTML, problemFor};
  const KKAWidgets = {
    register, mount, names: () => Object.keys(registry), util, defineWidget
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = KKAWidgets;
  if (root) root.KKAWidgets = KKAWidgets;
})(typeof window !== 'undefined' ? window : globalThis);
