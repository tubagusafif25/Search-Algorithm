(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && !!module.exports;
  const KKAWidgets = isNode ? require('./widgets-core.js') : root.KKAWidgets;
  const engine = isNode ? require('./algorithms.js') : root.KKAAlgorithms;
  const EPS = 1e-9;
  // Which numbers each mode writes per frontier entry and per trace row.
  const ROW_KEYS = {dfs: ['g'], ucs: ['g'], greedy: ['h'], astar: ['g', 'h', 'f']};
  const MODE_NAME = {dfs: 'DFS', ucs: 'UCS', greedy: 'Greedy', astar: 'A*'};

  // ---- small parsers ----------------------------------------------------------
  function parseNumber(value) {
    const text = String(value == null ? '' : value).trim().replace(',', '.');
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return NaN;
    return Number(text);
  }
  function fmtNum(value) {
    if (value === Infinity) return '∞';
    if (value === -Infinity) return '−∞';
    if (typeof value !== 'number' || !Number.isFinite(value)) return String(value);
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));
  }
  function fmt4(value) { return Number(value).toFixed(4); }
  function canonState(name, states) {
    const text = String(name == null ? '' : name).trim();
    if (!states || !states.length || states.includes(text)) return text;
    const hits = states.filter(s => s.toLowerCase() === text.toLowerCase());
    return hits.length === 1 ? hits[0] : text;
  }
  function normalizeAction(value) {
    const text = String(value == null ? '' : value).trim().toLowerCase();
    if (['expand', 'ekspansi', 'ekspan'].includes(text)) return 'expand';
    if (['goal', 'tujuan', 'uji tujuan'].includes(text)) return 'goal';
    return text;
  }
  function normalizeDecision(value) {
    const text = String(value == null ? '' : value).trim();
    if (/^(move|pindah|geser|lanjut)$/i.test(text)) return 'Move';
    if (/^(stop|berhenti|selesai)$/i.test(text)) return 'Stop';
    return '';
  }
  function normalizePrune(value) {
    if (typeof value === 'boolean') return value;
    const text = String(value == null ? '' : value).trim();
    if (/^(ya|y|yes|pangkas|true|1)$/i.test(text)) return true;
    if (/^(tidak|t|no|n|false|0|jangan)$/i.test(text)) return false;
    return null;
  }
  // Accepts "S-A-D-G", "S → A → D → G", "S, A, D, G" or "S A D G". Empty, "-" or "(kosong)" give [].
  function normalizePath(text) {
    const raw = String(text == null ? '' : text).trim();
    if (!raw || /^(-|—|\(kosong\)|\(tidak ada\))$/i.test(raw)) return [];
    return raw.split(/\s*(?:→|->|[-,;]|\s)\s*/).filter(Boolean);
  }
  function splitIds(text) {
    const raw = String(text == null ? '' : text).trim();
    if (!raw || /^(-|—|\(kosong\)|\(tidak ada\))$/i.test(raw)) return [];
    return raw.split(/[\s,;]+/).filter(Boolean);
  }
  function arrEq(a, b) {
    return a.length === b.length && a.every((x, i) => x === b[i]);
  }
  function ok(message = '') { return {ok: true, message}; }
  function bad(message) { return {ok: false, message}; }

  // Splits on ';' and ',' only where parentheses are balanced, so "A(g=3,h=8)" stays one entry.
  function splitTopLevel(text) {
    const parts = [];
    let depth = 0, current = '';
    for (const ch of text) {
      if (ch === '(') depth++;
      if (ch === ')') depth = Math.max(0, depth - 1);
      if ((ch === ';' || ch === ',') && depth === 0) { parts.push(current); current = ''; continue; }
      current += ch;
    }
    parts.push(current);
    return parts;
  }
  // "A(g=3,h=8,f=11); B(g=5,h=7,f=12)" -> [{state, g, h, f}]. Missing values are left out, not guessed.
  function parseFrontierText(text) {
    const raw = String(text == null ? '' : text).trim();
    if (raw === '' || /^(\(kosong\)|kosong|-|—|–)$/i.test(raw)) return {ok: true, entries: []};
    const entries = [];
    for (const piece of splitTopLevel(raw)) {
      const item = piece.trim();
      if (!item) continue;
      const m = /^([A-Za-z][A-Za-z0-9_']*)\s*(?:\((.*)\))?$/.exec(item);
      if (!m) return {ok: false, entries: [], error: 'Tidak bisa membaca "' + item + '". Tulis seperti A(g=3,h=8,f=11); B(g=5,h=7,f=12).'};
      const entry = {state: m[1]};
      for (const pair of String(m[2] || '').split(',')) {
        if (!pair.trim()) continue;
        const kv = /^\s*([ghfGHF])\s*[=:]\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*$/.exec(pair);
        if (!kv) return {ok: false, entries: [], error: 'Nilai "' + pair.trim() + '" pada ' + m[1] + ' tidak dikenali. Gunakan g=, h= atau f=.'};
        entry[kv[1].toLowerCase()] = Number(kv[2]);
      }
      entries.push(entry);
    }
    return {ok: true, entries};
  }
  function formatEntry(entry, mode) {
    return entry.state + '(' + (ROW_KEYS[mode] || ['g']).map(k => k + '=' + fmtNum(entry[k])).join(',') + ')';
  }

  // Compares a typed frontier with the engine's frontier (order matters). Returns {ok, messages}.
  function compareFrontier(text, expected, mode, options = {}) {
    const parsed = parseFrontierText(text);
    if (!parsed.ok) return {ok: false, messages: [parsed.error]};
    const states = options.states || [];
    const keys = ROW_KEYS[mode] || ['g'];
    const want = expected || [];
    const got = parsed.entries.map(e => Object.assign({}, e, {state: canonState(e.state, states)}));
    const used = new Array(got.length).fill(false);
    const missing = [];
    for (const w of want) {
      const k = got.findIndex((e, idx) => !used[idx] && e.state === w.state);
      if (k >= 0) used[k] = true; else missing.push(w);
    }
    const extra = got.filter((_, idx) => !used[idx]);
    const messages = [];
    for (const w of missing) messages.push('Entri ' + formatEntry(w, mode) + ' belum ditulis.');
    for (const e of extra) messages.push('Entri ' + e.state + ' tidak seharusnya ada (entri usang atau sudah closed tidak ditulis).');
    if (messages.length) return {ok: false, messages: messages.slice(0, 4)};
    for (let i = 0; i < want.length; i++) {
      if (got[i].state !== want[i].state) {
        return {ok: false, messages: ['Urutan berbeda pada posisi ' + (i + 1) + ': seharusnya ' + want[i].state + '.']};
      }
    }
    if (!options.statesOnly) {
      for (let i = 0; i < want.length; i++) {
        for (const k of keys) {
          const value = got[i][k];
          if (value === undefined) messages.push('Nilai ' + k + ' untuk ' + want[i].state + ' di frontier belum ditulis.');
          else if (Math.abs(value - want[i][k]) > EPS) messages.push('Nilai ' + k + ' untuk ' + want[i].state + ' di frontier seharusnya ' + fmtNum(want[i][k]) + '.');
        }
      }
    }
    return {ok: messages.length === 0, messages: messages.slice(0, 4)};
  }

  // One row of the trace: answer = {selected, g, h, f, action, frontier} as typed (strings).
  function checkRow(answer, expected, mode, options = {}) {
    const a = answer || {};
    const states = options.states || [];
    const fields = {};
    const keys = ROW_KEYS[mode] || ['g'];
    const selected = canonState(a.selected, states);
    if (!selected) fields.selected = bad('Isi kolom Dipilih.');
    else fields.selected = selected === expected.selected ? ok() : bad('Dipilih salah: seharusnya ' + expected.selected + '.');
    for (const k of keys) {
      if (options.statesOnly) { fields[k] = ok(); continue; }
      const value = parseNumber(a[k]);
      if (Number.isNaN(value)) fields[k] = bad('Nilai ' + k + ' untuk ' + expected.selected + ' belum diisi.');
      else if (Math.abs(value - expected[k]) > EPS) fields[k] = bad('Nilai ' + k + ' untuk ' + expected.selected + ' seharusnya ' + fmtNum(expected[k]) + '.');
      else fields[k] = ok();
    }
    const action = normalizeAction(a.action);
    fields.action = action === expected.action ? ok()
      : bad(expected.action === 'goal' ? 'Aksi seharusnya goal: state ini adalah tujuan.' : 'Aksi seharusnya expand (ekspansi).');
    const frontier = compareFrontier(a.frontier, expected.frontier, mode, {states, statesOnly: options.statesOnly});
    fields.frontier = frontier.ok ? ok() : bad(frontier.messages.join(' '));
    const messages = Object.values(fields).filter(f => !f.ok).map(f => f.message);
    return {ok: messages.length === 0, fields, messages};
  }

  // Summary after the last row: answer = {path, cost, expanded, order}. expected from traceTable.
  function checkSummary(answer, expected) {
    const a = answer || {};
    const fields = {};
    const wantPath = expected.path || [];
    fields.path = arrEq(normalizePath(a.path), wantPath) ? ok()
      : bad('Path seharusnya ' + (wantPath.length ? wantPath.join(' → ') : '(tidak ada)') + '.');
    const wantCost = expected.cost;
    if (Number.isFinite(wantCost)) {
      const cost = parseNumber(a.cost);
      const terms = Array.isArray(expected.costTerms) && expected.costTerms.length ? ' (' + expected.costTerms.join(' + ') + ')' : '';
      fields.cost = !Number.isNaN(cost) && Math.abs(cost - wantCost) <= EPS ? ok()
        : bad('Total cost seharusnya ' + fmtNum(wantCost) + terms + '.');
    } else {
      fields.cost = /^(-|—|∞|tidak ada)$/i.test(String(a.cost == null ? '' : a.cost).trim()) ? ok() : bad('Tidak ada path, jadi total cost ditulis —.');
    }
    const expanded = parseNumber(a.expanded);
    fields.expanded = expanded === expected.expanded ? ok() : bad('Jumlah ekspansi seharusnya ' + expected.expanded + '.');
    const wantOrder = expected.expansionOrder || [];
    fields.order = arrEq(normalizePath(a.order), wantOrder) ? ok() : bad('Urutan ekspansi seharusnya ' + (wantOrder.join(', ') || '(kosong)') + '.');
    const messages = Object.values(fields).filter(f => !f.ok).map(f => f.message);
    return {ok: messages.length === 0, fields, messages};
  }

  // One iteration of hill climbing on a route. answer = {costs:[string] (optional), best, bestCost, decision}.
  function checkTspStep(answer, iteration, options = {}) {
    const a = answer || {};
    const tol = options.tol != null ? options.tol : 0.0002;
    const tie = options.tie || 'first';
    const n = iteration.neighbors.length;
    const costs = [];
    for (const nb of iteration.neighbors) {
      const raw = (a.costs || [])[nb.index - 1];
      if (raw == null || String(raw).trim() === '') continue;
      const value = parseNumber(raw);
      costs.push(Number.isNaN(value) || Math.abs(value - nb.cost) > tol
        ? {index: nb.index, ok: false, message: 'Biaya #' + nb.index + ' seharusnya ' + fmt4(nb.cost) + '.'}
        : {index: nb.index, ok: true, message: ''});
    }
    const fields = {costs};
    const expIndex = iteration.best.index;
    const bestText = String(a.best == null ? '' : a.best).trim();
    const bestIndex = parseInt(bestText, 10);
    const chosen = iteration.neighbors.find(nb => nb.index === bestIndex);
    if (!bestText || Number.isNaN(bestIndex)) fields.best = bad('Isi nomor neighbor terbaik (1–' + n + ').');
    else if (bestIndex === expIndex) fields.best = ok();
    else if (chosen && Math.abs(chosen.cost - iteration.best.cost) <= EPS) {
      fields.best = bad(tie === 'first'
        ? 'Neighbor #' + bestIndex + ' juga berbiaya sama dengan #' + expIndex + '. Aturan: pilih yang pertama dalam urutan, yaitu #' + expIndex + '.'
        : 'Neighbor #' + bestIndex + ' berbiaya sama. Mode pembulatan notebook (float) memilih #' + expIndex + '.');
    } else fields.best = bad('Neighbor #' + bestIndex + ' bukan yang terbaik. Yang terkecil adalah #' + expIndex + ' (' + fmt4(iteration.best.cost) + ').');
    const bestCost = parseNumber(a.bestCost);
    fields.bestCost = !Number.isNaN(bestCost) && Math.abs(bestCost - iteration.best.cost) <= tol ? ok()
      : bad('Biaya terbaik seharusnya ' + fmt4(iteration.best.cost) + '.');
    const decision = normalizeDecision(a.decision);
    fields.decision = decision === iteration.decision ? ok()
      : bad(iteration.decision === 'Move' ? 'Keputusan seharusnya Move: ada tetangga yang lebih murah.' : 'Keputusan seharusnya Stop: tidak ada tetangga yang lebih murah.');
    const messages = [...costs.filter(c => !c.ok).map(c => c.message)];
    for (const key of ['best', 'bestCost', 'decision']) if (!fields[key].ok) messages.push(fields[key].message);
    return {ok: messages.length === 0, fields, messages, costs};
  }

  // One alpha-beta event. answer = {value, prune}. Prune is asked only when event.remaining is true.
  function checkAbEvent(answer, event, options = {}) {
    const a = answer || {};
    const isMax = event.nodeType === 'MAX';
    const symbol = isMax ? 'α' : 'β';
    const label = symbol + '(' + event.node + ')';
    const fields = {};
    const value = parseNumber(a.value);
    if (Number.isNaN(value)) fields.value = bad('Isi nilai ' + label + '.');
    else if (Math.abs(value - event.nodeValue) > EPS) fields.value = bad(label + ' seharusnya ' + fmtNum(event.nodeValue) + '.');
    else fields.value = ok();
    if (event.remaining) {
      const prune = normalizePrune(a.prune);
      const window = '[α, β] = [' + fmtNum(event.alpha) + ', ' + fmtNum(event.beta) + ']';
      const pruned = (event.prunedChildren || []).join(', ');
      if (prune === null) fields.prune = bad('Pilih ya atau tidak: pangkas anak yang tersisa?');
      else if (prune === !!event.cut) fields.prune = ok();
      else if (event.cut) fields.prune = bad('Seharusnya ya: jendela ' + window + ' sudah kosong, anak tersisa ' + pruned + ' dipangkas.');
      else fields.prune = bad('Seharusnya tidak: jendela ' + window + ' masih terbuka, anak tersisa tetap dibuka.');
    }
    const messages = Object.values(fields).filter(f => !f.ok).map(f => f.message);
    return {ok: messages.length === 0, fields, messages};
  }

  // Set comparison for the pruned nodes at the end of an alpha-beta drill.
  function checkPrunedSet(text, expected, options = {}) {
    const states = options.states || [];
    const got = [...new Set(splitIds(text).map(s => canonState(s, states)))];
    const want = expected || [];
    const missing = want.filter(x => !got.includes(x));
    const extra = got.filter(x => !want.includes(x));
    const messages = [];
    if (missing.length) messages.push('Belum disebut: ' + missing.join(', ') + '.');
    if (extra.length) messages.push('Tidak seharusnya dipangkas: ' + extra.join(', ') + '.');
    return {ok: messages.length === 0, missing, extra, messages};
  }

  // ---- drill widgets -------------------------------------------------------
  const util = KKAWidgets.util;
  const esc = util.esc;
  const TRACE_HINT = {
    dfs: 'Dipilih = entri paling atas stack, yaitu yang paling baru masuk. Successor yang sudah closed tidak ditulis. Entri usang dilewati tanpa nomor iterasi.',
    ucs: 'Dipilih = g terkecil. Jika g sama, yang masuk frontier lebih dulu (FIFO). Entri lama yang sudah digantikan update dilewati.',
    greedy: 'Dipilih = h terkecil. Jika h sama, yang masuk frontier lebih dulu (FIFO). g tidak dipakai untuk memilih.',
    astar: 'Dipilih = f = g + h terkecil. Jika f sama, yang masuk frontier lebih dulu (FIFO). Entri lama yang sudah digantikan update dilewati.'
  };
  const TRACE_FORMAT = {dfs: 'X(g=3); Y(g=5)', ucs: 'X(g=3); Y(g=5)', greedy: 'X(h=2); Y(h=6)', astar: 'X(g=3,h=8,f=11); Y(g=5,h=7,f=12)'};
  const TRACE_ITEM = {dfs: 'Stack sesudah (atas → bawah)', ucs: 'Frontier sesudah', greedy: 'Frontier sesudah', astar: 'Frontier sesudah'};

  function reportProgress(host, drillId, progress) {
    if (drillId && host.ctx.report) host.ctx.report(drillId, progress);
  }
  // Toast text is a one-line summary; the detail stays inline in the feedback box.
  function badCount(fields) {
    return Object.keys(fields || {}).filter(k => fields[k] && fields[k].ok === false).length;
  }
  function checkToast(label, ok, wrong) {
    return ok ? label + ' benar ✓' : label + ': ' + wrong + ' bagian belum benar — lihat tanda ×';
  }
  function scoreLine(host, drillId, total, correct) {
    const saved = drillId && host.ctx.saved ? host.ctx.saved(drillId) : null;
    let line = 'Skor percobaan pertama: ' + correct + ' dari ' + total + '.';
    if (saved && saved.bestPercent != null) line += ' Skor terbaik tersimpan: ' + saved.bestPercent + '%.';
    return '<p class="muted drill-score" aria-live="polite">' + esc(line) + '</p>';
  }
  function fieldHTML(uid, name, label, control, res, help) {
    const cls = 'drill-field' + (res ? (res.ok ? ' is-ok' : ' is-bad') : '');
    return '<div class="' + cls + '"><label for="' + uid + '-' + name + '">' + esc(label) + '</label>' + control +
      (help ? '<p class="field-help muted">' + esc(help) + '</p>' : '') +
      (res ? '<p class="field-msg ' + (res.ok ? 'correct' : 'incorrect') + '">' + (res.ok ? '✓ benar' : '✗ ' + esc(res.message)) + '</p>' : '') + '</div>';
  }
  function textControl(uid, name, value, attrs = '') {
    return '<input id="' + uid + '-' + name + '" name="' + name + '" data-key="' + name + '" value="' + esc(value == null ? '' : value) + '" autocomplete="off" spellcheck="false" ' + attrs + '>';
  }
  function feedbackBox(feedback) {
    if (!feedback) return '';
    return '<div class="feedback drill-feedback ' + (feedback.ok ? 'correct' : 'incorrect') + '" role="status" aria-live="polite"><p><strong>' + esc(feedback.title) + '</strong></p>' +
      (feedback.lines || []).map(line => '<p>' + esc(line) + '</p>').join('') + '</div>';
  }

  // ---- trace-drill -----------------------------------------------------------
  KKAWidgets.defineWidget('trace-drill', host => {
    const props = host.props, uid = host.ctx.uid;
    const problem = util.problemFor(props.caseId, props.variant);
    const mode = props.mode || 'ucs';
    const drillId = props.drillId || null;
    const hMap = problem.heuristic || {};
    const result = engine.runSearch({graph: problem.graph, start: problem.start, goal: problem.goal, heuristic: problem.heuristic, mode, maxExpansions: 1000});
    const table = engine.traceTable(result, mode);
    const rows = table.rows;
    const states = Object.keys(problem.graph);
    const keys = drill.ROW_KEYS[mode] || ['g'];
    const startEntry = {state: problem.start, g: 0};
    if (keys.includes('h')) startEntry.h = hMap[problem.start];
    if (keys.includes('f')) startEntry.f = startEntry.g + startEntry.h;
    const startText = engine.formatFrontier([startEntry], mode);
    const total = rows.length + 1;
    const state = {
      i: 0, draft: {}, sdraft: {}, first: {}, feedback: null, last: null, hint: false, shint: false,
      statesOnly: false, summaryDone: false
    };
    const stage = () => state.i < rows.length ? 'row' : 'summary';
    const rowText = r => r.selected + ' · ' + keys.map(k => k + '=' + drill.fmtNum(r[k])).join(', ') + ' · ' + (r.action === 'goal' ? 'goal' : 'expand') + ' · ' + r.frontierText;
    const skipNote = r => (r.skippedAfter || []).length
      ? ' Sebelum baris berikutnya, ' + r.skippedAfter.map(s => s.state + '(g=' + drill.fmtNum(s.g) + ')').join(', ') + ' di-pop dan dilewati' + (mode === 'dfs' ? ' karena sudah closed' : ' karena entri usang') + ' (tanpa nomor iterasi).'
      : '';
    const score = () => ({correct: Object.values(state.first).filter(Boolean).length, answered: Object.keys(state.first).length});
    function progress() {
      const s = score();
      reportProgress(host, drillId, {completed: state.summaryDone, correctFirstTry: s.correct, total});
    }
    function capture(form) {
      if (!form) return;
      const target = form.dataset.form === 'summary' ? state.sdraft : state.draft;
      for (const el of form.querySelectorAll('[name]')) if (el.type !== 'checkbox') target[el.name] = el.value;
    }
    function announce(text) { host.announce(text); }
    const frontierHelp = () => 'Format: ' + TRACE_FORMAT[mode] + '. Tulis (kosong) jika kosong. Urutan penulisan = urutan frontier.';
    function rowForm(row, idx) {
      const res = state.last && state.last.stage === 'row' && state.last.index === idx ? state.last.res : null;
      const f = res ? res.fields : {};
      const d = state.draft;
      const frontierBefore = idx === 0 ? startText : rows[idx - 1].frontierText;
      let out = '<form class="drill-form" data-form="row" data-key="row-form" aria-label="Baris ' + row.iteration + ' tabel trace">';
      out += '<p class="drill-prev">Frontier sebelum baris ini: <span class="mono">' + esc(frontierBefore) + '</span></p>';
      out += '<div class="drill-grid trace-grid">';
      const actionOpts = [['', '— pilih —'], ['expand', 'expand (ekspansi)'], ['goal', 'goal (uji tujuan)']];
      out += '<div class="drill-pair">';
      out += fieldHTML(uid, 'selected', 'Dipilih', textControl(uid, 'selected', d.selected, 'inputmode="text" aria-describedby="' + uid + '-hint"'), f.selected, 'Nama state, sama seperti di graf.');
      out += fieldHTML(uid, 'action', 'Aksi', '<select id="' + uid + '-action" name="action" data-key="action">' +
        actionOpts.map(([v, t]) => '<option value="' + v + '"' + (String(d.action || '') === v ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select>', f.action);
      out += '</div>';
      out += '<div class="drill-nums" role="group" aria-label="Nilai ' + keys.join(', ') + '">';
      for (const k of keys) {
        out += fieldHTML(uid, k, k, textControl(uid, k, d[k], 'inputmode="numeric" aria-describedby="' + uid + '-hint"'), f[k]);
      }
      out += '</div>';
      out += '<p class="field-help muted drill-nums-help">' + esc(keys.map(k => k === 'g' ? 'g = biaya sejauh ini' : k === 'h' ? 'h = perkiraan sisa' : 'f = g + h').join(' · ')) + '</p>';
      out += fieldHTML(uid, 'frontier', TRACE_ITEM[mode], textControl(uid, 'frontier', d.frontier, 'aria-describedby="' + uid + '-hint"'), f.frontier, frontierHelp());
      out += '</div>';
      out += '<div class="control-row">' +
        '<button type="submit" class="button" data-key="check">Periksa baris</button>' +
        '<button type="button" class="button secondary" data-action="hint" data-key="hint">' + (state.hint ? 'Sembunyikan petunjuk' : 'Petunjuk') + '</button>' +
        '<button type="button" class="button ghost" data-action="reveal" data-key="reveal">Tampilkan kunci baris</button></div>';
      if (props.statesOnlyOption !== false) out += '<label class="drill-check"><input type="checkbox" data-field="statesOnly" data-key="statesonly" ' + (state.statesOnly ? 'checked' : '') + '> Hanya nama state (abaikan angka)</label>';
      if (state.hint) out += '<div class="drill-hint" id="' + uid + '-hint"><p><strong>Petunjuk.</strong> ' + esc(TRACE_HINT[mode]) + '</p><p>Pilih state dari frontier sebelum baris ini, tulis nilai g/h/f-nya, isi Aksi, lalu tulis frontier sesudah pengekspansian. Entri usang tidak ditulis.</p></div>';
      return out + '</form>';
    }
    function summaryForm() {
      const res = state.last && state.last.stage === 'summary' ? state.last.res : null;
      const f = res ? res.fields : {};
      const d = state.sdraft;
      let out = '<form class="drill-form" data-form="summary" aria-label="Ringkasan hasil trace">';
      out += '<p>Semua baris sudah diisi. Tulis hasil akhirnya.</p><div class="drill-grid">';
      out += fieldHTML(uid, 'path', 'Path (dari start ke goal)', textControl(uid, 'path', d.path, 'aria-describedby="' + uid + '-shint"'), f.path, 'Tulis seperti S-A-D-G. Path = rantai parent dari goal, dibalik.');
      out += fieldHTML(uid, 'cost', 'Total cost', textControl(uid, 'cost', d.cost, 'inputmode="decimal"'), f.cost, 'Jumlah biaya sisi pada path.');
      out += fieldHTML(uid, 'expanded', 'Jumlah ekspansi', textControl(uid, 'expanded', d.expanded, 'inputmode="numeric"'), f.expanded, 'Goal dan entri usang tidak dihitung.');
      out += fieldHTML(uid, 'order', 'Urutan ekspansi', textControl(uid, 'order', d.order, 'aria-describedby="' + uid + '-shint"'), f.order, 'Urutan state yang diekspansi, dipisah koma.');
      out += '</div><div class="control-row"><button type="submit" class="button" data-key="check-summary">Periksa ringkasan</button>' +
        '<button type="button" class="button ghost" data-action="shint" data-key="shint">' + (state.shint ? 'Sembunyikan petunjuk' : 'Petunjuk') + '</button>' +
        '<button type="button" class="button ghost" data-action="revealSummary" data-key="reveal-summary">Tampilkan kunci ringkasan</button></div>';
      if (state.shint) out += '<div class="drill-hint" id="' + uid + '-shint"><p>Jumlah ekspansi tidak menghitung goal dan entri usang. Urutan ekspansi berisi state yang diekspansi berurutan, tanpa goal.</p></div>';
      return out + '</form>';
    }
    function keyBox() {
      if (!state.summaryDone || !state.last || state.last.stage !== 'summary' || !state.last.key) return '';
      return '<div class="feedback"><h3>Kunci ringkasan</h3><p>Path ' + esc(table.path.join(' → ') || '(tidak ada)') + ' · cost ' + esc(util.number(table.cost)) +
        ' · ekspansi ' + esc(table.expanded) + ' · urutan ' + esc(table.expansionOrder.join(', ') || '(kosong)') + '</p></div>';
    }
    const view = {
      title: 'Latihan trace · ' + (problem.title || props.caseId) + ' · ' + mode.toUpperCase(),
      html() {
        const s = score();
        let out = '<p>Isi baris berikutnya dari tabel trace. Angka yang dipakai: ' + esc(keys.join(', ')) + '. Penulisan frontier boleh memakai spasi atau tanda koma/titik koma.</p>';
        out += '<p class="drill-progress">Baris ' + Math.min(state.i + 1, rows.length + 1) + ' dari ' + total + '</p>';
        out += scoreLine(host, drillId, total, s.correct);
        if (state.i > 0) out += '<h3>Baris yang sudah diselesaikan</h3>' + util.traceTableHTML(table, {rows: rows.slice(0, state.i)});
        if (stage() === 'row') {
          out += '<h3>Baris ' + rows[state.i].iteration + '</h3>' + rowForm(rows[state.i], state.i);
        } else {
          out += '<h3>Ringkasan</h3>' + (state.summaryDone ? '' : summaryForm());
          out += keyBox();
        }
        out += feedbackBox(state.feedback);
        if (state.summaryDone) out += '<p class="drill-done"><strong>Latihan selesai.</strong></p>' + util.button('Mulai ulang latihan', 'restart', 'data-key="restart"', 'secondary');
        if (!rows.length) out = '<p class="feedback">Tidak ada baris trace untuk kasus ini.</p>';
        return out;
      },
      actions: {
        hint(d, e, target) { capture(target.closest('form')); state.hint = !state.hint; host.render(); },
        shint(d, e, target) { capture(target.closest('form')); state.shint = !state.shint; host.render(); },
        reveal() {
          if (stage() !== 'row') return;
          const row = rows[state.i];
          state.feedback = {ok: false, title: 'Kunci baris ' + row.iteration + ': ' + rowText(row), lines: [skipNote(row)].filter(Boolean)};
          state.last = null;
          state.i++; state.draft = {};
          state.first[row.iteration] = state.first[row.iteration] === undefined ? false : state.first[row.iteration];
          progress(); host.render();
        },
        revealSummary() {
          state.summaryDone = true;
          state.first.summary = state.first.summary === undefined ? false : state.first.summary;
          state.last = {stage: 'summary', key: true, res: null};
          state.feedback = {ok: false, title: 'Kunci ringkasan ditampilkan.', lines: []};
          progress(); host.render();
        },
        restart() {
          Object.assign(state, {i: 0, draft: {}, sdraft: {}, first: {}, feedback: null, last: null, summaryDone: false, hint: false, shint: false});
          progress(); host.render();
        }
      },
      fields: {
        statesOnly(value, target) { capture(target.closest('form')); state.statesOnly = target.checked; host.render(); }
      },
      submit(form) {
        capture(form);
        if (form.dataset.form === 'summary') {
          const expected = {path: table.path, cost: table.cost, costTerms: table.costTerms, expanded: table.expanded, expansionOrder: table.expansionOrder};
          const res = drill.checkSummary(state.sdraft, expected);
          if (state.first.summary === undefined) state.first.summary = res.ok;
          state.last = {stage: 'summary', res, key: false};
          if (res.ok) {
            state.summaryDone = true;
            state.feedback = {ok: true, title: 'Selesai. Semua hasil benar.', lines: ['Path, cost, jumlah ekspansi, dan urutan ekspansi sudah sesuai trace.']};
            host.announce('Latihan selesai ✓');
          } else {
            state.feedback = {ok: false, title: 'Ringkasan belum benar.', lines: res.messages};
            host.announce(checkToast('Ringkasan', false, badCount(res.fields)));
          }
          progress(); host.render();
          return;
        }
        const row = rows[state.i];
        const res = drill.checkRow(state.draft, row, mode, {states, statesOnly: state.statesOnly});
        if (state.first[row.iteration] === undefined) state.first[row.iteration] = res.ok;
        state.last = {stage: 'row', index: state.i, res};
        if (res.ok) {
          const lines = [skipNote(row)].filter(Boolean);
          state.feedback = {ok: true, title: 'Baris ' + row.iteration + ' benar.', lines};
          state.i++; state.draft = {}; state.hint = false;
          host.announce(checkToast('Baris ' + row.iteration, true));
        } else {
          state.feedback = {ok: false, title: 'Belum benar. Perbaiki kolom bertanda ✗.', lines: res.messages.slice(0, 3)};
          host.announce(checkToast('Baris ' + row.iteration, false, badCount(res.fields)));
        }
        progress(); host.render();
      }
    };
    return view;
  });

  // ---- ab-drill --------------------------------------------------------------
  KKAWidgets.defineWidget('ab-drill', host => {
    const props = host.props, uid = host.ctx.uid;
    const problem = util.problemFor(props.caseId, null);
    const order = props.order || 'left', pruneOn = props.pruneOn || 'gte';
    const drillId = props.drillId || null;
    const result = engine.runMinimax(problem.tree, {prune: true, order, pruneOn});
    const events = result.events || [];
    const states = [];
    const walk = node => { states.push(node.id); (node.children || []).forEach(walk); };
    walk(problem.tree);
    const total = events.length + 1;
    const state = {i: 0, draft: {}, first: {}, feedback: null, last: null, fdraft: {}, flast: null, done: false};
    const sym = e => e.nodeType === 'MAX' ? 'α' : 'β';
    const pruneHelp = pruneOn === 'gte' ? 'Pangkas jika α ≥ β (nilai sama juga dipangkas).' : 'Pangkas jika α > β (nilai sama tidak dipangkas).';
    function progress() {
      const correct = Object.values(state.first).filter(Boolean).length;
      reportProgress(host, drillId, {completed: state.done, correctFirstTry: correct, total});
    }
    function capture(form) {
      if (!form) return;
      const target = form.dataset.form === 'final' ? state.fdraft : state.draft;
      for (const el of form.querySelectorAll('[name]')) target[el.name] = el.value;
    }
    function eventForm(e) {
      const res = state.last && state.last.index === state.i ? state.last.res : null;
      const f = res ? res.fields : {};
      const d = state.draft;
      let out = '<form class="drill-form" data-form="event" aria-label="Langkah ' + (state.i + 1) + ' alpha-beta">';
      out += '<p><strong>' + esc(e.node) + ' (' + esc(e.nodeType) + ')</strong> menerima nilai <strong>' + esc(e.child) + ' = ' + esc(util.number(e.childValue)) + '</strong> dari anaknya.</p>';
      out += '<div class="drill-grid">';
      out += fieldHTML(uid, 'value', sym(e) + '(' + e.node + ') yang baru', textControl(uid, 'value', d.value, 'inputmode="decimal"'), f.value,
        e.nodeType === 'MAX' ? 'Nilai terbesar yang sudah dilihat pada node ini.' : 'Nilai terkecil yang sudah dilihat pada node ini.');
      if (e.remaining) {
        out += fieldHTML(uid, 'prune', 'Pangkas anak yang tersisa?', '<select id="' + uid + '-prune" name="prune" data-key="prune">' +
          [['', '— pilih —'], ['ya', 'ya, pangkas'], ['tidak', 'tidak']].map(([v, t]) => '<option value="' + v + '"' + ((d.prune || '') === v ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>', f.prune,
          'Bandingkan jendela [α, β] node ini dengan batas dari atas.');
      }
      return out + '</div><div class="control-row"><button type="submit" class="button" data-key="check">Periksa langkah</button>' +
        '<button type="button" class="button ghost" data-action="reveal" data-key="reveal">Tampilkan kunci langkah</button></div></form>';
    }
    function finalForm() {
      const f = state.flast || {};
      const d = state.fdraft;
      return '<form class="drill-form" data-form="final" aria-label="Hasil akhir alpha-beta"><div class="drill-grid">' +
        fieldHTML(uid, 'value', 'Nilai root', textControl(uid, 'value', d.value, 'inputmode="decimal"'), f.value) +
        fieldHTML(uid, 'best', 'Langkah terbaik', textControl(uid, 'best', d.best, 'aria-describedby="' + uid + '-fhelp"'), f.best, 'Tulis nama anak root, misalnya B.') +
        fieldHTML(uid, 'pruned', 'Simpul yang dipangkas', textControl(uid, 'pruned', d.pruned, 'aria-describedby="' + uid + '-fhelp"'), f.pruned, 'Pisahkan dengan koma. Tulis (tidak ada) jika tidak ada.') +
        '</div><p id="' + uid + '-fhelp" class="muted">Urutan penulisan tidak penting.</p><div class="control-row"><button type="submit" class="button" data-key="check-final">Periksa hasil akhir</button>' +
        '<button type="button" class="button ghost" data-action="revealFinal" data-key="reveal-final">Tampilkan kunci</button></div></form>';
    }
    return {
      title: 'Latihan alpha–beta · ' + (problem.title || props.caseId) + ' · ' + (order === 'left' ? 'kiri → kanan' : 'kanan → kiri'),
      html() {
        const correct = Object.values(state.first).filter(Boolean).length;
        const saved = drillId && host.ctx.saved ? host.ctx.saved(drillId) : null;
        let out = '<p>Setiap kali anak mengembalikan nilai, tulis α (MAX) atau β (MIN) node yang baru. ' + esc(pruneHelp) + '</p>';
        out += '<p class="drill-progress">Langkah ' + Math.min(state.i + 1, events.length + 1) + ' dari ' + total + '</p>';
        out += '<p class="muted drill-score" aria-live="polite">Skor percobaan pertama: ' + correct + ' dari ' + total + '.' + (saved && saved.bestPercent != null ? ' Skor terbaik tersimpan: ' + saved.bestPercent + '%.' : '') + '</p>';
        if (state.i > 0) out += '<h3>Peristiwa yang sudah selesai</h3>' + util.eventsHTML(events.slice(0, state.i));
        if (state.i < events.length) {
          out += '<h3>Langkah ' + (state.i + 1) + '</h3>' + eventForm(events[state.i]);
        } else if (!state.done) {
          out += '<h3>Hasil akhir</h3>' + finalForm();
        }
        out += feedbackBox(state.feedback);
        if (state.done) out += '<p class="drill-done"><strong>Latihan selesai.</strong></p>' + util.button('Mulai ulang latihan', 'restart', 'data-key="restart"', 'secondary');
        if (!events.length) out = '<p class="feedback">Tidak ada peristiwa untuk pohon ini.</p>';
        return out;
      },
      actions: {
        reveal() {
          if (state.i >= events.length) return;
          const e = events[state.i];
          if (state.first[state.i] === undefined) state.first[state.i] = false;
          const pruneText = e.remaining ? '; pangkas: ' + (e.cut ? 'ya (' + e.prunedChildren.join(', ') + ')' : 'tidak') : '';
          state.feedback = {ok: false, title: 'Kunci langkah ' + (state.i + 1) + ': ' + sym(e) + '(' + e.node + ') = ' + util.number(e.nodeValue) + pruneText, lines: []};
          state.i++; state.draft = {}; state.last = null;
          progress(); host.render();
        },
        revealFinal() {
          state.done = true;
          state.feedback = {ok: false, title: 'Kunci hasil akhir', lines: ['Nilai root ' + util.number(result.value) + ', langkah terbaik ' + (result.bestMove || '—') + ', simpul dipangkas: ' + ((result.pruned || []).join(', ') || 'tidak ada') + '.']};
          progress(); host.render();
        },
        restart() { Object.assign(state, {i: 0, draft: {}, first: {}, feedback: null, last: null, fdraft: {}, flast: null, done: false}); progress(); host.render(); }
      },
      submit(form) {
        capture(form);
        if (form.dataset.form === 'final') {
          const raw = String(state.fdraft.value || '').trim().replace(',', '.');
          const valueOk = raw !== '' && Math.abs(Number(raw) - result.value) <= 1e-9;
          const bestOk = String(state.fdraft.best || '').trim().toUpperCase() === String(result.bestMove || '').toUpperCase();
          const pruned = drill.checkPrunedSet(state.fdraft.pruned, result.pruned || [], {states});
          state.flast = {
            value: valueOk ? {ok: true} : {ok: false, message: 'Nilai root seharusnya ' + util.number(result.value) + '.'},
            best: bestOk ? {ok: true} : {ok: false, message: 'Langkah terbaik seharusnya ' + (result.bestMove || '—') + '.'},
            pruned: pruned.ok ? {ok: true} : {ok: false, message: pruned.messages.join(' ')}
          };
          const ok = valueOk && bestOk && pruned.ok;
          if (state.first.final === undefined) state.first.final = ok;
          state.feedback = ok ? {ok: true, title: 'Selesai. Semua hasil akhir benar.', lines: []}
            : {ok: false, title: 'Hasil akhir belum benar.', lines: ['Periksa kolom bertanda ✗.']};
          if (ok) state.done = true;
          host.announce(ok ? 'Latihan selesai ✓' : checkToast('Hasil akhir', false, badCount(state.flast)));
          progress(); host.render();
          return;
        }
        const e = events[state.i];
        const res = drill.checkAbEvent(state.draft, e, {});
        if (state.first[state.i] === undefined) state.first[state.i] = res.ok;
        state.last = {index: state.i, res};
        if (res.ok) {
          const lines = e.remaining && e.cut ? ['Anak yang tersisa dipangkas: ' + e.prunedChildren.join(', ') + '.'] : [];
          state.feedback = {ok: true, title: 'Langkah ' + (state.i + 1) + ' benar.', lines};
          state.i++; state.draft = {}; state.last = null;
          host.announce(checkToast('Langkah ' + state.i, true));
        } else {
          state.feedback = {ok: false, title: 'Belum benar. Perbaiki kolom bertanda ✗.', lines: res.messages};
          host.announce(checkToast('Langkah ' + (state.i + 1), false, badCount(res.fields)));
        }
        progress(); host.render();
      }
    };
  });

  // ---- tsp-hc ----------------------------------------------------------------
  KKAWidgets.defineWidget('tsp-hc', host => {
    const props = host.props, uid = host.ctx.uid;
    const problem = util.problemFor(props.caseId || 'tsp5', props.variant);
    const cities = problem.cities;
    const startText = String(props.start || problem.start.join(''));
    const route0 = startText.split('');
    const mode = props.mode === 'drill' ? 'drill' : 'replay';
    const drillId = props.drillId || null;
    const allowFloat = props.allowFloatToggle !== false;
    const state = {tie: 'first', index: 0, i: 0, draft: {}, first: {}, last: null, feedback: null, hint: false, done: false};
    let run = null;
    const compute = () => { run = engine.runTSP({cities, route: route0, tie: state.tie}); };
    compute();
    const iterations = () => run.iterations;
    const fmt4 = v => Number(v).toFixed(4);
    const tieNote = it => {
      const tied = it.neighbors.filter(n => Math.abs(n.cost - it.best.cost) <= 1e-9).map(n => '#' + n.index);
      if (tied.length <= 1) return '';
      return state.tie === 'first'
        ? 'Seri: ' + tied.join(' dan ') + ' sama. Aturan: pilih yang pertama dalam urutan, yaitu #' + it.best.index + '.'
        : 'Seri: ' + tied.join(' dan ') + ' sama. Mode pembulatan notebook (float) memilih #' + it.best.index + '.';
    };
    const swapText = (it, n) => (cities && route0.length ? it.route[n.i] + '↔' + it.route[n.j] : '') + ' (posisi ' + (n.i + 1) + ' dan ' + (n.j + 1) + ')';
    const neighbourTable = (it, inputs, res) => {
      const rowsHTML = it.neighbors.map(n => {
        const costField = inputs
          ? '<td><input class="cost-input" name="c-' + n.index + '" inputmode="decimal" aria-label="Biaya neighbor #' + n.index + '" value="' + esc(state.draft['c-' + n.index] || '') + '" data-key="c-' + n.index + '" autocomplete="off"></td>'
          : '<td>' + esc(fmt4(n.cost)) + '</td>';
        const msg = res && res.costs ? res.costs.find(c => c.index === n.index && !c.ok) : null;
        return '<tr class="' + (n.index === it.best.index ? 'is-best' : '') + '"><th scope="row">#' + n.index + '</th><td>' + esc(swapText(it, n)) + '</td><td class="mono">' + esc(engine.routeText(n.route)) + '</td>' + costField +
          (msg ? '</tr><tr class="cost-msg"><td colspan="4" class="incorrect">✗ ' + esc(msg.message) + '</td>' : '') + '</tr>';
      }).join('');
      return '<div class="table-wrap"><table class="data-table tsp-table"><thead><tr><th scope="col">#</th><th scope="col">Tukar</th><th scope="col">Rute tetangga</th><th scope="col">Biaya</th></tr></thead><tbody>' + rowsHTML + '</tbody></table></div>';
    };
    function tieControl() {
      return allowFloat ? '<div class="control-row">' + util.select('tie', 'Seri', [['first', 'Aturan: pilih yang pertama'], ['float', 'Pembulatan notebook (float)']], state.tie, uid + '-tie') + '</div>' : '';
    }
    function replayHTML() {
      const it = iterations()[state.index], last = state.index >= iterations().length - 1;
      let out = tieControl();
      out += '<p>Iterasi ' + it.iteration + ' · rute sekarang <strong class="mono">' + esc(engine.routeText(it.route)) + '</strong> · biaya ' + esc(fmt4(it.cost)) + '</p>';
      out += neighbourTable(it, false, null);
      out += '<p>Neighbor terbaik: <strong>#' + it.best.index + '</strong> · ' + esc(engine.routeText(it.best.route)) + ' · biaya ' + esc(fmt4(it.best.cost)) + '</p>';
      out += '<p class="feedback" role="status">' + (it.decision === 'Move'
        ? 'Move: biaya terbaik ' + fmt4(it.best.cost) + ' lebih kecil dari biaya sekarang ' + fmt4(it.cost) + '. Pindah ke rute baru.'
        : 'Stop: tidak ada tetangga yang lebih murah dari ' + fmt4(it.cost) + '. Berhenti.') + ' ' + esc(tieNote(it)) + '</p>';
      out += '<div class="control-row"><button type="button" class="button ghost" data-action="prev" data-key="prev"' + (state.index === 0 ? ' disabled' : '') + '>← Sebelumnya</button>' +
        '<button type="button" class="button" data-action="next" data-key="next"' + (last ? ' disabled' : '') + '>Iterasi berikutnya →</button>' +
        '<button type="button" class="button secondary" data-action="reset" data-key="reset">Ulangi</button></div>';
      if (last) out += '<div class="feedback"><h3>Hasil akhir</h3><p>Rute ' + esc(engine.routeText(run.finalRoute)) + ' · biaya ' + esc(fmt4(run.finalCost)) + ' · jumlah Move ' + run.moves + '.</p></div>';
      return out;
    }
    function drillHTML() {
      const its = iterations();
      if (state.i >= its.length) return '<p class="drill-done"><strong>Latihan selesai.</strong> Semua iterasi sudah benar.</p>' + util.button('Mulai ulang latihan', 'restart', 'data-key="restart"', 'secondary');
      const it = its[state.i];
      const res = state.last && state.last.index === state.i ? state.last.res : null;
      const f = res ? res.fields : {};
      const d = state.draft;
      let out = tieControl();
      out += '<p>Iterasi ' + it.iteration + ' · rute sekarang <strong class="mono">' + esc(engine.routeText(it.route)) + '</strong> · biaya ' + esc(fmt4(it.cost)) + '</p>';
      out += '<form class="drill-form" data-form="tsp" aria-label="Iterasi ' + it.iteration + ' tetangga">';
      out += '<p class="muted">Isi biaya tetangga jika mau (boleh dikosongkan), lalu nomor dan biaya terbaik serta keputusan.</p>';
      out += neighbourTable(it, true, res);
      out += '<div class="drill-grid">';
      out += fieldHTML(uid, 'best', 'Neighbor terbaik (nomor)', textControl(uid, 'best', d.best, 'inputmode="numeric"'), f.best, 'Nomor 1 sampai ' + it.neighbors.length + '.');
      out += fieldHTML(uid, 'bestCost', 'Biaya terbaik', textControl(uid, 'bestCost', d.bestCost, 'inputmode="decimal"'), f.bestCost, 'Empat angka di belakang koma.');
      out += fieldHTML(uid, 'decision', 'Keputusan', '<select id="' + uid + '-decision" name="decision" data-key="decision"><option value="">— pilih —</option>' +
        ['Move', 'Stop'].map(v => '<option value="' + v + '"' + (d.decision === v ? ' selected' : '') + '>' + v + '</option>').join('') + '</select>', f.decision,
        'Move jika biaya terbaik lebih kecil dari biaya sekarang.');
      out += '</div><div class="control-row"><button type="submit" class="button" data-key="check">Periksa iterasi</button>' +
        '<button type="button" class="button secondary" data-action="hint" data-key="hint">' + (state.hint ? 'Sembunyikan petunjuk' : 'Petunjuk') + '</button>' +
        '<button type="button" class="button ghost" data-action="reveal" data-key="reveal">Tampilkan kunci iterasi</button></div></form>';
      if (state.hint) out += '<div class="drill-hint"><p>Jarak Euclid: √(dx² + dy²) untuk setiap pasangan kota. Neighbor terbaik adalah biaya terkecil; jika seri, pilih nomor yang lebih kecil. Move jika biaya terbaik lebih kecil dari biaya sekarang, selisih lebih dari 0.0001.</p></div>';
      out += feedbackBox(state.feedback);
      return out;
    }
    const view = {
      title: 'Latihan hill climbing · TSP ' + startText + (problem.title ? ' · ' + problem.title : ''),
      html() {
        const its = iterations();
        if (mode === 'replay') {
          return replayHTML();
        }
        const correct = Object.values(state.first).filter(Boolean).length;
        const saved = drillId && host.ctx.saved ? host.ctx.saved(drillId) : null;
        let out = tieControl();
        out += '<p class="drill-progress">Iterasi ' + Math.min(state.i + 1, its.length) + ' dari ' + its.length + '</p>';
        out += '<p class="muted drill-score" aria-live="polite">Skor percobaan pertama: ' + correct + ' dari ' + its.length + '.' + (saved && saved.bestPercent != null ? ' Skor terbaik tersimpan: ' + saved.bestPercent + '%.' : '') + '</p>';
        out += drillHTML();
        return out;
      },
      actions: {
        prev() { state.index = Math.max(0, state.index - 1); host.render(); },
        next() { state.index = Math.min(iterations().length - 1, state.index + 1); host.render(); },
        reset() { state.index = 0; host.render(); },
        hint(d, e, target) { capture(target.closest('form')); state.hint = !state.hint; host.render(); },
        reveal() {
          const it = iterations()[state.i];
          if (!it) return;
          state.first[it.iteration] = state.first[it.iteration] === undefined ? false : state.first[it.iteration];
          state.feedback = {ok: false, title: 'Kunci iterasi ' + it.iteration, lines: ['Neighbor terbaik #' + it.best.index + ' · biaya ' + fmt4(it.best.cost) + ' · ' + it.decision + '.' + (tieNote(it) ? ' ' + tieNote(it) : '')]};
          state.i++; state.draft = {}; state.last = null; state.hint = false;
          reportNow(); host.render();
        },
        restart() { state.i = 0; state.draft = {}; state.first = {}; state.last = null; state.feedback = null; state.done = false; reportNow(); host.render(); }
      },
      fields: {
        tie(value) { state.tie = value; compute(); state.index = 0; state.i = 0; state.draft = {}; state.first = {}; state.last = null; state.feedback = null; reportNow(); host.render(); }
      },
      submit(form) {
        for (const el of form.querySelectorAll('[name]')) state.draft[el.name] = el.value;
        const its = iterations(), it = its[state.i];
        if (!it) return;
        const costs = it.neighbors.map(n => state.draft['c-' + n.index] || '');
        const res = drill.checkTspStep({costs, best: state.draft.best, bestCost: state.draft.bestCost, decision: state.draft.decision}, it, {tie: state.tie});
        if (state.first[it.iteration] === undefined) state.first[it.iteration] = res.ok;
        state.last = {index: state.i, res};
        if (res.ok) {
          state.feedback = {ok: true, title: 'Iterasi ' + it.iteration + ' benar.', lines: [it.decision === 'Move' ? 'Pindah ke rute ' + engine.routeText(it.best.route) + '.' : 'Berhenti pada rute ini.']};
          state.i++; state.draft = {}; state.last = null; state.hint = false;
          host.announce(checkToast('Iterasi ' + it.iteration, true));
        } else {
          state.feedback = {ok: false, title: 'Belum benar. Perbaiki kolom bertanda ✗.', lines: res.messages.slice(0, 4)};
          const wrong = res.costs.filter(c => !c.ok).length + ['best', 'bestCost', 'decision'].filter(k => !res.fields[k].ok).length;
          host.announce(checkToast('Iterasi ' + it.iteration, false, wrong));
        }
        reportNow(); host.render();
      },
      destroy() {}
    };
    function capture(form) { if (form) for (const el of form.querySelectorAll('[name]')) state.draft[el.name] = el.value; }
    function reportNow() {
      const its = iterations();
      const correct = Object.values(state.first).filter(Boolean).length;
      reportProgress(host, drillId, {completed: state.i >= its.length, correctFirstTry: correct, total: its.length});
    }
    return view;
  });

  const drill = {
    parseNumber, parseFrontierText, compareFrontier, checkRow, checkSummary, checkTspStep, checkAbEvent,
    checkPrunedSet, normalizePath, normalizeAction, normalizeDecision, normalizePrune, canonState, formatEntry,
    fmtNum, ROW_KEYS, MODE_NAME
  };
  if (KKAWidgets) KKAWidgets.drill = drill;
  if (isNode) module.exports = KKAWidgets;
})(typeof window !== 'undefined' ? window : globalThis);
