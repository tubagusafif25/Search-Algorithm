/* KKA Study Lab (kuis): router, storage and rendering for the six quiz topics.
   Pure helpers at the top are exported for Node tests; the DOM part runs only in a browser. */
(function (root) {
  'use strict';

  const STORAGE_KEY = 'kka-kuis-v3';
  const LEGACY_KEY = 'kka-study-lab-v2';
  const MAX_DRAFT = 60000;
  const MAX_EXAMS = 10;
  const TOPIC_ID = /^t[1-6]$/;
  const SECTION_ID = /^t[1-6]-s[1-6]$/;
  const EXAM_ID = /^u\d{6,20}$/;
  const DRILL_ID = /^t[1-6]-d\d+$/;
  const DATE_ID = /^\d{4}-\d{2}-\d{2}$/;
  const SET_IDS = ['A', 'B', 'acak'];
  const DURATIONS = [0, 60, 90, 120];
  const PLAN_KEYS = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'];
  const KIND_LABEL = {
    intuisi: 'Intuisi', aturan: 'Aturan kuliah', contoh: 'Contoh langkah demi langkah',
    menulis: 'Cara menulis jawaban esai', latihan: 'Latihan interaktif', cek: 'Cek cepat'
  };
  const PDFS = {
    2: 'Lecture 2 -- Uninformed Search.pdf',
    3: 'SP14 CS188 Lecture 3 -- Informed Search.pdf',
    4: '06-local-search.pdf',
    5: '8. Adversarial Search.pdf'
  };
  /* Rencana tanpa tanggal: urutan saja. Hari 6 adalah mock quiz. */
  const PLAN_STEPS = [
    { key: 'd1', title: 'Hari 1', text: 'DFS + UCS', topics: ['t1', 't2'] },
    { key: 'd2', title: 'Hari 2', text: 'Greedy', topics: ['t3'] },
    { key: 'd3', title: 'Hari 3', text: 'A*', topics: ['t4'] },
    { key: 'd4', title: 'Hari 4', text: 'Hill Climbing', topics: ['t5'] },
    { key: 'd5', title: 'Hari 5', text: 'Alpha-Beta', topics: ['t6'] },
    { key: 'd6', title: 'Hari 6', text: 'Mock quiz Set A → review → Set B', topics: [], mock: true }
  ];
  const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Route parsing: '#/', '#/t/t2', '#/t/t2/esai', '#/t/t2/t2-s03', '#/ujian', '#/ujian/u1700000000000', '#/ringkasan', '#/progres'. Junk goes home. */
  function parseRoute(hash) {
    const home = { view: 'home' };
    const path = String(hash == null ? '' : hash).replace(/^#/, '').replace(/^\/+/, '').replace(/\/+$/, '');
    if (path === '') return home;
    const parts = path.split('/');
    if (parts.length === 1) {
      if (parts[0] === 'ujian') return { view: 'exam-setup' };
      if (parts[0] === 'ringkasan') return { view: 'summary' };
      if (parts[0] === 'progres') return { view: 'progress' };
      return home;
    }
    if (parts[0] === 'ujian') return parts.length === 2 && EXAM_ID.test(parts[1]) ? { view: 'exam', eid: parts[1] } : home;
    if (parts[0] !== 't' || !TOPIC_ID.test(parts[1] || '')) return home;
    if (parts.length === 2) return { view: 'topic', tid: parts[1] };
    if (parts.length !== 3) return home;
    if (parts[2] === 'esai') return { view: 'essays', tid: parts[1] };
    if (SECTION_ID.test(parts[2]) && parts[2].indexOf(parts[1] + '-') === 0) return { view: 'section', tid: parts[1], sid: parts[2] };
    return home;
  }

  /* Answer normalisation: case, separators (→ -> - , ; / and spaces) become commas; a single number compares numerically. */
  function normalizeAnswer(value) {
    let s = String(value == null ? '' : value).trim().toLowerCase().replace(/−/g, '-');
    s = s.replace(/->|→/g, ',');
    s = s.replace(/(\S)-/g, '$1,');
    s = s.replace(/[;\/]/g, ',').replace(/\s+/g, ',');
    s = s.replace(/,+/g, ',').replace(/^,|,$/g, '');
    return s;
  }
  function numericValue(raw) {
    const s = String(raw == null ? '' : raw).trim().replace(/−/g, '-');
    let t = s;
    if (/^[+-]?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    else if (/^[+-]?\d+,\d+$/.test(t)) t = t.replace(',', '.');
    else if (!/^[+-]?\d+(\.\d+)?$/.test(t)) return NaN;
    return Number(t);
  }
  function sameNumber(a, b) {
    const x = numericValue(a), y = numericValue(b);
    return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) <= Math.max(1e-6, Math.abs(y) * 1e-9);
  }
  function matchesAnswer(value, expected) {
    if (normalizeAnswer(value) === normalizeAnswer(expected)) return true;
    return sameNumber(value, expected);
  }
  function checkAnswer(question, value) {
    if (!question) return false;
    if (question.type === 'mcq') return value !== undefined && value !== null && Number(value) === question.answer;
    if (typeof value !== 'string' || !value.trim()) return false;
    const accepted = [question.answer].concat(Array.isArray(question.accept) ? question.accept : []);
    return accepted.some(expected => matchesAnswer(value, expected));
  }

  /* ----- content index ----- */
  function byNumber(a, b) { return a.number - b.number; }
  function walkBlocks(blocks, visit) {
    for (const b of blocks || []) {
      visit(b);
    }
  }
  function drillIdsOf(topic) {
    const ids = [];
    for (const s of topic.sections || []) {
      walkBlocks(s.blocks, b => {
        if (b.type === 'widget' && b.props && typeof b.props.drillId === 'string' && ids.indexOf(b.props.drillId) < 0) ids.push(b.props.drillId);
      });
    }
    return ids;
  }
  function indexContent(topics) {
    const sections = new Map(), essays = new Map(), drills = new Set();
    for (const t of topics || []) {
      for (const s of t.sections || []) {
        sections.set(s.id, s);
        walkBlocks(s.blocks, b => {
          if (b.type === 'widget' && b.props && typeof b.props.drillId === 'string') drills.add(b.props.drillId);
        });
      }
      for (const e of t.essays || []) essays.set(e.id, e);
    }
    return { sections, essays, drills };
  }
  function essayMapOf(topics) {
    const map = new Map();
    for (const t of topics || []) for (const e of t.essays || []) map.set(e.id, e);
    return map;
  }

  /* ----- state ----- */
  function fresh() {
    const plan = {};
    for (const k of PLAN_KEYS) plan[k] = false;
    return { schemaVersion: 3, quizDate: null, plan, sections: {}, drills: {}, essays: {}, exams: [], last: null };
  }
  function normalizeQuizDate(value) {
    if (typeof value !== 'string' || !DATE_ID.test(value)) return null;
    const [y, m, d] = value.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return value;
  }

  /* Restores saved state. Anything unknown or of the wrong type is dropped. */
  function validateState(raw, topics, now) {
    const state = fresh();
    if (!raw || typeof raw !== 'object' || raw.schemaVersion !== 3) return state;
    const index = indexContent(topics);
    const isCount = v => Number.isInteger(v) && v >= 0;
    const isTime = v => Number.isFinite(v) && v >= 0 && (!now || v <= now + 86400000 * 366);

    state.quizDate = normalizeQuizDate(raw.quizDate);
    if (raw.plan && typeof raw.plan === 'object') for (const k of PLAN_KEYS) state.plan[k] = raw.plan[k] === true;

    if (raw.sections && typeof raw.sections === 'object') {
      for (const [sid, rec] of Object.entries(raw.sections)) {
        const section = index.sections.get(sid);
        if (!section || !rec || typeof rec !== 'object') continue;
        const out = { done: rec.done === true, checks: {} };
        const byId = new Map(section.checks.map(c => [c.id, c]));
        if (rec.checks && typeof rec.checks === 'object') {
          for (const [qid, c] of Object.entries(rec.checks)) {
            const q = byId.get(qid);
            if (!q || !c || typeof c !== 'object') continue;
            const choice = q.type === 'mcq' ? (typeof c.choice === 'number' ? c.choice : null) : (typeof c.choice === 'string' ? c.choice.slice(0, 200) : null);
            if (choice === null) continue;
            out.checks[qid] = { choice, correct: c.correct === true, solved: c.solved === true, attempts: isCount(c.attempts) ? c.attempts : 0 };
          }
        }
        state.sections[sid] = out;
      }
    }

    if (raw.drills && typeof raw.drills === 'object') {
      for (const [did, rec] of Object.entries(raw.drills)) {
        if (!index.drills.has(did) || !rec || typeof rec !== 'object') continue;
        const total = isCount(rec.total) ? rec.total : 0;
        const correct = isCount(rec.correctFirstTry) ? Math.min(rec.correctFirstTry, total) : 0;
        const best = isCount(rec.bestPercent) ? Math.min(rec.bestPercent, 100) : 0;
        state.drills[did] = { completed: rec.completed === true, correctFirstTry: correct, total, bestPercent: best, updatedAt: isTime(rec.updatedAt) ? rec.updatedAt : 0 };
      }
    }

    if (raw.essays && typeof raw.essays === 'object') {
      for (const [eid, rec] of Object.entries(raw.essays)) {
        const essay = index.essays.get(eid);
        if (!essay || !rec || typeof rec !== 'object') continue;
        const draft = typeof rec.draft === 'string' ? rec.draft.slice(0, MAX_DRAFT) : '';
        const rubric = essay.rubric.map((_, i) => Array.isArray(rec.rubric) && rec.rubric[i] === true);
        state.essays[eid] = {
          draft,
          revealed: rec.revealed === true && draft.trim() !== '',
          rubric,
          assessment: rec.assessment === 'mastered' || rec.assessment === 'review' ? rec.assessment : ''
        };
      }
    }

    if (Array.isArray(raw.exams)) {
      const seen = new Set();
      for (const ex of raw.exams) {
        if (!ex || typeof ex !== 'object' || typeof ex.id !== 'string' || !EXAM_ID.test(ex.id) || seen.has(ex.id)) continue;
        if (!SET_IDS.includes(ex.set) || !Array.isArray(ex.picks) || ex.picks.length !== 6) continue;
        if (!ex.picks.every(eid => index.essays.has(eid))) continue;
        if (!isTime(ex.startedAt) || !DURATIONS.includes(ex.durationMin)) continue;
        const answers = {};
        if (ex.answers && typeof ex.answers === 'object') {
          for (const eid of ex.picks) if (typeof ex.answers[eid] === 'string') answers[eid] = ex.answers[eid].slice(0, MAX_DRAFT);
        }
        const rubric = {};
        if (ex.rubric && typeof ex.rubric === 'object') {
          for (const eid of ex.picks) {
            const arr = ex.rubric[eid];
            if (Array.isArray(arr)) rubric[eid] = index.essays.get(eid).rubric.map((_, i) => arr[i] === true);
          }
        }
        const submitted = ex.submittedAt === null ? null : (isTime(ex.submittedAt) ? ex.submittedAt : null);
        seen.add(ex.id);
        state.exams.push({ id: ex.id, set: ex.set, picks: ex.picks.slice(), startedAt: ex.startedAt, durationMin: ex.durationMin, answers, submittedAt: submitted, rubric });
      }
      state.exams = state.exams.slice(-MAX_EXAMS);
    }

    if (typeof raw.last === 'string' && raw.last.length < 200 && parseRoute(raw.last).view !== 'home') state.last = raw.last;
    return state;
  }

  function sectionDone(section, state) {
    const rec = state.sections[section.id];
    if (!section.checks.length) return !!(rec && rec.done);
    return section.checks.every(c => rec && rec.checks && rec.checks[c.id] && rec.checks[c.id].solved === true);
  }
  function drillDone(drillId, state) {
    return !!(state.drills[drillId] && state.drills[drillId].completed);
  }
  function topicProgress(topic, state) {
    const sectionsDone = topic.sections.filter(s => sectionDone(s, state)).length;
    let checksTotal = 0, checksSolved = 0;
    for (const s of topic.sections) {
      for (const c of s.checks) {
        checksTotal++;
        const rec = state.sections[s.id] && state.sections[s.id].checks[c.id];
        if (rec && rec.solved) checksSolved++;
      }
    }
    const drills = drillIdsOf(topic);
    const drillsDone = drills.filter(id => drillDone(id, state)).length;
    const essaysMastered = (topic.essays || []).filter(e => state.essays[e.id] && state.essays[e.id].assessment === 'mastered').length;
    return {
      sectionsDone, sectionsTotal: topic.sections.length,
      checksSolved, checksTotal,
      drillsDone, drillsTotal: drills.length,
      essaysMastered, essaysTotal: (topic.essays || []).length
    };
  }

  /* ----- exam helpers ----- */
  function rubricScore(essay, checked) {
    return essay.rubric.reduce((sum, r, i) => sum + (checked && checked[i] === true ? r.points : 0), 0);
  }
  function examScore(exam, essays) {
    const perEssay = exam.picks.map(eid => {
      const essay = essays.get(eid);
      const checked = exam.rubric && exam.rubric[eid] ? exam.rubric[eid] : [];
      return { eid, score: essay ? rubricScore(essay, checked) : 0 };
    });
    const total = perEssay.reduce((sum, x) => sum + x.score, 0);
    const max = perEssay.length * 100;
    return { perEssay, total, max, percent: max ? Math.round(100 * total / max) : 0 };
  }
  /* Set A and Set B use the exam essays x1 and x2 of each topic. "acak" picks A or B per topic. */
  function examPicks(topics, set, rand) {
    const pick = typeof rand === 'function' ? rand : Math.random;
    const picks = [];
    for (const t of (topics || []).slice().sort(byNumber)) {
      const want = set === 'acak' ? (pick() < 0.5 ? 'A' : 'B') : set;
      const found = (t.essays || []).find(e => e.exam === true && e.set === want);
      if (found) picks.push(found.id);
    }
    return picks;
  }
  function timerInfo(exam, now) {
    const elapsedMs = Math.max(0, now - exam.startedAt);
    if (!exam.durationMin) return { limitMs: null, elapsedMs, remainingMs: null };
    const limitMs = exam.durationMin * 60000;
    return { limitMs, elapsedMs, remainingMs: limitMs - elapsedMs };
  }
  function clock(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    const pad = n => String(n).padStart(2, '0');
    return h ? h + ':' + pad(m) + ':' + pad(s) : pad(m) + ':' + pad(s);
  }

  /* ----- countdown and dates ----- */
  function daysUntil(dateStr, now) {
    const norm = normalizeQuizDate(dateStr);
    if (!norm) return null;
    const [y, m, d] = norm.split('-').map(Number);
    const t = new Date(now == null ? Date.now() : now);
    const todayUtc = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
    return Math.round((Date.UTC(y, m - 1, d) - todayUtc) / 86400000);
  }
  function countdownText(days) {
    if (days == null) return '';
    if (days > 1) return 'Tinggal ' + days + ' hari lagi';
    if (days === 1) return 'Besok';
    if (days === 0) return 'Hari ini';
    return 'Tanggal ini sudah lewat';
  }
  function longDate(dateStr) {
    const norm = normalizeQuizDate(dateStr);
    if (!norm) return '';
    const [y, m, d] = norm.split('-').map(Number);
    return DAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] + ', ' + d + ' ' + MONTH_NAMES[m - 1] + ' ' + y;
  }

  /* ----- drills (ctx.report) ----- */
  /* First completed run fixes the first-try score; bestPercent keeps the best completed percentage. */
  function mergeDrill(prev, report, now) {
    const base = prev || { completed: false, correctFirstTry: 0, total: 0, bestPercent: 0, updatedAt: 0 };
    const total = Number.isInteger(report.total) && report.total >= 0 ? report.total : 0;
    const correct = Number.isInteger(report.correctFirstTry) && report.correctFirstTry >= 0 ? Math.min(report.correctFirstTry, total) : 0;
    const completed = report.completed === true;
    const out = { completed: base.completed, correctFirstTry: base.correctFirstTry, total: base.total, bestPercent: base.bestPercent, updatedAt: now };
    if (completed && !base.completed) {
      out.completed = true;
      out.correctFirstTry = correct;
      out.total = total;
    }
    if (completed) {
      const percent = total ? Math.round(100 * correct / total) : 0;
      out.bestPercent = Math.max(base.bestPercent, percent);
    }
    return out;
  }

  /* ----- export ----- */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  /* Local calendar date (YYYY-MM-DD), so the student's own day is used. */
  function stamp(date) {
    const d = date instanceof Date ? date : new Date(date || Date.now());
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function stampTime(ms) {
    if (!ms) return '-';
    const d = new Date(ms);
    return stamp(d) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  /* Plain-text export of every saved answer. Self-assessments are not grades. */
  function exportText(state, topics, date) {
    const essays = essayMapOf(topics);
    const rows = ['KKA KUIS: JAWABAN DAN CATATAN PRIBADI', 'Diekspor: ' + stamp(date), 'Tanggal kuis: ' + (state.quizDate || 'belum diisi'), 'Penilaian diri bukan nilai otomatis.', ''];
    for (const topic of topics || []) {
      rows.push('==== Topik ' + topic.number + ': ' + topic.title + ' ====', '');
      for (const section of topic.sections) {
        const rec = state.sections[section.id];
        if (!rec) continue;
        rows.push('-- ' + section.title, 'Status: ' + (sectionDone(section, state) ? 'selesai' : 'belum selesai'));
        for (const q of section.checks) {
          const c = rec.checks && rec.checks[q.id];
          if (!c) continue;
          rows.push('Cek: ' + q.prompt, 'Jawaban: ' + (q.type === 'mcq' && typeof c.choice === 'number' ? q.options[c.choice] : String(c.choice)), 'Hasil: ' + (c.correct ? 'benar' : 'belum benar'));
        }
        rows.push('');
      }
      for (const did of drillIdsOf(topic)) {
        const d = state.drills[did];
        if (!d) continue;
        rows.push('Latihan ' + did + ': ' + (d.completed ? 'selesai' : 'belum selesai') + ' · skor percobaan pertama ' + d.correctFirstTry + ' dari ' + d.total);
      }
      for (const essay of topic.essays || []) {
        const rec = state.essays[essay.id];
        if (!rec) continue;
        rows.push('', 'ESAI ' + essay.id + ': ' + essay.title, 'JAWABAN:', rec.draft || '(belum diisi)', 'PENILAIAN DIRI: ' + (rec.assessment || 'belum dipilih'));
        if (rec.revealed) {
          rows.push('PEMBAHASAN RUJUKAN:', essay.solution || '', 'RUBRIK:');
          essay.rubric.forEach((r, i) => rows.push((rec.rubric[i] ? '[x] ' : '[ ] ') + r.text + ' (' + r.points + ' poin)'));
        }
      }
      rows.push('');
    }
    if (state.exams.length) {
      rows.push('==== MOCK QUIZ ====', '');
      for (const ex of state.exams) {
        const score = examScore(ex, essays);
        rows.push('UJIAN ' + ex.id + ' · Set ' + ex.set + ' · ' + (ex.durationMin ? ex.durationMin + ' menit' : 'tanpa batas waktu') + ' · mulai ' + stampTime(ex.startedAt) + ' · ' + (ex.submittedAt ? 'dikumpulkan ' + stampTime(ex.submittedAt) : 'belum dikumpulkan'));
        if (ex.submittedAt) rows.push('Skor: ' + score.total + ' dari ' + score.max + ' (' + score.percent + '%)');
        for (const eid of ex.picks) {
          const essay = essays.get(eid);
          const ps = score.perEssay.find(x => x.eid === eid);
          rows.push('', 'Soal ' + eid + ': ' + (essay ? essay.title : ''), 'JAWABAN:', ex.answers[eid] || '(belum diisi)', 'Skor esai (penilaian diri): ' + (ps ? ps.score : 0) + ' dari 100');
        }
        rows.push('');
      }
    }
    return rows.join('\n');
  }

  /* Text dump of the v2 drafts, for the legacy notice. Reads only essay drafts. */
  function legacyText(raw, date) {
    const rows = ['KKA STUDY LAB: JAWABAN LAMA (v2)', 'Diekspor: ' + stamp(date), ''];
    const essays = raw && raw.essays && typeof raw.essays === 'object' ? raw.essays : {};
    for (const [id, rec] of Object.entries(essays)) {
      if (rec && typeof rec.draft === 'string' && rec.draft.trim()) rows.push('[' + id + ']', rec.draft, '');
    }
    if (rows.length === 3) rows.push('(tidak ada jawaban tersimpan)');
    return rows.join('\n');
  }

  const helpers = {
    esc, parseRoute, normalizeAnswer, checkAnswer, numericValue, fresh, validateState, normalizeQuizDate,
    sectionDone, drillDone, topicProgress, indexContent, drillIdsOf, rubricScore, examScore, examPicks, timerInfo, clock,
    daysUntil, countdownText, longDate, mergeDrill, exportText, legacyText, slideSrc, pdfHref, PLAN_STEPS, PLAN_KEYS, SET_IDS, DURATIONS, KIND_LABEL
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
  if (!root || !root.document) return;

  /* ===================== browser part ===================== */
  function slideSrc(lectureNumber, n) { return 'slides/L' + lectureNumber + '-' + String(n).padStart(2, '0') + '.jpg'; }
  function pdfHref(lectureNumber, n) { return '../' + encodeURIComponent(PDFS[lectureNumber] || '') + '#page=' + n; }

  const topics = (Array.isArray(root.KKA_TOPICS) ? root.KKA_TOPICS.slice() : []).sort(byNumber);
  const cheat = root.KKA_CHEATSHEET || null;
  const essays = essayMapOf(topics);
  const main = document.getElementById('main');
  const saveStatus = document.getElementById('save-status');
  const reduced = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

  if (!topics.length) {
    main.innerHTML = '<section class="panel"><h1>Materi belum dapat dimuat</h1><p>Pastikan folder content/ dan semua file .js berada di samping index.html, lalu muat ulang halaman.</p></section>';
    return;
  }

  let state = fresh();
  let storageOK = true;
  let saveTimer = null;
  let toastTimer = null;
  let mounted = [];
  let widgetSpecs = [];
  let widgetSeq = 0;
  let legacyRaw = null;
  let view = { view: 'home' };
  let examTimer = null;

  /* ----- storage ----- */
  try {
    const raw = root.localStorage.getItem(STORAGE_KEY);
    if (raw) state = validateState(JSON.parse(raw), topics, Date.now());
  } catch (error) {
    storageOK = false;
  }
  try {
    const old = root.localStorage.getItem(LEGACY_KEY);
    if (old) legacyRaw = JSON.parse(old);
  } catch (error) {
    legacyRaw = { essays: {} };
  }
  function setStatus(text) { if (saveStatus) saveStatus.textContent = text; }
  function save() {
    clearTimeout(saveTimer); saveTimer = null;
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      storageOK = true;
      setStatus('Tersimpan di perangkat');
    } catch (error) {
      storageOK = false;
      setStatus('Belum tersimpan · ekspor TXT');
    }
  }
  function queueSave() {
    setStatus('Menyimpan…');
    clearTimeout(saveTimer); saveTimer = setTimeout(save, 300);
  }
  function toast(message) {
    const node = document.getElementById('toast');
    if (!node) return;
    node.textContent = message; node.classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('visible'), 3500);
  }
  function hideToast() {
    const node = document.getElementById('toast');
    clearTimeout(toastTimer); toastTimer = null;
    if (node) node.classList.remove('visible');
  }
  if (!storageOK) setStatus('Simpan lokal bermasalah · ekspor TXT');

  /* ----- small builders ----- */
  const txt = s => '<p class="pre-line">' + esc(s) + '</p>';
  const listHTML = (items, ordered) => '<' + (ordered ? 'ol' : 'ul') + '>' + items.map(s => '<li class="pre-line">' + esc(s) + '</li>').join('') + '</' + (ordered ? 'ol' : 'ul') + '>';
  const slideLink = (lectureNumber, n) => '<a href="' + esc(pdfHref(lectureNumber, n)) + '" target="_blank" rel="noopener">Buka PDF hal. ' + esc(n) + ' ↗</a>';
  function topicOf(tid) { return topics.find(t => t.id === tid) || null; }
  function sectionOf(topic, sid) { return topic.sections.find(s => s.id === sid) || null; }
  function examOf(eid) { return state.exams.find(e => e.id === eid) || null; }
  function activeExam() { return state.exams.slice().reverse().find(e => !e.submittedAt) || null; }
  function breadcrumb(items) {
    return '<nav class="breadcrumb" aria-label="Lokasi">' + items.map(i => i.href ? '<a href="' + esc(i.href) + '">' + esc(i.label) + '</a>' : esc(i.label)).join(' / ') + '</nav>';
  }

  /* ----- widgets ----- */
  function widgetSlot(name, props, caption) {
    const key = 'slot-' + (++widgetSeq);
    widgetSpecs.push({ key, name, props: props || {} });
    return '<div class="widget-slot" data-slot="' + key + '"><noscript>Simulator memerlukan JavaScript.</noscript></div>' + (caption ? '<p class="table-caption">' + esc(caption) + '</p>' : '');
  }
  function reportDrill(drillId, result) {
    if (!DRILL_ID.test(String(drillId || ''))) return null;
    state.drills[drillId] = mergeDrill(state.drills[drillId], result || {}, Date.now());
    queueSave();
    renderSidebar(view);
    return Object.assign({}, state.drills[drillId]);
  }
  function mountWidgets() {
    for (const spec of widgetSpecs) {
      const el = main.querySelector('[data-slot="' + spec.key + '"]');
      if (!el) continue;
      try {
        if (root.KKAWidgets && typeof root.KKAWidgets.mount === 'function') {
          const ctx = {
            uid: 'w' + spec.key.slice(5),
            reducedMotion: reduced(),
            announce: toast,
            report: reportDrill,
            saved: drillId => (state.drills[drillId] ? Object.assign({}, state.drills[drillId]) : null)
          };
          const handle = root.KKAWidgets.mount(el, spec.name, spec.props, ctx);
          if (handle && typeof handle.destroy === 'function') mounted.push(handle);
        } else {
          el.innerHTML = '<p class="feedback">Simulator belum tersedia: ' + esc(spec.name) + '</p>';
        }
      } catch (error) {
        el.innerHTML = '<p class="feedback error">Simulator gagal dimuat: ' + esc(spec.name) + '</p>';
      }
    }
    widgetSpecs = [];
  }
  function destroyWidgets() {
    for (const handle of mounted) { try { handle.destroy(); } catch (error) { /* ignore */ } }
    mounted = [];
    widgetSpecs = [];
  }

  /* ----- block renderers ----- */
  function blockHTML(block) {
    switch (block.type) {
      case 'text': return txt(block.text);
      case 'intuition': return '<div class="callout intuition"><strong>Intuisi</strong>' + txt(block.text) + '</div>';
      case 'list': return (block.title ? '<h3>' + esc(block.title) + '</h3>' : '') + listHTML(block.items || [], !!block.ordered);
      case 'definition': return '<dl class="definition"><dt>' + esc(block.term) + '</dt><dd class="pre-line">' + esc(block.text) + '</dd></dl>';
      case 'formula': return '<div class="formula" role="math">' + esc(block.text) + '</div>';
      case 'table': return '<div class="table-wrap">' + (block.caption ? '<p class="table-caption">' + esc(block.caption) + '</p>' : '') +
        '<table class="data-table"><thead><tr>' + block.headers.map(h => '<th scope="col">' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
        block.rows.map(row => '<tr>' + row.map(cell => '<td class="pre-line">' + esc(cell) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
      case 'pseudocode': return (block.title ? '<div class="pseudocode-title">' + esc(block.title) + '</div>' : '') + '<pre class="pseudocode"><code>' + esc(block.lines.join('\n')) + '</code></pre>';
      case 'note': return '<div class="callout note"><strong>Catatan</strong>' + txt(block.text) + '</div>';
      case 'warning': return '<div class="callout warning"><strong>Perhatian</strong>' + txt(block.text) + '</div>';
      case 'example': return '<div class="callout example"><strong>' + esc(block.title) + '</strong>' + txt(block.text) + '</div>';
      case 'slide': return '<figure class="slide-inline"><img src="' + esc(slideSrc(block.lecture, block.slide)) + '" alt="Slide ' + esc(block.slide) + ' dari ' + esc(PDFS[block.lecture] || 'PDF kuliah') + '" loading="lazy" data-slide-img="' + esc(block.slide) + '"><span class="slide-missing" hidden>Gambar slide tidak ada — buka PDF</span><figcaption class="pre-line">' + esc(block.caption || '') + ' · ' + slideLink(block.lecture, block.slide) + '</figcaption></figure>';
      case 'template': return '<div class="template"><div class="template-head"><strong>' + esc(block.title) + '</strong><button type="button" class="button secondary" data-action="copy-template">Salin</button></div><pre class="template-text"><code>' + esc(block.text) + '</code></pre></div>';
      case 'widget': return widgetSlot(block.widget, block.props, block.caption);
      default: return '';
    }
  }

  /* ----- checks (per section) ----- */
  function checkFormHTML(section, q) {
    const rec = (state.sections[section.id] && state.sections[section.id].checks[q.id]) || null;
    const name = 'c-' + q.id;
    let input;
    if (q.type === 'mcq') {
      input = '<fieldset><legend>' + esc(q.prompt) + '</legend>' + q.options.map((o, i) =>
        '<label class="choice"><input type="radio" name="' + esc(name) + '" value="' + i + '"' + (rec && rec.choice === i ? ' checked' : '') + '><span>' + esc(o) + '</span></label>').join('') + '</fieldset>';
    } else {
      input = '<label for="' + esc(name) + '"><strong>' + esc(q.prompt) + '</strong></label><input class="check-input" id="' + esc(name) + '" name="' + esc(name) + '" type="text" autocomplete="off" value="' + esc(rec && typeof rec.choice === 'string' ? rec.choice : '') + '">';
    }
    let feedback = '';
    if (rec) {
      feedback = '<div class="feedback ' + (rec.correct ? 'correct' : 'incorrect') + '" role="status" tabindex="-1" data-feedback>' +
        '<strong>' + (rec.correct ? 'Benar.' : 'Belum tepat.') + '</strong> ' + esc(q.explanation) +
        (q.source ? ' <span class="muted">Sumber: ' + esc(q.source) + '</span>' : '') + '</div>';
    }
    return '<form class="check-card" data-check data-sid="' + esc(section.id) + '" data-qid="' + esc(q.id) + '">' + input +
      '<button type="submit" class="button secondary">Periksa jawaban</button>' + feedback + '</form>';
  }
  function checksHTML(section) {
    if (!section.checks.length) return '';
    return '<h2>Cek pemahaman</h2>' + section.checks.map(q => checkFormHTML(section, q)).join('');
  }

  /* ----- slide thumbnails and the lightbox ----- */
  const dialog = document.getElementById('slide-dialog');
  function openSlide(lectureNumber, n) {
    const img = document.getElementById('slide-dialog-img');
    img.src = slideSrc(lectureNumber, n);
    img.alt = 'Slide ' + n + ' dari ' + (PDFS[lectureNumber] || 'PDF kuliah');
    document.getElementById('slide-dialog-caption').innerHTML = esc(PDFS[lectureNumber] || '') + ' · slide ' + n + ' · ' + slideLink(lectureNumber, n);
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  }
  function sourceHTML(src) {
    if (src.lecture && src.slide) {
      return '<figure class="source-card"><button type="button" class="slide-thumb" data-action="open-slide" data-lecture="' + esc(src.lecture) + '" data-slide="' + esc(src.slide) + '"><img src="' + esc(slideSrc(src.lecture, src.slide)) + '" alt="" loading="lazy" data-slide-img="' + esc(src.slide) + '"><span class="slide-missing" hidden>Gambar slide tidak ada — buka PDF</span><span class="sr-only">Perbesar slide ' + esc(src.slide) + '</span></button>' +
        '<figcaption>' + esc(src.label) + '<br>' + slideLink(src.lecture, src.slide) + '</figcaption></figure>';
    }
    return '<div class="source-card source-text"><p><strong>' + esc(src.label) + '</strong></p><p class="muted">Notebook: ' + esc(src.notebook || '') + '</p></div>';
  }

  /* ----- sidebar ----- */
  function renderSidebar(current) {
    const nav = document.getElementById('topic-nav');
    if (!nav) return;
    const cur = current || {};
    const topicItems = topics.map(t => {
      const p = topicProgress(t, state);
      const active = cur.tid === t.id;
      let html = '<li><a class="nav-link" href="#/t/' + esc(t.id) + '"' + (active && cur.view === 'topic' ? ' aria-current="page"' : '') + '><span class="nav-number">' + t.number + '</span><span class="nav-title">' + esc(t.short) + '</span><span class="nav-progress">' + p.sectionsDone + '/' + p.sectionsTotal + '</span></a>';
      if (active) {
        html += '<ol class="nav-sections">' + t.sections.map(s => {
          const done = sectionDone(s, state);
          return '<li><a href="#/t/' + esc(t.id) + '/' + esc(s.id) + '"' + (cur.sid === s.id ? ' aria-current="page"' : '') + '><span class="tick" aria-hidden="true">' + (done ? '✓' : '') + '</span>' + (done ? '<span class="sr-only">Selesai: </span>' : '') + esc(s.title) + '</a></li>';
        }).join('') +
          '<li><a href="#/t/' + esc(t.id) + '/esai"' + (cur.view === 'essays' ? ' aria-current="page"' : '') + '><span class="tick" aria-hidden="true"></span>Latihan esai</a></li></ol>';
      }
      return html + '</li>';
    }).join('');
    nav.innerHTML = '<div class="nav-group"><a class="nav-link" href="#/"' + (cur.view === 'home' ? ' aria-current="page"' : '') + '>Beranda</a></div>' +
      '<p class="nav-heading">Enam topik kuis</p><ol class="nav-topics">' + topicItems + '</ol>' +
      '<div class="nav-group nav-tools"><p class="nav-heading">Alat</p>' +
      '<a class="nav-link" href="#/ujian"' + (cur.view === 'exam-setup' || cur.view === 'exam' ? ' aria-current="page"' : '') + '>Mock quiz</a>' +
      '<a class="nav-link" href="#/ringkasan"' + (cur.view === 'summary' ? ' aria-current="page"' : '') + '>Ringkasan</a>' +
      '<a class="nav-link" href="#/progres"' + (cur.view === 'progress' ? ' aria-current="page"' : '') + '>Progres</a></div>';
    const resume = document.getElementById('resume');
    if (resume) { if (state.last) { resume.hidden = false; resume.setAttribute('href', state.last); } else resume.hidden = true; }
  }

  /* ----- exam timer ----- */
  function stopExamTimer() {
    if (examTimer) clearInterval(examTimer);
    examTimer = null;
  }
  function startExamTimer(exam) {
    stopExamTimer();
    const seen = { five: -1, warn10: false, warn1: false, done: false };
    const tick = () => {
      const el = document.getElementById('exam-timer');
      const live = document.getElementById('exam-announce');
      if (!el) { stopExamTimer(); return; }
      const now = Date.now();
      const info = timerInfo(exam, now);
      const say = msg => { if (live) live.textContent = msg; };
      el.classList.remove('timer-warn', 'timer-over');
      if (info.limitMs === null) {
        el.textContent = 'Berjalan ' + clock(info.elapsedMs) + ' · tanpa batas waktu';
      } else if (info.remainingMs > 0) {
        el.textContent = 'Sisa waktu ' + clock(info.remainingMs);
        if (info.remainingMs <= 600000) el.classList.add('timer-warn');
        if (!seen.warn10 && info.remainingMs <= 600000) { seen.warn10 = true; say('Sisa 10 menit.'); }
        if (!seen.warn1 && info.remainingMs <= 60000) { seen.warn1 = true; say('Sisa 1 menit.'); }
      } else {
        el.textContent = 'Waktu habis. Kamu masih bisa mengumpulkan.';
        el.classList.add('timer-over');
        if (!seen.done) { seen.done = true; say('Waktu habis. Kamu masih bisa mengumpulkan.'); }
      }
      const mark = Math.floor(info.elapsedMs / 300000);
      if (mark > seen.five) {
        seen.five = mark;
        if (mark > 0) say('Sudah berjalan ' + mark * 5 + ' menit.' + (info.remainingMs > 0 ? ' Sisa ' + Math.ceil(info.remainingMs / 60000) + ' menit.' : ''));
      }
    };
    tick();
    examTimer = setInterval(tick, 1000);
  }

  /* ----- views ----- */
  function homeView() {
    const resume = state.last ? '<p><a class="button secondary" href="' + esc(state.last) + '">Lanjutkan dari terakhir</a></p>' : '';
    const legacy = legacyRaw ? '<section class="callout warning legacy-notice" role="region" aria-label="Data versi lama"><strong>Data versi lama ditemukan</strong>' +
      '<p>Jawaban dari versi sebelumnya masih ada di browser ini dan tidak dipakai lagi. Unduh dulu jika masih dibutuhkan.</p>' +
      '<div class="control-row"><button type="button" class="button secondary" data-action="legacy-export">Unduh jawaban lama (.txt)</button>' +
      '<button type="button" class="button ghost" data-action="legacy-delete">Hapus data lama</button></div></section>' : '';
    const date = state.quizDate;
    const dateBlock = '<section class="panel quiz-date" aria-labelledby="quiz-date-title"><h2 id="quiz-date-title">Tanggal kuis</h2>' +
      '<p class="muted">Tanggal belum pasti? Kosongkan saja. Hitung mundur hanya muncul jika tanggal sudah diisi.</p>' +
      '<div class="control-row"><label for="quiz-date">Tanggal kuis</label><input id="quiz-date" type="date" value="' + esc(date || '') + '" data-quiz-date></div>' +
      '<p class="countdown" id="countdown" aria-live="polite">' + esc(date ? longDate(date) + ' · ' + countdownText(daysUntil(date)) : 'Hitung mundur belum aktif.') + '</p>' +
      '<button type="button" class="button ghost" data-action="quiz-date-clear" id="quiz-date-clear"' + (date ? '' : ' hidden') + '>Hapus tanggal</button></section>';
    const plan = '<section class="panel" aria-labelledby="plan-title"><h2 id="plan-title">Rencana belajar</h2>' +
      '<p class="muted">Urutannya saja, tanpa tanggal. Centang bila sudah selesai. Tersimpan di perangkat ini.</p><ol class="plan-list">' +
      PLAN_STEPS.map(step => '<li class="plan-step"><label><input type="checkbox" data-plan="' + esc(step.key) + '"' + (state.plan[step.key] ? ' checked' : '') + '><span><strong>' + esc(step.title) + '</strong> · ' + esc(step.text) + '</span></label>' +
        '<span class="plan-links">' + (step.mock ? '<a href="#/ujian">Buka mock quiz</a>' : step.topics.map(tid => '<a href="#/t/' + tid + '">Buka ' + esc(tid.toUpperCase()) + '</a>').join(' · ')) + '</span></li>').join('') +
      '</ol></section>';
    const cards = topics.map(t => {
      const p = topicProgress(t, state);
      return '<a class="topic-card card" href="#/t/' + esc(t.id) + '"><span class="badge">Topik ' + t.number + '</span><h2>' + esc(t.title) + '</h2>' +
        '<p>' + esc(t.summary) + '</p>' +
        '<div class="progress-track" aria-hidden="true"><span style="width:' + (p.sectionsTotal ? 100 * p.sectionsDone / p.sectionsTotal : 0) + '%"></span></div>' +
        '<span class="muted">' + p.sectionsDone + ' dari ' + p.sectionsTotal + ' bagian · ' + p.drillsDone + ' dari ' + p.drillsTotal + ' latihan</span><span class="card-foot">Buka topik →</span></a>';
    }).join('');
    return '<section class="hero"><p class="eyebrow">KKA · Persiapan kuis</p><h1>Enam topik kuis, satu bagian kecil dalam satu waktu.</h1>' +
      '<p class="lead">Urutannya sama dengan urutan kuis: DFS, UCS, Greedy, A*, Hill Climbing, lalu Alpha-Beta. Setiap topik punya intuisi, aturan kuliah, contoh langkah demi langkah, cara menulis esai, latihan interaktif, dan cek cepat.</p>' + resume +
      '<div class="control-row"><a class="button" href="#/ujian">Mock quiz</a><a class="button secondary" href="#/ringkasan">Ringkasan</a><a class="button secondary" href="#/progres">Progres</a></div></section>' +
      legacy + (storageOK ? '' : '<p class="feedback error">Penyimpanan di browser ini belum tersedia. Gunakan Ekspor sebelum menutup halaman.</p>') +
      dateBlock + plan +
      '<h2>Topik kuis</h2><div class="card-grid">' + cards + '</div>';
  }

  function topicView(topic) {
    const p = topicProgress(topic, state);
    const next = topic.sections.find(s => !sectionDone(s, state)) || topic.sections[0];
    const sections = '<ol class="section-list">' + topic.sections.map(s => {
      const done = sectionDone(s, state);
      return '<li><a href="#/t/' + esc(topic.id) + '/' + esc(s.id) + '">' + esc(s.title) + '</a> <span class="badge">' + esc(KIND_LABEL[s.kind] || s.kind) + '</span> <span class="badge' + (done ? ' done' : '') + '">' + (done ? '✓ Selesai' : 'Belum') + '</span></li>';
    }).join('') + '</ol>';
    const sources = topic.sources && topic.sources.length ? '<h2>Sumber</h2><div class="source-grid">' + topic.sources.map(sourceHTML).join('') + '</div>' : '';
    return breadcrumb([{ href: '#/', label: 'Beranda' }, { label: 'Topik ' + topic.number }]) +
      '<p class="kicker">Topik ' + topic.number + ' dari ' + topics.length + ' · urutan kuis</p>' +
      '<h1>' + esc(topic.title) + '</h1><p class="lead">' + esc(topic.summary) + '</p>' +
      '<section class="panel"><h2>Tujuan belajar</h2>' + listHTML(topic.goals || []) +
      '<div class="control-row"><a class="button" href="#/t/' + esc(topic.id) + '/' + esc(next.id) + '">' + (p.sectionsDone ? 'Lanjutkan belajar' : 'Mulai') + '</a>' +
      '<a class="button secondary" href="#/t/' + esc(topic.id) + '/esai">Latihan esai</a><a class="button ghost" href="#/ujian">Mock quiz</a></div>' +
      '<p class="muted">Bagian selesai: ' + p.sectionsDone + ' dari ' + p.sectionsTotal + ' · cek terjawab: ' + p.checksSolved + ' dari ' + p.checksTotal + ' · latihan selesai: ' + p.drillsDone + ' dari ' + p.drillsTotal + '</p>' +
      '<div class="progress-track" role="progressbar" aria-label="Progres topik ' + topic.number + '" aria-valuemin="0" aria-valuemax="' + p.sectionsTotal + '" aria-valuenow="' + p.sectionsDone + '"><span style="width:' + (100 * p.sectionsDone / p.sectionsTotal) + '%"></span></div></section>' +
      '<h2>Bagian</h2>' + sections + sources;
  }

  function sectionView(topic, section) {
    const idx = topic.sections.indexOf(section);
    const prev = idx > 0 ? topic.sections[idx - 1] : null;
    const next = idx < topic.sections.length - 1 ? topic.sections[idx + 1] : null;
    const done = sectionDone(section, state);
    const p = topicProgress(topic, state);
    const footerPrev = prev ? '<a class="button secondary" href="#/t/' + esc(topic.id) + '/' + esc(prev.id) + '">← ' + esc(prev.title) + '</a>' : '<a class="button secondary" href="#/t/' + esc(topic.id) + '">← Ringkasan topik</a>';
    const footerNext = next ? '<a class="button" href="#/t/' + esc(topic.id) + '/' + esc(next.id) + '">' + esc(next.title) + ' →</a>'
      : (topic.number < topics.length ? '<a class="button" href="#/t/t' + (topic.number + 1) + '">Topik berikutnya →</a>' : '<a class="button" href="#/ujian">Mock quiz →</a>');
    const markBtn = !section.checks.length ? '<div class="control-row"><button type="button" class="button ' + (done ? '' : 'secondary') + '" data-action="mark-done" data-sid="' + esc(section.id) + '" aria-pressed="' + done + '">' + (done ? '✓ Sudah ditandai' : 'Tandai selesai') + '</button></div>' : '';
    const essayLink = section.kind === 'latihan' || section.kind === 'menulis' ? '<p><a class="button secondary" href="#/t/' + esc(topic.id) + '/esai">Latihan esai topik ini →</a></p>' : '';
    return breadcrumb([{ href: '#/', label: 'Beranda' }, { href: '#/t/' + topic.id, label: 'Topik ' + topic.number }]) +
      '<p class="kicker section-kicker">' + esc(KIND_LABEL[section.kind] || section.kind) + ' · Bagian ' + (idx + 1) + ' dari ' + topic.sections.length + '</p>' +
      '<h1>' + esc(section.title) + '</h1>' +
      section.blocks.map(b => blockHTML(b)).join('') +
      markBtn + essayLink +
      checksHTML(section) +
      '<nav class="section-footer" aria-label="Bagian">' + footerPrev + footerNext + '</nav>' +
      '<p class="lecture-progress">Progres topik ini: ' + p.sectionsDone + ' dari ' + p.sectionsTotal + ' bagian selesai.</p>';
  }

  function essayFigure(essay) {
    return essay.figure ? widgetSlot(essay.figure.widget, essay.figure.props, '') : '';
  }
  function practiceEssayHTML(topic, essay, index) {
    const rec = state.essays[essay.id] || { draft: '', revealed: false, rubric: essay.rubric.map(() => false), assessment: '' };
    const rubricPart = essay.rubric.map((r, i) => '<label class="rubric-item"><input type="checkbox" data-rubric data-eid="' + esc(essay.id) + '" data-index="' + i + '"' + (rec.rubric[i] ? ' checked' : '') + '><span>' + esc(r.text) + ' <span class="muted">(' + r.points + ' poin)</span></span></label>').join('');
    const score = rubricScore(essay, rec.rubric);
    const review = rec.revealed ? '<div class="feedback"><strong>Pembahasan rujukan</strong>' + (essay.solutionBlocks ? essay.solutionBlocks.map(b => blockHTML(b)).join('') : txt(essay.solution || '')) + '</div>' +
      '<div class="rubric"><h3>Periksa jawabanmu</h3><p class="muted">Ini penilaian diri, bukan nilai otomatis.</p>' + rubricPart +
      '<p><strong>Skor rubrik: <span data-essay-score="' + esc(essay.id) + '">' + score + '</span> dari 100</strong></p>' +
      '<label for="assess-' + esc(essay.id) + '">Penilaian diri</label><select id="assess-' + esc(essay.id) + '" data-assessment data-eid="' + esc(essay.id) + '"><option value="">Pilih setelah memeriksa</option><option value="mastered"' + (rec.assessment === 'mastered' ? ' selected' : '') + '>Sudah paham</option><option value="review"' + (rec.assessment === 'review' ? ' selected' : '') + '>Perlu ditinjau</option></select></div>'
      : '<p class="muted">Pembahasan tersedia setelah kamu menulis jawaban.</p>';
    return '<article class="essay-card" id="essay-' + esc(essay.id) + '"><h2>Esai ' + (index + 1) + ': ' + esc(essay.title) + '</h2>' +
      '<p class="muted">' + esc(essay.minutes) + ' menit · ' + esc(essay.source) + '</p>' + essayFigure(essay) + txt(essay.prompt) +
      '<label for="draft-' + esc(essay.id) + '"><strong>Jawabanmu</strong></label>' +
      '<textarea id="draft-' + esc(essay.id) + '" maxlength="' + MAX_DRAFT + '" data-draft data-eid="' + esc(essay.id) + '" placeholder="Tulis langkah dan alasanmu dulu.">' + esc(rec.draft) + '</textarea>' +
      (rec.revealed ? '<p class="muted">Pembahasan sudah terbuka.</p>' : '<button type="button" class="button secondary" data-action="reveal-essay" data-eid="' + esc(essay.id) + '"' + (rec.draft.trim() ? '' : ' disabled') + '>Simpan & buka pembahasan</button>') +
      review + '</article>';
  }
  function essaysView(topic) {
    const practice = topic.essays.filter(e => !e.exam);
    const exam = topic.essays.filter(e => e.exam);
    return breadcrumb([{ href: '#/', label: 'Beranda' }, { href: '#/t/' + topic.id, label: 'Topik ' + topic.number }, { label: 'Latihan esai' }]) +
      '<p class="kicker">Latihan esai · Topik ' + topic.number + '</p><h1>Esai ' + esc(topic.short) + '</h1>' +
      '<p class="lead">Tulis jawaban dulu, lalu buka pembahasan dan periksa dengan rubrik.</p>' +
      practice.map((e, i) => practiceEssayHTML(topic, e, i)).join('') +
      '<details class="slide-ref"><summary>Soal mock quiz (buka setelah mencoba ujian)</summary>' +
      '<p class="muted">Soal ini dipakai di mock quiz. Kerjakan di mode ujian agar ada batas waktu dan lembar cetak.</p>' +
      exam.map(e => '<article class="essay-card"><h3>' + esc(e.title) + ' · Set ' + esc(e.set) + '</h3>' + txt(e.prompt) + '</article>').join('') +
      '<p><a class="button secondary" href="#/ujian">Buka mock quiz</a></p></details>';
  }

  /* ----- mock quiz ----- */
  function examSetupView() {
    const active = activeExam();
    const rows = topics.map(t => {
      const a = t.essays.find(e => e.exam && e.set === 'A');
      const b = t.essays.find(e => e.exam && e.set === 'B');
      return '<tr><td>' + esc(t.number + '. ' + t.short) + '</td><td class="pre-line">' + esc(a ? a.title : '-') + '</td><td class="pre-line">' + esc(b ? b.title : '-') + '</td></tr>';
    }).join('');
    const history = state.exams.slice().reverse();
    const historyHTML = history.length ? '<ul class="review-list">' + history.map(ex => {
      const score = examScore(ex, essays);
      return '<li><a href="#/ujian/' + esc(ex.id) + '">' + esc(stampTime(ex.startedAt)) + ' · Set ' + esc(ex.set) + ' · ' + (ex.durationMin ? ex.durationMin + ' menit' : 'tanpa batas') + '</a> · ' +
        (ex.submittedAt ? 'skor ' + score.total + ' dari ' + score.max + ' (' + score.percent + '%)' : '<span class="badge">belum dikumpulkan</span>') + '</li>';
    }).join('') + '</ul>' : '<p>Belum ada riwayat ujian.</p>';
    const start = active
      ? '<section class="callout warning"><strong>Ujian masih berjalan</strong><p>Selesaikan dulu ujian yang sedang berjalan sebelum memulai yang baru.</p><a class="button" href="#/ujian/' + esc(active.id) + '">Lanjutkan ujian</a></section>'
      : '<div class="panel exam-setup" data-exam-setup>' +
        '<fieldset><legend>Set soal</legend>' +
        '<label class="choice"><input type="radio" name="exam-set" value="A" checked><span>Set A (x1 tiap topik)</span></label>' +
        '<label class="choice"><input type="radio" name="exam-set" value="B"><span>Set B (x2 tiap topik)</span></label>' +
        '<label class="choice"><input type="radio" name="exam-set" value="acak"><span>Acak (A atau B per topik)</span></label></fieldset>' +
        '<fieldset><legend>Waktu</legend>' +
        '<label class="choice"><input type="radio" name="exam-duration" value="0" checked><span>Tanpa batas</span></label>' +
        '<label class="choice"><input type="radio" name="exam-duration" value="60"><span>60 menit</span></label>' +
        '<label class="choice"><input type="radio" name="exam-duration" value="90"><span>90 menit</span></label>' +
        '<label class="choice"><input type="radio" name="exam-duration" value="120"><span>120 menit</span></label></fieldset>' +
        '<div class="control-row"><button type="button" class="button" data-action="exam-start">Mulai ujian</button></div></div>';
    return breadcrumb([{ href: '#/', label: 'Beranda' }, { label: 'Mock quiz' }]) +
      '<p class="kicker">Mock quiz</p><h1>Mock quiz enam esai</h1>' +
      '<p class="lead">Satu esai per topik, sesuai urutan kuis. Jawaban disimpan otomatis. Setelah dikumpulkan, kamu bisa memeriksa dengan pembahasan dan rubrik.</p>' +
      start +
      '<section class="panel"><h2>Isi tiap set</h2><div class="table-wrap"><table class="data-table"><thead><tr><th scope="col">Topik</th><th scope="col">Set A</th><th scope="col">Set B</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>' +
      '<section class="panel"><h2>Riwayat (10 terakhir)</h2>' + historyHTML + '</section>';
  }
  function examEssayHTML(eid, index, exam) {
    const essay = essays.get(eid);
    const topic = topics.find(t => t.essays.some(e => e.id === eid));
    if (!essay) return '';
    const value = exam.answers[eid] || '';
    return '<article class="essay-card exam-essay" id="exam-' + esc(eid) + '"><h2>Soal ' + (index + 1) + ' · ' + esc(topic ? topic.short : '') + '</h2>' +
      '<p class="muted">' + esc(essay.title) + ' · ' + esc(essay.minutes) + ' menit</p>' + essayFigure(essay) + txt(essay.prompt) +
      '<label for="ans-' + esc(eid) + '"><strong>Jawabanmu</strong></label>' +
      '<textarea id="ans-' + esc(eid) + '" class="exam-answer" maxlength="' + MAX_DRAFT + '" data-exam-answer data-eid="' + esc(eid) + '">' + esc(value) + '</textarea></article>';
  }
  function examAttemptHTML(exam) {
    const setLabel = exam.set === 'acak' ? 'Acak' : exam.set;
    return breadcrumb([{ href: '#/', label: 'Beranda' }, { href: '#/ujian', label: 'Mock quiz' }, { label: 'Set ' + setLabel }]) +
      '<p class="kicker">Mock quiz · Set ' + esc(setLabel) + '</p><h1>Ujian berjalan</h1>' +
      '<div class="exam-bar"><p class="exam-timer" role="timer" id="exam-timer" aria-label="Sisa waktu"></p>' +
      '<p class="muted">' + (exam.durationMin ? exam.durationMin + ' menit' : 'Tanpa batas waktu') + ' · dimulai ' + esc(stampTime(exam.startedAt)) + '</p></div>' +
      '<p class="sr-only" id="exam-announce" aria-live="polite"></p>' +
      '<div class="control-row no-print"><button type="button" class="button secondary" data-action="exam-print">Cetak lembar</button>' +
      '<button type="button" class="button" data-action="exam-submit">Kumpulkan ujian</button></div>' +
      '<div class="exam-sheet"><h2 class="sheet-title">Lembar ujian · Set ' + esc(setLabel) + '</h2>' +
      '<p class="muted sheet-meta">Nama: ____________________ &nbsp; Tanggal: ____________</p>' +
      exam.picks.map((eid, i) => examEssayHTML(eid, i, exam)).join('') + '</div>';
  }
  function examReviewEssayHTML(eid, index, exam, score) {
    const essay = essays.get(eid);
    const topic = topics.find(t => t.essays.some(e => e.id === eid));
    if (!essay) return '';
    const checked = exam.rubric[eid] || essay.rubric.map(() => false);
    const answer = exam.answers[eid] || '';
    return '<article class="essay-card" id="review-' + esc(eid) + '"><h2>Soal ' + (index + 1) + ' · ' + esc(topic ? topic.short : '') + ': <span data-essay-score="' + esc(eid) + '">' + score + '</span>/100</h2>' +
      '<p class="muted">' + esc(essay.title) + ' · ' + esc(essay.source) + '</p>' +
      '<h3>Jawabanmu</h3><div class="answer-box pre-line">' + esc(answer || '(kosong)') + '</div>' +
      '<details class="slide-ref"><summary>Pembahasan rujukan</summary>' + (essay.solutionBlocks ? essay.solutionBlocks.map(b => blockHTML(b)).join('') : txt(essay.solution || '')) + '</details>' +
      '<div class="rubric"><h3>Rubrik (penilaian diri)</h3>' +
      essay.rubric.map((r, i) => '<label class="rubric-item"><input type="checkbox" data-exam-rubric data-eid="' + esc(eid) + '" data-index="' + i + '"' + (checked[i] ? ' checked' : '') + '><span>' + esc(r.text) + ' <span class="muted">(' + r.points + ' poin)</span></span></label>').join('') +
      '</div></article>';
  }
  function examReviewHTML(exam) {
    const res = examScore(exam, essays);
    const setLabel = exam.set === 'acak' ? 'Acak' : exam.set;
    return breadcrumb([{ href: '#/', label: 'Beranda' }, { href: '#/ujian', label: 'Mock quiz' }, { label: 'Hasil' }]) +
      '<p class="kicker">Hasil mock quiz · Set ' + esc(setLabel) + '</p><h1>Pembahasan ujian</h1>' +
      '<section class="panel" aria-live="polite"><h2>Skor total: <span data-total>' + res.total + '</span> dari <span data-max>' + res.max + '</span> (<span data-percent>' + res.percent + '</span>%)</h2>' +
      '<p class="muted">Dikumpulkan ' + esc(stampTime(exam.submittedAt)) + '. Skor ini penilaian diri dengan rubrik, bukan nilai otomatis.</p>' +
      '<div class="control-row"><a class="button" href="#/ujian">Mulai ujian baru</a><button type="button" class="button secondary" data-action="export">Ekspor jawaban (.txt)</button>' +
      '<button type="button" class="button ghost" data-action="exam-print">Cetak</button></div></section>' +
      exam.picks.map((eid, i) => examReviewEssayHTML(eid, i, exam, res.perEssay[i].score)).join('');
  }

  /* ----- summary (cheat sheet) ----- */
  function itemParts(x) {
    if (typeof x === 'string') return { label: '', text: x };
    if (x && typeof x === 'object') return { label: String(x.label || x.title || x.term || ''), text: String(x.text || x.body || x.meaning || x.rule || '') };
    return { label: '', text: String(x == null ? '' : x) };
  }
  function summaryView() {
    if (!cheat) return '<header><p class="eyebrow">Ringkasan</p><h1>Ringkasan belum tersedia</h1><p class="lead">Berkas ringkasan belum dimuat. Muat ulang halaman.</p></header>';
    const cmp = cheat.comparison || { headers: [], rows: [] };
    const rules = Array.isArray(cheat.rules) ? cheat.rules : [];
    const formulas = Array.isArray(cheat.formulas) ? cheat.formulas : [];
    const mistakes = Array.isArray(cheat.mistakes) ? cheat.mistakes : [];
    const checklist = Array.isArray(cheat.checklist) ? cheat.checklist : [];
    const table = (cmp.headers && cmp.rows) ? '<div class="table-wrap"><table class="data-table summary-table"><thead><tr>' + cmp.headers.map(h => '<th scope="col">' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
      cmp.rows.map(r => '<tr>' + r.map(c => '<td class="pre-line">' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' : '';
    const ruleHTML = rules.map(r => {
      const t = topicOf(r.topicId);
      return '<section class="panel" id="rule-' + esc(r.topicId) + '"><h2>' + (t ? '<a href="#/t/' + esc(t.id) + '">' + esc(r.title || t.title) + '</a>' : esc(r.title)) + '</h2>' +
        '<ul>' + (r.items || []).map(i => { const p = itemParts(i); return '<li class="pre-line">' + (p.label ? '<strong>' + esc(p.label) + '</strong> ' : '') + esc(p.text) + '</li>'; }).join('') + '</ul></section>';
    }).join('');
    const listOf = items => '<ul class="plain-list">' + items.map(i => { const p = itemParts(i); return '<li class="pre-line">' + (p.label ? '<strong>' + esc(p.label) + '</strong> ' : '') + esc(p.text) + '</li>'; }).join('') + '</ul>';
    return '<header><p class="eyebrow">Ringkasan</p><h1>Ringkasan kuis</h1><p class="lead">Pembanding algoritma, aturan, rumus, kesalahan umum, dan daftar cek sebelum kuis.</p></header>' +
      (table ? '<section class="panel"><h2>Perbandingan</h2>' + table + '</section>' : '') +
      ruleHTML +
      (formulas.length ? '<section class="panel"><h2>Rumus</h2>' + listOf(formulas) + '</section>' : '') +
      (mistakes.length ? '<section class="panel"><h2>Kesalahan yang sering terjadi</h2>' + listOf(mistakes) + '</section>' : '') +
      (checklist.length ? '<section class="panel"><h2>Daftar cek sebelum menulis</h2><ul class="checklist">' + checklist.map(i => '<li>' + esc(itemParts(i).text) + '</li>').join('') + '</ul></section>' : '') +
      '<section class="panel"><div class="control-row"><button type="button" class="button secondary" data-action="export">Ekspor jawaban (.txt)</button><a class="button ghost" href="#/">Kembali ke beranda</a></div></section>';
  }

  /* ----- progress ----- */
  function progressView() {
    const rows = topics.map(t => {
      const p = topicProgress(t, state);
      return '<tr><td>' + t.number + '. ' + esc(t.short) + '</td><td>' + p.sectionsDone + ' / ' + p.sectionsTotal + '</td><td>' + p.checksSolved + ' / ' + p.checksTotal + '</td><td>' + p.drillsDone + ' / ' + p.drillsTotal + '</td><td>' + p.essaysMastered + ' / ' + p.essaysTotal + '</td></tr>';
    }).join('');
    const review = [];
    for (const t of topics) {
      for (const s of t.sections) {
        const rec = state.sections[s.id];
        if (rec && rec.checks && Object.values(rec.checks).some(c => !c.solved && c.attempts > 0)) review.push('<a href="#/t/' + esc(t.id) + '/' + esc(s.id) + '">Topik ' + t.number + ' · ' + esc(s.title) + '</a>');
      }
      for (const e of t.essays) {
        const rec = state.essays[e.id];
        if (rec && rec.assessment === 'review') review.push('Topik ' + t.number + ' · esai: ' + esc(e.title));
      }
    }
    const exams = state.exams.slice().reverse().map(ex => {
      const score = examScore(ex, essays);
      return '<tr><td>' + esc(stampTime(ex.startedAt)) + '</td><td>' + esc(ex.set) + '</td><td>' + (ex.submittedAt ? score.total + ' / ' + score.max + ' (' + score.percent + '%)' : 'belum dikumpulkan') + '</td></tr>';
    }).join('');
    return '<p class="eyebrow">Progres</p><h1>Progres belajar</h1>' +
      '<p class="lead">Bagian selesai, cek yang sudah benar, latihan yang sudah selesai, dan esai yang sudah dipahami.</p>' +
      '<section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th scope="col">Topik</th><th scope="col">Bagian</th><th scope="col">Cek</th><th scope="col">Latihan</th><th scope="col">Esai paham</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>' +
      '<section class="panel"><h2>Perlu ditinjau</h2>' + (review.length ? '<ul class="review-list">' + review.map(r => '<li>' + r + '</li>').join('') + '</ul>' : '<p>Belum ada bagian yang perlu ditinjau. Jawab cek atau tandai esai untuk mengisi daftar ini.</p>') + '</section>' +
      '<section class="panel"><h2>Riwayat mock quiz</h2>' + (exams ? '<div class="table-wrap"><table class="data-table"><thead><tr><th scope="col">Mulai</th><th scope="col">Set</th><th scope="col">Skor</th></tr></thead><tbody>' + exams + '</tbody></table></div>' : '<p>Belum ada ujian.</p>') + '</section>' +
      '<section class="panel"><div class="control-row"><button type="button" class="button secondary" data-action="export">Ekspor jawaban (.txt)</button><a class="button ghost" href="#/">Kembali ke beranda</a></div></section>';
  }

  /* ----- download and clipboard ----- */
  function download(name, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportAnswers() {
    save();
    download('KKA-kuis-' + stamp(new Date()) + '.txt', exportText(state, topics, new Date()));
    toast('Jawaban diekspor sebagai TXT.');
  }
  function fallbackCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      const ok = typeof document.execCommand === 'function' && document.execCommand('copy');
      ta.remove();
      return !!ok;
    } catch (error) { return false; }
  }
  function copyText(text) {
    try {
      if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) {
        return root.navigator.clipboard.writeText(text).then(() => true, () => fallbackCopy(text));
      }
    } catch (error) { /* fall through */ }
    return Promise.resolve(fallbackCopy(text));
  }

  /* ----- router ----- */
  function renderRoute(focus) {
    save();
    hideToast();
    destroyWidgets();
    stopExamTimer();
    const parsed = parseRoute(location.hash);
    let current = parsed;
    let topic = parsed.tid ? topicOf(parsed.tid) : null;
    let section = topic && parsed.sid ? sectionOf(topic, parsed.sid) : null;
    if ((parsed.tid && !topic) || (parsed.sid && !section)) {
      toast('Halaman itu tidak ada. Kembali ke beranda.');
      current = { view: 'home' }; topic = null; section = null;
    }
    let exam = null;
    if (current.view === 'exam') {
      exam = examOf(current.eid);
      if (!exam) { toast('Ujian itu tidak ditemukan.'); current = { view: 'exam-setup' }; }
    }
    let html;
    switch (current.view) {
      case 'topic': html = topicView(topic); break;
      case 'section': html = sectionView(topic, section); break;
      case 'essays': html = essaysView(topic); break;
      case 'exam-setup': html = examSetupView(); break;
      case 'exam': html = exam.submittedAt ? examReviewHTML(exam) : examAttemptHTML(exam); break;
      case 'summary': html = summaryView(); break;
      case 'progress': html = progressView(); break;
      default: html = homeView();
    }
    main.innerHTML = html;
    view = Object.assign({}, current, { tid: topic ? topic.id : undefined, sid: section ? section.id : undefined });
    if (current.view === 'section') state.last = '#/t/' + topic.id + '/' + section.id;
    else if (current.view === 'topic') state.last = '#/t/' + topic.id;
    else if (current.view === 'essays') state.last = '#/t/' + topic.id + '/esai';
    else if (current.view === 'exam' && !exam.submittedAt) state.last = '#/ujian/' + exam.id;
    else if (current.view === 'exam-setup') state.last = '#/ujian';
    else if (current.view === 'summary') state.last = '#/ringkasan';
    else if (current.view === 'progress') state.last = '#/progres';
    mountWidgets();
    if (current.view === 'exam' && !exam.submittedAt) startExamTimer(exam);
    renderSidebar(view);
    closeNav();
    const titles = {
      home: 'Beranda', topic: topic && topic.title, section: section && section.title, essays: topic && 'Esai ' + topic.short,
      'exam-setup': 'Mock quiz', exam: 'Mock quiz', summary: 'Ringkasan', progress: 'Progres'
    };
    document.title = (titles[current.view] || 'Beranda') + ' · KKA Kuis';
    if (focus !== false) { main.focus({ preventScroll: true }); root.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'instant' }); }
    queueSave();
  }
  function closeNav() {
    document.body.classList.remove('nav-open');
    document.getElementById('nav-toggle').setAttribute('aria-expanded', 'false');
  }

  /* ----- events ----- */
  function essayRec(eid) {
    if (!state.essays[eid]) {
      const essay = essays.get(eid);
      state.essays[eid] = { draft: '', revealed: false, rubric: essay ? essay.rubric.map(() => false) : [], assessment: '' };
    }
    return state.essays[eid];
  }

  main.addEventListener('submit', event => {
    const form = event.target;
    event.preventDefault();
    if (!form.hasAttribute('data-check')) return;
    const sec = sectionOfId(form.dataset.sid);
    if (!sec) return;
    const q = sec.section.checks.find(c => c.id === form.dataset.qid);
    if (!q) return;
    let value;
    if (q.type === 'mcq') {
      const picked = form.querySelector('input[type="radio"]:checked');
      if (!picked) { toast('Pilih satu jawaban terlebih dahulu.'); return; }
      value = Number(picked.value);
    } else {
      value = form.querySelector('input[type="text"]').value.trim();
      if (!value) { toast('Tulis jawabanmu terlebih dahulu.'); return; }
    }
    const correct = checkAnswer(q, value);
    const wasDone = sectionDone(sec.section, state);
    const secRec = state.sections[sec.section.id] || (state.sections[sec.section.id] = { done: false, checks: {} });
    const prev = secRec.checks[q.id];
    secRec.checks[q.id] = { choice: value, correct, solved: !!(prev && prev.solved) || correct, attempts: (prev ? prev.attempts : 0) + 1 };
    const nowDone = sectionDone(sec.section, state);
    const tmp = document.createElement('div');
    tmp.innerHTML = checkFormHTML(sec.section, q);
    form.replaceWith(tmp.firstElementChild);
    const fb = main.querySelector('[data-check][data-qid="' + q.id + '"] [data-feedback]');
    if (fb) fb.focus({ preventScroll: true });
    renderSidebar(view);
    queueSave();
    if (nowDone && !wasDone) toast('Bagian ini sudah selesai.');
  });
  function sectionOfId(sid) {
    for (const t of topics) { const s = t.sections.find(x => x.id === sid); if (s) return { section: s, topic: t }; }
    return null;
  }

  main.addEventListener('change', event => {
    const el = event.target;
    if (el.hasAttribute('data-plan')) {
      state.plan[el.dataset.plan] = el.checked === true;
      queueSave();
      return;
    }
    if (el.hasAttribute('data-quiz-date')) {
      state.quizDate = normalizeQuizDate(el.value);
      const countdown = document.getElementById('countdown');
      if (countdown) countdown.textContent = state.quizDate ? longDate(state.quizDate) + ' · ' + countdownText(daysUntil(state.quizDate)) : 'Hitung mundur belum aktif.';
      const clear = document.getElementById('quiz-date-clear');
      if (clear) clear.hidden = !state.quizDate;
      queueSave();
      return;
    }
    if (el.hasAttribute('data-rubric')) {
      const eid = el.dataset.eid;
      const essay = essays.get(eid);
      if (!essay) return;
      const rec = essayRec(eid);
      rec.rubric[Number(el.dataset.index)] = el.checked;
      const scoreEl = main.querySelector('[data-essay-score="' + eid + '"]');
      if (scoreEl) scoreEl.textContent = rubricScore(essay, rec.rubric);
      queueSave();
      return;
    }
    if (el.hasAttribute('data-exam-rubric')) {
      const exam = examOf(view.eid);
      const eid = el.dataset.eid;
      const essay = essays.get(eid);
      if (!exam || !essay) return;
      if (!exam.rubric[eid]) exam.rubric[eid] = essay.rubric.map(() => false);
      exam.rubric[eid][Number(el.dataset.index)] = el.checked;
      const res = examScore(exam, essays);
      const sc = main.querySelector('[data-essay-score="' + eid + '"]');
      if (sc) sc.textContent = rubricScore(essay, exam.rubric[eid]);
      const total = main.querySelector('[data-total]'), percent = main.querySelector('[data-percent]');
      if (total) total.textContent = res.total;
      if (percent) percent.textContent = res.percent;
      queueSave();
      return;
    }
    if (el.hasAttribute('data-assessment')) {
      const eid = el.dataset.eid;
      if (!essays.has(eid)) return;
      essayRec(eid).assessment = el.value === 'mastered' || el.value === 'review' ? el.value : '';
      queueSave();
    }
  });

  main.addEventListener('input', event => {
    const el = event.target;
    if (el.hasAttribute('data-draft')) {
      const eid = el.dataset.eid;
      if (!essays.has(eid)) return;
      const rec = essayRec(eid);
      rec.draft = el.value.slice(0, MAX_DRAFT);
      if (rec.assessment === 'mastered') rec.assessment = '';
      const btn = el.parentElement.querySelector('[data-action="reveal-essay"]');
      if (btn && !rec.revealed) btn.disabled = !rec.draft.trim();
      queueSave();
      return;
    }
    if (el.hasAttribute('data-exam-answer')) {
      const exam = examOf(view.eid);
      if (!exam || exam.submittedAt || !exam.picks.includes(el.dataset.eid)) return;
      exam.answers[el.dataset.eid] = el.value.slice(0, MAX_DRAFT);
      queueSave();
    }
  });

  function submitExam(exam) {
    if (!root.confirm('Kumpulkan ujian ini? Setelah dikumpulkan, jawaban tidak bisa diubah lagi.')) return;
    exam.submittedAt = Date.now();
    save();
    renderRoute(true);
    toast('Ujian dikumpulkan. Periksa pembahasan dan rubriknya.');
  }

  main.addEventListener('click', event => {
    const el = event.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'export') { exportAnswers(); return; }
    if (action === 'mark-done') {
      const sid = el.dataset.sid;
      const sec = state.sections[sid] || (state.sections[sid] = { done: false, checks: {} });
      sec.done = !sec.done;
      el.classList.toggle('secondary', !sec.done);
      el.setAttribute('aria-pressed', String(sec.done));
      el.textContent = sec.done ? '✓ Sudah ditandai' : 'Tandai selesai';
      renderSidebar(view);
      queueSave();
      toast(sec.done ? 'Bagian ditandai selesai.' : 'Tanda dihapus.');
      return;
    }
    if (action === 'open-slide') { openSlide(Number(el.dataset.lecture), Number(el.dataset.slide)); return; }
    if (action === 'copy-template') {
      const pre = el.closest('.template') ? el.closest('.template').querySelector('pre') : null;
      const text = pre ? pre.textContent : '';
      copyText(text).then(ok => toast(ok ? 'Template disalin.' : 'Gagal menyalin. Pilih teks lalu salin manual.'));
      return;
    }
    if (action === 'reveal-essay') {
      const eid = el.dataset.eid;
      if (!essays.has(eid)) return;
      const rec = essayRec(eid);
      if (!rec.draft.trim()) { toast('Tuliskan jawabanmu terlebih dahulu.'); return; }
      rec.revealed = true;
      save();
      renderRoute(false);
      toast('Draf disimpan; pembahasan dibuka.');
      return;
    }
    if (action === 'quiz-date-clear') {
      state.quizDate = null;
      queueSave();
      renderRoute(false);
      toast('Tanggal kuis dihapus.');
      return;
    }
    if (action === 'exam-start') {
      if (activeExam()) { toast('Selesaikan ujian yang sedang berjalan dulu.'); return; }
      const setInput = document.querySelector('input[name="exam-set"]:checked');
      const durInput = document.querySelector('input[name="exam-duration"]:checked');
      const set = setInput ? setInput.value : 'A';
      const durationMin = durInput ? Number(durInput.value) : 0;
      const picks = examPicks(topics, set);
      if (picks.length !== topics.length) { toast('Soal ujian belum lengkap.'); return; }
      const now = Date.now();
      const exam = { id: 'u' + now, set, picks, startedAt: now, durationMin: DURATIONS.includes(durationMin) ? durationMin : 0, answers: {}, submittedAt: null, rubric: {} };
      state.exams.push(exam);
      state.exams = state.exams.slice(-MAX_EXAMS);
      save();
      location.hash = '#/ujian/' + exam.id;
      return;
    }
    if (action === 'exam-submit') {
      const exam = examOf(view.eid);
      if (exam && !exam.submittedAt) submitExam(exam);
      return;
    }
    if (action === 'exam-print') {
      if (main.querySelector('.exam-sheet')) document.body.classList.add('printing-exam');
      root.print();
      return;
    }
    if (action === 'legacy-export') { download('KKA-jawaban-lama-v2.txt', legacyText(legacyRaw, new Date())); return; }
    if (action === 'legacy-delete') {
      if (!root.confirm('Hapus data lama dari versi 2? Unduh dulu jika masih dibutuhkan.')) return;
      try { root.localStorage.removeItem(LEGACY_KEY); } catch (error) { /* blocked storage: nothing to remove */ }
      legacyRaw = null;
      renderRoute(false);
      toast('Data lama dihapus.');
    }
  });

  /* Broken slide images fall back to a text note and a link to the PDF. */
  main.addEventListener('error', event => {
    const img = event.target;
    if (!img.matches || !img.matches('img[data-slide-img]')) return;
    const note = img.parentElement && img.parentElement.querySelector('.slide-missing');
    img.hidden = true;
    if (note) note.hidden = false;
  }, true);

  document.getElementById('export-answers').addEventListener('click', exportAnswers);
  document.getElementById('nav-toggle').addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    document.getElementById('nav-toggle').setAttribute('aria-expanded', String(open));
    if (open) { const first = document.querySelector('#topic-nav a'); if (first) first.focus({ preventScroll: true }); }
  });
  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'nav-backdrop';
  backdrop.setAttribute('aria-label', 'Tutup menu topik');
  backdrop.addEventListener('click', closeNav);
  document.body.appendChild(backdrop);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('nav-open')) {
      closeNav();
      document.getElementById('nav-toggle').focus();
    }
  });
  root.addEventListener('afterprint', () => document.body.classList.remove('printing-exam'));
  root.addEventListener('hashchange', () => renderRoute(true));
  root.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  renderRoute(false);
})(typeof window !== 'undefined' ? window : globalThis);
