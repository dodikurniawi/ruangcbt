# Panduan Penggunaan Aplikasi CBT Sekolah

> Panduan ini ditujukan untuk guru dan operator sekolah.
> Tidak perlu paham teknologi — ikuti langkah demi langkah saja.

---

## Daftar Isi

- [A. Panduan Admin / Guru](#a-panduan-admin--guru)
  - [A1. Login ke Panel Admin](#a1-login-ke-panel-admin)
  - [A2. Menambah Data Siswa](#a2-menambah-data-siswa)
  - [A3. Membuat Soal Ujian](#a3-membuat-soal-ujian)
  - [A4. Membuka dan Menutup Sesi Ujian](#a4-membuka-dan-menutup-sesi-ujian)
  - [A5. Memantau Siswa yang Sedang Ujian](#a5-memantau-siswa-yang-sedang-ujian)
  - [A6. Mengunduh Rekap Nilai](#a6-mengunduh-rekap-nilai)
  - [A7. Mengganti Password Admin](#a7-mengganti-password-admin)
- [B. Panduan Siswa](#b-panduan-siswa)
  - [B1. Login ke Ujian](#b1-login-ke-ujian)
  - [B2. Mengerjakan Soal](#b2-mengerjakan-soal)
  - [B3. Jika Koneksi Terputus](#b3-jika-koneksi-terputus)
  - [B4. Mengumpulkan Jawaban](#b4-mengumpulkan-jawaban)
- [C. Masalah Umum dan Solusinya](#c-masalah-umum-dan-solusinya)

---

## A. Panduan Admin / Guru

### A1. Login ke Panel Admin

Panel admin adalah tempat guru mengelola ujian — mulai dari soal, data siswa, sampai melihat nilai.

**Alamat panel admin:**
```
https://ruangcbt.vercel.app/s/NAMA-SEKOLAH/admin/login
```
Ganti `NAMA-SEKOLAH` dengan kode sekolah Anda (diberikan saat pertama kali setup).

**Langkah login:**

1. Buka alamat panel admin di browser (Chrome atau Firefox dianjurkan).
2. Ketik password administrator di kolom yang tersedia.
3. Klik tombol **Masuk ke Panel Admin**.
4. Jika password benar, Anda akan masuk ke halaman **Dashboard Monitoring**.

> **Catatan:** Panel admin hanya bisa dibuka oleh satu perangkat. Gunakan laptop atau komputer guru, bukan HP siswa.

---

### A2. Menambah Data Siswa

Sebelum ujian dimulai, semua siswa harus sudah terdaftar di sistem.

**Cara menambah satu per satu:**

1. Di panel admin, klik menu **Data Siswa** di sebelah kiri.
2. Klik tombol **Tambah Data** di pojok kanan atas.
3. Isi formulir yang muncul:
   - **Nama Lengkap** — nama siswa sesuai rapor
   - **Username** — bisa diisi nomor induk siswa (NIS)
   - **Password** — password yang akan digunakan siswa saat login ujian
   - **Kelas** — pilih kelas siswa
4. Klik tombol **Simpan**.
5. Data siswa akan muncul di tabel.

**Cara impor banyak siswa sekaligus (dari Excel):**

1. Di halaman **Data Siswa**, klik tombol **Import**.
2. Unduh contoh format file yang tersedia.
3. Isi data siswa di file tersebut mengikuti format yang sudah ada.
4. Unggah file yang sudah diisi.
5. Sistem akan otomatis mendaftarkan semua siswa sekaligus.

> **Tips:** Gunakan NIS (Nomor Induk Siswa) sebagai username agar mudah diingat siswa.

---

### A3. Membuat Soal Ujian

1. Di panel admin, klik menu **Bank Soal** di sebelah kiri.
2. Klik tombol **Tambah Paket Baru**.
3. Sebuah formulir pembuatan soal akan terbuka. Isi bagian-bagian berikut:

   **Pertanyaan:**
   - Ketik teks soal di kolom **Pertanyaan**.
   - Jika soal perlu gambar, klik area kotak gambar lalu pilih file dari komputer Anda — gambar akan otomatis tersimpan.

   **Jenis Soal:**
   - **Pilihan Tunggal** — siswa hanya boleh memilih satu jawaban (A/B/C/D/E).
   - **Pilihan Kompleks** — siswa boleh memilih lebih dari satu jawaban sekaligus.

   **Pilihan Jawaban:**
   - Isi kolom **Opsi A**, **Opsi B**, **Opsi C**, **Opsi D** (dan **Opsi E** jika perlu).

   **Kunci Jawaban:**
   - Pilih huruf jawaban yang benar. Untuk soal kompleks, bisa pilih lebih dari satu.

   **Bobot Nilai:**
   - Isi angka bobot soal ini (biasanya diisi angka 1).

   **Mata Pelajaran:**
   - Pilih mata pelajaran yang sesuai (jika sudah diatur sebelumnya).

4. Klik tombol **Simpan Soal**.
5. Soal akan masuk ke daftar bank soal.

> **Catatan:** Soal bisa diedit atau dihapus kapan saja selama ujian belum dimulai.

---

### A4. Membuka dan Menutup Sesi Ujian

Ujian tidak otomatis terbuka. Guru harus membukanya secara manual agar siswa bisa mengakses soal.

**Cara membuka ujian:**

1. Masuk ke panel admin, klik menu **Dashboard** di sebelah kiri.
2. Di bagian **Status Ujian**, akan terlihat tulisan *"Ujian Ditutup"*.
3. Klik tombol **Buka Ujian**.
4. Status akan berubah menjadi *"Ujian Sedang Berlangsung"* dengan indikator hijau berkedip.
5. Siswa sekarang bisa login dan mengerjakan soal.

**Cara menutup ujian:**

1. Di halaman yang sama, klik tombol **Tutup Ujian**.
2. Status berubah menjadi *"Ujian Ditutup"*.
3. Siswa yang belum selesai tidak bisa lagi mengakses soal.

> **Penting:** Tutup ujian hanya setelah semua siswa selesai mengerjakan, atau waktu yang ditentukan sudah habis.

---

### A5. Memantau Siswa yang Sedang Ujian

Saat ujian berlangsung, guru bisa melihat siapa saja yang sedang mengerjakan secara langsung.

1. Buka menu **Dashboard** di panel admin.
2. Di bagian bawah ada tabel **Live Student Monitoring** yang menampilkan:
   - **Nama Siswa** — nama lengkap peserta
   - **Kelas** — kelas siswa
   - **Status** — salah satu dari:
     - 🔵 *Sedang Ujian* — siswa sedang mengerjakan
     - ✅ *Selesai* — sudah mengumpulkan jawaban
     - ❌ *Diskualifikasi* — kena pelanggaran (ganti tab, buka aplikasi lain, dll)
     - ⬜ *Belum Mulai* — belum login sama sekali
   - **Skor** — nilai akhir (muncul setelah selesai)
   - **Pelanggaran** — jumlah pelanggaran yang tercatat
3. Data diperbarui otomatis setiap beberapa detik — tidak perlu refresh manual.

**Jika siswa tidak bisa login ulang setelah keluar tidak sengaja:**

1. Cari nama siswa di tabel.
2. Klik ikon **↺** (panah melingkar) di kolom Aksi.
3. Status login siswa akan direset — siswa bisa login kembali.

---

### A6. Mengunduh Rekap Nilai

Setelah ujian selesai, nilai bisa diunduh dalam format Excel.

1. Di panel admin, klik menu **Cetak** di sebelah kiri.
2. Halaman rekap nilai akan menampilkan daftar seluruh siswa beserta nilainya.
3. Untuk mengunduh:
   - Klik tombol **EXPORT XLSX** untuk mendapatkan file Excel — cocok untuk input nilai rapor.
   - Klik tombol **EXPORT PDF** untuk mendapatkan file PDF — cocok untuk dicetak.
4. File akan otomatis terunduh ke komputer Anda.

---

### A7. Mengganti Password Admin

1. Di panel admin, klik menu **Data Siswa** di sebelah kiri.
2. Gulir ke bawah ke bagian **Konfigurasi Ujian**.
3. Temukan kolom **Password Administrator**.
4. Ketik password baru di kolom tersebut.
5. Klik tombol **Simpan Konfigurasi**.

> **Perhatian:** Catat password baru di tempat yang aman. Jika lupa, hubungi pengelola sistem untuk dibantu reset.

---

## B. Panduan Siswa

### B1. Login ke Ujian

**Alamat login ujian:**
```
https://ruangcbt.vercel.app/s/NAMA-SEKOLAH/login
```
Guru akan memberitahu alamat ini sebelum ujian. Bisa juga dibagikan sebagai link atau kode QR.

**Langkah login:**

1. Buka alamat login di browser HP atau komputer.
2. Isi kolom **Username** dengan nomor induk siswa (NIS) atau username yang diberikan guru.
3. Isi kolom **Password** dengan password yang diberikan guru.
4. Klik tombol **Masuk Sekarang**.
5. Jika diminta memasukkan PIN ujian, ketik 4 angka PIN yang diumumkan guru di kelas.
6. Soal ujian akan langsung muncul.

> **Catatan:** Satu akun hanya bisa digunakan di satu perangkat pada waktu yang sama.

---

### B2. Mengerjakan Soal

1. Soal ditampilkan satu per satu di layar.
2. Baca soal dengan teliti.
3. Pilih jawaban dengan mengklik salah satu pilihan (A, B, C, D, atau E).
   - Untuk soal biasa: pilih **satu** jawaban saja.
   - Untuk soal kompleks: boleh memilih **lebih dari satu** jawaban.
4. Untuk pindah ke soal berikutnya, klik tombol **›** (panah kanan).
5. Untuk kembali ke soal sebelumnya, klik tombol **‹** (panah kiri).
6. Nomor soal di panel samping bisa diklik langsung untuk loncat ke soal tertentu.

**Hal-hal yang DILARANG saat ujian:**

- Pindah ke tab lain di browser
- Membuka aplikasi lain
- Menekan tombol Back di browser
- Klik kanan di halaman ujian
- Menggunakan tombol pintasan seperti Ctrl+C, Ctrl+V
- Membuka DevTools (F12)

> Setiap pelanggaran dicatat. Jika melanggar terlalu banyak kali, ujian akan dikumpulkan otomatis dan siswa dinyatakan **diskualifikasi**.

---

### B3. Jika Koneksi Terputus

Jangan panik. Jawaban yang sudah diisi **tidak akan hilang** selama:

- Browser tidak ditutup, dan
- Masih menggunakan perangkat yang sama

**Yang harus dilakukan:**

1. Tunggu koneksi kembali normal (biasanya cukup 1–2 menit).
2. Halaman akan otomatis melanjutkan ujian dari posisi terakhir.
3. Jawaban yang sudah diisi tetap tersimpan di perangkat dan akan otomatis dikirim ulang saat koneksi pulih.

**Jika terpaksa harus refresh halaman:**

1. Refresh halaman browser (tekan F5 atau tombol refresh).
2. Jawaban tetap ada karena tersimpan sementara di perangkat.
3. Lanjutkan mengerjakan soal.

**Jika halaman browser ditutup tidak sengaja atau baterai habis:**

1. Hubungi guru segera.
2. Guru akan mereset login akun siswa.
3. Login ulang dengan username dan password yang sama.
4. Jawaban yang sudah tersinkron sebelumnya tetap aman.

---

### B4. Mengumpulkan Jawaban

Jawaban bisa dikumpulkan kapan saja sebelum waktu habis, atau akan dikumpulkan otomatis ketika waktu ujian habis.

**Cara mengumpulkan manual:**

1. Pastikan semua soal sudah dijawab (cek nomor di panel samping — yang sudah dijawab biasanya berubah warna).
2. Klik tombol **SELESAI UJIAN** di bagian bawah halaman.
3. Sebuah konfirmasi akan muncul: *"Kumpulkan Ujian?"*
4. Klik **Ya, Kumpulkan** untuk mengumpulkan.
5. Klik **Batal** jika ingin kembali mengecek jawaban dulu.
6. Setelah dikumpulkan, halaman akan menampilkan status dan nilai akhir.

> **Perhatian:** Setelah klik **Ya, Kumpulkan**, jawaban tidak bisa diubah lagi.

---

## C. Masalah Umum dan Solusinya

---

### Siswa tidak bisa login

**Gejala:** Muncul pesan *"Username atau password salah"* padahal sudah diketik dengan benar.

**Solusi:**

1. Pastikan tidak ada huruf besar/kecil yang salah — username dan password bersifat sensitif.
2. Coba ketik ulang secara manual, jangan salin-tempel.
3. Jika masih gagal, guru bisa cek data siswa di menu **Data Siswa** dan perbarui password lewat tombol edit (ikon pensil) lalu klik **Simpan Perubahan**.

**Gejala:** Muncul pesan *"Akun sedang digunakan di perangkat lain"* atau tidak bisa login setelah keluar tidak sengaja.

**Solusi:**

1. Guru masuk ke **Dashboard Monitoring**.
2. Cari nama siswa di tabel.
3. Klik ikon **↺** di kolom Aksi untuk mereset login.
4. Siswa bisa login ulang.

---

### Soal tidak muncul setelah login

**Gejala:** Setelah login, halaman loading terus atau muncul pesan soal tidak tersedia.

**Solusi:**

1. Pastikan guru sudah membuka ujian — cek **Dashboard**, statusnya harus *"Ujian Sedang Berlangsung"* (hijau). Jika belum, klik **Buka Ujian**.
2. Pastikan soal sudah dibuat di menu **Bank Soal**. Jika belum ada soal, ujian tidak bisa dijalankan.
3. Minta siswa refresh halaman dan coba login ulang.
4. Jika masih tidak muncul, coba ganti browser (gunakan Chrome versi terbaru).

---

### Lupa password admin

**Gejala:** Guru tidak bisa masuk ke panel admin karena lupa password.

**Solusi:**

1. Hubungi pengelola sistem (pihak yang menyediakan aplikasi ini).
2. Sampaikan kode sekolah Anda.
3. Pengelola akan membantu mereset password admin dari sisi sistem.

> Untuk mencegah kejadian ini terulang, simpan password admin di tempat yang aman — bisa di notes HP, buku catatan guru, atau aplikasi penyimpan password.

---

### Nilai siswa tidak muncul / rekap kosong

**Gejala:** Di menu **Cetak**, tidak ada data nilai siswa atau tabel kosong.

**Solusi:**

1. Pastikan setidaknya ada satu siswa yang sudah mengumpulkan jawaban (status *Selesai*).
2. Cek di **Dashboard Monitoring** — jika semua masih berstatus *Belum Mulai* atau *Sedang Ujian*, nilai memang belum bisa dilihat.
3. Jika ada siswa yang berstatus *Selesai* tapi nilainya tidak muncul di rekap, coba klik tombol **Refresh** di halaman Dashboard, lalu buka kembali menu **Cetak**.
4. Jika masih kosong, tunggu beberapa menit — sistem membutuhkan waktu singkat untuk memproses dan menyimpan nilai.

---

*Butuh bantuan lebih lanjut? Hubungi Administrator Sekolah atau pengelola sistem CBT Anda.*
