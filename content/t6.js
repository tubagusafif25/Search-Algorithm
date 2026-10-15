(function (root) {
  'use strict';

  /* Topik 6: Alpha-Beta Pruning (L5 slides 7–10, 16–21, 24–56).
     Angka peristiwa diambil dari PLAN2 Part 4.6 dan diverifikasi dengan simulasi (nilai root 0, langkah D). */
  const topic = {
    id: 't6',
    number: 6,
    slug: 'alpha-beta',
    title: 'Alpha-Beta Pruning',
    short: 'Alpha-Beta',
    summary: 'Alpha-beta menghitung nilai minimax yang sama dengan minimax biasa, tetapi melewati cabang yang tidak mungkin dipilih.',
    goals: [
      'Kamu bisa menghitung nilai minimax dari pohon permainan dan menjelaskan peran node MAX dan MIN.',
      'Kamu bisa menjalankan alpha-beta dari kiri ke kanan dan dari kanan ke kiri, lalu menulis tabel peristiwanya.',
      'Kamu bisa menjelaskan aturan pemangkasan dengan ≥ dan dengan >, dan kenapa hasilnya bisa berbeda.',
      'Kamu bisa menyebut daun yang dievaluasi dan simpul yang dipangkas, serta menjelaskan alpha cut-off dan beta cut-off.'
    ],
    sources: [
      { label: 'Lecture 5 slide 9 · minimax, root 3', lecture: 5, slide: 9 },
      { label: 'Lecture 5 slide 26 · prinsip pemangkasan', lecture: 5, slide: 26 },
      { label: 'Lecture 5 slide 27 · pohon contoh alpha-beta', lecture: 5, slide: 27 },
      { label: 'Lecture 5 slide 52 · aturan pemangkasan', lecture: 5, slide: 52 },
      { label: 'Lecture 5 slide 53 · pohon UW', lecture: 5, slide: 53 }
    ],
    sections: [
      {
        id: 't6-s1',
        kind: 'intuisi',
        title: 'Intuisi: minimax dulu, lalu pangkas',
        blocks: [
          { type: 'intuition', text: 'Di permainan dua pemain, lawan memilih langkah yang paling merugikanmu. Kamu memilih langkah yang terbaik di antara respons terburuk lawan. Alpha-beta tidak mengubah jawaban itu. Ia hanya berhenti memeriksa cabang yang sudah pasti tidak mengubah keputusan.' },
          { type: 'text', text: 'Node MAX adalah pemain yang ingin nilai (utility) setinggi mungkin. Node MIN adalah lawan yang ingin nilainya serendah mungkin. Daun punya utility. Node dalam mengambil nilai dari anaknya: MAX mengambil maksimum, MIN mengambil minimum.' },
          { type: 'slide', lecture: 5, slide: 9, caption: 'Cara menghitung nilai minimax dari daun ke akar (slide 9)' },
          { type: 'widget', widget: 'minimax-sim', props: { caseId: 'l5-rn', prune: false }, caption: 'Minimax tanpa pemangkasan: B = 3, C = 2, D = 2, A = 3. Langkah terbaik B.' },
          { type: 'slide', lecture: 5, slide: 16, caption: 'Definisi nilai minimax (slide 16)' },
          { type: 'formula', text: 'minimax(n) = utility(n)                 jika n adalah terminal\nminimax(n) = max(minimax anak n)      jika n adalah node MAX\nminimax(n) = min(minimax anak n)      jika n adalah node MIN' },
          { type: 'text', text: 'Kompleksitas minimax: waktu O(b^d) dan ruang O(bd), dengan pencarian depth-first (slide 20). Untuk permainan nyata, waktu sebesar itu terlalu besar, kecuali untuk permainan sederhana seperti tic-tac-toe.' },
          { type: 'slide', lecture: 5, slide: 25, caption: 'Apakah semua nilai minimax perlu dihitung? (slide 25)' },
          { type: 'text', text: 'Di slide 25, dua daun x dan y belum diketahui. Nilai root = max(min(3, 12, 8), min(2, x, y), min(14, 5, 2)) = max(3, min(2, x, y), 2). Karena min(2, x, y) ≤ 2, nilai root selalu 3, apa pun nilai x dan y. Kita tidak perlu mengecek x dan y.' },
          { type: 'slide', lecture: 5, slide: 26, caption: 'Prinsip pemangkasan (slide 26)' },
          { type: 'text', text: 'Prinsip slide 26, dalam bahasa Indonesia (terjemahan): pertimbangkan node n yang bisa dicapai pemain. Jika pemain punya pilihan m yang lebih baik di parent n atau di titik keputusan yang lebih tinggi, maka n tidak akan pernah dicapai dalam permainan sebenarnya. Setelah cukup tahu tentang n untuk menarik kesimpulan itu, n bisa dipangkas.' }
        ],
        checks: [
          { id: 't6-s1-c1', type: 'input', prompt: 'Di slide 9, berapa nilai minimax node akar A?', answer: '3', explanation: 'B = 3, C = 2, D = 2, sehingga A = max(3, 2, 2) = 3. Langkah terbaik adalah B.', source: 'Lecture 5 slide 9' },
          { id: 't6-s1-c2', type: 'input', prompt: 'Di slide 25, berapa nilai root jika x dan y belum diketahui?', answer: '3', explanation: 'min(2, x, y) ≤ 2, sehingga max(3, min(2, x, y), 2) = 3 untuk nilai x dan y apa pun.', source: 'Lecture 5 slide 25' }
        ]
      },
      {
        id: 't6-s2',
        kind: 'aturan',
        title: 'Aturan kuliah: alpha-beta',
        blocks: [
          { type: 'list', ordered: true, items: [
            'Telusuri anak dari kiri ke kanan, kecuali soal meminta urutan sebaliknya.',
            'α(n) pada node MAX adalah nilai terbesar yang sudah dilihat di n. β(n) pada node MIN adalah nilai terkecil yang sudah dilihat di n. Awalnya α = −∞ dan β = +∞.',
            'Setiap kali satu anak mengembalikan nilai, perbarui α atau β node itu. Jendela [α, β] diteruskan ke anak berikutnya.',
            'Berhenti mengekspansi node MAX n jika α(n) ≥ β milik node MIN di atasnya (beta cut-off). Berhenti mengekspansi node MIN n jika β(n) ≤ α milik node MAX di atasnya (alpha cut-off), sesuai slide 52.',
            'Anak yang tersisa, beserta seluruh subtree-nya, dipangkas.'
          ] },
          { type: 'definition', term: 'Alpha cut-off', text: 'Pemangkasan di node MIN karena α dari node MAX di atasnya. Contoh di pohon contoh: O (MIN) memangkas X karena β(O) = −3 ≤ α(F) = 4.' },
          { type: 'definition', term: 'Beta cut-off', text: 'Pemangkasan di node MAX karena β dari node MIN di atasnya.' },
          { type: 'pseudocode', title: 'Pseudocode alpha-beta (kiri → kanan)', lines: [
            'ALPHABETA(n, α, β):',
            '  if leaf: return value',
            '  if MAX: v ← −∞; for c: v ← max(v, AB(c, α, β)); α ← max(α, v); if α ≥ β: break',
            '  if MIN: v ← +∞; for c: v ← min(v, AB(c, α, β)); β ← min(β, v); if β ≤ α: break',
            '  return v'
          ] },
          { type: 'warning', text: 'Kesetaraan itu penting. Slide 52 memakai ≥. Pada pohon UW (slide 53–56), dengan ≥ node H berhenti setelah P = 4, sehingga Q dan R dipangkas. Dengan >, Q tetap dievaluasi dan hanya AA yang dipangkas di sana, seperti kunci slide 54. Nilai root tetap 4 pada kedua aturan, tetapi daftar simpul yang dipangkas berbeda. Tulis aturan yang kamu pakai di awal jawaban.' },
          { type: 'note', text: 'Jangan memangkas node yang masih bisa mengubah nilai root. Pangkas hanya jika aturan yang kamu tulis sudah terpenuhi.' }
        ],
        checks: [
          { id: 't6-s2-c1', type: 'mcq', prompt: 'Apa arti α(n) pada node MAX?', options: [
            'Nilai terkecil yang sudah dilihat di n',
            'Nilai terbesar yang sudah dilihat di n',
            'Nilai akar dari seluruh pohon',
            'Jumlah anak yang sudah dievaluasi'
          ], answer: 1, explanation: 'α(n) adalah nilai terbesar yang sudah dilihat di node MAX n. Untuk node MIN, β(n) adalah nilai terkecil yang sudah dilihat.', source: 'Lecture 5 slide 52' },
          { id: 't6-s2-c2', type: 'mcq', prompt: 'Kapan node MIN n berhenti diekspansi?', options: [
            'Jika β(n) ≤ α dari node MAX di atasnya',
            'Jika α(n) ≥ β dari node MIN di atasnya',
            'Jika β(n) ≥ α dari node MAX di atasnya',
            'Setelah anak pertama selesai'
          ], answer: 0, explanation: 'Node MIN berhenti jika β(n) ≤ α (alpha cut-off). Ini aturan slide 52.', source: 'Lecture 5 slide 52' }
        ]
      },
      {
        id: 't6-s3',
        kind: 'contoh',
        title: 'Contoh langkah demi langkah: pohon slide 27',
        blocks: [
          { type: 'text', text: 'Akar A adalah MAX. B, C, D, dan E adalah MIN. Telusuri dari kiri ke kanan. Nilai daun ada di slide 27.' },
          { type: 'slide', lecture: 5, slide: 27, caption: 'Pohon contoh alpha-beta (slide 27)' },
          { type: 'widget', widget: 'minimax-sim', props: { caseId: 'tree-lecture', prune: true, allowToggle: true }, caption: 'Simulasi kiri → kanan dengan pemangkasan. Matikan pemangkasan untuk melihat semua daun.' },
          { type: 'text', text: 'Tabel peristiwa. Setiap baris adalah satu kali anak mengembalikan nilai ke node induknya. Jendela [α, β] adalah nilai node induk setelah update.' },
          { type: 'table', caption: 'Peristiwa alpha-beta, kiri → kanan, pohon slide 27 (nomor slide kunci: 31, 34–35, 37, 38, 40, 41, 44–45, 47, 49)', headers: ['Langkah', 'Node', 'Anak = nilai', 'α/β node', 'Jendela [α, β]', 'Pangkas?'], rows: [
            ['1', 'F', 'N = 4', 'α(F) = 4', '[4, +∞]', 'Tidak'],
            ['2', 'O', 'W = −3', 'β(O) = −3', '[4, −3]', 'Ya: potong X (β(O) ≤ α(F))'],
            ['3', 'F', 'O = −3', 'α(F) = 4', '[4, +∞]', 'Tidak'],
            ['4', 'B', 'F = 4', 'β(B) = 4', '[−∞, 4]', 'Tidak'],
            ['5', 'B', 'G = −5', 'β(B) = −5', '[−∞, −5]', 'Tidak'],
            ['6', 'A', 'B = −5', 'α(A) = −5', '[−5, +∞]', 'Tidak'],
            ['7', 'C', 'H = −10', 'β(C) = −10', '[−5, −10]', 'Ya: potong I dan J (β(C) ≤ α(A)), dengan P, Q, R'],
            ['8', 'A', 'C = −10', 'α(A) = −5', '[−5, +∞]', 'Tidak'],
            ['9', 'A', 'D = 0', 'α(A) = 0', '[0, +∞]', 'Tidak'],
            ['10', 'K', 'S = 3', 'α(K) = 3', '[3, +∞]', 'Tidak'],
            ['11', 'K', 'T = 5', 'α(K) = 5', '[5, +∞]', 'Tidak'],
            ['12', 'E', 'K = 5', 'β(E) = 5', '[0, 5]', 'Tidak'],
            ['13', 'E', 'L = 2', 'β(E) = 2', '[0, 2]', 'Tidak'],
            ['14', 'M', 'U = −7', 'α(M) = −7', '[0, 2]', 'Tidak'],
            ['15', 'M', 'V = −9', 'α(M) = −7', '[0, 2]', 'Tidak'],
            ['16', 'E', 'M = −7', 'β(E) = −7', '[0, −7]', 'Tidak (M anak terakhir)'],
            ['17', 'A', 'E = −7', 'α(A) = 0', '[0, +∞]', 'Tidak']
          ] },
          { type: 'note', text: 'α(M) = −7 pada langkah 14–15 adalah nilai milik M. Jendela M tetap [0, 2] karena α yang diteruskan dari A adalah 0.' },
          { type: 'text', text: 'Hasil: daun yang dievaluasi N, W, G, H, D, S, T, L, U, V. Yang dipangkas X, I, J, P, Q, R. Nilai root 0 dan langkah terbaik D. Nilai minimax tanpa pemangkasan: F 4, O −5, B −5, C −10, J 9, E −7, K 5, M −7.' },
          { type: 'text', text: 'Sekarang lihat efek urutan. Pada slide 50–51, anak-anak E diurutkan dari kanan ke kiri, yaitu M, L, lalu K.' },
          { type: 'slide', lecture: 5, slide: 50, caption: 'Slide 50: E diurutkan kanan → kiri' },
          { type: 'slide', lecture: 5, slide: 51, caption: 'Slide 51: hasil urutan kanan → kiri di E' },
          { type: 'widget', widget: 'minimax-sim', props: { caseId: 'tree-lecture-e-rtl' }, caption: 'Hanya 4 simpul di dalam E yang disentuh: E, M, V, U.' },
          { type: 'text', text: 'Dengan urutan kanan → kiri di E, M dievaluasi lebih dulu: V = −9, lalu U = −7. Setelah itu β(E) = −7 ≤ α(A) = 0, sehingga L dan K dipangkas (bersama T dan S). Nilai root tetap 0 dan langkah terbaik tetap D.' }
        ],
        checks: [
          { id: 't6-s3-c1', type: 'input', prompt: 'Pada pohon slide 27 (kiri → kanan), berapa α(F) setelah daun N dievaluasi?', answer: '4', explanation: 'N = 4 adalah anak pertama F, jadi α(F) = 4.', source: 'Lecture 5 slide 31' },
          { id: 't6-s3-c2', type: 'input', prompt: 'Setelah W = −3 di O (kiri → kanan), anak mana yang dipangkas?', answer: 'X', explanation: 'β(O) = −3 ≤ α(F) = 4, jadi X tidak perlu dievaluasi (alpha cut-off).', source: 'Lecture 5 slide 34–35' }
        ]
      },
      {
        id: 't6-s4',
        kind: 'menulis',
        title: 'Cara menulis jawaban esai',
        blocks: [
          { type: 'text', text: 'Jawaban alpha-beta menulis aturan, tabel peristiwa, pohon, lalu hasil. Salin template ini dan isi bagian dalam kurung.' },
          { type: 'template', title: 'Template jawaban alpha-beta', text: `1) Aturan: kiri → kanan; α di MAX, β di MIN; pangkas jika α ≥ β (sebutkan jika memakai >).
2) Tabel peristiwa: Langkah | Node | Anak = nilai | α(n)/β(n) | Dibandingkan dengan | Pangkas?
3) Gambar pohon: tulis α/β akhir tiap node, coret cabang yang dipangkas.
4) Hasil: nilai root, langkah terbaik, daftar daun dievaluasi, simpul dipangkas.
5) Bandingkan dengan minimax tanpa pemangkasan: nilai root sama.` },
          { type: 'list', title: 'Kesalahan yang sering terjadi', items: [
            'Membandingkan α dan β dari node yang salah: α dari MAX, β dari MIN.',
            'Memangkas karena nilainya sama tanpa menyebut aturan ≥ atau >.',
            'Lupa bahwa cabang yang dipangkas tidak dievaluasi, sehingga daunnya tidak masuk daftar daun.',
            'Menganggap nilai α/β node yang dipangkas sebagai nilai minimax pasti.',
            'Mengambil nilai root dari daun, bukan dari max/min anak-anaknya.',
            'Menulis urutan kanan → kiri tanpa menyebutkan bahwa urutannya berubah.'
          ] },
          { type: 'note', text: 'Contoh jawaban lengkap ada di pembahasan esai t6-e2. Tulis dulu sendiri, lalu buka pembahasan.' }
        ],
        checks: []
      },
      {
        id: 't6-s5',
        kind: 'latihan',
        title: 'Latihan interaktif',
        blocks: [
          { type: 'text', text: 'Di setiap peristiwa, masukkan α atau β node dan putuskan apakah cabang dipangkas. Di akhir, cek daftar pangkas dan nilai root. Setiap latihan menyimpan skor percobaan pertamamu.' },
          { type: 'widget', widget: 'ab-drill', props: { caseId: 'l5-rn', order: 'left', pruneOn: 'gte', drillId: 't6-d1' }, caption: 'Latihan 1: l5-rn, kiri → kanan (slide 9).' },
          { type: 'widget', widget: 'ab-drill', props: { caseId: 'tree-lecture', order: 'left', pruneOn: 'gte', drillId: 't6-d2' }, caption: 'Latihan 2: pohon slide 27, kiri → kanan.' },
          { type: 'widget', widget: 'ab-drill', props: { caseId: 'tree-uw', order: 'left', pruneOn: 'gte', drillId: 't6-d3' }, caption: 'Latihan 3: pohon slide 53, kiri → kanan, aturan ≥.' },
          { type: 'widget', widget: 'ab-drill', props: { caseId: 'tree-uw', order: 'right', pruneOn: 'gte', drillId: 't6-d4' }, caption: 'Latihan 4: pohon slide 55, kanan → kiri.' },
          { type: 'widget', widget: 'ab-drill', props: { caseId: 'l5-minimax', order: 'right', pruneOn: 'gte', drillId: 't6-d5' }, caption: 'Latihan 5: l5-minimax, kanan → kiri (slide 17–19).' },
          { type: 'text', text: 'Variasi (bukan soal resmi): ubah nilai daun, urutan, dan aturan, lalu lihat pemangkasannya berubah.' },
          { type: 'widget', widget: 'minimax-sim', props: { caseId: 'tree-uw', allowOrder: true, allowPruneOnToggle: true, editableLeaves: true }, caption: 'Variasi: ubah nilai daun (bukan soal resmi).' }
        ],
        checks: []
      },
      {
        id: 't6-s6',
        kind: 'cek',
        title: 'Cek cepat',
        blocks: [
          { type: 'text', text: 'Tujuh soal singkat dari contoh di atas. Jawaban yang salah boleh dicoba lagi.' }
        ],
        checks: [
          { id: 't6-s6-c1', type: 'input', prompt: 'Berapa nilai root pohon slide 27 (kiri → kanan)?', answer: '0', explanation: 'A = max(B −5, C −10, D 0, E −7) = 0.', source: 'Lecture 5 slide 27' },
          { id: 't6-s6-c2', type: 'input', prompt: 'Apa langkah terbaik di akar pohon slide 27?', answer: 'D', explanation: 'Nilai D = 0 adalah nilai maksimum di akar.', source: 'Lecture 5 slide 27' },
          { id: 't6-s6-c3', type: 'input', prompt: 'Daun yang dievaluasi pada pohon slide 27 (kiri → kanan), dipisah koma?', answer: 'N,W,G,H,D,S,T,L,U,V', accept: ['N W G H D S T L U V'], explanation: 'Daun yang dipangkas adalah X, I, J, P, Q, R. Daun itu tidak dievaluasi.', source: 'Lecture 5 slide 27–49' },
          { id: 't6-s6-c4', type: 'input', prompt: 'Pada urutan kanan → kiri di E, berapa simpul di dalam E (termasuk E) yang disentuh?', answer: '4', explanation: 'Hanya E, M, V, dan U yang disentuh. Lalu E dipangkas.', source: 'Lecture 5 slide 50–51' },
          { id: 't6-s6-c5', type: 'mcq', prompt: 'Pohon UW (slide 53–54): α(H) = 4 dan β(B) = 4. Dengan aturan ≥, apa yang terjadi?', options: [
            'Q dan R dipangkas, sehingga H berhenti setelah P',
            'Hanya AA yang dipangkas',
            'Tidak ada yang dipangkas',
            'Semua daun dievaluasi'
          ], answer: 0, explanation: 'Dengan ≥, α(H) = 4 ≥ β(B) = 4, sehingga Q dan R dipangkas. Kunci slide 54 memakai >, sehingga hanya AA yang dipangkas di H.', source: 'Lecture 5 slide 53–54' },
          { id: 't6-s6-c6', type: 'input', prompt: 'Pada slide 9 (l5-rn), berapa daun yang dipangkas dengan kiri → kanan?', answer: '2', explanation: 'c2 dan c3 dipangkas karena β(C) = 2 ≤ α(A) = 3 setelah c1 = 2.', source: 'Lecture 5 slide 9' },
          { id: 't6-s6-c7', type: 'mcq', prompt: 'Pemangkasan di node MIN karena α dari node MAX di atasnya disebut?', options: [
            'Alpha cut-off',
            'Beta cut-off',
            'Leaf cut-off',
            'Root cut-off'
          ], answer: 0, explanation: 'Pemangkasan di node MIN karena α disebut alpha cut-off. Pemangkasan di node MAX karena β disebut beta cut-off.', source: 'Lecture 5 slide 35 dan 45' }
        ]
      }
    ],
    essays: [
      {
        id: 't6-e1',
        title: 'Slide 9 dan slide 25',
        exam: false,
        variant: false,
        source: 'Lecture 5 slide 9 dan 25',
        minutes: 15,
        prompt: 'Pada l5-rn (slide 9), jalankan alpha-beta dari kiri ke kanan dengan aturan α ≥ β. Tulis tabel peristiwa, sebutkan daun yang dipangkas dan alasannya, lalu tulis nilai root dan langkah terbaik. Jelaskan juga kenapa nilai root pada slide 25 tidak bergantung pada x dan y.',
        figure: { widget: 'minimax-sim', props: { caseId: 'l5-rn', prune: true } },
        solution: `Aturan: kiri → kanan; α di MAX, β di MIN; pangkas jika α ≥ β.
Peristiwa: B←b1=3 β(B)=3; B←b2=12 β(B)=3; B←b3=8 β(B)=3; A←B=3 α(A)=3; C←c1=2 β(C)=2 ≤ α(A)=3 → potong c2 dan c3 (4 dan 6); A←C=2 α(A)=3; D←d1=14 β(D)=14; D←d2=5 β(D)=5; D←d3=2 β(D)=2; A←D=2 α(A)=3.
Daun dievaluasi: b1, b2, b3, c1, d1, d2, d3. Dipangkas: c2 dan c3.
Nilai root 3, langkah terbaik B (min(3, 12, 8) = 3).
Slide 25: root = max(3, min(2, x, y), 2). Karena min(2, x, y) ≤ 2, hasilnya selalu 3. Jadi x dan y tidak mengubah jawaban, sehingga tidak perlu dievaluasi.`,
        rubric: [
          { text: 'Aturan: kiri → kanan, α di MAX, β di MIN, pangkas jika α ≥ β', points: 10 },
          { text: 'Tabel peristiwa lengkap (b1 sampai d3) dengan α/β yang benar', points: 40 },
          { text: 'Daun c2 dan c3 dipangkas dengan alasan β(C) = 2 ≤ α(A) = 3', points: 20 },
          { text: 'Nilai root 3 dan langkah terbaik B', points: 15 },
          { text: 'Penjelasan x dan y: min(2, x, y) ≤ 2 sehingga root tetap 3', points: 15 }
        ]
      },
      {
        id: 't6-e2',
        title: 'Pohon slide 27 dengan E kanan → kiri',
        exam: false,
        variant: false,
        source: 'Lecture 5 slide 27 dan 50–51',
        minutes: 20,
        prompt: 'Pada pohon slide 27, jalankan alpha-beta dari kiri ke kanan sampai selesai. Lalu jalankan lagi dengan anak E diurutkan dari kanan ke kiri (M, L, K). Tulis tabel peristiwa untuk kedua urutan, daun yang dievaluasi, dan simpul yang dipangkas. Apakah nilai root berubah?',
        figure: { widget: 'minimax-sim', props: { caseId: 'tree-lecture-e-rtl' } },
        solution: `Kiri → kanan (ringkas): F←N=4 α(F)=4; O←W=−3 β(O)=−3 ≤ 4 → potong X; F←O=−3; B←F=4 β(B)=4; B←G=−5 β(B)=−5; A←B=−5 α(A)=−5; C←H=−10 β(C)=−10 ≤ −5 → potong I dan J (dengan P, Q, R); A←C=−10; A←D=0 α(A)=0; K←S=3 α(K)=3; K←T=5 α(K)=5; E←K=5 β(E)=5; E←L=2 β(E)=2; M←U=−7 α(M)=−7; M←V=−9 α(M)=−7; E←M=−7 β(E)=−7 ≤ 0 → berhenti di E; A←E=−7.
Daun dievaluasi: N, W, G, H, D, S, T, L, U, V. Dipangkas: X, I, J, P, Q, R. Root 0, langkah D.
Kanan → kiri di E: M←V=−9 α(M)=−9; M←U=−7 α(M)=−7; E←M=−7 β(E)=−7 ≤ α(A)=0 → potong L dan K (dengan T dan S).
Daun dievaluasi: N, W, G, H, D, V, U. Dipangkas: X, I, J, P, Q, R, L, K, T, S. Hanya 4 simpul di dalam E yang disentuh: E, M, V, U.
Nilai root tetap 0 dan langkah terbaik tetap D. Urutan memengaruhi jumlah simpul yang dipangkas, tetapi tidak mengubah nilai minimax.`,
        rubric: [
          { text: 'Urutan kiri → kanan: daun dievaluasi dan simpul dipangkas', points: 30 },
          { text: 'Tabel peristiwa untuk E kanan → kiri (M, lalu cut L dan K)', points: 30 },
          { text: 'Perbandingan jumlah simpul yang disentuh di E (4)', points: 15 },
          { text: 'Nilai root 0 dan langkah terbaik D tetap', points: 15 },
          { text: 'Aturan yang dipakai disebut dengan jelas', points: 10 }
        ]
      },
      {
        id: 't6-e3',
        title: 'Latihan slide 10 · dua aturan',
        exam: false,
        variant: false,
        source: 'Lecture 5 slide 10',
        minutes: 15,
        prompt: 'Pada l5-practice (slide 10), jalankan alpha-beta dari kiri ke kanan dua kali: pertama dengan aturan α ≥ β, kedua dengan α > β. Untuk tiap aturan, tulis daun yang dipangkas, nilai root, dan langkah terbaik.',
        figure: { widget: 'minimax-sim', props: { caseId: 'l5-practice', prune: true } },
        solution: `Nilai minimax tanpa pemangkasan: B = 12, C = 2, D = 1, A = 12. Langkah terbaik B.
Aturan ≥: B←b1=31, b2=20, b3=12 → β(B)=12; A←B=12 α(A)=12. C←c1=2 β(C)=2 ≤ 12 → potong c2 dan c3. A←C=2. D←d1=12 β(D)=12 ≤ α(A)=12 → potong d2 dan d3. A←D=12.
Pangkas: c2, c3, d2, d3. Root 12, langkah B.
Aturan >: langkah sama sampai C. Di D, setelah d1 = 12 kita punya β(D) = 12 dan α(A) = 12. Karena 12 > 12 tidak benar, belum ada pemangkasan, jadi d2 dievaluasi: d2 = 1, β(D) = 1, lalu 12 > 1 → potong d3.
Pangkas: c2, c3, d3. Root 12, langkah B.
Perbedaan: aturan ≥ berhenti di D setelah d1 karena kesamaan 12 = 12, sehingga d2 juga dipangkas. Aturan > tidak menganggap kesamaan sebagai alasan, sehingga d2 tetap dievaluasi.`,
        rubric: [
          { text: 'Aturan ≥: daftar daun dipangkas (c2, c3, d2, d3) dengan alasan', points: 25 },
          { text: 'Aturan >: daftar daun dipangkas (c2, c3, d3)', points: 25 },
          { text: 'Nilai root 12 dan langkah terbaik B untuk kedua aturan', points: 15 },
          { text: 'Penjelasan kenapa ≥ dan > berbeda di D', points: 25 },
          { text: 'Tabel atau urutan peristiwa yang rapi', points: 10 }
        ]
      },
      {
        id: 't6-x1',
        title: 'Pohon slide 53–54 · kiri → kanan · Set A',
        exam: true,
        set: 'A',
        variant: false,
        source: 'Lecture 5 slide 53–54',
        minutes: 20,
        prompt: 'Pohon UW pada slide 53 (akar A adalah MAX). Jalankan alpha-beta dari kiri ke kanan dua kali: pertama dengan aturan α ≥ β, kedua dengan α > β. Untuk tiap aturan, tulis simpul yang dipangkas, nilai root, dan langkah terbaik. Jelaskan kenapa Q dan R dipangkas dengan ≥, tetapi tidak dengan >.',
        figure: { widget: 'minimax-sim', props: { caseId: 'tree-uw', prune: true, pruneOn: 'gte' } },
        solution: `Aturan ≥, kiri → kanan: B←E=8 β(B)=8; N←W=10 β(N)=10; N←X=2 β(N)=2; N←Y=9 β(N)=2; F←N=2 α(F)=2; F←O=4 α(F)=4; B←F=4 β(B)=4; B←G=7 β(B)=4; H←P=4 α(H)=4 ≥ β(B)=4 → potong Q dan R (dengan Z dan AA); B←H=4; A←B=4 α(A)=4; C←I=3 β(C)=3 ≤ 4 → potong J; S←BB=3 β(S)=3 ≤ 4 → potong CC; K←S=3 α(K)=3; T←DD=2 β(T)=2 ≤ 4 → potong EE; K←T=2; D←K=3 β(D)=3 ≤ 4 → potong L dan M (dengan U dan V); A←D=3.
Pangkas: Q, Z, AA, R, J, CC, EE, L, M, U, V. Root 4, langkah B.
Aturan >, kiri → kanan: sama sampai H←P=4 α(H)=4. Dengan >, α(H) = 4 > β(B) = 4 tidak benar, jadi H tidak berhenti dan Q dievaluasi. Q←Z=2 β(Q)=2, lalu 4 > 2 → potong AA. H←Q=2; H←R=8 α(H)=8. B←H=8 tidak mengubah β(B)=4. Setelah itu C←I=3 β(C)=3, 4 > 3 → potong J; S←BB=3 → potong CC; T←DD=2 → potong EE; D←K=3 β(D)=3, 4 > 3 → potong L dan M (dengan U dan V).
Pangkas: AA, J, CC, EE, L, M, U, V. Root 4, langkah B.
Kenapa Q dan R dipangkas dengan ≥ tetapi tidak dengan >: pada ≥ kesamaan α(H) = β(B) = 4 sudah cukup untuk berhenti di H, sehingga Q dan R (dengan Z dan AA) tidak dievaluasi. Pada > kesamaan tidak cukup, sehingga H tetap mengevaluasi R dan hanya AA yang dipangkas.`,
        rubric: [
          { text: 'Aturan ≥: daftar pangkas Q, Z, AA, R dan alasan α(H) = 4 ≥ β(B) = 4', points: 25 },
          { text: 'Aturan >: daftar pangkas AA, J, CC, EE, L, M, U, V', points: 25 },
          { text: 'Nilai root 4 dan langkah terbaik B untuk kedua aturan', points: 15 },
          { text: 'Penjelasan kenapa H tetap dievaluasi dengan >', points: 20 },
          { text: 'Perbedaan ≥ dan > dijelaskan dengan jelas', points: 15 }
        ]
      },
      {
        id: 't6-x2',
        title: 'Pohon slide 55–56 · kanan → kiri · Set B',
        exam: true,
        set: 'B',
        variant: false,
        source: 'Lecture 5 slide 55–56',
        minutes: 20,
        prompt: 'Pohon UW pada slide 55 dievaluasi dari kanan ke kiri dengan aturan α ≥ β. Tulis tabel peristiwa, simpul yang dipangkas, nilai root, dan langkah terbaik. Apakah hasilnya sama dengan slide 56?',
        figure: { widget: 'minimax-sim', props: { caseId: 'tree-uw', order: 'right', prune: true, pruneOn: 'gte' } },
        solution: `Urutan kanan → kiri, aturan ≥: M←V=9 α(M)=9; M←U=6; D←M=9 β(D)=9; D←L=4 β(D)=4; T←EE=8 β(T)=8; T←DD=2 β(T)=2; K←T=2 α(K)=2; S←CC=9 β(S)=9; S←BB=3 β(S)=3; K←S=3 α(K)=3; D←K=3 β(D)=3; A←D=3 α(A)=3; C←J=8 β(C)=8; C←I=3 β(C)=3; A←C=3; H←R=8 α(H)=8; Q←AA=4 β(Q)=4 ≤ 8 → potong Z; H←Q=4; H←P=4; B←H=8 β(B)=8; B←G=7 β(B)=7; F←O=4 α(F)=4; N←Y=9 β(N)=9; N←X=2 β(N)=2 ≤ α(F)=4 → potong W; F←N=2 α(F)=4; B←F=4 β(B)=4; B←E=8 β(B)=4; A←B=4 α(A)=4.
Pangkas: Z dan W. Root 4, langkah B.
Hasil sama dengan kunci slide 56: pangkas Z dan W, root 4, langkah B. Slide 55 memberi β = 2 untuk Q, tetapi nilai yang benar adalah 4 (AA = 4).`,
        rubric: [
          { text: 'Urutan kanan → kiri ditulis benar (M, D, T, S, K, C, H, B, N, F)', points: 30 },
          { text: 'Pangkas Z dan W dengan alasan', points: 25 },
          { text: 'Nilai root 4 dan langkah terbaik B', points: 15 },
          { text: 'Perbandingan dengan kunci slide 56', points: 15 },
          { text: 'Tabel rapi dan aturan ditulis di awal', points: 15 }
        ]
      }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = topic;
  if (root) (root.KKA_TOPICS = root.KKA_TOPICS || []).push(topic);
})(typeof window !== 'undefined' ? window : globalThis);
