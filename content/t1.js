(function (root) { 'use strict';
  var topic = {
    id: 't1',
    number: 1,
    slug: 'dfs',
    title: 'DFS Graph Search',
    short: 'DFS',
    summary: 'DFS selalu mengambil kandidat yang paling baru masuk (stack, LIFO), sehingga menelusuri satu cabang sedalam mungkin sebelum mundur. Versi graph search menambahkan closed set agar satu state tidak diekspansi dua kali. Di kuis, kamu harus menulis tabel trace dengan konvensi yang jelas dan menghitung path, cost, dan jumlah ekspansi.',
    goals: [
      'Menjalankan DFS graph search langkah demi langkah dengan stack dan closed set.',
      'Menulis tabel trace dengan format X(g=..) dan menyebut konvensi yang kamu pakai di baris pertama jawaban.',
      'Menghitung path, total cost, jumlah ekspansi, dan urutan ekspansi dari tabel yang kamu buat.',
      'Menjelaskan kenapa DFS tidak optimal dan bagaimana konvensi (urutan push, cek closed) mengubah hasilnya.'
    ],
    sources: [
      { label: 'Lecture 2 slide 22–26 (state space graph dan search tree)', lecture: 2, slide: 22 },
      { label: 'Lecture 2 slide 33 (DFS: fringe LIFO, cabang kiri dulu)', lecture: 2, slide: 33 },
      { label: 'Lecture 2 slide 36 (properti DFS)', lecture: 2, slide: 36 },
      { label: 'Notebook 01_materi_uniformed_search §4 dan §10', notebook: '01_materi_uniformed_search' },
      { label: 'Notebook 01_materi_informed_search §1 (explored / visited)', notebook: '01_materi_informed_search' },
      { label: 'Tugas individu §3 (aturan dan format trace)', notebook: '02_tugas_individu' }
    ],
    sections: [
      {
        id: 't1-s1',
        kind: 'intuisi',
        title: 'Menyusuri lorong paling dalam dulu',
        blocks: [
          { type: 'intuition', text: 'Bayangkan menyusuri gua. Di setiap percabangan kamu masuk ke lorong paling kiri dan terus masuk. Kalau buntu, kamu mundur ke percabangan terakhir dan mencoba lorong berikutnya. Stack mencatat lorong yang belum dicoba: yang terakhir ditaruh, pertama diambil.' },
          { type: 'slide', lecture: 2, slide: 33, caption: 'DFS: expand a deepest node first. Fringe berupa stack LIFO, dan cabang paling kiri ditelusuri dulu.' },
          { type: 'definition', term: 'Graph search vs tree search', text: 'Dalam state space graph setiap state muncul sekali (slide 22). Search tree menyimpan jalur, sehingga satu state bisa muncul berkali-kali (slide 25). Graph search = tree search + closed set: state yang sudah diekspansi tidak diekspansi lagi.' },
          { type: 'widget', widget: 'search-sim', props: { caseId: 'l2-four', modes: ['dfs'], allowTreeToggle: true, treeSearch: true }, caption: 'Graf empat state slide 26. Dengan tree search, a dan b bergantian tanpa henti (dibatasi 50 ekspansi). Matikan centang tree search: graph search menemukan S → a → b → G.' }
        ],
        checks: [
          { id: 't1-s1-c1', type: 'mcq', prompt: 'Fringe (frontier) DFS berupa struktur data apa?', options: [
            'Queue FIFO',
            'Stack LIFO',
            'Priority queue dengan prioritas g',
            'Priority queue dengan prioritas h'
          ], answer: 1, explanation: 'DFS memperluas simpul paling dalam dulu, jadi kandidat yang paling baru masuk yang diambil lebih dulu: stack (LIFO). Slide 33 menulisnya sebagai “Fringe is a LIFO stack”.', source: 'Lecture 2 slide 33' },
          { id: 't1-s1-c2', type: 'mcq', prompt: 'Kenapa tree search pada graf slide 26 tidak pernah berhenti?', options: [
            'Goal G tidak ada di graf',
            'Ada siklus a ↔ b, sehingga pohon pencarian menjadi tak berhingga',
            'Biaya edge bernilai negatif',
            'Heuristik tidak diberikan'
          ], answer: 1, explanation: 'Di graf slide 26, a dan b saling menunjuk. Tree search menyimpan jalur, jadi jalur a → b → a → b … terus tumbuh. Graph search dengan closed set memotong siklus ini.', source: 'Lecture 2 slide 26' }
        ]
      },
      {
        id: 't1-s2',
        kind: 'aturan',
        title: 'Aturan DFS graph search yang dipakai di kuis',
        blocks: [
          { type: 'text', text: 'DFS punya beberapa detail kecil yang menentukan urutan ekspansi. Di kuis, jawabanmu harus mengikuti konvensi yang jelas. Berikut konvensi “DFS-A” yang dipakai di aplikasi ini dan di contoh-contoh kuis:' },
          { type: 'list', ordered: true, items: [
            'Frontier = stack. Setiap entri menyimpan (state, g, parent).',
            'Successor dibaca sesuai urutan list graf, lalu dimasukkan terbalik sehingga successor pertama berada di atas stack (seperti reversed(successors) pada notebook Sudoku dan cabang paling kiri pada slide 33).',
            'Closed set dicek saat pop: jika state sudah closed, entri dilewati (skip) tanpa nomor iterasi dan tidak dihitung sebagai ekspansi.',
            'Successor yang sudah closed tidak dimasukkan. Successor yang masih ada di stack boleh dimasukkan lagi (duplikat); entri baru berada di atas.',
            'Goal test dilakukan saat pop.',
            'Parent ditentukan oleh entri yang benar-benar di-pop; path = rantai parent dari goal, dibalik.',
            'Snapshot “Stack sesudah” ditulis dari atas ke bawah dengan format X(g=..), hanya untuk entri yang state-nya belum closed.'
          ]},
          { type: 'pseudocode', title: 'DFS graph search (konvensi DFS-A)', lines: [
            'DFS-GRAPH(graph, start, goal):',
            '  stack ← [(start, 0, None)]; closed ← {}',
            '  while stack tidak kosong:',
            '    (s, g, p) ← pop(stack)',
            '    if s ∈ closed: continue            # skip, tanpa nomor iterasi',
            '    closed.add(s); parent[s] ← p',
            '    if s == goal: return path(parent, s), g',
            '    ekspansi += 1',
            '    for (n, c) in reversed(graph[s]):',
            '      if n ∉ closed: push(stack, (n, g + c, s))',
            '  return gagal'
          ]},
          { type: 'warning', text: 'Konvensi berbeda menghasilkan jawaban berbeda. Contoh: pada graf tugas, DFS-A dan konvensi “cek sudah ditemukan” sama-sama menghasilkan S-A-D-I-L-G (cost 20). Tetapi jika successor dimasukkan dalam urutan list tanpa dibalik, hasilnya S-C-H-K-M-G (cost 18).' },
          { type: 'table', caption: 'Konvensi mengubah hasil (dari tabel perbandingan materi)', headers: ['Graf', 'DFS-A (default web)', 'Cek “sudah ditemukan” saat push', 'Push sesuai urutan list'], rows: [
            ['l2-tiny (slide 23/45)', 'S-d-e-r-f-G, cost 10, 11 ekspansi', 'S-e-r-f-G, cost 14, 10 ekspansi', 'S-e-r-f-G, cost 14, 6 ekspansi'],
            ['Tugas (14 state)', 'S-A-D-I-L-G, cost 20, 5 ekspansi', 'S-A-D-I-L-G, cost 20, 5 ekspansi', 'S-C-H-K-M-G, cost 18, 5 ekspansi'],
            ['Materi (9 state)', 'S-A-D-G, cost 9, 3 ekspansi', 'S-A-D-G, cost 9, 3 ekspansi', 'S-C-H-G, cost 13, 3 ekspansi']
          ]},
          { type: 'note', text: 'Tulis konvensimu di baris pertama jawaban, misalnya “Konvensi: stack, successor dimasukkan terbalik, closed dicek saat pop.” Jika soal memberi aturan lain, ikuti aturan soal.' }
        ],
        checks: [
          { id: 't1-s2-c1', type: 'input', prompt: 'Graf tugas: setelah S diekspansi dengan konvensi DFS-A, state apa yang berada paling atas di stack? (tulis satu huruf)', answer: 'A', accept: ['a'], explanation: 'Successor S dalam urutan list adalah A, B, C. Karena dimasukkan terbalik, A berada paling atas.' },
          { id: 't1-s2-c2', type: 'mcq', prompt: 'Entri yang di-pop padahal state-nya sudah closed diperlakukan bagaimana?', options: [
            'Diekspansi lagi dan diberi nomor iterasi baru',
            'Dilewati tanpa nomor iterasi dan tidak dihitung sebagai ekspansi',
            'Dihitung sebagai ekspansi, tetapi tidak masuk tabel',
            'Dijadikan goal'
          ], answer: 1, explanation: 'Entri usang atau closed hanya dilewati. Nomor iterasi dan jumlah ekspansi hanya naik untuk state yang benar-benar diekspansi.' }
        ]
      },
      {
        id: 't1-s3',
        kind: 'contoh',
        title: 'Contoh langkah demi langkah: graf materi 9 state',
        blocks: [
          { type: 'text', text: 'Mulai dengan graf materi 9 state. Klik graf di bawah untuk melihat bobot setiap edge, lalu lihat tabel trace yang dibuat mesin. Setiap baris menunjukkan state yang dipilih dan isi stack sesudah ekspansi.' },
          { type: 'widget', widget: 'graph-view', props: { caseId: 'intro', showCosts: true } },
          { type: 'widget', widget: 'trace-table', props: { caseId: 'intro', mode: 'dfs', showSkips: true, showSummary: true }, caption: 'Tabel trace DFS pada graf materi (dibuat mesin).' },
          { type: 'text', text: 'Iterasi 1: S diekspansi. Successor A, B, C dimasukkan terbalik (C, B, lalu A), sehingga A berada paling atas. Stack: A(g=2); B(g=4); C(g=3).' },
          { type: 'text', text: 'Iterasi 2: A di-pop dan diekspansi. Successor D dan E masuk di atas B dan C. Stack: D(g=4); E(g=7); B(g=4); C(g=3).' },
          { type: 'text', text: 'Iterasi 3: D di-pop dan diekspansi. Successor G masuk di atas. Stack: G(g=9); E(g=7); B(g=4); C(g=3).' },
          { type: 'text', text: 'Iterasi 4: G di-pop, goal test berhasil. Path = G ← D ← A ← S, dibalik menjadi S → A → D → G. Cost = 2 + 2 + 5 = 9. Jumlah ekspansi = 3 (S, A, D).' },
          { type: 'slide', lecture: 2, slide: 36, caption: 'Properti DFS: DFS tidak menjamin path termurah, dan waktunya O(b^m) untuk kedalaman m.' },
          { type: 'text', text: 'Contoh kedua memakai graf slide (l2-tiny). Di sini ada dua entri untuk e. Perhatikan e(g=5) dan e(g=9) di stack setelah iterasi 2: keduanya berasal dari parent berbeda. Entri atas, yaitu e(g=5) lewat d, yang di-pop lebih dulu, sehingga parent e adalah d.' },
          { type: 'widget', widget: 'search-sim', props: { caseId: 'l2-tiny', modes: ['dfs'] }, caption: 'Graf kecil slide 23: DFS graph search dengan closed set.' },
          { type: 'widget', widget: 'trace-table', props: { caseId: 'l2-tiny', mode: 'dfs', showSkips: true }, caption: 'Tabel trace DFS pada graf slide (dibuat mesin). Perhatikan entri q(g=17) yang dilewati.' },
          { type: 'text', text: 'Setelah q(g=32) diekspansi, entri q(g=17) di-pop, tetapi q sudah closed, jadi entri itu dilewati tanpa nomor iterasi. Urutan ekspansi: S, d, b, a, c, e, h, p, q, r, f (11 ekspansi). Path: S → d → e → r → f → G, cost 3 + 2 + 2 + 1 + 2 = 10.' },
          { type: 'note', text: 'Urutan ekspansi tidak sama dengan path. Path hanya rantai parent dari goal. Ekspansi juga bisa mencakup cabang yang tidak ikut path, misalnya p dan q di atas.' }
        ],
        checks: [
          { id: 't1-s3-c1', type: 'input', prompt: 'Graf l2-tiny (slide 23) dengan DFS graph search: berapa cost path S → … → G? (angka saja)', answer: '10', accept: ['10'], explanation: 'Path S → d → e → r → f → G memiliki cost 3 + 2 + 2 + 1 + 2 = 10.' },
          { id: 't1-s3-c2', type: 'input', prompt: 'Graf materi 9 state (intro): berapa jumlah ekspansi DFS? (angka saja)', answer: '3', accept: ['3'], explanation: 'Ekspansinya S, A, D. G adalah goal dan tidak dihitung sebagai ekspansi.' }
        ]
      },
      {
        id: 't1-s4',
        kind: 'menulis',
        title: 'Cara menulis jawaban DFS di kuis',
        blocks: [
          { type: 'text', text: 'Jawaban esai DFS dinilai dari empat hal: konvensi yang tertulis jelas, tabel trace yang benar baris demi baris, hasil (path, cost, ekspansi, urutan), dan penjelasan optimalitas. Gunakan kerangka berikut dan ganti bagian dalam kurung.' },
          { type: 'template', title: 'Kerangka jawaban DFS', text: 'JAWABAN — DFS graph search pada [nama graf], start S, goal G\n1) Aturan yang saya pakai\n- Frontier: stack LIFO.\n- Successor diproses sesuai urutan list, dimasukkan terbalik sehingga successor pertama di atas stack.\n- Goal test saat pop. Entri closed dilewati tanpa nomor iterasi dan tidak dihitung ekspansi.\n- Duplikat: state yang belum closed boleh masuk stack lagi; closed dicek saat pop.\n2) Tabel trace\nIterasi | Dipilih | g | Aksi | Stack sesudah (atas → bawah)\n1 | S | 0 | expand | A(g=..); B(g=..); C(g=..)\n...\n3) Hasil\nPath: S → … → G\nTotal cost: a + b + … = …\nJumlah ekspansi: … (sebutkan state-nya)\nUrutan ekspansi: …\n4) Dua keputusan yang saya jelaskan (sertakan entri yang dilewati bila ada)\n5) Optimal atau tidak? Beri path pembanding dengan cost lebih kecil bila ada.' },
          { type: 'list', items: [
            'Rubrik umum: konvensi 10 poin, tabel 40 poin, hasil 20 poin, optimalitas 15 poin, dua keputusan 15 poin (total 100).',
            'Tulis path sebagai rantai parent dari goal, lalu dibalik. Jangan menulis urutan ekspansi sebagai path.',
            'Goal dan entri yang dilewati tidak dihitung sebagai ekspansi.'
          ]},
          { type: 'warning', text: 'Kesalahan yang sering terjadi pada DFS: lupa membalik push sehingga successor terakhir berada di atas; tidak menulis duplikat yang masih ada di stack; mengekspansi state yang sudah closed; menghitung entri yang dilewati sebagai iterasi; menguji goal saat state ditemukan, bukan saat di-pop.' },
          { type: 'widget', widget: 'trace-table', props: { caseId: 'assignment', mode: 'dfs', showSkips: true }, caption: 'Contoh tabel untuk graf tugas. Gunakan sebagai referensi format, bukan hafalan.' }
        ],
        checks: [
          { id: 't1-s4-c1', type: 'mcq', prompt: 'Dari mana path DFS ditentukan?', options: [
            'Urutan ekspansi dibaca dari awal ke akhir',
            'Rantai parent dari goal, lalu dibalik',
            'Entri stack terakhir sebelum goal',
            'Successor dengan g terkecil pada setiap iterasi'
          ], answer: 1, explanation: 'Setiap entri menyimpan parent. Dari goal kamu ikuti parent sampai start, lalu balik urutannya.' }
        ]
      },
      {
        id: 't1-s5',
        kind: 'latihan',
        title: 'Latihan: isi baris berikutnya',
        blocks: [
          { type: 'text', text: 'Isi baris berikutnya dari tabel trace. Format kandidat sama seperti di tabel: X(g=..). Tekan “Petunjuk” jika ragu. Setiap drill menilai baris per baris dan memberi tahu jika ada entri yang dilewati.' },
          { type: 'widget', widget: 'trace-drill', props: { caseId: 'intro', mode: 'dfs', drillId: 't1-d1', statesOnlyOption: true }, caption: 'Drill 1: graf materi 9 state.' },
          { type: 'widget', widget: 'trace-drill', props: { caseId: 'assignment', mode: 'dfs', drillId: 't1-d2', statesOnlyOption: true }, caption: 'Drill 2: graf tugas 14 state.' },
          { type: 'widget', widget: 'trace-drill', props: { caseId: 'l2-tiny', mode: 'dfs', drillId: 't1-d3', statesOnlyOption: true }, caption: 'Drill 3: graf slide 23 (perhatikan entri usang).' },
          { type: 'note', text: 'Setelah drill, kerjakan esai latihan di halaman esai topik ini. Esai pertama memakai graf tugas, dan esai kedua memakai graf slide dengan perbandingan konvensi.' }
        ],
        checks: []
      },
      {
        id: 't1-s6',
        kind: 'cek',
        title: 'Cek cepat DFS',
        blocks: [
          { type: 'text', text: 'Jawab tujuh pertanyaan singkat. Jawaban yang salah akan menunjukkan bagian yang perlu kamu ulang.' }
        ],
        checks: [
          { id: 't1-s6-c1', type: 'input', prompt: 'Graf tugas: tulis urutan ekspansi DFS-A dipisahkan koma (contoh: S,A,…).', answer: 'S,A,D,I,L', accept: ['S-A-D-I-L', 'S A D I L', 'S, A, D, I, L'], explanation: 'Ekspansinya S, A, D, I, L. Goal G dicapai saat di-pop setelah L.' },
          { id: 't1-s6-c2', type: 'input', prompt: 'Graf tugas: berapa total cost path DFS-A? (angka saja)', answer: '20', accept: ['20'], explanation: 'S → A (3) → D (4) → I (4) → L (3) → G (6) = 20.' },
          { id: 't1-s6-c3', type: 'mcq', prompt: 'Apakah DFS selalu menemukan path termurah?', options: [
            'Ya, karena DFS selalu menemukan path paling pendek',
            'Tidak, DFS memilih solusi paling kiri tanpa melihat biaya',
            'Ya, asalkan graf tidak punya siklus',
            'Hanya jika heuristik admissible'
          ], answer: 1, explanation: 'DFS tidak membandingkan biaya. Pada graf tugas, DFS menemukan cost 20, sedangkan S → C → F → J → M → G hanya 17.', source: 'Lecture 2 slide 36' },
          { id: 't1-s6-c4', type: 'mcq', prompt: 'Berapa kira-kira ruang yang dipakai DFS tree search untuk kedalaman m dengan faktor cabang b?', options: [
            'O(b^m) waktu dan O(b^m) ruang',
            'O(b^m) waktu dan O(bm) ruang',
            'O(bm) waktu dan O(b^m) ruang',
            'O(m) waktu dan O(1) ruang'
          ], answer: 1, explanation: 'Slide 36: waktu O(b^m) dan ruang O(bm), karena fringe hanya menyimpan saudara-saudara sepanjang jalur ke akar.', source: 'Lecture 2 slide 36' },
          { id: 't1-s6-c5', type: 'input', prompt: 'Graf slide l2-tiny: tulis urutan ekspansi DFS-A dipisahkan koma (dimulai dengan S).', answer: 'S,d,b,a,c,e,h,p,q,r,f', accept: ['S-d-b-a-c-e-h-p-q-r-f', 'S,d,b,a,c,e,h,p,q,r,f'], explanation: 'Ada 11 ekspansi. Goal G di-pop setelah f, tetapi tidak dihitung.' },
          { id: 't1-s6-c6', type: 'mcq', prompt: 'Graf tugas, push sesuai urutan list tanpa dibalik. Iterasi pertama memilih state apa setelah S diekspansi?', options: [
            'A, karena A pertama dalam urutan list',
            'C, karena entri terakhir yang dimasukkan berada paling atas',
            'B, karena B berbiaya 5',
            'G, karena G adalah goal'
          ], answer: 1, explanation: 'Tanpa pembalikan, successor terakhir (C) dimasukkan terakhir dan berada paling atas, sehingga C yang di-pop berikutnya. Itu sebabnya hasilnya S-C-H-K-M-G.' },
          { id: 't1-s6-c7', type: 'input', prompt: 'Graf materi 9 state, setelah A diekspansi (konvensi DFS-A): sebutkan semua entri stack dari atas ke bawah, hanya nama state (contoh: X,Y,Z).', answer: 'D,E,B,C', accept: ['D-E-B-C', 'D E B C', 'D, E, B, C'], explanation: 'Successor A adalah D dan E. Setelah dibalik, D berada paling atas, lalu E, lalu sisa stack B dan C.' }
        ]
      }
    ],
    essays: [
      {
        id: 't1-e1',
        title: 'DFS pada graf tugas',
        exam: false,
        variant: false,
        source: 'Tugas individu §2 (graf 14 state), konvensi DFS-A',
        minutes: 15,
        prompt: 'Graf tugas individu (14 state, berarah) dari S ke G. Jalankan DFS graph search dengan konvensi web (stack LIFO, successor dimasukkan terbalik, closed dicek saat pop).\n(a) Tulis tabel trace: Iterasi | Dipilih | g | Aksi | Stack sesudah.\n(b) Tulis path, total cost, jumlah ekspansi, dan urutan ekspansi.\n(c) Apakah path itu minimum? Beri path pembanding bila tidak.\n(d) Jelaskan dua keputusan dari trace (misalnya kenapa A dipilih di iterasi 2).',
        figure: { widget: 'graph-view', props: { caseId: 'assignment' } },
        solution: 'Konvensi: stack LIFO, successor dimasukkan terbalik, closed dicek saat pop.\nTabel: 5 ekspansi (S, A, D, I, L) lalu goal G di iterasi 6. Tidak ada entri yang di-pop lalu dilewati sebelum goal; entri B(g=4), B(g=5), C(g=4), E(g=9), dan E(g=10) masih tersisa di stack ketika goal ditemukan.\nPath: S → A → D → I → L → G, cost 3 + 4 + 4 + 3 + 6 = 20. Jumlah ekspansi 5. Urutan ekspansi S, A, D, I, L.\nTidak minimum: S → C → F → J → M → G berbiaya 4 + 3 + 3 + 4 + 3 = 17, jadi DFS tidak optimal.\nKeputusan 1: iterasi 2 memilih A karena A adalah successor pertama S dan berada paling atas stack.\nKeputusan 2: iterasi 5 memilih L karena L adalah successor pertama I dalam urutan list, sehingga L berada di atas J dan dipilih lebih dulu. Ini bukan karena L lebih murah.',
        solutionBlocks: [
          { type: 'widget', widget: 'trace-table', props: { caseId: 'assignment', mode: 'dfs', showSkips: true }, caption: 'Tabel trace kunci (dibuat mesin).' },
          { type: 'text', text: 'Path: S → A → D → I → L → G. Total cost 3 + 4 + 4 + 3 + 6 = 20. Jumlah ekspansi 5 (S, A, D, I, L). Urutan ekspansi S, A, D, I, L.' },
          { type: 'text', text: 'Optimal? Tidak. Path S → C → F → J → M → G berbiaya 17, lebih murah dari 20. Satu path pembanding sudah cukup untuk membantah optimalitas.' },
          { type: 'text', text: 'Iterasi 2 memilih A karena A paling atas di stack. Iterasi 2 juga menunjukkan dua entri B: B(g=4) lewat A di atas B(g=5) lewat S. Iterasi 5 memilih L karena L adalah successor pertama I dalam urutan list.' }
        ],
        rubric: [
          { text: 'Konvensi ditulis di awal jawaban dan sesuai dengan yang dipakai di tabel', points: 10 },
          { text: 'Tabel: baris ekspansi benar (6 baris), frontier sesudah tiap baris benar, entri usang ditandai', points: 40 },
          { text: 'Path, total cost (20), jumlah ekspansi (5), dan urutan ekspansi benar', points: 20 },
          { text: 'Menyatakan tidak optimal dan memberi path pembanding (cost 17)', points: 15 },
          { text: 'Dua keputusan dijelaskan dengan alasan dari konvensi (bukan “karena kecil”)', points: 15 }
        ]
      },
      {
        id: 't1-e2',
        title: 'DFS pada graf slide dan perbandingan konvensi',
        exam: false,
        variant: false,
        source: 'Lecture 2 slide 23/45/47 (graf l2-tiny)',
        minutes: 15,
        prompt: 'Graf slide berikut (l2-tiny) dari S ke G.\n(a) Jalankan DFS graph search dengan konvensi web. Tulis tabel trace lengkap, termasuk entri yang dilewati.\n(b) Tulis path, cost, jumlah ekspansi, dan urutan ekspansi.\n(c) Bandingkan dengan konvensi (a): cek “sudah ditemukan” saat push. Apa path dan jumlah ekspansinya?',
        figure: { widget: 'graph-view', props: { caseId: 'l2-tiny' } },
        solution: 'Konvensi DFS-A: 11 ekspansi (S, d, b, a, c, e, h, p, q, r, f) lalu goal G di-pop. Entri q(g=17) dilewati karena q sudah closed.\nPath: S → d → e → r → f → G, cost 3 + 2 + 2 + 1 + 2 = 10.\nKonvensi (a), cek saat push: S → e → r → f → G, cost 9 + 2 + 1 + 2 = 14. Ekspansinya S, d, b, a, c, e, h, q, r, f (10 ekspansi), karena e(g=9) sudah ada dari S dan tidak dimasukkan ulang dari d.\nPerbedaan: pada konvensi (a) e dicapai pertama kali dari S dengan g=9, jadi jalur lewat d tidak pernah masuk stack sebagai kandidat baru.',
        solutionBlocks: [
          { type: 'widget', widget: 'trace-table', props: { caseId: 'l2-tiny', mode: 'dfs', showSkips: true }, caption: 'Konvensi DFS-A (dibuat mesin).' },
          { type: 'text', text: 'Path DFS-A: S → d → e → r → f → G, cost 10. Jumlah ekspansi 11. Urutan ekspansi S, d, b, a, c, e, h, p, q, r, f.' },
          { type: 'text', text: 'Konvensi (a) cek saat push: path S → e → r → f → G, cost 14, jumlah ekspansi 10 (S, d, b, a, c, e, h, q, r, f).' }
        ],
        rubric: [
          { text: 'Konvensi ditulis dan tabel dari DFS-A benar (urutan, skip, frontier)', points: 10 },
          { text: 'Path, cost, jumlah ekspansi, dan urutan ekspansi DFS-A benar', points: 40 },
          { text: 'Hasil konvensi (a) dihitung dengan benar (path, cost 14)', points: 20 },
          { text: 'Penjelasan kenapa hasilnya berbeda, mengacu ke entri e(g=9) dan e(g=5)', points: 30 }
        ]
      },
      {
        id: 't1-e3',
        title: 'Tiga graf, tiga konvensi',
        exam: false,
        variant: false,
        source: 'Konvensi DFS pada graf materi, graf slide, dan graf tugas',
        minutes: 15,
        prompt: 'Tanpa menulis tabel lengkap, tentukan path dan cost DFS pada tiga graf berikut: graf materi 9 state (intro), graf slide (l2-tiny), dan graf tugas (assignment). Untuk setiap graf, tentukan hasil dengan (1) konvensi web DFS-A, (2) push sesuai urutan list, dan (3) cek sudah ditemukan saat push. Jelaskan sumber perbedaannya dalam tiga sampai lima kalimat.',
        solution: 'Graf materi (intro): (1) S-A-D-G, cost 9; (2) S-C-H-G, cost 13; (3) S-A-D-G, cost 9.\nGraf slide (l2-tiny): (1) S-d-e-r-f-G, cost 10; (2) S-e-r-f-G, cost 14; (3) S-e-r-f-G, cost 14.\nGraf tugas (assignment): (1) S-A-D-I-L-G, cost 20; (2) S-C-H-K-M-G, cost 18; (3) S-A-D-I-L-G, cost 20.\nSumber perbedaan: urutan push menentukan successor mana yang di atas stack, sehingga menentukan cabang mana yang ditelusuri dulu. Cek saat push mengubah entri yang sudah ada menjadi tidak masuk lagi, sehingga jalur yang pertama kali ditemukan bisa berbeda dari jalur yang lebih murah.',
        rubric: [
          { text: 'Sembilan nilai hasil benar (path dan cost untuk tiga graf dan tiga konvensi), masing-masing 8 poin', points: 72 },
          { text: 'Penjelasan sumber perbedaan: urutan push dan kapan closed atau sudah-ditemukan dicek', points: 28 }
        ]
      },
      {
        id: 't1-x1',
        title: 'DFS pada peta Romania',
        exam: true,
        set: 'A',
        variant: false,
        source: 'Peta Romania (L2 slide 17, cases.js romania), urutan successor alfabetis',
        minutes: 20,
        prompt: 'Peta Romania dari Arad (A) ke Bucharest (B). Jalan dua arah. Successor setiap kota diurutkan alfabetis sesuai daftar di graf (case romania). Jalankan DFS graph search dengan konvensi web.\n(a) Tulis tabel trace: Iterasi | Dipilih | g | Aksi | Stack sesudah.\n(b) Tulis path, total cost, jumlah ekspansi, dan urutan ekspansi.\n(c) Bandingkan dengan UCS pada peta yang sama. Mana yang lebih murah dan kenapa DFS tidak menemukan itu?',
        figure: { widget: 'graph-view', props: { caseId: 'romania' } },
        solution: 'Konvensi DFS-A. Ekspansi: A, S, F (3 ekspansi). Goal B di-pop setelah F.\nPath: A → S → F → B, cost 140 + 99 + 211 = 450.\nUCS pada peta yang sama menemukan A → S → R → P → B dengan cost 418, lebih murah 32.\nDFS tidak optimal karena memilih cabang paling kiri dan dalam: S lalu F, tanpa membandingkan total biaya dengan cabang R atau T.',
        solutionBlocks: [
          { type: 'widget', widget: 'trace-table', props: { caseId: 'romania', mode: 'dfs', showSkips: true }, caption: 'DFS pada peta Romania (dibuat mesin).' },
          { type: 'text', text: 'Path A → S → F → B, cost 450. Jumlah ekspansi 3 (A, S, F). Urutan ekspansi A, S, F.' },
          { type: 'text', text: 'Perbandingan: UCS menemukan A → S → R → P → B dengan cost 418. DFS tidak optimal karena tidak membandingkan biaya.' }
        ],
        rubric: [
          { text: 'Konvensi ditulis dan sesuai dengan tabel', points: 10 },
          { text: 'Tabel trace benar baris demi baris (4 baris kunci)', points: 40 },
          { text: 'Path (A-S-F-B), cost 450, jumlah ekspansi 3, urutan ekspansi benar', points: 20 },
          { text: 'Perbandingan dengan UCS (418) dan penjelasan kenapa DFS tidak optimal', points: 30 }
        ]
      },
      {
        id: 't1-x2',
        title: 'DFS pada graf slide L3 slide 26',
        exam: true,
        set: 'B',
        variant: false,
        source: 'Lecture 3 slide 26 (graf Teg), cases.js l3-teg',
        minutes: 20,
        prompt: 'Graf slide L3 slide 26 dari S ke G (cases l3-teg). Jalankan DFS graph search dengan konvensi web.\n(a) Tulis tabel trace lengkap, termasuk entri yang dilewati.\n(b) Tulis path, total cost, jumlah ekspansi, dan urutan ekspansi.\n(c) Apakah hasil DFS optimal pada graf ini? Jelaskan dengan membandingkan dengan satu path lain yang kamu temukan.',
        figure: { widget: 'graph-view', props: { caseId: 'l3-teg' } },
        solution: 'Konvensi DFS-A. Ekspansi: S, a, b, c, d (5 ekspansi). G di-pop setelah d.\nPath: S → a → d → G, cost 1 + 3 + 2 = 6.\nKarena c tidak punya successor, DFS kembali ke entri d(g=4) yang dibuat dari a, lalu mencapai G.\nHasil ini optimal pada graf ini hanya kebetulan: UCS juga menemukan cost 6, jadi hasil ini tidak membuktikan bahwa DFS selalu optimal.',
        solutionBlocks: [
          { type: 'widget', widget: 'trace-table', props: { caseId: 'l3-teg', mode: 'dfs', showSkips: true }, caption: 'DFS pada graf slide L3-26 (dibuat mesin).' },
          { type: 'text', text: 'Path S → a → d → G, cost 6. Jumlah ekspansi 5 (S, a, b, c, d). Urutan ekspansi S, a, b, c, d.' },
          { type: 'text', text: 'Optimal? Pada graf ini ya, tetapi hanya kebetulan: UCS juga menemukan 6. DFS tidak menjamin optimal, karena pilihan cabang tidak memperhitungkan biaya. Pembanding yang sama tidak selalu tersedia; lihat esai x1 untuk graf yang DFS-nya tidak optimal.' }
        ],
        rubric: [
          { text: 'Konvensi ditulis dan sesuai dengan tabel', points: 10 },
          { text: 'Tabel trace benar baris demi baris (6 baris, termasuk tentang d dari a)', points: 40 },
          { text: 'Path, cost 6, jumlah ekspansi 5, urutan ekspansi benar', points: 20 },
          { text: 'Analisis optimalitas: menyebut bahwa hasil ini kebetulan dan memberi pembanding', points: 30 }
        ]
      }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = topic;
  if (root) (root.KKA_TOPICS = root.KKA_TOPICS || []).push(topic);
})(typeof window !== 'undefined' ? window : globalThis);
