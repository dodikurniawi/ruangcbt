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
    mapel_diujikan?: string; // id_mapel yang diujikan saat submit, diisi GAS
    saved_answers?: AnswersRecord | null; // recovered answers from server (col 14)
}

// Question types
//
// QUESTION_TYPES adalah daftar canonical seluruh tipe soal yang dikenal model.
// QUESTION_TYPES_IMPLEMENTED adalah bagian yang benar-benar sudah didukung
// end-to-end (form, renderer, scoring GAS). Tipe canonical yang belum
// terimplementasi sengaja tetap tercantum agar kontrak dan sanitizer sudah punya
// bentuk yang benar; GAS tetap menolaknya sampai tipe tersebut dikerjakan.
export const QUESTION_TYPES = ['SINGLE', 'COMPLEX', 'TRUE_FALSE', 'MATCHING', 'FILL_IN'] as const;
export const QUESTION_TYPES_IMPLEMENTED = ['SINGLE', 'COMPLEX'] as const;

export const QUESTION_WRITE_FIELDS = [
    'id_soal', 'nomor_urut', 'tipe', 'pertanyaan', 'gambar_url',
    'opsi_a', 'opsi_b', 'opsi_c', 'opsi_d', 'opsi_e',
    'kunci_jawaban', 'bobot', 'kategori', 'id_mapel', 'data_soal',
] as const;

export const STUDENT_QUESTION_FIELDS = [
    'id_soal', 'nomor_urut', 'tipe', 'pertanyaan', 'gambar_url',
    'opsi_a', 'opsi_b', 'opsi_c', 'opsi_d', 'opsi_e',
    'bobot', 'kategori', 'id_mapel', 'nama_mapel', 'data_soal',
] as const;

export const ADMIN_ONLY_QUESTION_FIELDS = ['kunci_jawaban', 'status_soal', 'versi_dari'] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];
export type ImplementedQuestionType = (typeof QUESTION_TYPES_IMPLEMENTED)[number];

/** Item bernomor pada data soal terstruktur. `teks` adalah rich text. */
export interface QuestionDataItem {
    id: string;
    teks: string;
}

export interface TrueFalseQuestionData {
    pernyataan: QuestionDataItem[];
}

export interface MatchingQuestionData {
    kiri: QuestionDataItem[];
    kanan: QuestionDataItem[];
}

export interface FillInQuestionData {
    petunjuk: string;
}

/** SELALU student-visible; kunci jawaban tidak boleh masuk ke sini. */
export type QuestionData = TrueFalseQuestionData | MatchingQuestionData | FillInQuestionData;

export interface QuestionBase {
    id_soal: string;
    nomor_urut: number;
    pertanyaan: string;
    gambar_url?: string | null;
    bobot: number;
    kategori?: string | null;
    id_mapel?: string | null;
    nama_mapel?: string | null;
}

export interface LegacyQuestionOptions {
    opsi_a: string;
    opsi_b: string;
    opsi_c: string;
    opsi_d: string;
    opsi_e?: string | null;
}

export interface SingleQuestion extends QuestionBase, LegacyQuestionOptions {
    tipe: 'SINGLE';
    data_soal?: never;
}

export interface ComplexQuestion extends QuestionBase, LegacyQuestionOptions {
    tipe: 'COMPLEX';
    data_soal?: never;
}

export interface TrueFalseQuestion extends QuestionBase {
    tipe: 'TRUE_FALSE';
    data_soal: TrueFalseQuestionData;
}

export interface MatchingQuestion extends QuestionBase {
    tipe: 'MATCHING';
    data_soal: MatchingQuestionData;
}

export interface FillInQuestion extends QuestionBase {
    tipe: 'FILL_IN';
    data_soal: FillInQuestionData;
}

/** Canonical student-visible model, discriminated by `tipe`. */
export type StudentQuestion =
    | SingleQuestion
    | ComplexQuestion
    | TrueFalseQuestion
    | MatchingQuestion
    | FillInQuestion;

/** Nama lama dipertahankan sebagai alias student-safe. */
export type Question = StudentQuestion;
export type ImplementedStudentQuestion = Extract<StudentQuestion, { tipe: ImplementedQuestionType }>;

/** Carrier Sheet/API tetap string: legacy (`B`, `A,C`) atau JSON ter-serialisasi. */
export type SerializedQuestionAnswerKey = string;

export interface QuestionAdminFields {
    kunci_jawaban: SerializedQuestionAnswerKey;
    status_soal: 'AKTIF' | 'ARSIP';
    versi_dari: string | null;
}

export type AdminQuestion<T extends StudentQuestion = StudentQuestion> =
    T extends StudentQuestion ? T & QuestionAdminFields : never;
export type ImplementedAdminQuestion = AdminQuestion<ImplementedStudentQuestion>;

/**
 * Payload create/update. `data_soal` writeable dan tersimpan pada Questions kolom
 * 17; untuk SINGLE/COMPLEX tipenya tetap `never` karena keduanya tidak punya isi
 * terstruktur.
 */
export type QuestionWritePayload =
    Omit<ImplementedAdminQuestion, 'nama_mapel' | 'status_soal' | 'versi_dari'>;

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
    archived?: boolean; // deleteQuestion: soal diarsipkan, bukan dihapus
    versioned?: boolean; // updateQuestion: perubahan disimpan sebagai versi baru
    id_soal?: string; // id soal hasil create atau versi baru
    previous_id_soal?: string; // id soal versi historis yang diarsipkan
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
