# Verifikasi

Status terakhir: semua uji otomatis lulus dan pemeriksaan browser pada 375 px dan 1280 px tanpa error.

## Uji otomatis

Perintah: `node --test tests/*.test.js` (dari folder `study-web`).

| Berkas uji | Lulus | Gagal |
|---|---|---|
| tests/algorithms.test.js | 40 | 0 |
| tests/app.test.js | 24 | 0 |
| tests/cases.test.js | 11 | 0 |
| tests/content.test.js | 41 | 0 |
| tests/widgets-core.test.js | 33 | 0 |
| tests/widgets-drill.test.js | 23 | 0 |
| **Total** | **172** | **0** |

`tests/app.test.js` mencakup: router hash, validasi state v3, hitung mundur tanggal kuis, rencana belajar, penggabungan hasil drill, skor mock quiz (maks 600), ekspor teks, dan tes integrasi yang memuat semua berkas dalam urutan `index.html`.

## Pemeriksaan browser (Playwright, Chromium headless)

- **Rute**: 104 rute diperiksa pada lebar 375 px dan 1280 px. Tidak ada error konsol atau error halaman. Tidak ada scroll horizontal.
- **Alur interaktif** (22 pemeriksaan, semua lulus pada 1280 px):
  - Enam kartu topik tampil sesuai urutan kuis.
  - Hitung mundur tidak tampil tanpa tanggal. Setelah tanggal diisi, tampil dan tersimpan.
  - Centang rencana belajar bertahan setelah muat ulang.
  - Widget latihan di t1 bagian 5 terpasang (3 widget).
  - Cek jawaban di t5 bagian 1 menampilkan umpan balik.
  - Rubrik esai menambah skor.
  - Mock quiz: mulai, timer berjalan, jawaban tersimpan otomatis dan bertahan setelah muat ulang, lalu dikumpulkan dan tampil pembahasan dengan total dari 600.
  - Ringkasan dan progres tampil.
  - Pemberitahuan data v2 tampil setelah muat ulang dan bisa dihapus.
  - Ekspor `.txt` memuat teks draft esai.
- **Tangkapan layar yang sudah dilihat**: beranda, latihan trace (t1 bagian 5), pembahasan mock quiz, dan ringkasan. Tampilan tidak bermasalah. Di tangkapan layar halaman penuh, header lengket dan toast kadang menutupi konten. Itu artefak tangkapan, bukan bug layout.

## Daftar cek manual

Jalankan sebelum kuis:

- [ ] Beranda: tanggal kuis bisa diisi dan dihapus. Hitung mundur sesuai tanggal.
- [ ] Rencana belajar: keenam langkah bisa dicentang dan tetap tercentang setelah muat ulang.
- [ ] Setiap topik: enam bagian bisa dibuka, latihan interaktif bisa dipakai, tombol "Tandai selesai" bekerja.
- [ ] Esai: draft tersimpan, rubrik bisa dicentang, skor berubah.
- [ ] Mock quiz Set A dan Set B: mulai, timer, cetak lembar ujian (Ctrl+P), kumpulkan, review.
- [ ] Ringkasan: tabel perbandingan terbaca di telepon.
- [ ] Ekspor `.txt` berisi jawaban dan catatan.
- [ ] Mode telepon: menu Topik membuka sidebar. Tidak ada scroll horizontal.

## Catatan

- Tanggal kuis tidak di-hardcode. Pengguna mengisinya sendiri.
- Penilaian diri pada mock quiz adalah rubrik yang ditandai pengguna, bukan nilai otomatis.
- Pemeriksaan kecocokan lintas berkas: semua nama widget yang dipakai di `content/t*.js` terdaftar di `KKAWidgets`. Semua `caseId` yang dipakai ada di `KKA_CASES`.
