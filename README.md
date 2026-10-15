# KKA Kuis

Ruang belajar offline untuk kuis KKA (Kecerdasan Komputasional/Artifisial). Enam topik pencarian, berurutan sesuai kuis:

1. DFS Graph Search
2. Uniform Cost Search (UCS)
3. Greedy Best-First Search
4. A* Search
5. Steepest-Ascent Hill Climbing (TSP dan 8-queens)
6. Alpha-Beta Pruning

Setiap topik memiliki enam bagian kecil: intuisi, aturan, contoh, cara menulis jawaban, latihan interaktif, dan cek cepat. Ada juga esai latihan, mock quiz enam esai dengan timer, ringkasan rumus dan kesalahan umum, serta halaman progres.

## Cara menjalankan

Cara termudah: klik dua kali `START-STUDY.cmd` di folder `study-web` (Windows). Skrip ini menjalankan `serve.py` lalu membuka browser ke `http://127.0.0.1:8765/study-web/`.

Alternatif tanpa skrip, dari folder `kka`:

```
python3 -m http.server 8822
```

Lalu buka `http://127.0.0.1:8822/study-web/index.html`. Aplikasi tidak butuh internet dan tidak butuh instalasi. Tidak ada langkah build.

## Yang disimpan di perangkat

Semua jawaban disimpan di penyimpanan browser (`localStorage`, kunci `kka-kuis-v3`). Data tidak dikirim ke mana pun. Isinya:

- Centang bagian yang sudah selesai dan jawaban cek cepat.
- Draft esai dan penilaian diri dengan rubrik.
- Riwayat mock quiz (10 terakhir).
- Progres latihan interaktif.
- Tanggal kuis (opsional). Bila diisi, beranda menampilkan hitung mundur.
- Rencana belajar: enam langkah dengan checkbox.

Jika browser dibersihkan atau memakai jendela privat, data hilang. Gunakan tombol **Ekspor** (unduh `.txt`) untuk menyimpan salinan jawaban.

Data versi lama (`kka-study-lab-v2`) dideteksi otomatis. Beranda menampilkan pemberitahuan dengan dua pilihan: unduh jawaban lama (.txt) atau hapus data lama.

## Rencana belajar yang disarankan

Urutannya saja, tanpa tanggal:

1. Hari 1: DFS + UCS
2. Hari 2: Greedy
3. Hari 3: A*
4. Hari 4: Hill Climbing
5. Hari 5: Alpha-Beta
6. Hari 6: mock quiz Set A, lalu review, lalu Set B

## Mock quiz

- Pilih Set A, Set B, atau acak. Set acak memilih A atau B untuk tiap topik.
- Durasi: tanpa batas, 60, 90, atau 120 menit.
- Jawaban tersimpan otomatis dan tetap ada setelah halaman dimuat ulang.
- Saat dikumpulkan, skor 0 sampai 600 dihitung dari rubrik yang Anda tandai sendiri. Ini penilaian diri, bukan nilai otomatis.
- Tombol **Cetak** membuka lembar ujian untuk dicetak.

## Struktur folder

- `index.html`, `app.js`, `styles.css`: shell aplikasi, router hash, dan tampilan.
- `algorithms.js`, `cases.js`: mesin pencarian dan data kasus (graf, tree, TSP, queens).
- `widgets-core.js`, `widgets-drill.js`, `widgets.css`: widget interaktif dan latihan.
- `content/`: isi materi. `cheatsheet.js` untuk ringkasan, `t1.js` sampai `t6.js` untuk topik.
- `tests/`: uji otomatis. Jalankan dengan `node --test tests/*.test.js`.
- `CONTRACT.md`: kontrak data antar bagian. `VERIFICATION.md`: hasil uji dan daftar cek manual.

## Uji

```
cd study-web
node --test tests/*.test.js
```

Lihat `VERIFICATION.md` untuk jumlah uji dan daftar cek manual.
