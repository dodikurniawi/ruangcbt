# CBT Serverless: Next.js + Google Sheets + Live Proctoring

Aplikasi ujian online (CBT) dengan arsitektur serverless, fitur keamanan
anti-curang, dan live score real-time ala CAT BKN.

## 🏗 Architecture

- **Frontend:** Next.js 14 (Vercel)
- **Backend API:** Google Apps Script (Web App)
- **Database:** Google Spreadsheets
- **Real-time:** Short-Polling (SWR)

## ✨ Key Features

1.  **Zero Cost DB:** Menggunakan Google Sheets sebagai database utama.
2.  **Live Score Board:** Tampilan proyektor dengan animasi ranking &
    auto-scroll.
3.  **Smart Fraud Detection:**
    - Deteksi Tab Switch / Minimize.
    - Deteksi Split Screen.
    - Blokir Klik Kanan & Copy-Paste.
    - Sistem 3x Peringatan -> Auto Diskualifikasi.
4.  **Complex Question Type:** Mendukung Pilihan GKamu & Pilihan GKamu Kompleks
    (Checkbox).

## 🚀 Getting Started

### 1. Setup Backend (Google Sheets & GAS)

1.  Buat Google Sheet baru dengan 4 Tab: `Config`, `Users`, `Questions`,
    `Responses`.
2.  Klik **Extensions > Apps Script**.
3.  Copy kode dari folder `/backend-script/code.gs` (Generate ini via AI sesuai
    PRD).
4.  **Deploy:**
    - Klik `Deploy` -> `New Deployment`.
    - Select type: `Web App`.
    - Execute as: `Me`.
    - **Who has access: `Anyone`** (Wajib agar Next.js bisa akses).
5.  Simpan **Web App URL**.

### 2. Setup Frontend (Next.js)

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Setup Environment Variables (`.env.local`):
    ```env
    NEXT_PUBLIC_API_URL="[https://script.google.com/macros/s/](https://script.google.com/macros/s/)[YOUR_SCRIPT_ID]/exec"
    NEXT_PUBLIC_APP_NAME="CBT Sekolah Hebat"
    ```
3.  Run Development Server:
    ```bash
    npm run dev
    ```

## 📂 Project Structure
