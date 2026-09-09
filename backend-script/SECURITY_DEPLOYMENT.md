# Security Foundation Deployment

Perubahan ini bersifat fail-closed. Tenant yang belum memiliki secret tidak dapat dipakai oleh frontend baru. Siapkan seluruh secret sebelum memublikasikan frontend.

## Secret yang diperlukan

- `SESSION_SIGNING_SECRET`: satu secret milik deployment Next.js untuk menandatangani session admin dan siswa.
- `REGISTRY_LOOKUP_SECRET`: satu secret bersama antara Next.js dan Registry GAS. Secret ini hanya membuka kolom `shared_secret`; metadata tenant lama tetap dapat dibaca tanpa secret agar migrasi tidak memutus frontend lama.
- `SHARED_SECRET`: satu secret unik per tenant, disimpan pada kolom E Registry dan Script Properties milik GAS tenant tersebut.

Setiap secret minimal 32 karakter acak. Jangan memakai password admin, PIN ujian, atau secret yang sama untuk beberapa tenant.

Contoh membuat secret 32 byte:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

## Urutan migrasi tanpa membuka bypass

1. Tambahkan header `shared_secret` pada kolom E sheet `Registry`.
2. Isi secret unik untuk seluruh tenant aktif. Jangan lanjut jika ada tenant aktif yang masih kosong.
3. Pada Registry Apps Script, buka Project Settings lalu tambahkan Script Property `REGISTRY_LOOKUP_SECRET`.
4. Deploy versi baru `registry-gas.gs` pada deployment Registry yang sudah ada.
5. Pada setiap project Apps Script tenant, tambahkan Script Property `SHARED_SECRET` dengan nilai yang sama seperti kolom E tenant tersebut.
6. Deploy versi baru `code.gs` pada deployment tenant yang sudah ada. Jangan membuat URL baru jika URL lama masih tercatat di Registry.
7. Tambahkan environment variable berikut pada Next.js/Vercel lalu deploy frontend:

```env
REGISTRY_GAS_URL=https://script.google.com/macros/s/REGISTRY_DEPLOYMENT_ID/exec
REGISTRY_LOOKUP_SECRET=secret-registry-minimal-32-karakter
SESSION_SIGNING_SECRET=secret-session-minimal-32-karakter
```

Untuk mode single-tenant tanpa Registry, gunakan:

```env
GAS_API_URL=https://script.google.com/macros/s/TENANT_DEPLOYMENT_ID/exec
GAS_SHARED_SECRET=secret-tenant-minimal-32-karakter
SINGLE_TENANT_SCHOOL_ID=school-id-stabil
SESSION_SIGNING_SECRET=secret-session-minimal-32-karakter
```

`NEXT_PUBLIC_API_URL` masih diterima untuk kompatibilitas URL GAS lama, tetapi jangan menaruh secret pada variable `NEXT_PUBLIC_*`.

## Verifikasi aman

Gunakan tenant test untuk operasi destruktif. Pada tenant produksi, batasi verifikasi ke request non-destruktif.

1. Panggil GAS tenant secara langsung tanpa `proxy_secret`; respons harus `Unauthorized`.
2. Panggil action admin melalui proxy tanpa cookie; respons HTTP harus `401`.
3. Login admin melalui proxy; respons harus memasang cookie `ruangcbt_session` dengan `HttpOnly`, `SameSite=Lax`, dan `Secure` pada production.
4. Dengan cookie admin, panggil `getUsers`; request harus berhasil.
5. Login sebagai siswa test. `getQuestions` harus berhasil tanpa `kunci_jawaban`.
6. Kirim `submitExam` atau `syncAnswers` dengan `id_siswa` berbeda; proxy harus menolak dengan HTTP `403`. Jangan submit ujian tenant produksi untuk pengujian ini.
7. Coba cookie tenant A pada route tenant B; proxy harus menolak dengan HTTP `403`.
8. Pastikan `/monitoring` tetap bekerja dan hanya memuat nama, kelas, skor, status, serta waktu selesai.

## Batas yang masih ada

- Shared secret ini tidak memberikan perlindungan replay jika secret sudah bocor. Dalam threat model saat ini, secret hanya berjalan melalui HTTPS antara Next.js, Registry GAS, dan tenant GAS serta tidak pernah dikirim ke browser. Gunakan HMAC bertimestamp bila arsitektur nanti menambah perantara yang tidak dipercaya.
- Password siswa dan password admin masih tersimpan plaintext pada Google Sheets. GAS tidak menyediakan password-hashing adaptif yang layak sebagai primitive bawaan. Migrasi hashing perlu format baru dan strategi backward-compatible tersendiri; jangan menggantinya dengan SHA-256 cepat lalu menganggap masalah selesai.
- Session bertanda tangan tidak memiliki revocation list. Logout menghapus cookie, tetapi token yang sebelumnya disalin tetap valid sampai kedaluwarsa maksimal delapan jam. Tambahkan versi session per akun hanya jika risiko pencurian token membenarkan state tambahan.
