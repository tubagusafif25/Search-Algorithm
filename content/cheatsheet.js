(function (root) {
  'use strict';
  // Lembar contekan ujian: perbandingan algoritma, aturan konvensi per topik, rumus, dan kesalahan umum.
  const cheatsheet = {
    comparison: {
      headers: ['Aspek', 'DFS', 'UCS', 'Greedy', 'A*', 'Hill climbing', 'Alpha-beta'],
      rows: [
        ['Struktur', 'Stack + closed set', 'Priority queue menurut g', 'Priority queue menurut h', 'Priority queue menurut f = g + h', '1 state', 'DFS pada pohon game'],
        ['Dipilih', 'Paling atas (paling baru)', 'g terkecil', 'h terkecil', 'f terkecil', 'Neighbor terbaik', 'Anak kiri → kanan'],
        ['Tie', 'Urutan push', 'FIFO', 'FIFO', 'FIFO', 'Neighbor pertama', '—'],
        ['Duplikat', 'Closed saat pop', 'Update g, lewati entri usang', 'Path pertama, tidak masuk ulang', 'Update g, lewati usang, reopen', '—', '—'],
        ['Goal / berhenti', 'Goal test saat pop', 'Goal test saat pop', 'Goal test saat pop', 'Goal test saat pop', 'Tidak ada neighbor lebih baik', 'Semua anak selesai atau dipangkas'],
        ['Format', 'X(g=..)', 'X(g=..)', 'X(h=..)', 'X(g=..,h=..,f=..)', 'Iterasi / Route / Cost / Best / Decision', 'α(n), β(n), pangkas'],
        ['Complete / optimal', 'Complete pada graf berhingga dengan closed set; tidak optimal', 'Ya / ya (biaya ≥ ε > 0)', 'Ya pada graf berhingga / tidak', 'Ya / ya jika admissible', 'Tidak / tidak', 'Nilai root = minimax'],
        ['Kompleksitas (slide)', 'O(b^m) waktu, O(bm) ruang', 'O(b^(C*/ε))', 'Worst case seperti DFS, salah arah', 'Tergantung h', 'Memori kecil', 'Minimax O(b^d) waktu, O(bd) ruang']
      ]
    },
    rules: [
      {topicId: 't1', title: 'DFS graph search', items: [
        'Frontier = stack. Setiap entri menyimpan (state, g, parent).',
        'Successor dibaca sesuai urutan list, lalu dimasukkan terbalik sehingga successor pertama berada di atas stack.',
        'Closed set dicek saat pop: state yang sudah closed dilewati (skip) tanpa nomor iterasi dan tidak dihitung sebagai ekspansi.',
        'Successor yang sudah closed tidak dimasukkan. Successor yang masih ada di stack boleh masuk lagi sebagai duplikat.',
        'Goal test saat pop. Parent ditentukan oleh entri yang benar-benar di-pop.',
        'Snapshot frontier ditulis dari atas ke bawah, hanya entri yang belum closed.'
      ]},
      {topicId: 't2', title: 'Uniform Cost Search', items: [
        'UCS = A* dengan semua h = 0.',
        'Entri priority queue berisi (g, nomor urut, state); tie diputus FIFO.',
        'Successor sesuai urutan list; new_g = g + c. Jika new_g < g lama, catat g dan parent lama, update, lalu push entri baru.',
        'Saat pop, jika g entri ≠ g terbaik state, entri usang dilewati tanpa nomor iterasi.',
        'Goal test saat pop: goal yang ditemukan pertama belum tentu optimal.'
      ]},
      {topicId: 't3', title: 'Greedy best-first search', items: [
        'Priority = h. Entri (h, urutan, state); tie FIFO.',
        'Parent menyimpan path pertama. State yang sudah ditemukan (ada di frontier atau visited) tidak dimasukkan ulang.',
        'Visited = state yang sudah diekspansi. g hanya dihitung untuk laporan cost.',
        'Goal test saat pop. Snapshot ditulis sebagai X(h=..).',
        'Greedy tidak optimal: hanya melihat h, bukan biaya yang sudah ditempuh.'
      ]},
      {topicId: 't4', title: 'A* search', items: [
        'Entri (f, urutan, g, state) dengan f = g + h.',
        'Pop: jika g entri ≠ g terbaik state, entri usang dilewati sebelum goal test, tanpa nomor iterasi.',
        'Untuk setiap successor hitung new_g; jika new_g < g lama, catat g dan parent lama, update, push.',
        'Reopen diperbolehkan: state yang sudah diekspansi boleh diekspansi lagi jika g membaik, dan dihitung sebagai ekspansi baru.',
        'Goal test saat pop. Snapshot kandidat aktif ditulis X(g=..,h=..,f=..).',
        'Optimal jika h admissible; tanpa reopen, syarat cukupnya consistency.'
      ]},
      {topicId: 't5', title: 'Steepest-ascent hill climbing (TSP dan 8-queens)', items: [
        'Pegang satu state. Evaluasi semua neighbor dan ambil yang terbaik; seri diambil neighbor pertama dalam urutan pembangkitan.',
        'Pindah hanya jika neighbor terbaik lebih baik secara ketat. Jika tidak, berhenti pada optimum lokal atau plateau.',
        'TSP: state = urutan kota; cost = total jarak Euclid termasuk kembali ke kota pertama; neighbor = swap posisi i < j (10 neighbor pada 5 kota).',
        '8-queens: state = 8 digit; neighbor = pindahkan satu ratu ke baris lain (56 neighbor); h = jumlah pasangan yang saling menyerang.',
        'Hasil bergantung pada state awal: lihat contoh yang mencapai optimum global dan yang terjebak.'
      ]},
      {topicId: 't6', title: 'Alpha-beta pruning', items: [
        'Telusuri anak dari kiri ke kanan, kecuali soal meminta urutan lain.',
        'α(n) pada node MAX = nilai terbesar yang sudah dilihat di n; β(n) pada node MIN = nilai terkecil yang sudah dilihat di n.',
        'Setiap kali satu anak mengembalikan nilai, perbarui α atau β node tersebut.',
        'Pangkas anak yang tersisa jika α(n) ≥ β (aturan ≥) pada node MAX, atau β(n) ≤ α (aturan ≤) pada node MIN. Sebutkan jika memakai aturan > (strict).',
        'Nilai root sama dengan minimax tanpa pruning. Tulis aturan yang dipakai di baris pertama jawaban.'
      ]}
    ],
    formulas: [
      'f(n) = g(n) + h(n); Greedy memakai f = h; UCS memakai f = g.',
      'Admissible: h(n) ≤ h*(n) untuk setiap n.',
      'Consistent: h(u) ≤ c(u, v) + h(v) untuk setiap busur u → v.',
      'Update A*/UCS: new_g < g_lama (strict). Entri dengan g lebih besar dari g terbaik dilewati.',
      'Hill climbing TSP: Move jika cost(neighbor terbaik) < cost(current); selain itu Stop.',
      'Alpha-beta: pangkas anak tersisa jika α ≥ β (node MAX di bawah β ancestor, atau node MIN di bawah α ancestor).',
      'Jarak Euclid: d(A,B) = √((x_A − x_B)² + (y_A − y_B)²).'
    ],
    mistakes: [
      'Menguji goal saat state ditemukan, bukan saat diambil dari frontier.',
      'Menghitung goal atau entri usang/closed sebagai ekspansi.',
      'Menjumlahkan h ke cost path. Cost hanya jumlah c(u,v) di sepanjang path.',
      'Menulis urutan ekspansi sebagai path. Path adalah rantai parent dari goal.',
      'Memutus tie secara alfabetis. Tie diputus menurut urutan masuk (FIFO) atau urutan push (DFS).',
      'Lupa memperbarui parent saat g membaik.',
      'Menulis snapshot frontier sebelum successor diproses.',
      'Menganggap DFS atau Greedy optimal, atau menganggap konvensi tidak berpengaruh pada hasil.',
      'Mencampur aturan ≥ dan > pada alpha-beta tanpa menyebutkannya.'
    ],
    checklist: [
      'Tulis konvensi di baris pertama jawaban (tie, duplikat, goal test, urutan successor).',
      'Buat tabel trace: iterasi, dipilih, g/h/f, aksi, frontier sesudah.',
      'Catat setiap update (g lama → baru, parent lama → baru) dan setiap entri yang dilewati.',
      'Tulis path, total cost (jumlahkan edge), jumlah ekspansi, dan urutan ekspansi.',
      'Periksa optimalitas: admissible/consistent, dan beri path pembanding jika tidak optimal.',
      'Jelaskan minimal dua keputusan, termasuk tie yang menentukan hasil.'
    ]
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = cheatsheet;
  if (root) root.KKA_CHEATSHEET = cheatsheet;
})(typeof window !== 'undefined' ? window : globalThis);
