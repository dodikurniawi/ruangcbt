# Product Requirements Document (PRD) - Serverless CBT & Live Proctoring

**Version: 2.0** | **Last Updated: December 2026**

---

## 1. Project Overview

Membangun aplikasi **Computer Based Test (CBT)** berbasis web modern yang meniru
pengalaman CAT BKN (Sistem Ujian CPNS). Aplikasi ini memiliki karakteristik
unik:

1.  **Serverless & Cost-Efficient:** Menggunakan Google Sheets sebagai Database
    dan Google Apps Script (GAS) sebagai API Backend ($0 Cost).
2.  **Real-time Live Score:** Halaman monitoring publik (Proyektor) dengan
    animasi ranking dan auto-scroll.
3.  **Smart Fraud Detection:** Sistem keamanan browser (Anti-Tab Switch,
    Anti-Copy-Paste).
4.  **Small Scale Optimized:** Dirancang untuk maksimal 40 siswa per sesi ujian
    (80 siswa total database).

---

## 2. Tech Stack Requirements

- **Frontend:** Next.js 14+ (App Router), TypeScript.
- **Styling:** Tailwind CSS, Shadcn UI (Components), Framer Motion (Animations).
- **State Management:** Zustand (Global store untuk timer & exam state).
- **Data Fetching:** SWR (Stale-While-Revalidate) untuk polling data real-time.
- **Local Storage:** IndexedDB (via Dexie.js) untuk autosave jawaban dengan
  offline support.
- **Backend:** Google Apps Script (GAS) deployed as Web App Executable.
- **Database:** Google Spreadsheets.
- **Image CDN:** Google Drive (Public shared links).

---

## 3. Database Schema (Google Sheets)

Project membutuhkan **1 Spreadsheet** dengan **4 Tab (Worksheets)**.

### Tab 1: `Config`

_Key-Value store untuk pengaturan ujian._ | Key | Value (Example) | Description
| | :--- | :--- | :--- | | `exam_name` | Ujian Akhir Semester | Nama Ujian | |
`exam_duration` | 90 | Durasi ujian (menit) | | `admin_password` | admin123 |
Password masuk dashboard | | `live_score_pin` | 2026 | PIN akses halaman Live
Score | | `max_violations` | 3 | Batas toleransi kecurangan | | `auto_submit` |
TRUE | Auto-submit saat timer habis | | `shuffle_questions` | FALSE | Acak
urutan soal per siswa |

### Tab 2: `Users`

_Data siswa dan status real-time._ | Column | Type | Description | | :--- | :---
| :--- | | `id_siswa` | String | UUID/NISN (Primary Key) | | `username` | String
| Unique Login ID (lowercase) | | `password` | String | Plain text (untuk
demo/testing) | | `nama_lengkap`| String | Nama Siswa | | `kelas` | String |
Kelas (contoh: XII-IPA-1) | | `status_login`| Boolean | `TRUE` jika sedang aktif
login | | `waktu_mulai` | Timestamp | Waktu login pertama (ISO 8601) | |
`waktu_selesai`| Timestamp | Waktu submit | | `skor_akhir` | Number | Total
Nilai (0-100) | | `violation_count`| Number | Counter kecurangan (0-3) | |
`status_ujian`| Enum | `BELUM`, `SEDANG`, `SELESAI`, `DISKUALIFIKASI` | |
`last_seen` | Timestamp | Update setiap 30 detik (heartbeat) |

### Tab 3: `Questions`

_Bank Soal dengan dukungan gambar._ | Column | Type | Description | | :--- |
:--- | :--- | | `id_soal` | String | Unique ID (contoh: Q001, Q002) | |
`nomor_urut` | Number | Urutan tampil soal (1, 2, 3, ...) | | `tipe` | Enum |
`SINGLE` (Radio), `COMPLEX` (Checkbox) | | `pertanyaan` | String | Teks soal
(support line breaks) | | `gambar_url` | String | **[OPSIONAL]** Link Google
Drive public | | `opsi_a` | String | Pilihan A | | `opsi_b` | String | Pilihan B
| | `opsi_c` | String | Pilihan C | | `opsi_d` | String | Pilihan D | | `opsi_e`
| String | **[OPSIONAL]** Pilihan E (kosongkan jika 4 opsi) | | `kunci_jawaban`|
String | `SINGLE`: "C" / `COMPLEX`: "A,C" (comma separated) | | `bobot` | Number
| Poin jika benar (default: 1) | | `kategori` | String | **[OPSIONAL]** Tag
untuk filtering (contoh: "Matematika") |

**⚠️ Catatan Gambar:**

- Upload gambar ke **Google Drive folder khusus** (buat folder "CBT Images").
- Set permission: "Anyone with the link can view".
- Format URL: `https://drive.google.com/file/d/FILE_ID/view`
- Backend akan otomatis convert ke direct image URL.
- **Rekomendasi:** Max 800KB per gambar, format JPG/PNG/WebP.

### Tab 4: `Responses`

_Log detail jawaban siswa (Audit Trail)._ | Column | Type | Description | | :---
| :--- | :--- | | `timestamp` | Timestamp | Waktu submit (ISO 8601) | |
`id_siswa` | String | ID Siswa (Foreign Key) | | `nama_lengkap` | String | Nama
siswa (denormalisasi untuk laporan) | | `kelas` | String | Kelas siswa | |
`jawaban_raw` | JSON String | `{"Q001": "A", "Q002": ["A","C"]}` | |
`skor_akhir` | Number | Total skor yang didapat | | `durasi_ujian` | Number |
Waktu pengerjaan dalam menit | | `log_violation` | String | Catatan detil
pelanggaran (contoh: "Tab switch: 2x, Copy: 1x") | | `ip_address` | String |
**[OPSIONAL]** IP siswa (jika perlu tracking) |

---

## 4. Feature Specifications

### A. Module: Student Exam (`/exam`)

#### **User Flow:**

1. **Login Page (`/login`):**
   - Input username & password.
   - Validasi via API `doPost({action: "login"})`.
   - Jika berhasil, redirect ke `/exam` dan simpan session di cookie (httpOnly).

2. **Exam Interface (`/exam`):**
   - **Layout:**
     - Fullscreen mode (dengan tombol exit fullscreen).
     - Timer countdown di top-right (sticky position).
     - Progress bar (jumlah soal terjawab / total soal).
     - Navigasi grid soal (nomor 1-30 dengan status: Belum/Sudah dijawab).
   - **Question Display:**
     - Tampilkan pertanyaan + opsi (Radio untuk SINGLE, Checkbox untuk COMPLEX).
     - Jika ada `gambar_url`, tampilkan gambar di atas pertanyaan menggunakan
       `next/image` dengan lazy loading.
     - Tombol navigasi: "Sebelumnya" | "Selanjutnya" | "Submit".
   - **Auto-save Logic:**
     - Setiap kali siswa memilih jawaban, simpan ke **IndexedDB**
       (offline-first).
     - Sync ke backend setiap **30 detik** via API
       `doPost({action: "syncAnswers"})` (kirim semua jawaban).
     - Tampilkan indikator status: "💾 Menyimpan..." / "✅ Tersimpan" / "⚠️
       Offline - Data tersimpan lokal".

3. **Submit Exam:**
   - Klik tombol "Selesai Ujian" → Muncul konfirmasi modal.
   - Kirim semua jawaban via API `doPost({action: "submitExam"})`.
   - Redirect ke halaman "Terima Kasih" dengan skor (jika instant grading
     enabled).

#### **Technical Specs:**

```typescript
// IndexedDB Schema (Dexie.js)
interface ExamState {
  id_siswa: string;
  answers: Record<string, string | string[]>; // {"Q001": "A", "Q002": ["A","C"]}
  lastSync: Date;
  timeRemaining: number; // detik
}
```

---

### B. Module: Smart Fraud Detection (Security)

#### **Implementation: Custom Hook `useExamSecurity`**

**Deteksi Pelanggaran:** | Event | Trigger | Action |
|-------|---------|--------| | `visibilitychange` | Pindah tab / Minimize
browser | Strike +1 | | `blur` | Klik di luar window (misal buka Calculator) |
Strike +1 | | `contextmenu` | Klik kanan | Prevent + Warning toast | | `keydown`
| Ctrl+C, Ctrl+V, Ctrl+U, F12, Ctrl+Shift+I | Prevent + Strike +1 | | `resize` |
Perubahan ukuran window (indikasi split screen) | Warning toast (no strike) | |
`copy` / `paste` | Copy/Paste content | Prevent + Strike +1 |

**Strike Enforcement (3-Strike Rule):**

1. **Strike 1:**
   - Muncul **Modal Peringatan** (fullscreen overlay, tidak bisa close selama 10
     detik).
   - Isi modal: "PERINGATAN 1/3 - Kamu terdeteksi melakukan kecurangan. Jika
     terulang 2x lagi, ujian akan dihentikan."
   - Kirim log ke API:
     `doPost({action: "reportViolation", type: "tab_switch"})`.
   - Countdown timer 10 detik baru bisa close modal.

2. **Strike 2:**
   - Modal sama dengan Strike 1, tapi tulisan "PERINGATAN 2/3 - TERAKHIR!".
   - Countdown 15 detik.

3. **Strike 3:**
   - **Auto-Submit Ujian** + Update status ke `DISKUALIFIKASI`.
   - Redirect ke halaman `/exam/disqualified` (tidak bisa back).
   - Halaman berisi: "Ujian Kamu Dihentikan karena Pelanggaran Berulang".

**Additional Security:**

- Disable devtools detection (jangan terlalu agresif, cukup warning).
- Disable screenshot via CSS (`user-select: none` + watermark).
- Fullscreen recommendation (optional, tidak dipaksa).

```typescript
// Example Hook Usage
const { violations, isBlocked } = useExamSecurity({
  maxViolations: 3,
  onViolation: (type) => {
    // Send to API
    reportViolation(type);
  },
  onMaxViolations: () => {
    // Auto submit
    submitExam(true); // force submit
  },
});
```

---

### C. Module: Live Score (`/live-score`)

#### **User Flow:**

1. **PIN Protection:**
   - Halaman dilindungi PIN (dari Tab Config: `live_score_pin`).
   - Input PIN → Validasi client-side → Simpan di sessionStorage.
   - Jika salah 3x, block selama 5 menit (via localStorage timestamp).

2. **Leaderboard Display:**
   - **Data Source:** Polling API `doGet({action: "getLiveScore"})` setiap **5
     detik** via SWR.
   - **Table Columns:** | Rank | Nama | Kelas | Skor | Status | Waktu Selesai |
     |------|------|-------|------|--------|---------------|
   - **Sorting Logic:**
     1. Skor tertinggi ke terendah.
     2. Jika skor sama, waktu submit tercepat menang.
     3. Status `DISKUALIFIKASI` tampil di bawah (warna merah).

3. **Animations (Framer Motion):**

   ```tsx
   <motion.tr
     layout // Auto-animate saat posisi berubah
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     exit={{ opacity: 0, x: -100 }}
     transition={{ type: "spring", stiffness: 500, damping: 30 }}
   >
   ```

4. **Auto-Scroll (Infinite Loop):**
   - Container dengan `overflow-y: auto`.
   - JavaScript:
     ```typescript
     useEffect(() => {
       const container = scrollRef.current;
       let direction = 1; // 1 = down, -1 = up

       const scroll = () => {
         if (!container) return;

         container.scrollTop += direction * 1; // 1px per frame

         // Balik arah saat sampai ujung
         if (
           container.scrollTop >=
           container.scrollHeight - container.clientHeight
         ) {
           direction = -1;
         } else if (container.scrollTop <= 0) {
           direction = 1;
         }
       };

       const interval = setInterval(scroll, 50); // 20 FPS
       return () => clearInterval(interval);
     }, [data]);
     ```

5. **Additional Features:**
   - Tampilkan total peserta ujian (SELESAI / SEDANG / BELUM).
   - Highlight TOP 3 dengan badge (🥇🥈🥉).
   - Dark mode untuk tampilan proyektor.

---

### D. Module: Admin Dashboard (`/admin`)

#### **Authentication:**

- Login dengan password dari Tab Config (`admin_password`).
- Session management via JWT token (simpan di httpOnly cookie).

#### **Features:**

**1. Monitoring Real-time:**

- **Card Statistics:**
  - Total siswa terdaftar.
  - Sedang ujian (status = `SEDANG`).
  - Selesai ujian.
  - Diskualifikasi.
- **Table Siswa:**
  - Columns: Nama | Kelas | Status | Skor | Violations | Last Seen | Actions.
  - Actions: "Reset Login" (set `status_login` = FALSE), "View Details".
- **Refresh Button:** Manual refresh data (selain auto-refresh 10 detik).

**2. CRUD Soal:**

- **List Soal (Table View):**
  - Columns: No | Pertanyaan (truncate 50 char) | Tipe | Bobot | Gambar |
    Actions.
  - Actions: Edit | Delete | Preview.
- **Create/Edit Soal (Modal Form):**
  - Input fields:
    - Nomor urut.
    - Tipe soal (dropdown: SINGLE / COMPLEX).
    - Pertanyaan (textarea).
    - **Image Upload:**
      - Fitur: Drag & drop atau file picker.
      - **Backend tidak handle upload**, admin harus:
        1. Upload manual ke Google Drive folder "CBT Images".
        2. Copy public link.
        3. Paste ke field `gambar_url`.
      - Preview gambar jika URL sudah diisi.
    - Opsi A-E (input text).
    - Kunci jawaban (dynamic based on tipe):
      - SINGLE: Radio buttons A-E.
      - COMPLEX: Checkboxes A-E.
    - Bobot (number input, default: 1).
  - Validasi:
    - Pertanyaan tidak boleh kosong.
    - Minimal 2 opsi terisi.
    - Kunci jawaban harus dipilih.
- **Delete Confirmation Modal:** "Yakin hapus soal ini? Tidak bisa di-undo."

**3. Export Results:**

- Tombol "Download Hasil Ujian (.CSV)".
- Data export:
  - Nama, Kelas, Skor, Status, Waktu Mulai, Waktu Selesai, Durasi, Violations.

**4. Config Management:**

- Form untuk edit config (Tab Config):
  - Nama ujian.
  - Durasi.
  - Password admin (show/hide toggle).
  - PIN live score.
  - Max violations.

---

## 5. Backend Business Logic (Google Apps Script)

### **Global Setup:**

```javascript
// Properties Service untuk caching
const CACHE_DURATION = 60; // seconds
const cache = CacheService.getScriptCache();

// Helper: Get Spreadsheet
function getSheet(tabName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(tabName);
}

// Helper: Parse Google Drive Image URL
function parseGDriveImageUrl(url) {
  if (!url || url.trim() === "") return null;

  // Extract FILE_ID from various Google Drive URL formats
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/, // /d/FILE_ID
    /id=([a-zA-Z0-9_-]+)/, // ?id=FILE_ID
    /file\/d\/([a-zA-Z0-9_-]+)/, // /file/d/FILE_ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
  }

  return url; // Return original if no match
}
```

---

### **Endpoint: `doPost(e)`**

#### **Action: `login`**

```javascript
function handleLogin(params) {
  const { username, password } = params;
  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();

  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (
      row[1].toLowerCase() === username.toLowerCase() &&
      row[2] === password
    ) {
      const statusUjian = row[10]; // status_ujian column

      // Cek apakah sudah selesai/diskualifikasi
      if (statusUjian === "SELESAI" || statusUjian === "DISKUALIFIKASI") {
        return { success: false, message: "Kamu sudah menyelesaikan ujian." };
      }

      // Update status login & waktu mulai (jika pertama kali)
      sheet.getRange(i + 1, 6).setValue(true); // status_login
      if (!row[6]) {
        // waktu_mulai kosong
        sheet.getRange(i + 1, 7).setValue(new Date());
        sheet.getRange(i + 1, 11).setValue("SEDANG");
      }
      sheet.getRange(i + 1, 12).setValue(new Date()); // last_seen

      // Return user data (tanpa password)
      return {
        success: true,
        data: {
          id_siswa: row[0],
          username: row[1],
          nama_lengkap: row[3],
          kelas: row[4],
          status_ujian: row[10],
        },
      };
    }
  }

  return { success: false, message: "Username atau password salah." };
}
```

---

#### **Action: `syncAnswers`**

```javascript
function handleSyncAnswers(params) {
  const { id_siswa, answers } = params; // answers: {"Q001": "A", ...}

  // Simpan di cache untuk backup
  cache.put(`answers_${id_siswa}`, JSON.stringify(answers), 3600);

  // Update last_seen
  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id_siswa) {
      sheet.getRange(i + 1, 12).setValue(new Date()); // last_seen
      break;
    }
  }

  return { success: true, message: "Synced" };
}
```

---

#### **Action: `submitExam`**

```javascript
function handleSubmitExam(params) {
  const { id_siswa, answers, forced } = params; // forced = true jika auto-submit

  // Get questions untuk grading
  const qSheet = getSheet("Questions");
  const questions = qSheet.getDataRange().getValues();

  let totalScore = 0;
  const maxScore = questions.length - 1; // exclude header

  // Grading Logic
  for (let i = 1; i < questions.length; i++) {
    const q = questions[i];
    const id_soal = q[0];
    const tipe = q[2];
    const kunci = q[10]; // kunci_jawaban
    const bobot = q[11];
    const jawaban = answers[id_soal];

    if (!jawaban) continue; // Skip jika tidak dijawab

    if (tipe === "SINGLE") {
      // Exact match
      if (jawaban === kunci) {
        totalScore += bobot;
      }
    } else if (tipe === "COMPLEX") {
      // Parse comma-separated string
      const kunciArray = kunci
        .split(",")
        .map((k) => k.trim())
        .sort();
      const jawabanArray = Array.isArray(jawaban)
        ? jawaban.sort()
        : jawaban
            .split(",")
            .map((j) => j.trim())
            .sort();

      // Strict equality
      if (JSON.stringify(kunciArray) === JSON.stringify(jawabanArray)) {
        totalScore += bobot;
      }
    }
  }

  // Convert to 0-100 scale
  const finalScore = (totalScore / maxScore) * 100;

  // Update Users table
  const uSheet = getSheet("Users");
  const users = uSheet.getDataRange().getValues();
  let userName = "",
    userClass = "",
    waktuMulai = null;

  for (let i = 1; i < users.length; i++) {
    if (users[i][0] === id_siswa) {
      userName = users[i][3];
      userClass = users[i][4];
      waktuMulai = users[i][6];

      uSheet.getRange(i + 1, 6).setValue(false); // status_login
      uSheet.getRange(i + 1, 8).setValue(new Date()); // waktu_selesai
      uSheet.getRange(i + 1, 9).setValue(finalScore.toFixed(2)); // skor_akhir
      uSheet
        .getRange(i + 1, 11)
        .setValue(forced ? "DISKUALIFIKASI" : "SELESAI");
      break;
    }
  }

  // Calculate duration
  const durasiMenit = waktuMulai
    ? Math.round((new Date() - new Date(waktuMulai)) / 60000)
    : 0;

  // Save to Responses table
  const rSheet = getSheet("Responses");
  rSheet.appendRow([
    new Date(),
    id_siswa,
    userName,
    userClass,
    JSON.stringify(answers),
    finalScore.toFixed(2),
    durasiMenit,
    forced ? "DISKUALIFIKASI - Auto Submit" : "",
    "", // IP address (optional)
  ]);

  return {
    success: true,
    score: finalScore.toFixed(2),
    status: forced ? "DISKUALIFIKASI" : "SELESAI",
  };
}
```

---

#### **Action: `reportViolation`**

```javascript
function handleReportViolation(params) {
  const { id_siswa, type } = params; // type: "tab_switch", "copy_paste", etc

  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();
  const config = getConfig();
  const maxViolations = parseInt(config.max_violations);

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id_siswa) {
      const currentCount = data[i][9] || 0; // violation_count
      const newCount = currentCount + 1;

      sheet.getRange(i + 1, 10).setValue(newCount);

      // Check if diskualifikasi
      if (newCount >= maxViolations) {
        sheet.getRange(i + 1, 11).setValue("DISKUALIFIKASI");
        return {
          success: true,
          disqualified: true,
          violations: newCount,
        };
      }

      return {
        success: true,
        disqualified: false,
        violations: newCount,
      };
    }
  }

  return { success: false, message: "User not found" };
}
```

---

### **Endpoint: `doGet(e)`**

#### **Action: `getQuestions`**

```javascript
function handleGetQuestions(params) {
  const cached = cache.get("questions");
  if (cached) return JSON.parse(cached);

  const sheet = getSheet("Questions");
  const data = sheet.getDataRange().getValues();
  const questions = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    questions.push({
      id_soal: row[0],
      nomor_urut: row[1],
      tipe: row[2],
      pertanyaan: row[3],
      gambar_url: parseGDriveImageUrl(row[4]), // Parse URL
      opsi_a: row[5],
      opsi_b: row[6],
      opsi_c: row[7],
      opsi_d: row[8],
      opsi_e: row[9],
      bobot: row[11],
      kategori: row[12],
      // TIDAK KIRIM kunci_jawaban (row[10])
    });
  }

  // Sort by nomor_urut
  questions.sort((a, b) => a.nomor_urut - b.nomor_urut);

  const result = JSON.stringify({ success: true, data: questions });
  cache.put("questions", result, CACHE_DURATION);

  return result;
}
```

---

#### **Action: `getLiveScore`**

```javascript
function handleGetLiveScore(params) {
  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();
  const scores = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[10];

    // Only show SELESAI & DISKUALIFIKASI
    if (status === "SELESAI" || status === "DISKUALIFIKASI") {
      scores.push({
        rank: 0, // Will be calculated after sort
        nama: row[3],
        kelas: row[4],
        skor: parseFloat(row[8]) || 0,
        status: status,
        waktu_selesai: row[7] ? new Date(row[7]).toLocaleString("id-ID") : "-",
        waktu_submit_ms: row[7] ? new Date(row[7]).getTime() : 0,
      });
    }
  }

  // Sort: Skor DESC, Waktu ASC (tercepat menang)
  scores.sort((a, b) => {
    if (b.skor !== a.skor) return b.skor - a.skor;
    return a.waktu_submit_ms - b.waktu_submit_ms;
  });

  // Add rank
  scores.forEach((item, index) => {
    item.rank = index + 1;
  });

  return JSON.stringify({ success: true, data: scores });
}
```

---

#### **Action: `getConfig`**

```javascript
function getConfig() {
  const cached = cache.get("config");
  if (cached) return JSON.parse(cached);

  const sheet = getSheet("Config");
  const data = sheet.getDataRange().getValues();
  const config = {};

  for (let i = 1; i < data.length; i++) {
    config[data[i][0]] = data[i][1]; // key-value
  }

  cache.put("config", JSON.stringify(config), CACHE_DURATION);
  return config;
}
```

---

## 6. Security & Best Practices

### **Frontend Security:**

1. **No Sensitive Data in Client:** Jangan simpan kunci jawaban di
   localStorage/cookies.
2. **HTTPS Only:** Deploy di Vercel/Netlify dengan SSL.
3. **Rate Limiting:** SWR dengan `dedupingInterval: 5000` untuk prevent spam
   requests.
4. **Input Validation:** Sanitize user input sebelum kirim ke backend.

### **Backend Security:**

1. **CORS Policy:** Set di GAS deployment:
   ```javascript
   function doGet(e) {
     return ContentService.createTextOutput(/* response */)
       .setMimeType(ContentService.MimeType.JSON)
       .setHeader("Access-Control-Allow-Origin", "https://your-domain.com");
   }
   ```
2. **Rate Limiting:** GAS otomatis limit 100 requests/user/100 seconds (cukup
   untuk 40 siswa).
3. **Authentication Token:** Kirim JWT token di header untuk verifikasi session.

---

## 7. Deployment Checklist

### **Frontend (Vercel/Netlify):**

- [ ] Setup environment variables:
  - `NEXT_PUBLIC_GAS_API_URL`
  - `NEXT_PUBLIC_APP_NAME`
- [ ] Build dengan `next build`
- [ ] Test di staging domain dulu
- [ ] Custom domain setup (optional)

### **Backend (Google Apps Script):**

- [ ] Deploy as Web App:
  - Execute as: **Me**
  - Who has access: **Anyone**
- [ ] Copy Web App URL ke frontend env
- [ ] Test semua endpoints via Postman

### **Database (Google Sheets):**

- [ ] Buat 4 tabs sesuai schema
- [ ] Input dummy data untuk testing:
  - 5 siswa di Tab Users
  - 10 soal di Tab Questions
- [ ] Set sharing: **Restricted** (hanya owner & script)

---

## 8. Testing Scenarios

### **Functional Testing:**

1. **Login:** Valid/invalid credentials, concurrent login, logout.
2. **Exam Flow:** Jawab soal, auto-save, timer countdown, submit.
3. **Security:** Trigger violations, test 3-strike rule, force submit.
4. **Live Score:** PIN validation, real-time update, auto-scroll.
5. **Admin:** CRUD soal, monitoring, export CSV.

### **Performance Testing (40 concurrent users):**

- Simulate 40 siswa login bersamaan (tools: Artillery, k6).
- Monitor GAS execution time (max 6 minutes).
- Check Sheets API quota (unlimited for Workspace accounts).

### **Edge Cases:**

- Internet putus saat ujian → IndexedDB recovery.
- Timer habis tepat saat submit → Handle race condition.
- Gambar di Google Drive dihapus → Show placeholder image.
