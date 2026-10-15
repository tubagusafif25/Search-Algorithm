(function (root) { 'use strict';
  var topic = {
    id: 't4',
    number: 4,
    slug: 'astar',
    title: 'A* Search',
    short: 'A*',
    summary: 'A* memilih kandidat dengan f = g + h terkecil: biaya yang sudah ditempuh ditambah perkiraan sisa. Dengan heuristik admissible dan aturan pembaruan (termasuk pembukaan ulang), A* menemukan path termurah. Di kuis, kamu harus menulis trace, tabel pembaruan, dan memeriksa consistency.',
    goals: [
      'Menjalankan A* graph search dengan f = g + h, pembaruan g dan parent, dan entri usang yang dilewati.',
      'Menulis tabel trace dan tabel pembaruan, lalu menjelaskan setiap pembaruan dengan angka.',
      'Menjelaskan admissible dan consistent, dan memeriksa consistency pada setiap edge.',
      'Menjelaskan kapan pembukaan ulang (reopen) terjadi dan kenapa hasil tetap optimal.'
    ],
    sources: [
      { label: 'Lecture 3 slide 24–27 (A*, optimalitas, admissible)', lecture: 3, slide: 24 },
      { label: 'Lecture 3 slide 37 (properti A*)', lecture: 3, slide: 37 },
      { label: 'Lecture 3 slide 43 (perbandingan Greedy, UCS, A*)', lecture: 3, slide: 43 },
      { label: 'Lecture 3 slide 48–49 (membuat heuristik admissible)', lecture: 3, slide: 48 },
      { label: 'Lecture 3 slide 54 (ringkasan A*)', lecture: 3, slide: 54 },
      { label: 'Notebook 01_materi_informed_search §3e–3h, §6, §7, §9', notebook: '01_materi_informed_search' },
      { label: 'Tugas individu §3, §5 (analisis NRP genap), §6 (eksperimen heuristik)', notebook: '02_tugas_individu' }
    ],
    sections: [
      {
        id: 't4-s1',
        kind: 'intuisi',
        title: 'Biaya yang sudah ditempuh plus perkiraan sisa',
        blocks: [
          { type: 'intuition', text: 'Greedy hanya melihat perkiraan sisa (h). UCS hanya melihat biaya yang sudah ditempuh (g). A* menjumlahkan keduanya: f = g + h. Kandidat yang sudah mahal tetapi tampak dekat tidak akan terus dipilih, dan kandidat yang murah tetapi jauh juga tidak.' },
          { type: 'slide', lecture: 3, slide: 26, caption: 'Kombinasi UCS dan greedy: UCS mengurutkan menurut g, Greedy menurut h, dan A* menurut f = g + h.' },
          { type: 'widget', widget: 'search-sim', props: { caseId: 'l3-teg', modes: ['ucs', 'greedy', 'astar'] }, caption: 'UCS mengekspansi S, a, b, c, d. Greedy mengekspansi S, a, e, d. A* hanya S, a, d.' },
          { type: 'slide', lecture: 3, slide: 27, caption: 'Is A* optimal? Yang salah: biaya goal yang buruk (5) terlihat lebih murah dari perkiraan goal yang baik. Perkiraan harus lebih kecil atau sama dengan biaya sebenarnya.' },
          { type: 'widget', widget: 'heuristic-tuner', props: { caseId: 'l3-admissible', node: 'A', min: 0, max: 8 }, caption: 'Geser h(A) dan lihat hasil A* pada graf dua jalur.' },
          { type: 'definition', term: 'Admissible', text: 'h(n) ≤ h*(n) untuk semua n, dengan h*(n) = biaya sebenarnya dari n ke goal terdekat. Heuristik ini tidak pernah melebih-lebihkan biaya.' },
          { type: 'definition', term: 'Consistent', text: 'h(n) ≤ c(n, n′) + h(n′) untuk setiap edge n → n′. Ini aturan “masuk akal di setiap langkah” dari notebook §3f.' },
          { type: 'note', text: 'Consistent dan h(G) = 0 mengimplikasikan admissible. Sebaliknya belum tentu: admissible tidak menjamin consistent. Contoh di notebook §3h: h(D) = 0 melanggar A → D, karena 7 > 2 + 0.' }
        ],
        checks: [
          { id: 't4-s1-c1', type: 'input', prompt: 'Graf slide L3-26 (atau sembarang kandidat): g = 4, h = 5, berapa f? (angka saja)', answer: '9', accept: ['9'], explanation: 'f = g + h = 4 + 5 = 9.' },
          { id: 't4-s1-c2', type: 'mcq', prompt: 'Frontier notebook latihan 1: A(g=3, h=7), B(g=5, h=3), C(g=2, h=8). Siapa yang dipilih A*?', options: [
            'A, karena f = 10 pertama',
            'B, karena f = 8 paling kecil',
            'C, karena g = 2 paling kecil',
            'Tidak bisa ditentukan'
          ], answer: 1, explanation: 'f(A) = 10, f(B) = 8, f(C) = 10. A* memilih B. Greedy juga memilih B (h = 3), tetapi UCS memilih C (g = 2).', source: 'Notebook informed latihan 1' },
          { id: 't4-s1-c3', type: 'input', prompt: 'Graf l3-admissible: berapa nilai h(A) terbesar yang masih admissible? (angka saja)', answer: '3', accept: ['3'], explanation: 'Biaya sebenarnya dari A ke G adalah 3, jadi h(A) harus kurang dari atau sama dengan 3.', source: 'Lecture 3 slide 27' }
        ]
      },
      {
        id: 't4-s2',
        kind: 'aturan',
        title: 'Aturan A* graph search yang dipakai di kuis',
        blocks: [
          { type: 'text', text: 'Aturan berikut dari notebook §6 dan tugas §3. Ikuti urutan ini setiap baris trace.' },
          { type: 'list', ordered: true, items: [
            'Entri frontier berisi (f, nomor urut, g, state). Tie pada f diputus FIFO: yang masuk lebih dulu dipilih.',
            'Saat pop: jika g entri ≠ g_cost[state], entri itu usang. Lewati tanpa nomor iterasi dan tanpa ekspansi. Ini dicek sebelum goal test.',
            'Setiap baris trace memuat g, h, f, dan kolom updates (pembaruan yang terjadi pada baris itu).',
            'Goal test saat pop.',
            'Untuk setiap successor n dengan biaya c: hitung new_g = g(state) + c. Jika new_g < g_cost[n], catat g lama dan parent lama, perbarui g dan parent, lalu push (new_g + h(n), nomor urut, new_g, n). Jika tidak lebih kecil, tidak ada pembaruan.',
            'Reopen diperbolehkan: state yang sudah diekspansi boleh diekspansi lagi jika g-nya membaik. Itu dihitung sebagai peristiwa ekspansi baru.',
            'Ekspansi = memproses successor. Goal dan entri usang tidak dihitung.',
            'Snapshot frontier berisi kandidat aktif saja, dengan format X(g=..,h=..,f=..), diurutkan menurut f lalu FIFO.'
          ]},
          { type: 'pseudocode', title: 'A* graph search (dengan reopen)', lines: [
            'ASTAR(graph, start, goal, h):',
            '  heap ← [(h(start), 0, 0, start)]; g_cost ← {start: 0}; parent ← {start: None}',
            '  while heap tidak kosong:',
            '    (f, _, g, s) ← pop(heap)',
            '    if g > g_cost[s]: continue           # entri usang, tanpa nomor iterasi',
            '    if s == goal: return path(parent, s), g',
            '    ekspansi += 1',
            '    for (n, c) in graph[s]:',
            '      new_g ← g + c',
            '      if n ∉ g_cost or new_g < g_cost[n]:',
            '        catat (g_cost[n], parent[n]) lama',
            '        g_cost[n] ← new_g; parent[n] ← s',
            '        push(heap, (new_g + h(n), counter, new_g, n))',
            '  return gagal'
          ]},
          { type: 'table', caption: 'Tiga keadaan yang harus dibedakan (notebook §6j)', headers: ['Keadaan', 'Tindakan A*'], rows: [
            ['Jalur lebih murah ditemukan', 'Update g dan parent, lalu push entri baru'],
            ['Versi lama di-pop', 'Skip; jangan dihitung sebagai ekspansi atau iterasi'],
            ['State pernah diekspansi, lalu g membaik', 'Boleh diekspansi ulang; hitung sebagai peristiwa baru']
          ]},
          { type: 'text', text: 'Syarat optimal (notebook §7c): heuristik admissible, h(goal) = 0, bobot nonnegatif, pembaruan biaya dan reopen, serta goal test saat pop. Jika state yang sudah diekspansi tidak boleh dibuka ulang, consistency adalah syarat cukup yang lebih kuat.' },
          { type: 'warning', text: 'Jangan menguji goal saat successor ditemukan. Di graf tugas, G pertama kali masuk frontier dengan g = 17 dan f = 17. Jika tidak diuji saat pop, jalur lain yang lebih murah bisa terlewat.' }
        ],
        checks: [
          { id: 't4-s2-c1', type: 'mcq', prompt: 'Kapan pembaruan g dan parent dilakukan di A*?', options: [
            'Jika new_g lebih besar atau sama dengan g lama',
            'Jika new_g < g lama (lebih kecil secara ketat)',
            'Setiap kali state ditemukan',
            'Hanya saat goal ditemukan'
          ], answer: 1, explanation: 'Pembaruan terjadi hanya jika new_g lebih kecil secara ketat. Jika sama, tidak ada perbaikan dan tidak ada pembaruan.' },
          { id: 't4-s2-c2', type: 'mcq', prompt: 'Heuristik h(P) = 6, c(P, Q) = 2, dan h(Q) = 3. Apakah edge P → Q consistent?', options: [
            'Ya, karena 6 ≤ 2 + 3 + 1',
            'Tidak, karena 6 > 2 + 3 = 5',
            'Ya, karena h(Q) lebih kecil dari h(P)',
            'Tidak bisa ditentukan dari data ini'
          ], answer: 1, explanation: 'Consistency: h(P) ≤ c(P, Q) + h(Q). 6 ≤ 5 tidak benar, jadi edge ini melanggar consistency.' }
        ]
      },
      {
        id: 't4-s3',
        kind: 'contoh',
        title: 'Contoh langkah demi langkah: graf materi, lalu variasi D0',
        blocks: [
          { type: 'text', text: 'Jalankan A* pada graf materi. Perhatikan tiga hal: baris yang memperbarui D dan E, skip entri lama, dan goal G yang akhirnya ditemukan dengan cost 9 (bukan 15).' },
          { type: 'widget', widget: 'trace-table', props: { caseId: 'intro', mode: 'astar', showUpdates: true, showSkips: true, showSummary: true }, caption: 'Tabel trace A* pada graf materi (dibuat mesin).' },
          { type: 'text', text: 'Iterasi 2: B diekspansi (g=4, f=6). D dibangkitkan dengan g = 5, f = 10. Iterasi 4: A (g=2, h=7, f=9) diekspansi, dan D diperbarui menjadi g = 4 (parent B → A). Pada baris ini update ditulis di kolom updates.' },
          { type: 'text', text: 'Iterasi 3: F diekspansi (g=6, f=7). G masuk dengan g = 15. Ini belum final. Iterasi 6: D (g=4) diekspansi, dan G diperbarui dari 15 menjadi 9 (parent F → D). Iterasi 7: G di-pop dengan g = 9 dan goal test berhasil. Path S → A → D → G, cost 9, dengan 6 ekspansi (S, B, F, A, C, D).' },
          { type: 'text', text: 'Pada baris iterasi 5, C diekspansi dan E diperbarui dari 7 menjadi 5 (parent A → C). Pembaruan ini tidak mengubah path akhir, tetapi membuat E lebih murah sebelum dipilih.' },
          { type: 'text', text: 'Cara membaca trace: setiap baris adalah satu pop yang valid. Kolom Frontier sesudah berisi kandidat aktif. Kolom updates mencatat perbaikan. Entri lama (skip) tidak diberi nomor.' },
          { type: 'widget', widget: 'trace-table', props: { caseId: 'intro', variant: 'D0', mode: 'astar', showUpdates: true, showSkips: true }, caption: 'Variasi D0 (h(D) = 0). A* diekspansi ulang untuk D (reopen).' },
          { type: 'text', text: 'Variasi D0: h(D) = 0 melanggar consistency (A → D: 7 > 2 + 0), tetapi tetap admissible. D diekspansi pada iterasi 3 dengan g = 5. Lalu A menemukan g(D) = 4 (5 → 4), sehingga D dibuka ulang di iterasi 6. Ekspansi 7 peristiwa, 6 state unik. Cost tetap 9.' }
        ],
        checks: [
          { id: 't4-s3-c1', type: 'input', prompt: 'Graf materi (intro): pada iterasi 3 (F diekspansi), berapa g(G) yang tercatat pertama kali? (angka saja)', answer: '15', accept: ['15'], explanation: 'F → G berbiaya 9, dan g(F) = 6. Jadi 6 + 9 = 15. Nilai ini nanti diperbarui menjadi 9.' },
          { id: 't4-s3-c2', type: 'input', prompt: 'Variasi D0 (h(D) = 0) pada graf materi: berapa state unik yang diekspansi? (angka saja)', answer: '6', accept: ['6'], explanation: 'Peristiwa ekspansinya S, B, D, F, A, D, C: tujuh peristiwa. State unik: S, B, D, F, A, C = 6.' }
        ]
      },
      {
        id: 't4-s4',
        kind: 'menulis',
        title: 'Cara menulis jawaban A* di kuis',
        blocks: [
          { type: 'text', text: 'Jawaban A* dinilai dari trace, tabel pembaruan, dan analisis. Analisis di tugas NRP genap meminta angka dari hasilmu sendiri, termasuk perhitungan f dan pemeriksaan consistency.' },
          { type: 'template', title: 'Kerangka jawaban A*', text: 'JAWABAN — A* graph search pada [nama graf], start S, goal G\n1) Aturan yang saya pakai\n- Frontier: priority queue dengan f = g + h, tie FIFO.\n- Entri usang dilewati tanpa nomor iterasi sebelum goal test.\n- Pembaruan jika new_g < g lama; state yang sudah diekspansi boleh di-reopen.\n- Goal test saat pop.\n2) Tabel trace\nIterasi | Dipilih | g | h | f | Aksi | Frontier sesudah\n1 | S | 0 | 9 | 9 | expand | A(g=3,h=8,f=11); C(g=4,h=7,f=11); B(g=5,h=7,f=12)\n...\n3) Tabel pembaruan\nIterasi | State | g lama | g baru | Parent lama | Parent baru\n...\n4) Hasil\nPath: S → … → G\nTotal cost: …\nJumlah ekspansi: … (peristiwa, dan state unik bila ada reopen)\nUrutan ekspansi: …\n5) Analisis (sesuai pertanyaan tugas)\n(1) Bagaimana state berikutnya dipilih, termasuk tie?\n(2) Hitung satu f = g + h dan bandingkan dengan pesaing.\n(3) Jelaskan satu pembaruan: g lama/baru, parent lama/baru, dan entri usang.\n(4) Periksa consistency semua edge; hubungkan dengan h(G) = 0 dan optimalitas.' },
          { type: 'list', items: [
            'Pembagian poin di esai latihan ini: aturan 10, tabel 30, pembaruan dan entri usang 15, hasil 15, analisis 30 poin.',
            'Untuk pemeriksaan consistency, tulis satu baris per edge atau tunjukkan tabel consistency-table.',
            'Jika ada reopen, tulis peristiwa ekspansi kedua dengan iterasi baru, dan sebut itu sebagai peristiwa baru.'
          ]},
          { type: 'widget', widget: 'consistency-table', props: { caseId: 'assignment' }, caption: 'Pemeriksaan consistency untuk graf tugas: 0 pelanggaran.' }
        ],
        checks: [
          { id: 't4-s4-c1', type: 'mcq', prompt: 'Entri usang di A* dicek di mana?', options: [
            'Setelah goal test',
            'Sebelum goal test, saat pop, dan tanpa nomor iterasi',
            'Saat successor dibangkitkan',
            'Tidak perlu dicek'
          ], answer: 1, explanation: 'Entri usang dicek lebih dulu saat pop. Jika usang, dilewati tanpa goal test, nomor iterasi, atau ekspansi.' }
        ]
      },
      {
        id: 't4-s5',
        kind: 'latihan',
        title: 'Latihan: isi baris A*, reopen, dan variasi',
        blocks: [
          { type: 'text', text: 'Isi baris berikutnya dari tabel A*. Kandidat ditulis X(g=..,h=..,f=..), diurutkan menurut f lalu FIFO. Setelah drill, coba variasi heuristik. Variasi di sini bukan soal resmi.' },
          { type: 'widget', widget: 'trace-drill', props: { caseId: 'intro', mode: 'astar', drillId: 't4-d1', statesOnlyOption: true }, caption: 'Drill 1: graf materi 9 state.' },
          { type: 'widget', widget: 'trace-drill', props: { caseId: 'assignment', mode: 'astar', drillId: 't4-d2', statesOnlyOption: true }, caption: 'Drill 2: graf tugas 14 state.' },
          { type: 'widget', widget: 'trace-drill', props: { caseId: 'l3-teg', mode: 'astar', drillId: 't4-d3', statesOnlyOption: true }, caption: 'Drill 3: graf slide L3-26.' },
          { type: 'widget', widget: 'trace-drill', props: { caseId: 'intro', variant: 'D0', mode: 'astar', drillId: 't4-d4', statesOnlyOption: false }, caption: 'Drill 4: variasi D0, dengan reopen pada D.' },
          { type: 'widget', widget: 'variant-lab', props: { caseId: 'assignment', mode: 'astar', presets: ['V1', 'V3', 'V4', 'V6', 'E1'], allowCustom: true }, caption: 'Variasi dari graf tugas, bukan soal resmi. Lihat bagaimana A* berubah saat h atau biaya berubah.' },
          { type: 'widget', widget: 'consistency-table', props: { caseId: 'assignment', variant: 'V3' }, caption: 'Pelanggaran consistency pada variasi V3.' }
        ],
        checks: []
      },
      {
        id: 't4-s6',
        kind: 'cek',
        title: 'Cek cepat A*',
        blocks: [
          { type: 'text', text: 'Jawab delapan pertanyaan singkat. Untuk pertanyaan angka, tulis angka saja.' }
        ],
        checks: [
          { id: 't4-s6-c1', type: 'input', prompt: 'Graf tugas: berapa total cost path A*? (angka saja)', answer: '17', accept: ['17'], explanation: 'A* menemukan S → C → F → J → M → G, cost 17.' },
          { id: 't4-s6-c2', type: 'input', prompt: 'Graf tugas: berapa jumlah ekspansi A*? (peristiwa, angka saja)', answer: '13', accept: ['13'], explanation: 'Ekspansinya S, A, C, B, F, E, D, H, J, I, K, M, L: 13 peristiwa.' },
          { id: 't4-s6-c3', type: 'input', prompt: 'Graf tugas: pada iterasi 2 (A diekspansi), berapa g(B) setelah diperbarui? (angka saja)', answer: '4', accept: ['4'], explanation: 'S → A (3) + A → B (1) = 4 < 5. B diperbarui dari 5 menjadi 4 (parent S → A).' },
          { id: 't4-s6-c4', type: 'input', prompt: 'Graf tugas: berapa pelanggaran consistency pada baseline? (angka saja)', answer: '0', accept: ['0'], explanation: 'Semua edge memenuhi h(n) ≤ c(n, n′) + h(n′). Tidak ada pelanggaran.' },
          { id: 't4-s6-c5', type: 'mcq', prompt: 'Variasi V6 (h(C) = 15, h(F) = 12, h(H) = 12). Apa yang terjadi pada A*?', options: [
            'Path tetap optimal, cost 17',
            'A* menemukan path S-A-B-E-J-M-G dengan cost 19, lebih mahal dari 17, karena heuristik tidak admissible',
            'A* tidak berhenti',
            'A* menemukan cost 20 karena h(C) terlalu besar'
          ], answer: 1, explanation: 'h(C) = 15 > h*(C) = 13, sehingga heuristik tidak admissible. A* menemukan cost 19, lebih mahal dari 17.' },
          { id: 't4-s6-c6', type: 'input', prompt: 'Variasi V3 (h(C) = 12, h(F) = 10, h(H) = 9): berapa kali J diekspansi? (angka saja)', answer: '2', accept: ['2'], explanation: 'J diekspansi pada iterasi 8 dengan g = 12, lalu diperbarui menjadi g = 10 saat F diekspansi, dan diekspansi lagi pada iterasi 10 (reopen).' },
          { id: 't4-s6-c7', type: 'input', prompt: 'Notebook §9b: h(A) = 50 pada graf materi. Berapa cost path A*? (angka saja)', answer: '10', accept: ['10'], explanation: 'Dengan h(A) = 50 yang tidak admissible, A* menemukan S → B → D → G dengan cost 10, bukan 9.' },
          { id: 't4-s6-c8', type: 'input', prompt: 'Peta Romania dengan A*: berapa jumlah ekspansi? (angka saja)', answer: '5', accept: ['5'], explanation: 'Ekspansinya A, S, R, P, F. Goal B di-pop setelah itu dan tidak dihitung.' }
        ]
      }
    ],
    essays: [
      {
        id: 't4-e1',
        title: 'A* pada graf tugas dan analisis consistency',
        exam: false,
        variant: false,
        source: 'Tugas individu §2 dan §5 (analisis NRP genap, A*)',
        minutes: 15,
        prompt: 'Graf tugas individu (14 state) dari S ke G. Jalankan A* graph search dengan h yang diberikan.\n(a) Tulis tabel trace: Iterasi | Dipilih | g | h | f | Aksi | Frontier sesudah.\n(b) Tulis tabel pembaruan dan entri usang yang dilewati.\n(c) Tulis path, total cost, jumlah ekspansi, dan urutan ekspansi.\n(d) Jawab analisis: bagaimana state dipilih saat tie? Hitung satu f = g + h dan bandingkan dengan pesaing. Periksa consistency semua edge, lalu jelaskan kenaikan optimalitas dari h(G) = 0.',
        figure: { widget: 'graph-view', props: { caseId: 'assignment', showHeuristic: true } },
        solution: 'Aturan: f = g + h, tie FIFO, pembaruan jika new_g lebih kecil, entri usang dilewati, goal diuji saat pop.\nPembaruan (4 kali): B 5 → 4 (S → A, iterasi 2). E 10 → 6 (A → B, iterasi 4). K 14 → 12 (F → H, iterasi 8). L 15 → 14 (J → I, iterasi 10).\nEntri usang yang dilewati: B(g=5) setelah iterasi 4, dan E(g=10) setelah iterasi 9.\nHasil: path S → C → F → J → M → G, cost 17. Jumlah ekspansi 13. Urutan ekspansi S, A, C, B, E, D, F, H, J, I, K, M, L.\nTie: pada iterasi 2, A dan C sama-sama f = 11 (A: 3 + 8, C: 4 + 7). A masuk lebih dulu, jadi A dipilih.\nConsistency: 0 pelanggaran di 30 edge. h(G) = 0 dan heuristik admissible (h ≤ h* untuk semua state), sehingga path yang ditemukan optimal.',
        solutionBlocks: [
          { type: 'widget', widget: 'trace-table', props: { caseId: 'assignment', mode: 'astar', showUpdates: true, showSkips: true }, caption: 'Tabel trace dan pembaruan A* pada graf tugas (dibuat mesin).' },
          { type: 'widget', widget: 'consistency-table', props: { caseId: 'assignment' }, caption: 'Pemeriksaan consistency: 0 pelanggaran.' }
        ],
        rubric: [
          { text: 'Aturan A* ditulis (f, tie FIFO, entri usang, pembaruan, goal saat pop)', points: 10 },
          { text: 'Tabel trace benar baris demi baris, dengan g, h, f, dan frontier', points: 30 },
          { text: 'Tabel pembaruan (4 pembaruan dengan parent lama dan baru) dan dua entri usang', points: 15 },
          { text: 'Path S-C-F-J-M-G, cost 17, 13 ekspansi, dan urutan ekspansi benar', points: 15 },
          { text: 'Analisis: tie pada iterasi 2 dengan f, consistency 0 pelanggaran, dan kaitan h(G) = 0 dengan optimalitas', points: 30 }
        ]
      },
      {
        id: 't4-e2',
        title: 'Variasi V3: reopen pada J',
        exam: false,
        variant: true,
        source: 'Tugas individu §6 (eksperimen heuristik), variasi V3',
        minutes: 15,
        prompt: 'Variasi V3 dari graf tugas (variasi, bukan soal resmi): h(C) = 12, h(F) = 10, h(H) = 9. Semua h lain sama.\n(a) Jalankan A* dengan V3. Tulis tabel trace dan tabel pembaruan.\n(b) Di mana J diekspansi dua kali? Jelaskan kenapa.\n(c) Periksa consistency. Apakah V3 admissible? Apakah hasilnya tetap optimal?',
        figure: { widget: 'variant-lab', props: { caseId: 'assignment', mode: 'astar', presets: ['V3'], allowCustom: false } },
        solution: 'Variasi V3, label: variasi dari graf tugas.\nPath S → C → F → J → M → G, cost 17. Jumlah ekspansi 12 peristiwa (S, A, B, E, D, C, I, J, F, J, M, L).\nJ diekspansi dua kali: pertama pada iterasi 8 dengan g = 12. Pada iterasi 9, F diekspansi dan memperbarui J dari 12 menjadi 10 (parent E → F). Entri J yang baru menyebabkan reopen, lalu J diekspansi lagi pada iterasi 10.\nConsistency: 4 pelanggaran, yaitu C → B, F → E, F → J, dan H → K. Heuristik ini tidak consistent, tetapi tetap admissible. Karena admissible dan h(G) = 0, hasil cost 17 tetap optimal. Reopen dibutuhkan karena heuristik tidak consistent.',
        solutionBlocks: [
          { type: 'widget', widget: 'trace-table', props: { caseId: 'assignment', variant: 'V3', mode: 'astar', showUpdates: true, showSkips: true }, caption: 'A* pada variasi V3 (dibuat mesin).' },
          { type: 'widget', widget: 'consistency-table', props: { caseId: 'assignment', variant: 'V3' }, caption: 'Pelanggaran consistency pada V3.' }
        ],
        rubric: [
          { text: 'Tabel trace dan pembaruan V3 benar', points: 35 },
          { text: 'Menunjukkan J diekspansi dua kali dan menjelaskan reopen (J 12 → 10)', points: 25 },
          { text: 'Consistency: menyebut 4 pelanggaran (C → B, F → E, F → J, H → K)', points: 20 },
          { text: 'Kesimpulan: masih admissible sehingga cost 17 tetap optimal, dengan alasan', points: 20 }
        ]
      },
      {
        id: 't4-e3',
        title: 'Eksperimen heuristik dari notebook §9b',
        exam: false,
        variant: true,
        source: 'Notebook 01_materi_informed_search §9b (graf materi)',
        minutes: 15,
        prompt: 'Pada graf materi (intro), bandingkan tiga pilihan heuristik: (1) null heuristic h = 0 untuk semua state, (2) heuristik informatif (h dari graf materi), dan (3) h(A) = 50 dengan h lain sama dengan (2).\n(a) Tulis hasil setiap pilihan: path, cost, dan jumlah ekspansi.\n(b) Jelaskan kenapa pilihan (3) menghasilkan path yang berbeda.\n(c) Hubungkan hasil dengan admissible: heuristik (3) admissible atau tidak? Kenapa?',
        solutionBlocks: [
          { type: 'widget', widget: 'trace-table', props: { caseId: 'intro', variant: 'H0', mode: 'astar', showUpdates: true }, caption: 'Null heuristic (H0): semua h = 0 (dibuat mesin).' },
          { type: 'widget', widget: 'trace-table', props: { caseId: 'intro', variant: 'A50', mode: 'astar', showUpdates: true }, caption: 'h(A) = 50 (A50) (dibuat mesin).' }
        ],
        solution: '(1) Null heuristic: path S → A → D → G, cost 9, 8 ekspansi (sama dengan UCS).\n(2) Heuristik informatif: path S → A → D → G, cost 9, 6 ekspansi (S, B, F, A, C, D).\n(3) h(A) = 50: path S → B → D → G, cost 10, 5 ekspansi (S, B, F, C, D).\nPilihan (3) tidak admissible karena h(A) = 50 lebih besar dari h*(A) = 7. Karena f(A) = 2 + 50 = 52, A tidak sempat dipilih sebelum goal lewat B dan D ditemukan. Cost yang didapat 10, bukan 9, sehingga A* gagal menemukan path termurah.',
        rubric: [
          { text: 'Hasil null heuristic benar: path, cost 9, 8 ekspansi', points: 20 },
          { text: 'Hasil heuristik informatif benar: path, cost 9, 6 ekspansi', points: 20 },
          { text: 'Hasil h(A) = 50 benar: path S-B-D-G, cost 10, 5 ekspansi', points: 20 },
          { text: 'Menjelaskan kenapa h(A) = 50 tidak admissible (50 > h*(A) = 7)', points: 25 },
          { text: 'Menjelaskan kenapa A tidak dipilih sebelum goal (f(A) = 52)', points: 15 }
        ]
      },
      {
        id: 't4-x1',
        title: 'A* pada peta Romania',
        exam: true,
        set: 'A',
        variant: false,
        source: 'Peta Romania (L3 slide 19 untuk h, cases.js romania)',
        minutes: 20,
        prompt: 'Peta Romania dari Arad (A) ke Bucharest (B), dengan h = jarak garis lurus ke Bucharest. Jalankan A* graph search dengan pembaruan.\n(a) Tulis tabel trace lengkap dengan g, h, dan f.\n(b) Tulis path, total cost, jumlah ekspansi, dan urutan ekspansi.\n(c) Saat F diekspansi, F → B memberi g = 450. Apakah itu menjadi pembaruan? Jelaskan dengan nilai g(B) yang sudah tercatat.',
        figure: { widget: 'graph-view', props: { caseId: 'romania', showHeuristic: true } },
        solution: 'Path A → S → R → P → B, cost 140 + 80 + 97 + 101 = 418. Jumlah ekspansi 5 (A, S, R, P, F).\nSetelah P diekspansi di iterasi 4, B masuk frontier dengan g = 418 dan f = 418. F (f = 417) diekspansi di iterasi 5 karena f-nya lebih kecil. Goal B di-pop di iterasi 6.\nSaat F diekspansi, F → B memberi g = 450. Itu bukan pembaruan, karena 450 tidak lebih kecil dari g(B) = 418 yang sudah tercatat dari P. Entri B(g=450) tidak pernah masuk frontier.',
        solutionBlocks: [
          { type: 'widget', widget: 'trace-table', props: { caseId: 'romania', mode: 'astar', showUpdates: true, showSkips: true }, caption: 'A* pada peta Romania (dibuat mesin).' }
        ],
        rubric: [
          { text: 'Tabel trace lengkap dengan g, h, dan f benar', points: 40 },
          { text: 'Path A-S-R-P-B, cost 418, 5 ekspansi, dan urutan ekspansi benar', points: 20 },
          { text: 'Pembaruan yang terjadi (g(B) dari 450 menjadi 418 saat P diekspansi) dijelaskan', points: 20 },
          { text: 'Menjelaskan kenapa F → B (450) tidak menjadi pembaruan, dengan nilai g(B) = 418', points: 20 }
        ]
      },
      {
        id: 't4-x2',
        title: 'Variasi V6 dan heuristik pada slide 27',
        exam: true,
        set: 'B',
        variant: true,
        source: 'Variasi V6 dari graf tugas dan Lecture 3 slide 27',
        minutes: 20,
        prompt: 'Bagian (a): variasi V6 dari graf tugas (h(C) = 15, h(F) = 12, h(H) = 12, sisa h sama). Jalankan A* dan tulis tabel trace ringkas. Tulis path, cost, dan jumlah ekspansi.\nBagian (b): graf slide L3-27 (S → A cost 1, S → G cost 5, A → G cost 3), dengan h(A) = 6 dan h(G) = 0. Apa yang dihasilkan A*? Batas h(A) agar admissible berapa?\nJelaskan kenapa V6 tidak optimal dan apa hubungannya dengan h*(C).',
        figure: { widget: 'variant-lab', props: { caseId: 'assignment', mode: 'astar', presets: ['V6'], allowCustom: false } },
        solution: 'Bagian (a): V6 (variasi, bukan soal resmi). Path A* S → A → B → E → J → M → G, cost 19 (S → A 3, A → B 1, B → E 2, E → J 6, J → M 4, M → G 3). Jumlah ekspansi 10 peristiwa (S, A, B, E, D, I, J, L, M, C). G diperbarui dari 20 menjadi 19 pada iterasi 9 (parent L → M). C baru diekspansi pada iterasi 10.\nBagian (b): pada graf slide L3-27 dengan h(A) = 6, f(A) = 1 + 6 = 7 > f(G lewat jalan langsung) = 5. Akibatnya G di-pop dengan cost 5 padahal S → A → G berbiaya 4. Batas admissible: h(A) ≤ h*(A) = 3.\nV6 tidak optimal karena h(C) = 15 > h*(C) = 13, dan h(F) = 12 > 10, h(H) = 12 > 9. Heuristik yang melebihi biaya sebenarnya membuat A* menilai C terlalu mahal, sehingga jalur yang lebih murah lewat C baru diekspansi di iterasi 10.',
        solutionBlocks: [
          { type: 'widget', widget: 'trace-table', props: { caseId: 'assignment', variant: 'V6', mode: 'astar', showUpdates: true, showSkips: true }, caption: 'A* pada variasi V6 (dibuat mesin). Perhatikan G 20 → 19.' },
          { type: 'widget', widget: 'heuristic-tuner', props: { caseId: 'l3-admissible', node: 'A', min: 0, max: 8 }, caption: 'Slide 27: geser h(A) dan lihat hasilnya.' }
        ],
        rubric: [
          { text: 'Tabel A* V6 benar (termasuk pembaruan G 20 → 19)', points: 35 },
          { text: 'Path S-A-B-E-J-M-G, cost 19, dan jumlah ekspansi 10 benar', points: 20 },
          { text: 'Slide 27: cost 5 dengan h(A) = 6, dan batas admissible h(A) ≤ 3', points: 25 },
          { text: 'Menjelaskan kenapa V6 tidak optimal (h(C) = 15 > h*(C) = 13)', points: 20 }
        ]
      }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = topic;
  if (root) (root.KKA_TOPICS = root.KKA_TOPICS || []).push(topic);
})(typeof window !== 'undefined' ? window : globalThis);
