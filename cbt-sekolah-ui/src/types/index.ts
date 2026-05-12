// =====================================
// Type Definitions for CBT Application
// =====================================

// Config types
export interface ExamConfig {
    exam_name: string;
    exam_duration: number; // in minutes
    max_violations: number;
    auto_submit: boolean;
    shuffle_questions: boolean;
    admin_password?: string;
    live_score_pin?: string;
    exam_pin?: string;
    exam_status?: 'OPEN' | 'CLOSED';
    admin_wa?: string;  // nomor WA admin sekolah, misal "628123456789"
    exam_mapel?: string; // id_mapel yang diujikan, kosong = semua mapel
}

// User types
export interface User {
    id_siswa: string;
    username: string;
    nama_lengkap: string;
    kelas: string;
    status_login?: boolean;
    waktu_mulai?: string;
    waktu_selesai?: string;
    skor_akhir?: number;
    violation_count?: number;
    status_ujian: 'BELUM' | 'SEDANG' | 'SELESAI' | 'DISKUALIFIKASI';
    last_seen?: string;
    exam_duration?: number;
}

// Question types
export type QuestionType = 'SINGLE' | 'COMPLEX';

export interface Question {
    id_soal: string;
    nomor_urut: number;
    tipe: QuestionType;
    pertanyaan: string;
    gambar_url?: string | null;
    opsi_a: string;
    opsi_b: string;
    opsi_c: string;
    opsi_d: string;
    opsi_e?: string | null;
    bobot: number;
    kategori?: string | null;
    id_mapel?: string | null;
    nama_mapel?: string | null;
    kunci_jawaban?: string; // hanya ada di respons admin (getAdminQuestions)
}

// Answer types
export type Answer = string | string[];
export type AnswersRecord = Record<string, Answer>;

// Response from exam
export interface ExamResponse {
    timestamp: string;
    id_siswa: string;
    nama_lengkap: string;
    kelas: string;
    jawaban_raw: string;
    skor_akhir: number;
    durasi_ujian: number;
    log_violation: string;
    ip_address?: string;
}

// Live Score types
export interface LiveScoreEntry {
    rank: number;
    nama: string;
    kelas: string;
    skor: number;
    status: 'SELESAI' | 'DISKUALIFIKASI' | 'SEDANG' | 'BELUM';
    waktu_selesai: string;
    waktu_submit_ms: number;
}

export interface LiveScoreStats {
    total: number;
    sedang: number;
    selesai: number;
    diskualifikasi: number;
    belum: number;
}

// API Response types
export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    stats?: LiveScoreStats;
    score?: string;
    status?: string;
    violations?: number;
    disqualified?: boolean;
}

// Exam State (for Zustand/IndexedDB)
export interface ExamState {
    id_siswa: string;
    nama_lengkap: string;
    kelas: string;
    answers: AnswersRecord;
    lastSync: Date | null;
    timeRemaining: number; // in seconds
    violations: number;
    currentQuestion: number;
    isSubmitted: boolean;
}

// Violation types
export type ViolationType =
    | 'tab_switch'
    | 'blur'
    | 'copy'
    | 'paste'
    | 'contextmenu'
    | 'devtools'
    | 'keyboard_shortcut';

export interface Kelas {
    id_kelas: string;
    nama_kelas: string;
    tingkat: string;
}

export interface MataPelajaran {
    id_mapel: string;
    kode_mapel: string;
    nama_mapel: string;
}

// CP Registry types
export type PhaseName = 'fase_A' | 'fase_B' | 'fase_C' | 'fase_D' | 'fase_E' | 'fase_F';

export interface CPElement {
    elemen: Record<string, string>;
}

export interface PhaseData {
    jenjang: string;
    mapel: Record<string, CPElement>;
    mata_pelajaran_pilihan?: Record<string, CPElement>;
}

