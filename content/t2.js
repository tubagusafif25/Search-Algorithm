(function (root) { 'use strict';
  var topic = {
    id: 't2',
    number: 2,
    slug: 'ucs',
    title: 'Uniform Cost Search',
    short: 'UCS',
    summary: 'UCS selalu mengekspansi kandidat dengan biaya total sejauh ini (g) yang paling kecil. Dengan pembaruan biaya dan goal test saat pop, UCS menemukan path termurah. Harga yang dibayar: UCS menjelajah ke segala arah karena tidak tahu di mana goal berada.',
    goals: [
      'Menjalankan UCS graph search dengan pembaruan g dan parent, serta melewati entri usang.',
      'Menulis tabel trace dan tabel pembaruan (g lama, g baru, parent lama, parent baru) dengan benar.',
      'Menjelaskan kenapa goal diuji saat pop dan bukan saat ditemukan.',
      'Membedakan pilihan UCS, Greedy, dan A* pada frontier yang sama.'
    ],
    sources: [
      { label: 'Lecture 2 slide 45 (cost-sensitive search)', lecture: 2, slide: 45 },
      { label: 'Lecture 2 slide 47 (UCS, cost contours)', lecture: 2, slide: 47 },
      { label: 'Lecture 2 slide 48–49 (properti dan masalah UCS)', lecture: 2, slide: 48 },
      { label: 'Lecture 3 slide 11 (UCS di Lecture 3)', lecture: 3, slide: 11 },
      { label: 'Notebook 01_materi_informed_search §1a, §3d, §7d', notebook: '01_materi_informed_search' },
      { label: 'Tugas individu §3 dan §6 (pembaruan dan entri usang)', notebook: '02_tugas_individu' }
    ],
    sections: [
      {
        id: 't2-s1',
        kind: 'intuisi',
        title: 'Tinta yang menyebar dari start',
        blocks: [
          { type: 'intuition', text: 'Bayangkan tinta yang menyebar dari titik start. Tinta bergerak lebih lambat lewat jalan yang mahal. Kontur biaya yang sama akan tumbuh merata ke segala arah. UCS selalu memperluas kontur yang paling dekat dengan start (biaya paling kecil) lebih dulu.' },
          { type: 'slide', lecture: 2, slide: 45, caption: 'Cost-sensitive search: setiap busur punya biaya, dan tujuannya adalah path dengan total biaya terkecil.' },
          { type: 'slide', lecture: 2, slide: 47, caption: 'UCS: expand a cheapest node first. Kontur biaya yang bertambah merata dari start.' },
          { type: 'definition', term: 'Pertanyaan yang dijawab UCS', text: 'Dari semua path yang belum habis dicoba, mana yang punya biaya total sejauh ini paling kecil? Kandidat itu diekspansi dulu.' },
          { type: 'widget', widget: 'graph-view', props: { caseId: 'intro', showCosts: true }, caption: 'Graf materi 9 state. Bobot setiap busur tampil di atas garis.' }
        ],
        checks: [
          { id: 't2-s1-c1', type: 'mcq', prompt: 'UCS memilih kandidat dengan prioritas apa?', options: [
            'h terkecil',
            'g terkecil (biaya sejauh ini)',
            'f = g + h terkecil',
            'Urutan masuk terakhir (LIFO)'
          ], answer: 1, explanation: 'UCS memakai g: biaya yang sudah ditempuh dari start. Notebook menyebutnya “Biaya yang sudah ditempuh”.', source: 'Notebook informed §7d' },
          { id: 't2-s1-c2', type: 'mcq', prompt: 'Kapan UCS dijamin complete dan optimal?', options: [
            'Selalu, tanpa syarat',
            'Jika solusi termurah berbiaya berhingga dan setiap busur berbiaya minimal ε > 0',
            'Jika heuristik consistent',
            'Jika graf tidak punya siklus'
          ], answer: 1, explanation: 'Slide 48: UCS menjelajah kontur biaya dan menemukan solusi termurah dengan syarat biaya busur minimum positif. Heuristik tidak dipakai di sini.', source: 'Lecture 2 slide 48' }
        ]
      },
      {
        id: 't2-s2',
        kind: 'aturan',
        title: 'Aturan UCS graph search yang dipakai di kuis',
        blocks: [
          { type: 'text', text: 'UCS sama dengan A* dengan semua h = 0 (notebook §3d). Yang berubah hanya prioritasnya: g saja. Aturan lain tetap: pembaruan saat ketemu jalur lebih murah, entri usang dilewati, dan goal diuji saat pop.' },
          { type: 'list', ordered: true, items: [
            'Frontier = priority queue dengan entri (g, nomor urut, state). Nomor urut menjadi tie-breaker FIFO.',
            'Successor diproses sesuai urutan list graf. Untuk setiap successor n dengan biaya c: hitung new_g = g(s) + c.',
            'Jika new_g < g_cost[n] (atau n belum pernah ditemukan): catat g lama dan parent lama, perbarui g_cost[n] dan parent[n], lalu push entri baru. Jika new_g tidak lebih kecil, tidak ada pembaruan (misalnya B → D 4 + 1 = 5 tidak lebih kecil dari 4).',
            'Saat pop: jika g pada entri ≠ g_cost[state], entri itu usang. Lewati tanpa nomor iterasi dan tanpa ekspansi.',
            'Goal test dilakukan saat pop. Goal yang ditemukan lebih awal bisa masih punya biaya lebih besar.',
            'Ekspansi = memproses successor. Goal dan entri usang tidak dihitung.',
            'Snapshot frontier hanya berisi kandidat aktif, diurutkan menurut g lalu FIFO, dengan format X(g=..).'
          ]},
          { type: 'pseudocode', title: 'UCS graph search', lines: [
            'UCS(graph, start, goal):',
            '  heap ← [(0, 0, start)]; g_cost ← {start: 0}; parent ← {start: None}; closed ← {}',
            '  while heap tidak kosong:',
            '    (g, _, s) ← pop(heap)',
            '    if g > g_cost[s]: continue           # entri usang, tanpa nomor iterasi',
            '    if s == goal: return path(parent, s), g',
            '    closed.add(s); ekspansi += 1',
            '    for (n, c) in graph[s]:',
            '      new_g ← g + c',
            '      if n ∉ g_cost or new_g < g_cost[n]:',
            '        catat (g_cost[n], parent[n]) lama; g_cost[n] ← new_g; parent[n] ← s',
            '        push(heap, (new_g, counter, n))',
            '  return gagal'
          ]},
          { type: 'note', text: 'Tulis dua tabel di jawabanmu: tabel trace (Iterasi | Dipilih | g | Aksi | Frontier sesudah) dan tabel pembaruan (Iterasi | State | g lama | g baru | Parent lama | Parent baru). Tabel pembaruan menunjukkan kenapa path berubah.' },
          { type: 'warning', text: 'Goal test saat ditemukan adalah kesalahan umum. Di peta Romania, B pertama kali ditemukan dari F dengan g = 450, padahal path lewat P berbiaya 418. Goal baru dianggap selesai saat dipilih dari frontier dengan g terkecil.' }
        ],
        checks: [
          { id: 't2-s2-c1', type: 'input', prompt: 'Graf materi (intro): setelah C diekspansi di iterasi 3, berapa g(E) yang tercatat? (angka saja)', answer: '5', accept: ['5'], explanation: 'C → E berbiaya 2, dan g(C) = 3, jadi 3 + 2 = 5 < 7. Itu sebabnya g(E) diperbarui dari 7 ke 5.' },
          { id: 't2-s2-c2', type: 'mcq', prompt: 'Kenapa goal diuji saat di-pop dan bukan saat successor-nya dibangkitkan?', options: [
            'Supaya goal bisa dihitung sebagai ekspansi',
            'Karena goal yang ditemukan lebih dulu belum tentu punya g terkecil; jalur yang lebih murah bisa muncul kemudian',
            'Supaya tabel trace lebih pendek',
            'Karena UCS tidak menyimpan parent'
          ], answer: 1, explanation: 'Di peta Romania, B pertama kali ditemukan dari F dengan g = 450. Jalur lewat P (418) datang kemudian dan memperbarui g(B). Goal diuji saat pop agar hanya entri terpilih dengan g terkecil yang dianggap solusi.' }
        ]
      },
      {
        id: 't2-s3',
        kind: 'contoh',
        title: 'Contoh langkah demi langkah: graf materi 9 state',
        blocks: [
          { type: 'text', text: 'Jalankan UCS pada graf materi 9 state. Perhatikan tiga hal: pembaruan g pada E, baris yang tidak memperbarui apa-apa, dan entri usang yang dilewati.' },
          { type: 'widget', widget: 'search-sim', props: { caseId: 'intro', modes: ['ucs'] } },
          { type: 'widget', widget: 'trace-table', props: { caseId: 'intro', mode: 'ucs', showUpdates: true, showSkips: true, showSummary: true }, caption: 'Tabel trace UCS pada graf materi (dibuat mesin).' },
          { type: 'text', text: 'Iterasi 1: S diekspansi. Successor A (g=2), C (g=3), B (g=4) masuk.' },
          { type: 'text', text: 'Iterasi 2: A diekspansi. Successor D (g=4) dan E (g=7) masuk. Dari A, B tidak diperbarui karena B sudah 4.' },
          { type: 'text', text: 'Iterasi 3: C diekspansi (g=3). C → E berbiaya 2, sehingga new_g = 5 < 7. Ini pembaruan pertama: E 7 → 5 (parent A → C). Entri E(g=7) menjadi usang.' },
          { type: 'text', text: 'Iterasi 4: B diekspansi (g=4). B → D berbiaya 1, sehingga new_g = 5. Karena g(D) = 4 sudah ada, 5 tidak lebih kecil dan tidak ada pembaruan.' },
          { type: 'text', text: 'Iterasi 8: F diekspansi, lalu entri E(g=7) yang usang di-pop dan dilewati tanpa nomor iterasi. Iterasi 9: G di-pop dengan g = 9, goal test berhasil. Path S → A → D → G, cost 2 + 2 + 5 = 9. Jumlah ekspansi 8.' },
          { type: 'widget', widget: 'graph-view', props: { caseId: 'l2-tiny', showCosts: true }, caption: 'Graf kecil slide 23. Dibahas di contoh kedua di bawah.' },
          { type: 'text', text: 'Contoh kedua memakai graf slide l2-tiny. Dari S, p (g=1) diekspansi lebih dulu sebelum d (g=3). Di iterasi 3, d membuka jalan ke e dengan g = 5 dan memperbarui e dari 9 ke 5 (parent S → d). Path S → d → e → r → f → G, cost 10, dengan 8 ekspansi.' },
          { type: 'widget', widget: 'trace-table', props: { caseId: 'l2-tiny', mode: 'ucs', showUpdates: true, showSkips: true }, caption: 'UCS pada graf slide l2-tiny (dibuat mesin).' },
          { type: 'slide', lecture: 2, slide: 47, caption: 'Slide 47 memakai tree search: e diekspansi dua kali. Dengan graph search dan pembaruan, e hanya diekspansi sekali.' }
        ],
        checks: [
          { id: 't2-s3-c1', type: 'input', prompt: 'Graf materi (intro): berapa jumlah ekspansi UCS? (angka saja)', answer: '8', accept: ['8'], explanation: 'Ekspansinya S, A, C, B, D, E, H, F. G adalah goal dan tidak dihitung.' },
          { id: 't2-s3-c2', type: 'input', prompt: 'Graf slide l2-tiny: tulis urutan ekspansi UCS, dipisahkan koma.', answer: 'S,p,d,b,e,a,r,f', accept: ['S-p-d-b-e-a-r-f', 'S,p,d,b,e,a,r,f'], explanation: 'Ada 8 ekspansi. Setelah f, G di-pop dan dicek sebagai goal.' }
        ]
      },
      {
        id: 't2-s4',
        kind: 'menulis',
        title: 'Cara menulis jawaban UCS di kuis',
        blocks: [
          { type: 'text', text: 'Jawaban UCS dinilai dari aturan yang kamu tulis, dua tabel (trace dan pembaruan), hasil akhir, dan penjelasan dua keputusan. Ikuti kerangka berikut.' },
          { type: 'template', title: 'Kerangka jawaban UCS', text: 'JAWABAN — UCS graph search pada [nama graf], start S, goal G\n1) Aturan yang saya pakai\n- Frontier: priority queue dengan prioritas g, tie FIFO.\n- Successor diproses sesuai urutan list. Pembaruan jika new_g < g lama.\n- Entri usang (g entri > g terbaik) dilewati tanpa nomor iterasi.\n- Goal test saat pop.\n2) Tabel trace\nIterasi | Dipilih | g | Aksi | Frontier sesudah\n1 | S | 0 | expand | A(g=..); C(g=..); B(g=..)\n...\n3) Tabel pembaruan\nIterasi | State | g lama | g baru | Parent lama | Parent baru\n...\n4) Hasil\nPath: S → … → G\nTotal cost: a + b + … = …\nJumlah ekspansi: …\nUrutan ekspansi: …\n5) Dua keputusan yang saya jelaskan (misalnya pembaruan E 7 → 5, atau entri usang yang dilewati)\n6) Optimal? Ya, karena goal diuji saat pop dan semua kontur biaya lebih kecil sudah diekspansi.' },
          { type: 'list', items: [
            'Rubrik umum: aturan 10 poin, tabel 35 poin, pembaruan 15 poin, hasil 20 poin, penjelasan 20 poin (total 100).',
            'Pembaruan hanya terjadi jika new_g benar-benar lebih kecil. Angka yang sama tidak diperbarui.',
            'Tulis entri usang di tabel sebagai “skip”, bukan sebagai iterasi.'
          ]},
          { type: 'warning', text: 'Kesalahan umum UCS: menaruh entri usang di frontier snapshot; menghitung entri usang sebagai ekspansi; mengubah parent tanpa mengubah g; menganggap goal selesai saat ditemukan.' }
        ],
        checks: [
          { id: 't2-s4-c1', type: 'mcq', prompt: 'Entri B(g=5) di-pop setelah g(B) sudah 4. Apa yang dilakukan?', options: [
            'Diekspansi lagi dengan nomor iterasi baru',
            'Dilewati sebagai entri usang, tanpa nomor iterasi',
            'Dijadikan goal',
            'Digabung dengan entri B(g=4)'
          ], answer: 1, explanation: 'Entri dengan g yang lebih besar dari g_cost terbaik adalah usang. Ia dilewati tanpa ekspansi dan tanpa nomor iterasi.' }
        ]
      },
      {
        id: 't2-s5',
        kind: 'latihan',
        title: 'Latihan: isi baris UCS',
        blocks: [
          { type: 'text', text: 'Isi baris berikutnya dari tabel UCS. Kandidat ditulis X(g=..), diurutkan menurut g lalu FIFO. Jika ada entri usang yang di-pop, mesin akan memberi tahu kamu sebelum baris berikutnya.' },
          { type: 'widget', widget: 'trace-drill', props: { caseId: 'intro', mode: 'ucs', drillId: 't2-d1', statesOnlyOption: true }, caption: 'Drill 1: graf materi 9 state.' },
          { type: 'widget', widget: 'trace-drill', props: { caseId: 'assignment', mode: 'ucs', drillId: 't2-d2', statesOnlyOption: true }, caption: 'Drill 2: graf tugas 14 state.' },
          { type: 'widget', widget: 'trace-drill', props: { caseId: 'l2-tiny', mode: 'ucs', drillId: 't2-d3', statesOnlyOption: true }, caption: 'Drill 3: graf slide 23.' },
          { type: 'widget', widget: 'variant-lab', props: { caseId: 'assignment', mode: 'ucs', presets: ['E1'], allowCustom: true }, caption: 'Variasi dari graf tugas, bukan soal resmi. Preset E1 mengubah biaya C → F menjadi 6.' }
        ],
        checks: []
      },
      {
        id: 't2-s6',
        kind: 'cek',
        title: 'Cek cepat UCS',
        blocks: [
          { type: 'text', text: 'Jawab tujuh pertanyaan singkat. Untuk pertanyaan angka, tulis angka saja.' }
        ],
        checks: [
          { id: 't2-s6-c1', type: 'input', prompt: 'Graf tugas: berapa total cost path UCS dari S ke G? (angka saja)', answer: '17', accept: ['17'], explanation: 'Path S → C → F → J → M → G berbiaya 4 + 3 + 3 + 4 + 3 = 17.' },
          { id: 't2-s6-c2', type: 'input', prompt: 'Graf tugas: berapa jumlah ekspansi UCS? (angka saja)', answer: '13', accept: ['13'], explanation: 'Ekspansinya S, A, C, B, E, D, F, H, J, I, K, M, L: 13 ekspansi. Goal G tidak dihitung.' },
          { id: 't2-s6-c3', type: 'input', prompt: 'Graf tugas: pada iterasi 7 (F diekspansi), g(J) diperbarui dari 12 menjadi berapa? (angka saja)', answer: '10', accept: ['10'], explanation: 'F → J berbiaya 3, dan g(F) = 7, jadi 7 + 3 = 10 < 12. Parent J berubah dari E ke F.' },
          { id: 't2-s6-c4', type: 'mcq', prompt: 'Mana yang benar tentang entri usang?', options: [
            'Entri usang diekspansi, tetapi tidak masuk tabel',
            'Entri usang dilewati tanpa nomor iterasi dan tidak dihitung ekspansi',
            'Entri usang menjadi goal bila g-nya lebih kecil',
            'Entri usang hanya ada di A*'
          ], answer: 1, explanation: 'Entri yang g-nya tidak sama dengan g_cost terbaik sudah usang. Ia hanya dilewati.' },
          { id: 't2-s6-c5', type: 'mcq', prompt: 'UCS adalah A* dengan heuristik apa?', options: [
            'h = g',
            'h = 0 untuk semua state',
            'h = biaya sebenarnya ke goal',
            'h = jumlah successor'
          ], answer: 1, explanation: 'Dengan h = 0, f = g, sehingga prioritas A* menjadi UCS. Notebook §3d menulis hal yang sama.', source: 'Notebook informed §3d' },
          { id: 't2-s6-c6', type: 'input', prompt: 'Graf Romania dari Arad ke Bucharest dengan UCS: berapa total cost path? (angka saja)', answer: '418', accept: ['418'], explanation: 'UCS menemukan A → S → R → P → B dengan cost 418, lebih murah dari A → S → F → B (450).' },
          { id: 't2-s6-c7', type: 'mcq', prompt: 'Notebook §7d: frontier A(g=1,h=9), B(g=8,h=1), C(g=4,h=3). Siapa yang dipilih UCS?', options: [
            'A, karena g = 1 paling kecil',
            'B, karena h = 1 paling kecil',
            'C, karena f = 7 paling kecil',
            'Tidak ada, karena UCS tidak memakai priority'
          ], answer: 0, explanation: 'UCS memakai g saja. g(A) = 1 paling kecil. Greedy memilih B dan A* memilih C.', source: 'Notebook informed §7d' }
        ]
      }
    ],
    essays: [
      {
        id: 't2-e1',
        title: 'UCS pada graf tugas',
        exam: false,
        variant: false,
        source: 'Tugas individu §2 (graf 14 state), konvensi UCS',
        minutes: 15,
        prompt: 'Graf tugas individu (14 state, berarah) dari S ke G. Jalankan UCS graph search dengan pembaruan g dan parent.\n(a) Tulis tabel trace: Iterasi | Dipilih | g | Aksi | Frontier sesudah.\n(b) Tulis tabel pembaruan: Iterasi | State | g lama | g baru | Parent lama | Parent baru.\n(c) Tulis path, total cost, jumlah ekspansi, dan urutan ekspansi.\n(d) Jelaskan kenapa B(g=4) diekspansi sebelum B(g=5), dan kenapa entri B(g=5) kemudian dilewati.',
        figure: { widget: 'graph-view', props: { caseId: 'assignment' } },
        solution: 'Aturan: priority g, tie FIFO, pembaruan jika new_g lebih kecil, entri usang dilewati, goal diuji saat pop.\nPembaruan: 5 kali. Iterasi 2: B 5 → 4 (S → A). Iterasi 4: E 10 → 6 (A → B). Iterasi 7: J 12 → 10 (E → F). Iterasi 8: K 14 → 12 (F → H). Iterasi 10: L 15 → 14 (J → I).\nEntri usang yang dilewati: B(g=5), E(g=10), J(g=12), K(g=14), L(g=15). Total 5 entri.\nHasil: path S → C → F → J → M → G, cost 4 + 3 + 3 + 4 + 3 = 17. Jumlah ekspansi 13. Urutan ekspansi S, A, C, B, E, D, F, H, J, I, K, M, L.\nPenjelasan: iterasi 4 memilih B(g=4) sebelum B(g=5) karena g lebih kecil. Setelah itu B(g=5) menjadi usang dan dilewati.',
        solutionBlocks: [
          { type: 'widget', widget: 'trace-table', props: { caseId: 'assignment', mode: 'ucs', showUpdates: true, showSkips: true }, caption: 'Tabel trace dan pembaruan UCS pada graf tugas (dibuat mesin).' },
          { type: 'text', text: 'Hasil: S → C → F → J → M → G, cost 17. Jumlah ekspansi 13. Urutan ekspansi S, A, C, B, E, D, F, H, J, I, K, M, L.' }
        ],
        rubric: [
          { text: 'Aturan UCS ditulis (priority g, pembaruan, entri usang, goal saat pop)', points: 10 },
          { text: 'Tabel trace benar: frontier sesudah tiap baris dan entri yang dilewati', points: 35 },
          { text: 'Tabel pembaruan lima baris (B, E, J, K, L) lengkap dengan parent lama dan baru', points: 15 },
          { text: 'Path S-C-F-J-M-G, cost 17, 13 ekspansi, dan urutan ekspansi benar', points: 20 },
          { text: 'Penjelasan B(g=4) vs B(g=5) dan kenapa entri usang dilewati', points: 20 }
        ]
      },
      {
        id: 't2-e2',
        title: 'UCS pada graf slide: graph search dan tree search',
        exam: false,
        variant: false,
        source: 'Lecture 2 slide 45–47 (graf l2-tiny)',
        minutes: 15,
        prompt: 'Graf slide l2-tiny dari S ke G.\n(a) Jalankan UCS graph search dengan pembaruan. Tulis tabel trace dan path, cost, jumlah ekspansi.\n(b) Slide 47 memakai tree search. Jelaskan perbedaan jumlah ekspansi antara graph search dan tree search pada graf ini, dan sebutkan state yang diekspansi dua kali pada tree search.',
        figure: { widget: 'graph-view', props: { caseId: 'l2-tiny' } },
        solution: 'Graph search: path S → d → e → r → f → G, cost 10, 8 ekspansi (S, p, d, b, e, a, r, f). Entri e(g=9) dari S menjadi usang setelah d memperbarui e menjadi 5.\nTree search (slide 47): e diekspansi dua kali, sehingga ada 9 ekspansi (S, p, d, b, e, a, r, f, e). Tree search menyimpan jalur, bukan state, sehingga satu state bisa muncul lebih dari sekali.\nKesimpulan: graph search dengan pembaruan mengekspansi setiap state sekali dan menghasilkan path yang sama dengan biaya terkecil.',
        solutionBlocks: [
          { type: 'widget', widget: 'trace-table', props: { caseId: 'l2-tiny', mode: 'ucs', showUpdates: true, showSkips: true }, caption: 'UCS graph search pada graf slide (dibuat mesin).' },
          { type: 'text', text: 'Graph search: 8 ekspansi, cost 10. Tree search (slide 47): 9 ekspansi, e muncul dua kali.' }
        ],
        rubric: [
          { text: 'Tabel trace graph search benar (termasuk entri usang e(g=9))', points: 40 },
          { text: 'Path S-d-e-r-f-G, cost 10, dan 8 ekspansi benar', points: 20 },
          { text: 'Membandingkan dengan tree search: 9 ekspansi, e diekspansi dua kali', points: 20 },
          { text: 'Kesimpulan: kenapa closed set atau pembaruan membuat graph search lebih efisien', points: 20 }
        ]
      },
      {
        id: 't2-e3',
        title: 'Satu frontier, tiga algoritma',
        exam: false,
        variant: false,
        source: 'Notebook informed §7d dan latihan 1, §3d',
        minutes: 15,
        prompt: 'Frontier pertama: A(g=1, h=9), B(g=8, h=1), C(g=4, h=3). Frontier kedua: A(g=3, h=7), B(g=5, h=3), C(g=2, h=8).\n(a) Untuk setiap frontier, tentukan state yang dipilih UCS, Greedy, dan A*. Tulis perhitungan prioritasnya.\n(b) Apa yang terjadi pada A* jika semua h = 0? Bandingkan jumlah ekspansi pada graf materi (intro) dengan h informatif (6 ekspansi) dan h = 0 (8 ekspansi).\n(c) Jelaskan dengan dua kalimat kenapa pilihan ketiga algoritma bisa berbeda pada frontier yang sama.',
        solution: 'Frontier pertama: UCS memilih A (g = 1). Greedy memilih B (h = 1). A* memilih C (f = 4 + 3 = 7; A f = 10; B f = 9).\nFrontier kedua: UCS memilih C (g = 2). Greedy memilih B (h = 3; A h = 7, C h = 8). A* memilih B (f = 8; A f = 10; C f = 10).\nA* dengan semua h = 0 sama dengan UCS: pada graf materi 8 ekspansi dan cost 9. Dengan h informatif, ekspansi turun menjadi 6 dengan cost 9 juga.\nPenjelasan: UCS melihat hanya biaya yang sudah ditempuh, Greedy hanya perkiraan sisa, dan A* menjumlahkan keduanya, sehingga pilihan bisa berbeda.',
        rubric: [
          { text: 'Frontier pertama: tiga pilihan benar dengan perhitungan prioritas (8 poin per pilihan, 24 total)', points: 24 },
          { text: 'Frontier kedua: tiga pilihan benar dengan perhitungan (8 poin per pilihan, 24 total)', points: 24 },
          { text: 'Penjelasan tiap algoritma memakai priority yang benar (g, h, atau g+h)', points: 28 },
          { text: 'A* dengan h = 0 dibahas: sama dengan UCS, dan perbandingan ekspansi pada graf materi', points: 24 }
        ]
      },
      {
        id: 't2-x1',
        title: 'UCS pada peta Romania',
        exam: true,
        set: 'A',
        variant: false,
        source: 'Peta Romania (L2 slide 17, cases.js romania)',
        minutes: 20,
        prompt: 'Peta Romania dari Arad (A) ke Bucharest (B). Jalan dua arah. Jalankan UCS graph search dengan pembaruan g dan parent.\n(a) Tulis tabel trace lengkap.\n(b) Tulis tabel pembaruan untuk setiap perubahan g, termasuk perubahan parent.\n(c) Tulis path, total cost, jumlah ekspansi, dan urutan ekspansi.\n(d) Jelaskan kenapa B pertama kali ditemukan dengan cost 450 tetapi akhirnya cost 418.',
        figure: { widget: 'graph-view', props: { caseId: 'romania' } },
        solution: 'Path A → S → R → P → B, cost 140 + 80 + 97 + 101 = 418. Jumlah ekspansi 12 (A, Z, T, S, O, R, L, F, M, P, C, D).\nPembaruan utama: B 450 → 418 pada iterasi 10 saat P diekspansi (parent F → P).\nB pertama kali ditemukan dari F dengan g = 450. Setelah P diekspansi dengan g = 317, B dapat dicapai dengan 317 + 101 = 418 < 450, sehingga g(B) diperbarui.',
        solutionBlocks: [
          { type: 'widget', widget: 'trace-table', props: { caseId: 'romania', mode: 'ucs', showUpdates: true, showSkips: true }, caption: 'UCS pada peta Romania (dibuat mesin).' },
          { type: 'text', text: 'Path A → S → R → P → B, cost 418. Jumlah ekspansi 12. Pembaruan: B 450 → 418 pada iterasi 10 (F → P).' }
        ],
        rubric: [
          { text: 'Tabel trace benar baris demi baris (13 baris, termasuk goal)', points: 40 },
          { text: 'Tabel pembaruan benar, termasuk B 450 → 418 dan parent baru P', points: 15 },
          { text: 'Path, cost 418, jumlah ekspansi 12, dan urutan ekspansi benar', points: 20 },
          { text: 'Penjelasan pembaruan B dan kenapa goal diuji saat pop', points: 25 }
        ]
      },
      {
        id: 't2-x2',
        title: 'UCS pada variasi tugas (C → F = 6)',
        exam: true,
        set: 'B',
        variant: true,
        source: 'Variasi dari graf tugas (preset E1, bukan soal resmi)',
        minutes: 20,
        prompt: 'Variasi dari graf tugas: biaya edge C → F diubah dari 3 menjadi 6. Semua edge lain sama. Jalankan UCS graph search dengan pembaruan.\n(a) Tulis tabel trace lengkap.\n(b) Tulis path, total cost, jumlah ekspansi, dan urutan ekspansi.\n(c) Bandingkan dengan UCS pada graf tugas asli. Apa yang berubah dan kenapa?',
        figure: { widget: 'variant-lab', props: { caseId: 'assignment', mode: 'ucs', presets: ['E1'], allowCustom: false } },
        solution: 'Variasi E1, label: variasi dari graf tugas. Path S → C → H → K → M → G, cost 4 + 5 + 3 + 3 + 3 = 18. Jumlah ekspansi 13 (S, A, C, B, E, D, H, F, I, J, K, L, M).\nPerbandingan: pada graf asli path S → C → F → J → M → G cost 17. Dengan C → F = 6, jalur S → C → F → J → M → G menjadi 4 + 6 + 3 + 4 + 3 = 20, sehingga jalur lewat H dan K (18) menjadi yang termurah.\nJumlah ekspansi tetap 13, tetapi urutannya berbeda.',
        solutionBlocks: [
          { type: 'widget', widget: 'trace-table', props: { caseId: 'assignment', variant: 'E1', mode: 'ucs', showUpdates: true, showSkips: true }, caption: 'UCS pada variasi E1 (dibuat mesin, bukan soal resmi).' },
          { type: 'text', text: 'Variasi E1: path S → C → H → K → M → G, cost 18, 13 ekspansi. Graf asli: cost 17.' }
        ],
        rubric: [
          { text: 'Tabel trace variasi benar (14 baris, termasuk goal)', points: 40 },
          { text: 'Path S-C-H-K-M-G, cost 18, dan jumlah ekspansi 13 benar', points: 20 },
          { text: 'Perbandingan dengan graf asli: apa yang berubah (path dan cost) dan kenapa', points: 25 },
          { text: 'Pembaruan yang terjadi pada variasi dijelaskan dengan parent lama dan baru', points: 15 }
        ]
      }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = topic;
  if (root) (root.KKA_TOPICS = root.KKA_TOPICS || []).push(topic);
})(typeof window !== 'undefined' ? window : globalThis);
