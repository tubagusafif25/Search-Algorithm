(function (root) { 'use strict';
  var topic = {
    id: 't3',
    number: 3,
    slug: 'greedy',
    title: 'Greedy Best-First Search',
    short: 'Greedy',
    summary: 'Greedy memilih kandidat yang diperkirakan paling dekat dengan goal (h terkecil). Cepat dan sederhana, tetapi tidak menjamin path termurah karena biaya yang sudah ditempuh (g) diabaikan. Di kuis, kamu harus menulis trace Greedy dan menjawab lima pertanyaan analisis dari tugas.',
    goals: [
      'Menjalankan Greedy best-first search dengan prioritas h dan tie FIFO.',
      'Menjelaskan aturan “path pertama disimpan” dan kenapa state yang sudah ditemukan tidak dimasukkan ulang.',
      'Menjawab pertanyaan analisis Greedy: pemilihan, peran heuristik, optimalitas, keputusan, dan kelemahan.',
      'Menjelaskan pengaruh perubahan heuristik (variasi V1, V4, V6) pada path dan jumlah ekspansi.'
    ],
    sources: [
      { label: 'Lecture 3 slide 14–21 (informed search, greedy)', lecture: 3, slide: 21 },
      { label: 'Lecture 3 slide 19 (heuristik garis lurus Romania)', lecture: 3, slide: 19 },
      { label: 'Lecture 3 slide 26 (kombinasi UCS dan greedy)', lecture: 3, slide: 26 },
      { label: 'Notebook 01_materi_informed_search §5 dan §7c', notebook: '01_materi_informed_search' },
      { label: 'Tugas individu §3, §5 (analisis Greedy), §6 (eksperimen heuristik)', notebook: '02_tugas_individu' }
    ],
    sections: [
      {
        id: 't3-s1',
        kind: 'intuisi',
        title: 'Jalan yang terlihat paling dekat',
        blocks: [
          { type: 'intuition', text: 'Kamu ingin pulang ke rumah. Dari setiap persimpangan, kamu memilih jalan yang kelihatannya paling dekat ke rumah, tanpa peduli sudah berjalan berapa jauh. Itulah Greedy: ia hanya melihat perkiraan jarak tersisa, yaitu h.' },
          { type: 'slide', lecture: 3, slide: 19, caption: 'Heuristik garis lurus ke Bucharest untuk setiap kota Romania. Ini nilai h yang dipakai Greedy.' },
          { type: 'slide', lecture: 3, slide: 21, caption: 'Greedy: expand a node that you think is closest to a goal state. Best-first membawamu langsung ke goal yang salah; kasus terburuk seperti DFS yang dipandu salah.' },
          { type: 'widget', widget: 'graph-view', props: { caseId: 'intro', showCosts: true, showHeuristic: true }, caption: 'Graf materi 9 state dengan nilai h di setiap state.' }
        ],
        checks: [
          { id: 't3-s1-c1', type: 'mcq', prompt: 'Greedy memilih kandidat dengan prioritas apa?', options: [
            'g terkecil',
            'h terkecil',
            'f = g + h terkecil',
            'Biaya total path yang paling murah sejauh ini sambil memperhitungkan h'
          ], answer: 1, explanation: 'Greedy hanya memakai h: perkiraan sisa ke goal. g tidak ikut menentukan prioritas.' },
          { id: 't3-s1-c2', type: 'mcq', prompt: 'Apa yang bisa salah pada Greedy?', options: [
            'Tidak pernah berhenti',
            'Menemukan goal yang salah karena biaya yang sudah ditempuh diabaikan',
            'Tidak bisa dijalankan jika h ada',
            'Selalu menemukan path termurah'
          ], answer: 1, explanation: 'Slide 21: best-first membawamu ke goal yang terlihat dekat, bukan goal dengan biaya terkecil. Di graf materi, F terlihat dekat (h = 1), tetapi jalan F → G berbiaya 9.' }
        ]
      },
      {
        id: 't3-s2',
        kind: 'aturan',
        title: 'Aturan Greedy graph search yang dipakai di kuis',
        blocks: [
          { type: 'text', text: 'Aturan Greedy di tugas dan di aplikasi ini mengikuti notebook. Perhatikan bahwa state yang sudah ditemukan tidak dimasukkan ulang: Greedy menyimpan path pertama yang ditemukan dan tidak memperbaikinya.' },
          { type: 'list', ordered: true, items: [
            'Frontier = priority queue dengan entri (h, nomor urut, state). Tie diputus FIFO: yang masuk lebih dulu dipilih lebih dulu.',
            'Successor diproses sesuai urutan list graf.',
            'Setiap state punya parent yang disimpan pertama kali ditemukan. Path pertama dipertahankan.',
            'Successor yang sudah ditemukan (ada di parent) atau sudah diekspansi (visited) tidak dimasukkan ulang.',
            'Goal test dilakukan saat pop. Goal dan entri yang dilewati tidak dihitung sebagai ekspansi.',
            'g hanya dihitung untuk laporan cost path. Ia tidak mengubah urutan.',
            'Snapshot frontier berisi kandidat dengan format X(h=..), diurutkan menurut h lalu FIFO.'
          ]},
          { type: 'pseudocode', title: 'Greedy best-first graph search', lines: [
            'GREEDY(graph, start, goal, h):',
            '  heap ← [(h(start), 0, start)]; parent ← {start: None}; visited ← {}',
            '  while heap tidak kosong:',
            '    (_, _, s) ← pop(heap)',
            '    if s ∈ visited: continue',
            '    if s == goal: return path(parent, s)',
            '    visited.add(s); ekspansi += 1',
            '    for (n, c) in graph[s]:',
            '      if n ∉ parent:                 # hanya penemuan pertama',
            '        parent[n] ← s',
            '        push(heap, (h(n), counter, n))',
            '  return gagal'
          ]},
          { type: 'note', text: 'Notebook §7c: Greedy tidak menjamin path termurah. Pada graf yang sama, Greedy dan A* bisa memilih jalur berbeda karena prioritas yang berbeda.' },
          { type: 'warning', text: 'Jangan mengubah parent state yang sudah ditemukan, meskipun jalur baru terlihat lebih murah. Itu aturan Greedy di tugas, bukan kesalahan. Kalau kamu ingin memperbaiki biaya, itu A* (topik 4).' }
        ],
        checks: [
          { id: 't3-s2-c1', type: 'mcq', prompt: 'Di graf slide l3-teg, d sudah ditemukan dari a. Saat e diekspansi dan punya successor d, apa yang Greedy lakukan?', options: [
            'Memperbarui parent d menjadi e',
            'Tidak memasukkan d lagi, dan parent d tetap a',
            'Memasukkan d sebagai duplikat dengan h yang sama',
            'Menghentikan pencarian'
          ], answer: 1, explanation: 'Greedy menyimpan path pertama. d sudah ditemukan dari a, sehingga parent-nya tetap a meskipun dari e ada jalur ke d.' },
          { id: 't3-s2-c2', type: 'input', prompt: 'Graf tugas: setelah S diekspansi, B(h=7) dan C(h=7) tie. Mana yang dipilih di iterasi berikutnya? (satu huruf)', answer: 'B', accept: ['b'], explanation: 'Tie diputus FIFO. B masuk lebih dulu daripada C karena B ada sebelum C dalam urutan successor S.' }
        ]
      },
      {
        id: 't3-s3',
        kind: 'contoh',
        title: 'Contoh langkah demi langkah: graf materi dan Romania',
        blocks: [
          { type: 'text', text: 'Jalankan Greedy pada graf materi. Dari S, B (h=2) dipilih karena paling dekat ke goal menurut h. Dari B, F (h=1) dipilih. Dari F, G (h=0) masuk dan diuji sebagai goal.' },
          { type: 'widget', widget: 'trace-table', props: { caseId: 'intro', mode: 'greedy', showSummary: true }, caption: 'Tabel trace Greedy pada graf materi (dibuat mesin).' },
          { type: 'text', text: 'Path S → B → F → G dengan cost 4 + 2 + 9 = 15, dan jumlah ekspansi 3 (S, B, F). Padahal A* menemukan path S → A → D → G dengan cost 9. F terlihat dekat (h = 1), tetapi jalan F → G mahal (9). Greedy tidak melihat biaya itu sampai terlambat.' },
          { type: 'widget', widget: 'search-sim', props: { caseId: 'romania', modes: ['greedy', 'astar'] }, caption: 'Greedy: Arad → Sibiu → Fagaras → Bucharest, cost 450. A*: cost 418.' },
          { type: 'text', text: 'Pada peta Romania, Greedy memilih S (h = 253), lalu F (h = 178), lalu B (h = 0). Hasil: A → S → F → B, cost 450, dengan 3 ekspansi (A, S, F). A* menemukan jalur yang lebih murah lewat R dan P.' }
        ],
        checks: [
          { id: 't3-s3-c1', type: 'input', prompt: 'Graf materi (intro): tulis path Greedy dipisahkan koma, mulai dari S.', answer: 'S,B,F,G', accept: ['S-B-F-G', 'S B F G', 'S,B,F,G'], explanation: 'Path Greedy S → B → F → G.' },
          { id: 't3-s3-c2', type: 'input', prompt: 'Graf materi (intro): berapa cost path Greedy? (angka saja)', answer: '15', accept: ['15'], explanation: 'S → B (4) + B → F (2) + F → G (9) = 15.' }
        ]
      },
      {
        id: 't3-s4',
        kind: 'menulis',
        title: 'Cara menulis jawaban Greedy di kuis',
        blocks: [
          { type: 'text', text: 'Jawaban Greedy menjawab lima pertanyaan analisis dari tugas. Trace harus ada, tetapi pertanyaan analisis yang menentukan nilai di bagian ini. Gunakan kerangka berikut.' },
          { type: 'template', title: 'Kerangka jawaban Greedy', text: 'JAWABAN — Greedy best-first pada [nama graf], start S, goal G\n1) Aturan yang saya pakai\n- Frontier: priority queue dengan prioritas h, tie FIFO.\n- Path pertama dipertahankan; state yang sudah ditemukan tidak dimasukkan ulang.\n- Goal test saat pop. g hanya untuk laporan cost.\n2) Tabel trace\nIterasi | Dipilih | h | Aksi | Frontier sesudah\n1 | S | 9 | expand | B(h=7); C(h=7); A(h=8)\n...\n3) Hasil\nPath: S → … → G\nTotal cost: a + b + … = …\nJumlah ekspansi: … (sebutkan state-nya)\n4) Analisis (lima pertanyaan tugas)\n(1) Bagaimana state berikutnya dipilih, termasuk tie?\n(2) Apa peran heuristik, dan kenapa g tidak menjadi prioritas?\n(3) Apakah path minimum? Beri pembanding dengan cost lebih kecil.\n(4) Satu keputusan ketika h memengaruhi pilihan, dengan minimal dua kandidat.\n(5) Kelemahan Greedy yang terlihat dari hasil saya.' },
          { type: 'list', items: [
            'Rubrik umum: aturan 10 poin, tabel 35 poin, hasil 15 poin, analisis 40 poin (8 poin per pertanyaan).',
            'Untuk nomor 3, satu path yang lebih murah cukup untuk membantah optimalitas.',
            'Untuk nomor 4, sebut kandidat yang tie dan urutan masuk, misalnya B dan C pada iterasi 2.'
          ]},
          { type: 'warning', text: 'Kesalahan umum Greedy: memakai g sebagai prioritas; mengubah parent state yang sudah ditemukan; memasukkan kembali state yang sudah visited; menyebut Greedy “pasti optimal” hanya karena trace-nya pendek.' }
        ],
        checks: [
          { id: 't3-s4-c1', type: 'mcq', prompt: 'Analisis tugas nomor 3 meminta pembanding. Mana pembanding yang tepat untuk graf tugas?', options: [
            'Path yang lebih panjang dalam jumlah edge',
            'Path S → C → F → J → M → G dengan cost 17, yang lebih murah daripada 21',
            'Jumlah ekspansi yang lebih banyak',
            'Path yang tidak memakai goal'
          ], answer: 1, explanation: 'Satu path yang lebih murah sudah membantah optimalitas. S → C → F → J → M → G berbiaya 17 < 21.' }
        ]
      },
      {
        id: 't3-s5',
        kind: 'latihan',
        title: 'Latihan: isi baris Greedy dan eksperimen heuristik',
        blocks: [
          { type: 'text', text: 'Isi baris berikutnya dari tabel Greedy. Kandidat ditulis X(h=..), diurutkan menurut h lalu FIFO. Setelah drill, coba eksperimen variasi heuristik.' },
          { type: 'widget', widget: 'trace-drill', props: { caseId: 'intro', mode: 'greedy', drillId: 't3-d1', statesOnlyOption: true }, caption: 'Drill 1: graf materi 9 state.' },
          { type: 'widget', widget: 'trace-drill', props: { caseId: 'assignment', mode: 'greedy', drillId: 't3-d2', statesOnlyOption: true }, caption: 'Drill 2: graf tugas 14 state.' },
          { type: 'widget', widget: 'trace-drill', props: { caseId: 'l3-teg', mode: 'greedy', drillId: 't3-d3', statesOnlyOption: true }, caption: 'Drill 3: graf slide L3-26.' },
          { type: 'widget', widget: 'variant-lab', props: { caseId: 'assignment', mode: 'greedy', presets: ['V1', 'V4', 'V6', 'E1'], allowCustom: true }, caption: 'Variasi dari graf tugas, bukan soal resmi. Ubah h lalu lihat path Greedy berubah.' }
        ],
        checks: []
      },
      {
        id: 't3-s6',
        kind: 'cek',
        title: 'Cek cepat Greedy',
        blocks: [
          { type: 'text', text: 'Jawab tujuh pertanyaan singkat. Untuk pertanyaan angka, tulis angka saja.' }
        ],
        checks: [
          { id: 't3-s6-c1', type: 'input', prompt: 'Graf tugas: tulis path Greedy dipisahkan koma (dimulai dengan S).', answer: 'S,B,F,J,M,G', accept: ['S-B-F-J-M-G', 'S,B,F,J,M,G'], explanation: 'Path Greedy S → B → F → J → M → G.' },
          { id: 't3-s6-c2', type: 'input', prompt: 'Graf tugas: berapa cost path Greedy? (angka saja)', answer: '21', accept: ['21'], explanation: 'S → B (5) + B → F (6) + F → J (3) + J → M (4) + M → G (3) = 21.' },
          { id: 't3-s6-c3', type: 'input', prompt: 'Graf tugas: berapa jumlah ekspansi Greedy? (angka saja)', answer: '5', accept: ['5'], explanation: 'Ekspansinya S, B, F, J, M. G adalah goal dan tidak dihitung.' },
          { id: 't3-s6-c4', type: 'mcq', prompt: 'Apakah path Greedy pada graf tugas minimum?', options: [
            'Ya, karena Greedy selalu minimum',
            'Tidak, S → C → F → J → M → G berbiaya 17 lebih murah',
            'Ya, karena jumlah ekspansinya paling kecil',
            'Tidak bisa ditentukan'
          ], answer: 1, explanation: 'Satu path yang lebih murah sudah membantah optimalitas. Cost 17 < 21.' },
          { id: 't3-s6-c5', type: 'input', prompt: 'Variasi V1 (h(C)=6, h(F)=4, h(H)=4): berapa cost path Greedy? (angka saja)', answer: '17', accept: ['17'], explanation: 'Dengan h(C) = 6 < h(B) = 7, Greedy memilih C lebih dulu dan berakhir di S → C → F → J → M → G, cost 17.' },
          { id: 't3-s6-c6', type: 'mcq', prompt: 'Graf slide L3-26: kenapa path ke d lewat a, padahal e sudah diekspansi dan punya successor d?', options: [
            'Karena e tidak boleh diekspansi',
            'Karena d sudah ditemukan dari a lebih dulu, sehingga tidak dimasukkan ulang',
            'Karena h(d) lebih besar dari h(e)',
            'Karena cost e → d lebih besar dari a → d'
          ], answer: 1, explanation: 'Greedy menyimpan penemuan pertama. d sudah ditemukan dari a, jadi e → d tidak mengubah parent d.' },
          { id: 't3-s6-c7', type: 'input', prompt: 'Peta Romania dengan Greedy: berapa cost path? (angka saja)', answer: '450', accept: ['450'], explanation: 'Greedy menemukan A → S → F → B, cost 140 + 99 + 211 = 450.' }
        ]
      }
    ],
    essays: [
      {
        id: 't3-e1',
        title: 'Greedy pada graf tugas dan lima analisis',
        exam: false,
        variant: false,
        source: 'Tugas individu §2 dan §5 (analisis NRP ganjil, Greedy)',
        minutes: 15,
        prompt: 'Graf tugas individu (14 state) dari S ke G. Jalankan Greedy best-first graph search dengan h yang diberikan.\n(a) Tulis tabel trace: Iterasi | Dipilih | h | Aksi | Frontier sesudah.\n(b) Tulis path, total cost, jumlah ekspansi, dan urutan ekspansi.\nJawab lima pertanyaan analisis:\n(1) Bagaimana state berikutnya dipilih dari frontier?\n(2) Apa peran heuristik? Kenapa g tidak menjadi prioritas?\n(3) Apakah path Anda minimum? Bandingkan cost dengan alternatif yang relevan.\n(4) Tunjukkan satu keputusan ketika heuristik memengaruhi pilihan, dengan minimal dua kandidat.\n(5) Apa kelemahan Greedy yang terlihat dari hasil Anda?',
        figure: { widget: 'graph-view', props: { caseId: 'assignment', showHeuristic: true } },
        solution: 'Trace: 5 ekspansi (S, B, F, J, M), lalu goal G di iterasi 6.\nPath: S → B → F → J → M → G, cost 5 + 6 + 3 + 4 + 3 = 21. Urutan ekspansi S, B, F, J, M.\n(1) Greedy memilih state dengan h terkecil di frontier. Tie diputus FIFO.\n(2) h memandu pencarian. g tidak menjadi prioritas karena Greedy hanya memperkirakan sisa perjalanan. g hanya dihitung untuk laporan cost.\n(3) Tidak minimum. S → C → F → J → M → G berbiaya 17, lebih murah dari 21.\n(4) Iterasi 2: B(h=7) dan C(h=7) tie. B masuk lebih dulu, jadi B dipilih. Iterasi 4: J(h=4) dan K(h=4) tie. J masuk lebih dulu, jadi J dipilih.\n(5) Kelemahan: mengabaikan biaya yang sudah ditempuh. F pertama kali ditemukan dari B, sehingga path S → B → F (biaya 11) disimpan. C tidak pernah diekspansi, padahal S → C → F hanya berbiaya 7. Greedy tidak membandingkan kedua jalur itu.',
        solutionBlocks: [
          { type: 'widget', widget: 'trace-table', props: { caseId: 'assignment', mode: 'greedy', showSummary: true }, caption: 'Tabel trace Greedy pada graf tugas (dibuat mesin).' }
        ],
        rubric: [
          { text: 'Aturan Greedy ditulis (priority h, tie FIFO, path pertama dipertahankan)', points: 10 },
          { text: 'Tabel trace benar baris demi baris (5 ekspansi dan goal)', points: 35 },
          { text: 'Hasil: path S-B-F-J-M-G, cost 21, 5 ekspansi, urutan ekspansi benar', points: 15 },
          { text: 'Analisis 1–5: masing-masing 8 poin, dengan angka dari trace', points: 40 }
        ]
      },
      {
        id: 't3-e2',
        title: 'Eksperimen heuristik V1',
        exam: false,
        variant: true,
        source: 'Tugas individu §6 (eksperimen heuristik), variasi V1',
        minutes: 15,
        prompt: 'Variasi V1 dari graf tugas (variasi, bukan soal resmi): h(C) = 6, h(F) = 4, h(H) = 4. Semua h lain sama dengan graf asli.\n(a) Jalankan Greedy dengan variasi V1. Tulis tabel trace.\n(b) Isi tabel perbandingan: Aspek | Asli | V1, untuk urutan ekspansi, jumlah ekspansi, path, dan cost.\n(c) Jelaskan kenapa path berubah. Apakah V1 tetap konsisten dan admissible?',
        figure: { widget: 'variant-lab', props: { caseId: 'assignment', mode: 'greedy', presets: ['V1'], allowCustom: false } },
        solution: 'Variasi V1, label: variasi dari graf tugas.\nTabel perbandingan:\nUrutan ekspansi: asli S, B, F, J, M; V1 S, C, F, H, J, M.\nJumlah ekspansi: asli 5; V1 6.\nPath: asli S-B-F-J-M-G; V1 S-C-F-J-M-G.\nCost: asli 21; V1 17.\nPenjelasan: h(C) = 6 < h(B) = 7, sehingga C dipilih lebih dulu di iterasi 1. Dari C, F (h = 4) dipilih. Path lewat C dan F lebih murah.\nV1 tetap konsisten dan admissible (consistency-table tidak menemukan pelanggaran).',
        solutionBlocks: [
          { type: 'widget', widget: 'trace-table', props: { caseId: 'assignment', variant: 'V1', mode: 'greedy', showSummary: true }, caption: 'Greedy pada variasi V1 (dibuat mesin).' },
          { type: 'widget', widget: 'consistency-table', props: { caseId: 'assignment', variant: 'V1' }, caption: 'Pemeriksaan consistency untuk V1.' }
        ],
        rubric: [
          { text: 'Tabel trace V1 benar (urutan dan frontier)', points: 40 },
          { text: 'Tabel perbandingan asli vs V1 benar: urutan, jumlah ekspansi, path, cost', points: 15 },
          { text: 'Penjelasan perubahan lewat h(C) = 6 < h(B) = 7', points: 25 },
          { text: 'Menyatakan V1 tetap consistent dan admissible, dengan alasan', points: 20 }
        ]
      },
      {
        id: 't3-e3',
        title: 'Variasi V6: heuristik yang tidak admissible',
        exam: false,
        variant: true,
        source: 'Tugas individu §6 (variasi V6, bukan soal resmi)',
        minutes: 15,
        prompt: 'Variasi V6 dari graf tugas (variasi, bukan soal resmi): h(C) = 15, h(F) = 12, h(H) = 12. Semua h lain sama.\n(a) Jalankan Greedy dengan V6. Tulis tabel trace.\n(b) Tulis path, cost, dan jumlah ekspansi. Bandingkan dengan Greedy pada graf asli.\n(c) Jelaskan kenapa nilai h yang besar pada F dan C tidak membuat Greedy memilih keduanya lebih dulu.',
        figure: { widget: 'variant-lab', props: { caseId: 'assignment', mode: 'greedy', presets: ['V6'], allowCustom: false } },
        solution: 'Variasi V6, label: variasi dari graf tugas.\nPath: S → B → E → J → M → G, cost 5 + 2 + 6 + 4 + 3 = 20. Jumlah ekspansi 5 (S, B, E, J, M).\nC (h = 15) dan F (h = 12) masuk frontier, tetapi tidak pernah dipilih karena h-nya besar. Greedy hanya mengurutkan frontier menurut h, sehingga nilai h yang besar hanya mengubah urutan, bukan kemungkinan terpilih.\nGreedy tidak membutuhkan heuristik admissible untuk menyelesaikan pencarian, tetapi hasilnya bisa lebih mahal: 20 > 17 pada graf ini.',
        solutionBlocks: [
          { type: 'widget', widget: 'trace-table', props: { caseId: 'assignment', variant: 'V6', mode: 'greedy', showSummary: true }, caption: 'Greedy pada variasi V6 (dibuat mesin).' }
        ],
        rubric: [
          { text: 'Tabel trace V6 benar', points: 40 },
          { text: 'Path S-B-E-J-M-G, cost 20, dan 5 ekspansi benar', points: 20 },
          { text: 'Penjelasan kenapa C dan F tidak dipilih lebih dulu (nilai h yang besar)', points: 25 },
          { text: 'Membandingkan dengan Greedy asli dan menyebut bahwa hasilnya tidak selalu minimum', points: 15 }
        ]
      },
      {
        id: 't3-x1',
        title: 'Greedy pada peta Romania',
        exam: true,
        set: 'A',
        variant: false,
        source: 'Peta Romania (L3 slide 19 untuk h, cases.js romania)',
        minutes: 20,
        prompt: 'Peta Romania dari Arad (A) ke Bucharest (B), dengan h = jarak garis lurus ke Bucharest. Jalankan Greedy best-first graph search.\n(a) Tulis tabel trace: Iterasi | Dipilih | h | Aksi | Frontier sesudah.\n(b) Tulis path, total cost, dan jumlah ekspansi.\n(c) Bandingkan dengan A* pada peta yang sama. Mana yang lebih murah dan kenapa Greedy bisa lebih mahal?',
        figure: { widget: 'graph-view', props: { caseId: 'romania', showHeuristic: true } },
        solution: 'Path A → S → F → B, cost 140 + 99 + 211 = 450. Ekspansi 3 (A, S, F). Goal B di-pop pada iterasi 4.\nA* menemukan A → S → R → P → B dengan cost 418. Selisih 32.\nGreedy mengejar h terkecil. Dari S, F (h = 178) terlihat paling dekat, tetapi jalan itu mahal. Greedy tidak membandingkan biaya yang sudah ditempuh, sehingga jalur lewat R dan P (yang lebih murah) tidak dicoba.',
        solutionBlocks: [
          { type: 'widget', widget: 'trace-table', props: { caseId: 'romania', mode: 'greedy', showSummary: true }, caption: 'Greedy pada peta Romania (dibuat mesin).' },
          { type: 'widget', widget: 'search-sim', props: { caseId: 'romania', modes: ['greedy', 'astar'] }, caption: 'Greedy dibandingkan A*.' }
        ],
        rubric: [
          { text: 'Aturan Greedy ditulis dan sesuai dengan tabel', points: 10 },
          { text: 'Tabel trace benar baris demi baris (4 baris)', points: 40 },
          { text: 'Path A-S-F-B, cost 450, dan 3 ekspansi benar', points: 20 },
          { text: 'Perbandingan dengan A* (418) dan penjelasan kenapa Greedy lebih mahal', points: 30 }
        ]
      },
      {
        id: 't3-x2',
        title: 'Greedy pada graf slide L3-26',
        exam: true,
        set: 'B',
        variant: false,
        source: 'Lecture 3 slide 26 (graf Teg), cases.js l3-teg',
        minutes: 20,
        prompt: 'Graf slide L3-26 dari S ke G dengan h: S 6, a 5, b 6, c 7, d 2, e 1, G 0. Jalankan Greedy best-first graph search.\n(a) Tulis tabel trace lengkap.\n(b) Tulis path, total cost, jumlah ekspansi, dan urutan ekspansi.\n(c) Jelaskan kenapa e diekspansi, tetapi parent d tetap a. Apakah path ini minimum?',
        figure: { widget: 'graph-view', props: { caseId: 'l3-teg', showHeuristic: true } },
        solution: 'Ekspansi: S, a, e, d (4 ekspansi). Goal G di-pop setelah d.\nPath: S → a → d → G, cost 1 + 3 + 2 = 6.\ne diekspansi karena h(e) = 1 paling kecil di frontier. e punya successor d, tetapi d sudah ditemukan dari a, jadi tidak dimasukkan ulang dan parent d tetap a.\nPath ini minimum pada graf ini (sama dengan UCS dan A*). Namun Greedy tidak menjamin hal itu: pilihannya ditentukan oleh h, bukan oleh biaya.',
        solutionBlocks: [
          { type: 'widget', widget: 'trace-table', props: { caseId: 'l3-teg', mode: 'greedy', showSummary: true }, caption: 'Greedy pada graf slide L3-26 (dibuat mesin).' }
        ],
        rubric: [
          { text: 'Aturan Greedy ditulis (path pertama dipertahankan)', points: 10 },
          { text: 'Tabel trace benar baris demi baris (5 baris)', points: 40 },
          { text: 'Path S-a-d-G, cost 6, 4 ekspansi, dan urutan ekspansi benar', points: 20 },
          { text: 'Menjelaskan kenapa e diekspansi dan d tetap berparent a, dan kenapa hasil ini tidak menjamin optimal', points: 30 }
        ]
      }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = topic;
  if (root) (root.KKA_TOPICS = root.KKA_TOPICS || []).push(topic);
})(typeof window !== 'undefined' ? window : globalThis);
