# Kontrak data bersama (salinan PART 3)

Salinan dari PLAN2.md PART 3. Tambahan di bagian akhir berasal dari keputusan W3 (tanggal kuis dan rencana belajar).

## Bagian 3 — Kontrak data bersama (exact)

The UMD pattern is unchanged: every file works with `require` in Node and sets a global in the browser.

### 3.1 Script order (index.html)
```
algorithms.js → cases.js → widgets-core.js → widgets-drill.js → content/cheatsheet.js →
content/t1.js … content/t6.js → app.js        (CSS: styles.css, widgets.css)
```
Use `?v=3` on every asset.

### 3.2 Globals
`window.KKAAlgorithms`, `window.KKA_CASES`, `window.KKAWidgets`, `window.KKA_TOPICS` (an array; content files push into it; the app sorts by `number`), `window.KKA_CHEATSHEET`. `app.js` exports its pure functions through `module.exports`.

### 3.3 Topic, Section, Block, Question, Essay
```js
Topic = { id:'t1', number:1, slug:'dfs', title:'DFS Graph Search', short:'DFS',
  summary:'2–3 kalimat', goals:[3–5 strings],
  sources:[{label:'Lecture 2 slide 33', lecture:2, slide:33} | {label:'Notebook 01_materi_uniformed_search §10', notebook:'01_materi_uniformed_search'}],
  sections:[6 × Section],                // kinds in order: intuisi, aturan, contoh, menulis, latihan, cek
  essays:[3 practice {exam:false} + 2 exam {exam:true, set:'A'|'B'}] }
Section = { id:'t1-s1'..'t1-s6', kind, title, blocks:[Block], checks:[Question] /* s6: 6–8, others 0–3 */ }
Block = {type:'text',text} | {type:'intuition',text} | {type:'list',items,ordered?} | {type:'definition',term,text}
 | {type:'formula',text} | {type:'table',caption?,headers,rows} | {type:'pseudocode',title?,lines}
 | {type:'note',text} | {type:'warning',text} | {type:'example',title,text}
 | {type:'slide', lecture:2|3|4|5, slide:N, caption}           // NEW: lecture required
 | {type:'template', title, text}                               // NEW: monospace answer template + "Salin" button
 | {type:'widget', widget, props, caption?}
Question = {id:'t1-s6-c1', type:'mcq', prompt, options[2–5], answer:index, explanation, source?}
         | {id, type:'input', prompt, answer:'17', accept?:[...], explanation, source?}
Essay = { id:'t1-e1'|'t1-x1', title, exam:boolean, set?:'A'|'B', variant:boolean, source:'string',
  minutes:15|20, prompt:'plain text', figure?:{widget, props},
  solution:'plain text model answer', solutionBlocks?:[Block], rubric:[{text, points}] /* points sum = 100 */ }
```
- All content strings are plain text with no HTML; `\n` is allowed.
- ID patterns: `t[1-6]`, `t[1-6]-s[1-6]`, `t[1-6]-s[1-6]-c[0-9]+`, `t[1-6]-e[1-3]`, `t[1-6]-x[1-2]`, drill ids `t[1-6]-d[0-9]+`.
- Set A uses `x1`; Set B uses `x2`.
- Slide image path: `slides/L{lecture}-{NN}.jpg`.
- PDF map in app.js: `{2:'Lecture 2 -- Uninformed Search.pdf', 3:'SP14 CS188 Lecture 3 -- Informed Search.pdf', 4:'06-local-search.pdf', 5:'8. Adversarial Search.pdf'}`, linked as `'../'+encodeURIComponent(pdf)+'#page='+n`.

### 3.4 Engine API (W1)
```
runSearch({graph,start,goal,heuristic,mode,treeSearch=false,maxExpansions=1000})   // unchanged
formatFrontier(entries, mode) -> string
   dfs|ucs: 'X(g=3)'; greedy: 'X(h=7)'; astar: 'X(g=3,h=8,f=11)'; joined with '; '; empty -> '(kosong)'
   dfs entries are listed TOP of stack first; others in priority then FIFO order
traceTable(result, mode) -> { mode, rows:[Row], path, cost, costTerms:[edge costs along path], expanded, expansionOrder }
   Row = { iteration (1-based, valid pops only), selected, g, h (null for dfs/ucs), f (astar only, else null),
           action:'expand'|'goal', frontier:[{state,g,h,f}], frontierText,
           updates:[{state, previousG, newG, previousParent, newParent, reopened:boolean}]  // only previousG !== null
           skippedAfter:[{state, g}] }   // stale (ucs/astar) or closed (dfs) pops after this row, before the next
applyVariant(problem, variant) -> deep-copied problem with isVariant:true, title += ' · ' + label
   variant: string id (looked up in problem.variants) or object {label?, h?:{S:n}, hAll?:number, edges?:[[from,to,cost]], cities?:{A:[x,y]}, leaves?:{id:value}}
consistencyViolations(graph, h) -> [{from,to,hFrom,cost,hTo,limit}]     // graph order, h(from) > cost + h(to)
trueCosts(graph, goal) -> {state: cheapest cost to goal (Infinity if unreachable)}
tspDistance(cities,a,b) = Math.sqrt(dx*dx+dy*dy);  tspRouteCost(cities,route): total=0; for i: total += d(route[i], route[(i+1)%n])
routeText(route) -> 'A → B → C → D → E → A'
runTSP({cities, route, tie='first'|'float'}) -> { iterations:[{iteration (0-based), route, cost,
        neighbors:[{index:1..C(n,2), i, j, route, cost}], best:{index,i,j,route,cost}, decision:'Move'|'Stop'}],
        finalRoute, finalCost, moves, trace }
   neighbours: for i in 0..n-1, for j in i+1..n-1: swap. 'first': best = first k with cost < bestCost - 1e-9;
   Move iff best.cost < cost - 1e-9. 'float': same with epsilon 0 (reproduces notebook output).
runMinimax(tree, {prune=true, order='left'|'right', pruneOn='gte'|'gt'}) -> existing fields + 
   prunedRoots:[ids of first-level cut children], events:[{step, node, nodeType:'MAX'|'MIN', child, childValue,
   nodeValue /* own α(n) or β(n) */, alpha, beta /* window after update */, cut:boolean, prunedChildren:[ids], remaining:boolean}]
   cut condition: pruneOn==='gte' ? alpha >= beta : alpha > beta (only when children remain)
runQueens({start, mode:'steepest'}); queensAttacks; queensAttackingPairs; queensNeighborGrid
runCase(problem, mode, options): search → runSearch/traceTable; tsp → runTSP; queens → runQueens; tree → runMinimax
```

### 3.5 Cases (W1) — ids are fixed
- **search:** `intro`, `assignment`, `l2-tiny`, `l2-four`, `romania`, `l3-teg`, `l3-admissible`
- **tsp:** `tsp5`
- **queens:** `l4-queens-17`, `l4-queens-local`
- **tree:** `l5-rn`, `l5-practice`, `l5-minimax`, `tree-lecture`, `tree-lecture-e-rtl`, `tree-uw`

**Variants:**
```js
assignment.variants = {
 V1:{label:'Variasi V1: h(C)=6, h(F)=4, h(H)=4', h:{C:6,F:4,H:4}, note:'Tiga nilai diturunkan; tetap consistent dan admissible.'},
 V3:{label:'Variasi V3: h(C)=12, h(F)=10, h(H)=9', h:{C:12,F:10,H:9}, note:'Admissible (h ≤ h*), tetapi tidak consistent pada C→B, F→E, F→J, H→K; A* membuka ulang J.'},
 V4:{label:'Variasi V4: h(B)=9, h(E)=9, h(F)=3', h:{B:9,E:9,F:3}, note:'Admissible; consistency gagal pada C→F (7 > 3+3).'},
 V6:{label:'Variasi V6: h(C)=15, h(F)=12, h(H)=12', h:{C:15,F:12,H:12}, note:'Tidak admissible: h(C)=15 > h*(C)=13, h(F)=12 > 10, h(H)=12 > 9.'},
 E1:{label:'Variasi E1: biaya C→F = 6 (semula 3)', edges:[['C','F',6]], note:'Heuristic awal tetap consistent: h(C)=7 ≤ 6 + h(F)=5.'} }
intro.variants = { H0:{label:'Semua h = 0 (null heuristic, notebook §3d)', hAll:0},
 D0:{label:'h(D) = 0 (notebook §3h)', h:{D:0}}, A50:{label:'h(A) = 50 (notebook §9b)', h:{A:50}} }
l3-admissible.variants = { A3:{label:'h(A)=3', h:{A:3}}, A4:{label:'h(A)=4', h:{A:4}}, A5:{label:'h(A)=5', h:{A:5}} }
'tsp5' = {id:'tsp5', kind:'tsp', title:'TSP 5 kota (notebook local search)',
  source:'KKA-2026 / Searching / Local / 01_materi_local_search.ipynb §4',
  cities:{A:[1,1],B:[4,5],C:[7,2],D:[6,7],E:[2,6]}, start:['A','B','C','D','E'],
  starts:{exp1:'ABCDE', exp2:'ACBED', exp3:'DAEBC', x2:'ADBCE'},
  positions: {city:[x*80, (8-y)*80]},
  variants:{A13:{label:'Variasi: kota A dipindah ke (1,3)', cities:{A:[1,3]}}}}
'tree-uw' (L5 slides 53–56), MAX root; leaves named as on the slide:
 A:[ B:[E 8, F:[N:[W 10, X 2, Y 9], O 4], G 7, H:[P 4, Q:[Z 2, AA 4], R 8]],
     C:[I 3, J 8],
     D:[K:[S:[BB 3, CC 9], T:[DD 2, EE 8]], L 4, M:[U 6, V 9]] ]   // positions via treePositions()
```
Existing case data (graphs, h, positions, Romania roads and labels, the trees) stays **exactly** as it is in the current `cases.js`.

### 3.6 Widgets (W2) — names and props
```
graph-view        {caseId, variant?, showCosts=true, showHeuristic=false}
search-sim        {caseId, variant?, modes:['dfs'|'ucs'|'greedy'|'astar'], treeSearch?, allowTreeToggle?}
trace-table       {caseId, variant?, mode, showUpdates=true, showSkips=true, showSummary=true}
consistency-table {caseId, variant?}
variant-lab       {caseId, mode, presets:[variantIds], allowCustom=true}
heuristic-tuner   {caseId:'l3-admissible', node:'A', min:0, max:8}
minimax-sim       {caseId, prune=true, allowToggle=true, order='left', allowOrder=false, pruneOn='gte', allowPruneOnToggle=false, editableLeaves=false}
queens            {start, mode:'explore'|'hill', showGrid=true}
trace-drill       {caseId, variant?, mode, drillId, statesOnlyOption=true}
ab-drill          {caseId, order='left', pruneOn='gte', drillId}
tsp-hc            {caseId:'tsp5', variant?, start:'ABCDE', mode:'replay'|'drill', drillId?, allowFloatToggle=true}
```
- `ctx = {uid, reducedMotion, announce(msg), report(drillId, {completed, correctFirstTry, total}), saved(drillId) -> record|null}`. The app supplies `report`/`saved`; widgets must work when they are absent (no-op).
- Pure helpers for tests: `KKAWidgets.drill = {parseFrontierText, compareFrontier, checkRow, checkSummary, checkTspStep, checkAbEvent, normalizePath}`.

### 3.7 Storage (W3), key `kka-kuis-v3`
```js
{schemaVersion:3,
 sections:{[sid]:{done:bool, checks:{[qid]:{choice, correct, solved, attempts}}}},
 drills:{[drillId]:{completed:bool, correctFirstTry:int, total:int, bestPercent:int, updatedAt:number}},
 essays:{[eid]:{draft:string≤60000, revealed:bool, rubric:bool[], assessment:''|'mastered'|'review'}},
 exams:[{id, set:'A'|'B'|'acak', picks:[6 essay ids], startedAt, durationMin:0|60|90|120,
         answers:{[eid]:string≤60000}, submittedAt:number|null, rubric:{[eid]:bool[]}}],   // keep last 10
 last:'#/t/t1/t1-s3'}
```
- `validateState(raw, topics)` drops unknown ids and wrong types.
- If `kka-study-lab-v2` exists, home shows "Data versi lama ditemukan", with buttons "Unduh jawaban lama (.txt)" (dumps `essays[*].draft`) and "Hapus data lama".

---


### Tambahan W3 (di luar PART 3.7)
Override dari pengguna: tanggal kuis tidak di-hardcode. Disimpan di state yang sama.
```js
{schemaVersion:3, ...,
 quizDate:'YYYY-MM-DD' | absent,        // diisi lewat input tanggal di beranda; hitung mundur hanya tampil bila ada
 plan:{d1:bool, d2:bool, d3:bool, d4:bool, d5:bool, d6:bool}   // rencana belajar, checkbox
}
```
- Rencana (PLAN_STEPS di app.js): Hari 1 DFS + UCS, Hari 2 Greedy, Hari 3 A*, Hari 4 Hill Climbing, Hari 5 Alpha-Beta, Hari 6 mock quiz Set A → review → Set B (`mock: true`).
- `exams[].set` = `'acak'` memilih A atau B per topik untuk enam esai.
