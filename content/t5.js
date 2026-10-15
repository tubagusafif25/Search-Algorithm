(function (root) {
  'use strict';

  /* Topik 5: Steepest-Ascent Hill Climbing (L4 slides 3–14, notebook 01_materi_local_search).
     Angka TSP dan 8-queens diambil dari PLAN2 Part 4.4 dan 4.5. Kunci: cost ABCDE 23.5638, global 21.3453. */
  const topic = {
    id: 't5',
    number: 5,
    slug: 'hill-climbing',
    title: 'Steepest-Ascent Hill Climbing',
    short: 'Hill Climbing',
    summary: 'Hill climbing memegang satu state, membandingkan semua tetangganya, dan pindah ke tetangga terbaik selama lebih baik. Berhenti ketika tidak ada tetangga yang lebih baik: bisa di optimum lokal.',
    goals: [
      'Kamu bisa menjelaskan steepest-ascent: satu state, semua tetangga diperiksa, lalu pindah ke yang terbaik.',
      'Kamu bisa menghitung cost rute TSP, membangkitkan 10 tetangga, dan menulis keputusan Move atau Stop.',
      'Kamu bisa menjelaskan kenapa hill climbing berhenti di optimum lokal dan kenapa hasilnya bergantung pada titik awal.',
      'Kamu bisa menulis jawaban esai hill climbing dengan representasi, tabel, aturan seri, dan hasil akhir.'
    ],
    sources: [
      { label: 'Lecture 4 slide 7 · pseudocode hill climbing', lecture: 4, slide: 7 },
      { label: 'Lecture 4 slide 11 · 8-queens, h = 17', lecture: 4, slide: 11 },
      { label: 'Lecture 4 slide 13 · minimum lokal, h = 1', lecture: 4, slide: 13 },
      { label: 'Lecture 4 slide 14 · statistik 14% dan 86%', lecture: 4, slide: 14 },
      { label: 'Notebook 01_materi_local_search · §2, §4–§15', notebook: '01_materi_local_search' }
    ],
    sections: [
      {
        id: 't5-s1',
        kind: 'intuisi',
        title: 'Intuisi: mendaki bukit berkabut',
        blocks: [
          { type: 'intuition', text: 'Bayangkan kamu berdiri di bukit berkabut dan ingin naik setinggi mungkin. Kamu tidak bisa melihat seluruh peta, hanya langkah di sekitarmu. Setiap kali kamu melangkah ke arah yang paling menanjak. Kalau semua arah menurun, kamu berhenti. Itulah hill climbing.\nPada TSP kita ingin cost sekecil mungkin, jadi “mendaki” berarti menurunkan cost.' },
          { type: 'text', text: 'Hill climbing termasuk local search: ia memegang satu state saat ini dan hanya pindah ke state tetangga. Jalur yang sudah dilalui diabaikan, sehingga memorinya kecil. Kelemahannya, ia tidak melihat lebih jauh daripada tetangga langsung. Slide 8 menggambarkannya sebagai “climbing Mount Everest in a thick fog with amnesia”.' },
          { type: 'slide', lecture: 4, slide: 7, caption: 'Pseudocode hill climbing versi max (slide 7)' },
          { type: 'pseudocode', title: 'Hill-climbing, versi max (slide 7, dibaca verbatim)', lines: [
            'function HILL-CLIMBING(problem) return a state that is a local maximum',
            '  input: problem, a problem',
            '  local variables: current, a node.',
            '                   neighbor, a node.',
            '',
            '  current ← MAKE-NODE(INITIAL-STATE[problem])',
            '  loop do',
            '    neighbor ← a highest valued successor of current',
            '    if VALUE[neighbor] ≤ VALUE[current] then return STATE[current]',
            '    current ← neighbor'
          ] },
          { type: 'note', text: 'Versi min (untuk TSP, cost diminimalkan): balik pertidaksamaan dan cari successor dengan nilai terendah. Slide 7 menulisnya sebagai “min version will reverse inequalities and look for lowest valued successor”.' },
          { type: 'text', text: 'Notebook membandingkan beberapa varian hill climbing. Kita memakai steepest-ascent.' },
          { type: 'table', caption: 'Varian hill climbing (notebook 01_materi_local_search, bagian 2)', headers: ['Varian', 'Cara memilih neighbor', 'Dipakai di sini?'], rows: [
            ['Steepest-ascent', 'Cek semua neighbor, ambil yang terbaik', 'Ya'],
            ['First-choice / simple', 'Ambil neighbor pertama yang lebih baik dari current', 'Tidak'],
            ['Stochastic', 'Pilih acak di antara neighbor yang lebih baik', 'Tidak'],
            ['Random-restart', 'Jalankan ulang dari state awal acak, ambil hasil terbaik', 'Tidak']
          ] },
          { type: 'text', text: 'Slide 9 bertanya: hill climbing terjebak di minimum lokal bergantung pada apa? Jawabannya: pada titik awal. Start yang berbeda bisa berakhir di tempat yang berbeda. Variasi A(1,3) di latihan menunjukkan hal ini: dari ABCDE algoritma berhenti di optimum lokal, sedangkan dari DAEBC ia mencapai optimum global.' }
        ],
        checks: [
          { id: 't5-s1-c1', type: 'mcq', prompt: 'Pada steepest-ascent, bagaimana neighbor berikutnya dipilih?', options: [
            'Neighbor pertama yang lebih baik ditemukan',
            'Neighbor terbaik dari semua neighbor',
            'Neighbor yang dipilih secara acak',
            'Neighbor dengan cost tertinggi'
          ], answer: 1, explanation: 'Steepest-ascent memeriksa semua neighbor lalu memilih yang terbaik (highest valued successor, slide 7). Versi first-choice berhenti pada neighbor pertama yang lebih baik.', source: 'Lecture 4 slide 7' },
          { id: 't5-s1-c2', type: 'mcq', prompt: 'Kapan hill climbing berhenti (kondisi stop)?', options: [
            'Ketika tidak ada neighbor yang nilainya lebih baik, yaitu VALUE(neighbor) ≤ VALUE(current)',
            'Setelah memeriksa 10 neighbor',
            'Ketika menemukan state yang sudah pernah dikunjungi',
            'Setelah 100 langkah'
          ], answer: 0, explanation: 'Berhenti ketika neighbor terbaik tidak lebih baik dari current. Itu yang membuat hill climbing berhenti di puncak kecil atau minimum lokal.', source: 'Lecture 4 slide 7' }
        ]
      },
      {
        id: 't5-s2',
        kind: 'aturan',
        title: 'Aturan kuliah: hill climbing pada TSP',
        blocks: [
          { type: 'definition', term: 'State', text: 'Urutan kota dalam satu rute tertutup. Contoh: ABCDE berarti A → B → C → D → E → A.' },
          { type: 'definition', term: 'Cost', text: 'Jumlah jarak Euclid seluruh sisi rute, termasuk sisi dari kota terakhir kembali ke kota pertama.\nd(X, Y) = √((xX − xY)² + (yX − yY)²)' },
          { type: 'definition', term: 'Neighbor', text: 'Tukar dua posisi i dan j dengan i < j. Untuk 5 kota ada C(5,2) = 10 neighbor. Urutan pembangkitannya: (0,1), (0,2), (0,3), (0,4), (1,2), (1,3), (1,4), (2,3), (2,4), (3,4).' },
          { type: 'list', ordered: true, items: [
            'Hitung cost state sekarang.',
            'Bangkitkan 10 neighbor dengan menukar posisi (i, j), i < j.',
            'Pilih neighbor dengan cost terkecil. Jika ada seri, pilih yang pertama dalam urutan pembangkitan.',
            'Move jika cost(best) < cost(current). Selain itu Stop.',
            'Jika Move, ulangi dari langkah 1 dengan state baru.'
          ] },
          { type: 'formula', text: 'Iterations = jumlah Move (iterasi yang berhenti dengan Stop tidak dihitung sebagai Move)' },
          { type: 'table', caption: 'Kolom tabel ringkas per iterasi (format notebook §12)', headers: ['Iteration', 'Current Route', 'Current Cost', 'Best Neighbor', 'Best Neighbor Cost', 'Decision'], rows: [
            ['0', 'ABCDE', '23.5638', 'DBCAE (#3)', '22.3760', 'Move']
          ] },
          { type: 'note', text: 'Pembulatan: cost ABCDE = 5.0000 + 4.2426 + 5.0990 + 4.1231 + 5.0990 = 23.5638 bila memakai nilai penuh. Jika tiap suku dibulatkan dulu lalu dijumlahkan, hasilnya 23.5637. Keduanya diterima. Pakai 4 desimal dan toleransi 0.0001.' },
          { type: 'warning', text: 'Seri di notebook (float): kadang notebook menampilkan neighbor lain yang nilainya sama karena selisih floating-point yang sangat kecil. Aturan jawaban kuliah adalah neighbor pertama dalam urutan pembangkitan. Dua neighbor yang seri selalu tur yang sama, hanya titik awal dan arahnya yang berbeda, jadi cost-nya tidak berubah.' }
        ],
        checks: [
          { id: 't5-s2-c1', type: 'input', prompt: 'Ada berapa neighbor dari satu state dengan 5 kota?', answer: '10', explanation: 'Pasangan (i, j) dengan i < j dari 5 posisi adalah C(5,2) = 10.', source: 'Notebook 01_materi_local_search §9' },
          { id: 't5-s2-c2', type: 'input', prompt: 'Berapa d(A,B) untuk A(1,1) dan B(4,5)?', answer: '5', accept: ['5.0000', '5,0000'], explanation: 'Selisih koordinat (3, 4). √(3² + 4²) = √25 = 5.', source: 'Notebook 01_materi_local_search §6' }
        ]
      },
      {
        id: 't5-s3',
        kind: 'contoh',
        title: 'Contoh langkah demi langkah: TSP 5 kota dan 8-queens',
        blocks: [
          { type: 'text', text: 'Lima kota: A(1,1), B(4,5), C(7,2), D(6,7), E(2,6). Tabel jarak Euclid (4 desimal):' },
          { type: 'table', caption: 'Jarak antarkota', headers: ['Pasangan', 'Jarak', 'Pasangan', 'Jarak'], rows: [
            ['AB', '5.0000 (√25)', 'BD', '2.8284 (√8)'],
            ['AC', '6.0828 (√37)', 'BE', '2.2361 (√5)'],
            ['AD', '7.8102 (√61)', 'CD', '5.0990 (√26)'],
            ['AE', '5.0990 (√26)', 'CE', '6.4031 (√41)'],
            ['BC', '4.2426 (√18)', 'DE', '4.1231 (√17)']
          ] },
          { type: 'text', text: 'Percobaan 1: start ABCDE. Cost awal ABCDE = 5.0000 + 4.2426 + 5.0990 + 4.1231 + 5.0990 = 23.5638. Ikuti replay di bawah, lalu baca penjelasannya.' },
          { type: 'widget', widget: 'tsp-hc', props: { caseId: 'tsp5', start: 'ABCDE', mode: 'replay' }, caption: 'Replay percobaan 1 (start ABCDE).' },
          { type: 'example', title: 'Iterasi 0 (ABCDE, 23.5638)', text: 'Dari 10 neighbor, yang terbaik #3 DBCAE dengan cost 22.3760. #5 ACBDE juga 22.3760, tetapi #3 muncul lebih dulu, jadi #3 dipilih. 22.3760 < 23.5638, maka Move.' },
          { type: 'example', title: 'Iterasi 1 (DBCAE, 22.3760)', text: 'Yang terbaik #1 BDCAE dengan cost 21.3453. #9 DBEAC juga 21.3453 (seri), dan #1 dipilih. 21.3453 < 22.3760, maka Move.' },
          { type: 'example', title: 'Iterasi 2 (BDCAE, 21.3453)', text: 'Yang terbaik #1 DBCAE dengan cost 22.3760 (seri dengan #9 BDEAC). 22.3760 ≥ 21.3453, maka Stop.' },
          { type: 'text', text: 'Hasil: rute B → D → C → A → E → B dengan cost 21.3453 setelah 2 Move. Itu tur yang sama dengan A-C-D-B-E, optimum global untuk 5 kota ini.' },
          { type: 'note', text: 'Pada iterasi terakhir, notebook mencetak best neighbor #9 (float). Nilainya sama dengan #1, dan keputusannya tetap Stop.' },
          { type: 'text', text: 'Contoh kedua: 8-queens (slide 11). Setiap state adalah 8 digit, dengan digit ke-i sebagai baris ratu di kolom ke-i, dihitung dari bawah. h adalah jumlah pasangan ratu yang saling menyerang. Yang diminimalkan adalah h, jadi h yang lebih kecil lebih baik.' },
          { type: 'slide', lecture: 4, slide: 11, caption: '8-queens dengan h = 17 (slide 11)' },
          { type: 'text', text: 'State 43254323 punya h = 17. Dari 56 neighbor (8 kolom, masing-masing 7 baris lain), neighbor terbaik punya h = 12. Urutan pemeriksaan: kolom 1 sampai 8, lalu baris 1 sampai 8. Yang pertama dengan h = 12 adalah kolom 2 → baris 6, yaitu 46254323.' },
          { type: 'widget', widget: 'queens', props: { start: '43254323', mode: 'hill', showGrid: true }, caption: 'Simulasi 8-queens, start 43254323, mode hill.' },
          { type: 'text', text: 'Jalur steepest-ascent: 43254323(17) → 46254323(12) → 46251323(7) → 46251373(3) → 46251473(2) → 36251473(1). Ada 5 Move. Di 36251473, tidak ada neighbor dengan h lebih kecil, jadi algoritma berhenti pada minimum lokal dengan h = 1.' },
          { type: 'slide', lecture: 4, slide: 13, caption: 'Board slide 13 dengan h = 1. Neighbor terbaiknya punya h = 2, jadi ini minimum lokal.' }
        ],
        checks: [
          { id: 't5-s3-c1', type: 'input', prompt: 'Berapa cost ABCDE? Tulis dengan 4 desimal.', answer: '23.5638', accept: ['23,5638', '23.5637', '23,5637'], explanation: 'Cost ABCDE = 5.0000 + 4.2426 + 5.0990 + 4.1231 + 5.0990 = 23.5638. Jika suku dibulatkan dulu, hasilnya 23.5637. Keduanya diterima.', source: 'Notebook 01_materi_local_search §7' },
          { id: 't5-s3-c2', type: 'input', prompt: 'Pada iterasi 0 percobaan 1, neighbor terbaik berada di nomor berapa?', answer: '3', accept: ['#3'], explanation: 'Neighbor #3 (DBCAE, 22.3760) dipilih. #5 bernilai sama, tetapi #3 dibangkitkan lebih dulu.', source: 'Notebook 01_materi_local_search §11–§12' }
        ]
      },
      {
        id: 't5-s4',
        kind: 'menulis',
        title: 'Cara menulis jawaban esai',
        blocks: [
          { type: 'text', text: 'Jawaban hill climbing selalu ditulis dengan urutan yang sama. Salin template ini, lalu isi bagian dalam kurung siku.' },
          { type: 'template', title: 'Template jawaban hill climbing (TSP)', text: `1) Representasi: state = [urutan kota]; neighbor = tukar posisi (i < j), ada 10 neighbor; cost = jarak total termasuk kembali ke kota pertama.
2) Tabel jarak: [pasangan dan jarak yang dipakai].
3) Per iterasi: current route + cost; tabel 10 neighbor (#, swap, route, cost); best (seri → yang pertama); keputusan Move atau Stop.
4) Tabel ringkas iterasi: Iteration | Current Route | Current Cost | Best Neighbor | Best Neighbor Cost | Decision.
5) Hasil akhir: route, cost, jumlah Move; apakah optimum global? (bandingkan dengan 12 tur atau beri alasan).` },
          { type: 'list', title: 'Kesalahan yang sering terjadi', items: [
            'Membangkitkan neighbor yang sama dua kali atau melewatkan satu. Untuk 5 kota harus 10.',
            'Memilih best dari nilai, lalu lupa aturan seri: pakai neighbor pertama dalam urutan.',
            'Menulis Move padahal best tidak lebih kecil dari current. Move hanya jika cost(best) < cost(current).',
            'Menyatakan hasil pasti optimum global tanpa membandingkan dengan tur lain.',
            'Menghitung cost tanpa sisi kembali ke kota pertama.',
            'Mencampur nilai yang dibulatkan dan nilai penuh tanpa menyebutkan toleransi.'
          ] },
          { type: 'note', text: 'Contoh jawaban lengkap ada di pembahasan esai t5-e1. Tulis dulu sendiri, lalu buka pembahasan.' }
        ],
        checks: []
      },
      {
        id: 't5-s5',
        kind: 'latihan',
        title: 'Latihan interaktif',
        blocks: [
          { type: 'text', text: 'Isi neighbor dan keputusan tiap iterasi sendiri, lalu bandingkan dengan jawaban di simulator. Setiap latihan menyimpan skor percobaan pertamamu.' },
          { type: 'widget', widget: 'tsp-hc', props: { caseId: 'tsp5', start: 'ABCDE', mode: 'drill', drillId: 't5-d1' }, caption: 'Latihan 1: start ABCDE (percobaan 1).' },
          { type: 'widget', widget: 'tsp-hc', props: { caseId: 'tsp5', start: 'ACBED', mode: 'drill', drillId: 't5-d2' }, caption: 'Latihan 2: start ACBED (percobaan 2).' },
          { type: 'widget', widget: 'tsp-hc', props: { caseId: 'tsp5', start: 'DAEBC', mode: 'drill', drillId: 't5-d3' }, caption: 'Latihan 3: start DAEBC (percobaan 3).' },
          { type: 'widget', widget: 'tsp-hc', props: { caseId: 'tsp5', variant: 'A13', start: 'ABCDE', mode: 'drill', drillId: 't5-d4' }, caption: 'Latihan 4 · variasi: kota A dipindah ke (1,3). Ini bukan soal resmi.' },
          { type: 'text', text: 'Eksplorasi 8-queens: pilih start, lalu perhatikan h turun dan berhenti di minimum lokal.' },
          { type: 'widget', widget: 'queens', props: { start: '43254323', mode: 'explore', showGrid: true }, caption: 'Eksplorasi 8-queens (mode explore).' }
        ],
        checks: []
      },
      {
        id: 't5-s6',
        kind: 'cek',
        title: 'Cek cepat',
        blocks: [
          { type: 'text', text: 'Tujuh soal singkat. Jawaban yang salah boleh dicoba lagi.' }
        ],
        checks: [
          { id: 't5-s6-c1', type: 'input', prompt: 'Cost akhir percobaan 1 (start ABCDE) setelah berhenti? 4 desimal.', answer: '21.3453', accept: ['21,3453'], explanation: 'Rute akhir B → D → C → A → E → B = 21.3453, setara dengan tur A-C-D-B-E.', source: 'Contoh langkah demi langkah' },
          { id: 't5-s6-c2', type: 'input', prompt: 'Berapa Move pada percobaan 1?', answer: '2', explanation: 'Move terjadi di iterasi 0 dan 1. Iterasi 2 berakhir dengan Stop.', source: 'Contoh langkah demi langkah' },
          { id: 't5-s6-c3', type: 'mcq', prompt: 'Pada iterasi 0 percobaan 1, neighbor #3 dan #5 sama-sama 22.3760. Mana yang dipilih menurut aturan kuliah?', options: [
            '#3, karena muncul lebih dulu dalam urutan pembangkitan',
            '#5, karena indeksnya lebih besar',
            'Keduanya dipakai bergantian',
            'Yang alfabetis pertama'
          ], answer: 0, explanation: 'Aturan seri: neighbor pertama dalam urutan pembangkitan. #3 dibangkitkan sebelum #5.', source: 'Aturan kuliah' },
          { id: 't5-s6-c4', type: 'input', prompt: 'Berapa h awal state 43254323 pada slide 11?', answer: '17', explanation: 'Pasangan ratu yang saling menyerang di state awal slide 11 berjumlah 17.', source: 'Lecture 4 slide 11' },
          { id: 't5-s6-c5', type: 'input', prompt: 'Berapa h terbaik dari 56 neighbor pada state awal slide 11?', answer: '12', explanation: 'Neighbor terbaik punya h = 12. Yang pertama ditemukan di kolom 2, baris 6.', source: 'Lecture 4 slide 11' },
          { id: 't5-s6-c6', type: 'mcq', prompt: 'Kenapa hill climbing berhenti di 36251473 (h = 1), padahal bukan solusi?', options: [
            'Ia sudah menemukan solusi',
            'Tidak ada neighbor dengan h lebih kecil, jadi ia berada di optimum lokal',
            'Ia kehabisan memori',
            'Ia memilih neighbor secara acak'
          ], answer: 1, explanation: 'Hill climbing hanya pindah ke neighbor yang lebih baik. Tidak ada yang lebih baik dari h = 1, jadi ia berhenti di minimum lokal.', source: 'Lecture 4 slide 13–14' },
          { id: 't5-s6-c7', type: 'input', prompt: 'Cost ABCDE pada variasi A(1,3)? 4 desimal.', answer: '20.2326', accept: ['20,2326'], explanation: 'Dengan A di (1,3): AB 3.6056 + BC 4.2426 + CD 5.0990 + DE 4.1231 + EA 3.1623 = 20.2326.', source: 'Variasi A(1,3), bukan soal resmi' }
        ]
      }
    ],
    essays: [
      {
        id: 't5-e1',
        title: 'Percobaan 2 (ACBED)',
        exam: false,
        variant: false,
        source: 'Notebook 01_materi_local_search §4 dan §14',
        minutes: 20,
        prompt: 'Start dari ACBED dengan cost 24.4948. Jalankan steepest-ascent hill climbing dengan neighbor swap (i < j) dan aturan seri ke neighbor pertama. Tulis representasi, tabel jarak yang dipakai, tabel 10 neighbor di setiap iterasi, keputusan Move atau Stop, dan hasil akhir. Sebutkan juga apakah rute akhirnya sama dengan rute percobaan 1.',
        figure: { widget: 'tsp-hc', props: { caseId: 'tsp5', start: 'ACBED', mode: 'replay' } },
        solution: `Representasi: state = urutan kota; neighbor = swap (i < j), ada 10 neighbor; cost termasuk kembali ke kota pertama.
Jarak: AB 5.0000, AC 6.0828, AD 7.8102, AE 5.0990, BC 4.2426, BD 2.8284, BE 2.2361, CD 5.0990, CE 6.4031, DE 4.1231.
Iterasi 0 (ACBED, 24.4948): best #2 BCAED dengan cost 22.3760. #10 ACBDE juga 22.3760, tetapi #2 muncul lebih dulu. 22.3760 < 24.4948, maka Move.
Iterasi 1 (BCAED, 22.3760): best #4 DCAEB dengan cost 21.3453. #6 BEACD juga 21.3453, tetapi #4 muncul lebih dulu. 21.3453 < 22.3760, maka Move.
Iterasi 2 (DCAEB, 21.3453): best #4 BCAED dengan cost 22.3760 (seri dengan #6). 22.3760 ≥ 21.3453, maka Stop.
Hasil: D → C → A → E → B → D, cost 21.3453, 2 Move. Notebook (float) mencetak B → E → A → C → D → B. Itu tur yang sama, dibaca dari arah lain. Tur ini optimum global (A-C-D-B-E).`,
        rubric: [
          { text: 'Representasi: state, 10 neighbor (swap i < j), cost termasuk kembali', points: 10 },
          { text: 'Jarak dan cost awal ACBED (24.4948) benar', points: 15 },
          { text: 'Tabel 10 neighbor untuk setiap iterasi 0–2, dengan cost yang benar', points: 40 },
          { text: 'Keputusan Move atau Stop dan aturan seri dijelaskan', points: 15 },
          { text: 'Hasil: rute akhir, cost 21.3453, 2 Move, dan catatan bahwa tur sama dengan notebook', points: 20 }
        ]
      },
      {
        id: 't5-e2',
        title: 'Percobaan 3 dan perbandingan',
        exam: false,
        variant: false,
        source: 'Notebook 01_materi_local_search §14',
        minutes: 20,
        prompt: 'Jalankan steepest-ascent hill climbing dari DAEBC (cost 24.4870) sampai berhenti. Lalu bandingkan tiga percobaan (ABCDE, ACBED, DAEBC). Apakah ketiganya mencapai optimum global 21.3453? Jelaskan kenapa hasil hill climbing tetap sama untuk start dan aturan seri yang sama, dan kenapa semua percobaan berakhir di tur yang sama walaupun jumlah Move-nya berbeda.',
        solution: `Iterasi 0 (DAEBC, 24.4870): best #4 CAEBD dengan cost 21.3453. #6 DBEAC juga 21.3453, tetapi #4 muncul lebih dulu. Move.
Iterasi 1 (CAEBD, 21.3453): best #2 EACBD dengan cost 22.3760 (seri dengan #10 CAEDB). 22.3760 ≥ 21.3453, maka Stop.
Hasil: C → A → E → B → D → C, cost 21.3453, 1 Move (sama dengan notebook).
Perbandingan: ABCDE 2 Move, ACBED 2 Move, DAEBC 1 Move. Ketiganya berakhir di cost 21.3453. Untuk 5 kota ada 12 tur berbeda, dan 21.3453 adalah yang termurah, jadi ketiganya optimum global.
Determinisme: tidak ada langkah acak. Start dan aturan seri yang sama selalu menghasilkan jalur yang sama. Perbedaan jumlah Move hanya bergantung pada start.`,
        rubric: [
          { text: 'Rute dan cost per iterasi untuk DAEBC benar', points: 30 },
          { text: 'Keputusan Move atau Stop di tiap iterasi, dan aturan seri', points: 20 },
          { text: 'Perbandingan tiga percobaan: jumlah Move dan hasil akhir', points: 25 },
          { text: 'Penjelasan determinisme dan 12 tur sebagai alasan optimum global', points: 25 }
        ]
      },
      {
        id: 't5-e3',
        title: '8-queens slide 11',
        exam: false,
        variant: false,
        source: 'Lecture 4 slide 11–14',
        minutes: 15,
        prompt: 'Diberikan 8-queens dengan state 43254323 (h = 17). Gunakan steepest-ascent dengan urutan pemeriksaan kolom 1–8, lalu baris 1–8, dan pilih neighbor dengan h terkecil. Tulis langkah pertama, lalu lanjutkan sampai berhenti. Apa arti h = 1 pada 36251473? Jelaskan juga statistik hill climbing di slide 14.',
        figure: { widget: 'queens', props: { start: '43254323', mode: 'hill', showGrid: true } },
        solution: `Representasi: state = 8 digit, digit ke-i = baris ratu di kolom i (dihitung dari bawah). h = jumlah pasangan ratu yang saling menyerang.
Start 43254323, h = 17. Dari 56 neighbor, yang terbaik punya h = 12. Yang pertama dalam urutan pemeriksaan adalah kolom 2 → baris 6, menjadi 46254323.
Jalur: 43254323(17) → 46254323(12) → 46251323(7) → 46251373(3) → 46251473(2) → 36251473(1). Ada 5 Move.
Di 36251473 h = 1. Bukan solusi (solusi punya h = 0). Tidak ada neighbor dengan h lebih kecil, jadi algoritma berhenti di minimum lokal.
Statistik slide 14: dari state acak, 14% berhasil dan 86% terjebak di minimum lokal. Yang berhasil rata-rata 4 langkah, yang terjebak rata-rata 3 langkah. Ruang keadaannya sekitar 8⁸ ≈ 17 juta.`,
        rubric: [
          { text: 'Representasi state dan definisi h', points: 15 },
          { text: 'h awal 17, neighbor terbaik 12, dan urutan pemeriksaan kolom lalu baris', points: 25 },
          { text: 'Jalur sampai berhenti (5 Move) benar', points: 25 },
          { text: 'Penjelasan minimum lokal untuk h = 1', points: 20 },
          { text: 'Statistik slide 14 (14%, 86%, 4 dan 3 langkah)', points: 15 }
        ]
      },
      {
        id: 't5-x1',
        title: 'Variasi A(1,3) · Set A',
        exam: true,
        set: 'A',
        variant: true,
        source: 'Variasi dari TSP 5 kota: kota A dipindah ke (1,3). Bukan soal resmi.',
        minutes: 20,
        prompt: 'Kota A dipindah ke (1,3). Kota lain tetap: B(4,5), C(7,2), D(6,7), E(2,6). Mulai dari ABCDE, jalankan steepest-ascent hill climbing dengan aturan seri ke neighbor pertama. Apakah ABCDE sudah optimum lokal? Berapa cost optimum global untuk variasi ini? Dari DAEBC, apakah algoritma mencapai optimum global? Tulis cost dan keputusan tiap langkah.',
        figure: { widget: 'tsp-hc', props: { caseId: 'tsp5', variant: 'A13', start: 'ABCDE', mode: 'replay' } },
        solution: `Jarak yang berubah: AB 3.6056, AE 3.1623, AD 6.4031. AC 6.0828 tetap.
Cost ABCDE = 3.6056 + 4.2426 + 5.0990 + 4.1231 + 3.1623 = 20.2326.
Iterasi 0 dari ABCDE: best #3 DBCAE = 20.4392 (#5 ACBDE juga 20.4392). 20.4392 ≥ 20.2326, maka Stop. ABCDE adalah optimum lokal.
Optimum global variasi ini: A-C-D-B-E = 19.4086 (AC 6.0828 + CD 5.0990 + DB 2.8284 + BE 2.2361 + EA 3.1623).
Dari DAEBC (cost 21.1431): best #4 CAEBD = 19.4086 < 21.1431, maka Move. Iterasi berikutnya tidak menemukan yang lebih kecil, maka Stop. Hasilnya 19.4086 dalam 1 Move, optimum global.
Kesimpulan: hasil hill climbing bergantung pada titik awal. Dari ABCDE algoritma terjebak, dari DAEBC tidak.`,
        rubric: [
          { text: 'Jarak yang berubah dan cost ABCDE 20.2326', points: 20 },
          { text: 'Iterasi dari ABCDE dan keputusan Stop sebagai optimum lokal', points: 25 },
          { text: 'Optimum global 19.4086 dengan rute A-C-D-B-E', points: 20 },
          { text: 'Start DAEBC: 1 Move dan mencapai optimum global', points: 20 },
          { text: 'Kesimpulan tentang pengaruh titik awal', points: 15 }
        ]
      },
      {
        id: 't5-x2',
        title: 'Start ADBCE · Set B',
        exam: true,
        set: 'B',
        variant: false,
        source: 'Notebook 01_materi_local_search §4 (start ADBCE)',
        minutes: 20,
        prompt: 'Mulai dari ADBCE dengan cost 26.3835. Jalankan steepest-ascent hill climbing dengan aturan seri ke neighbor pertama. Tulis tabel tiap iterasi (current route, cost, best neighbor, keputusan), jumlah Move, dan rute akhir. Apakah rute akhir sudah optimum global?',
        solution: `Representasi: state = urutan kota; neighbor = swap (i < j), ada 10 neighbor.
Iterasi 0 (ADBCE, 26.3835): best #4 EDBCA dengan cost 22.3760 (#6 ACBDE juga 22.3760, pilih #4). Move.
Iterasi 1 (EDBCA, 22.3760): best #3 CDBEA dengan cost 21.3453 (#5 EBDCA juga 21.3453, pilih #3). Move.
Iterasi 2 (CDBEA, 21.3453): best #3 EDBCA dengan cost 22.3760 (#5 CBDEA juga 22.3760). 22.3760 ≥ 21.3453, maka Stop.
Hasil: C → D → B → E → A → C, cost 21.3453, 2 Move. Ini tur yang sama dengan A-C-D-B-E, yaitu optimum global.`,
        rubric: [
          { text: 'Representasi dan cost awal ADBCE (26.3835)', points: 15 },
          { text: 'Tabel tiga iterasi dengan cost yang benar', points: 40 },
          { text: 'Keputusan Move atau Stop dan aturan seri di tiap iterasi', points: 20 },
          { text: 'Hasil akhir: rute, cost 21.3453, dan 2 Move', points: 15 },
          { text: 'Perbandingan dengan optimum global', points: 10 }
        ]
      }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = topic;
  if (root) (root.KKA_TOPICS = root.KKA_TOPICS || []).push(topic);
})(typeof window !== 'undefined' ? window : globalThis);
