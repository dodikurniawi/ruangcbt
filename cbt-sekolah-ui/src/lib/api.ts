import type {
    ApiResponse,
    User,
    ImplementedStudentQuestion,
    ImplementedAdminQuestion,
    QuestionWritePayload,
    LiveScoreEntry,
    LiveScoreStats,
    ExamConfig,
    AnswersRecord,
    Kelas,
    MataPelajaran,
    ExamSummary,
    SaveExamConfigInput,
    QuestionCollection
} from '@/types';
import { RequestTimeoutError, clientTimeoutMs, fetchWithTimeout } from '@/lib/timeouts';

// Resolve proxy URL: tenant-aware when inside /s/[schoolId]/, fallback to single-tenant
function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    const match = window.location.pathname.match(/^\/s\/([^/]+)/);
    if (match) return `/api/${match[1]}/proxy`;
  }
  return '/api/proxy';
}

/**
 * Base fetch wrapper using local proxy
 * The proxy forwards requests to Google Apps Script
 */
async function fetchApi<T>(
    action: string,
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, unknown>
): Promise<ApiResponse<T>> {
    try {
        const apiUrl = getApiUrl();
        const url = method === 'GET'
            ? `${apiUrl}?action=${action}`
            : apiUrl;

        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (method === 'POST') {
            options.body = JSON.stringify({ action, ...(body ?? {}) });
        }

        const response = await fetchWithTimeout(url, options, clientTimeoutMs(action));
        let data: ApiResponse<T>;
        try {
            data = await response.json();
        } catch {
            // Badan non-JSON berarti perantara (gateway/proxy) yang menjawab, bukan
            // aplikasi. Dibedakan dari penolakan bisnis yang selalu berbentuk JSON.
            data = {
                success: false,
                message: `Server memberi respons yang tidak dikenali (${response.status}).`,
                code: 'invalid_response',
            };
        }

        return data;
    } catch (error) {
        // Batas waktu klien adalah jaring terakhir: server sudah punya batasnya
        // sendiri yang lebih ketat, jadi sampai di sini artinya jawabannya memang
        // tidak pernah datang. Pesan dipisahkan dari kegagalan jaringan biasa.
        if (error instanceof RequestTimeoutError) {
            return {
                success: false,
                message: 'Server tidak merespons tepat waktu. Periksa koneksi lalu coba lagi.',
                code: 'timeout',
            };
        }
        console.error('API Error:', action);
        return {
            success: false,
            message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
            code: 'network',
        };
    }
}

// ===== AUTH APIs =====

export async function login(username: string, password: string): Promise<ApiResponse<User>> {
    return fetchApi<User>('login', 'POST', { username, password });
}

export async function adminLogin(password: string): Promise<ApiResponse> {
    return fetchApi('adminLogin', 'POST', { password });
}

export async function logout(): Promise<ApiResponse> {
    return fetchApi('logout', 'POST');
}

// ===== EXAM APIs =====

export async function getQuestions(): Promise<ApiResponse<ImplementedStudentQuestion[]>> {
    return fetchApi<ImplementedStudentQuestion[]>('getQuestions');
}

export async function getAdminQuestions(): Promise<ApiResponse<ImplementedAdminQuestion[]>> {
    return fetchApi<ImplementedAdminQuestion[]>('getAdminQuestions');
}

export async function getConfig(): Promise<ApiResponse<ExamConfig>> {
    const res = await fetchApi<ExamConfig>('getConfig');
    if (res.success && res.data) {
        if (!res.data.exam_name || res.data.exam_name === 'Try Out Internal Persiapan TKA') {
            res.data.exam_name = 'RuangCBT';
        }
    }
    return res;
}

/**
 * Status PIN dari satu panggilan Config. Tenant yang GAS-nya belum di-deploy ulang
 * belum mengirim `isPinRequired`; untuk mereka jawabannya diambil dari action lama
 * supaya aturan PIN tidak berubah sama sekali.
 */
export async function resolvePinRequired(config: ExamConfig | null): Promise<boolean> {
    if (config && typeof config.isPinRequired === 'boolean') return config.isPinRequired;
    const res = await getExamPinStatus();
    return res.data?.isPinRequired === true;
}

/**
 * `rev` hanya menentukan urutan autosave di server (mana yang lebih baru saat dua
 * request saling mendahului). Identitas, status submit, dan deadline tetap
 * ditentukan server. Dihilangkan bila tidak diberikan supaya tenant GAS lama
 * tetap menerima request ini apa adanya.
 */
export async function syncAnswers(
    id_siswa: string,
    answers: AnswersRecord,
    rev?: number,
): Promise<ApiResponse> {
    return fetchApi('syncAnswers', 'POST', rev === undefined ? { id_siswa, answers } : { id_siswa, answers, rev });
}

export async function submitExam(
    id_siswa: string,
    answers: AnswersRecord,
    forced: boolean = false
): Promise<ApiResponse<{ score: string; status: string }>> {
    return fetchApi('submitExam', 'POST', { id_siswa, answers, forced });
}

export async function reportViolation(
    id_siswa: string,
    type: string
): Promise<ApiResponse<{ violations: number; disqualified: boolean }>> {
    return fetchApi('reportViolation', 'POST', { id_siswa, type });
}

// ===== LIVE SCORE APIs =====

export async function getLiveScore(): Promise<ApiResponse<LiveScoreEntry[]> & { stats?: LiveScoreStats }> {
    return fetchApi<LiveScoreEntry[]>('getLiveScore');
}

// ===== ADMIN APIs =====

export async function getUsers(): Promise<ApiResponse<User[]>> {
    return fetchApi<User[]>('getUsers');
}

export async function resetUserLogin(id_siswa: string): Promise<ApiResponse> {
    return fetchApi('resetUserLogin', 'POST', { id_siswa });
}

export async function createQuestion(data: Partial<QuestionWritePayload> & { kunci_jawaban: string }): Promise<ApiResponse> {
    return fetchApi('createQuestion', 'POST', { data });
}

export async function updateQuestion(
    id_soal: string,
    data: Partial<QuestionWritePayload> & { kunci_jawaban: string }
): Promise<ApiResponse> {
    return fetchApi('updateQuestion', 'POST', { id_soal, data });
}

export async function deleteQuestion(id_soal: string): Promise<ApiResponse> {
    return fetchApi('deleteQuestion', 'POST', { id_soal });
}

export interface ImportQuestionsResult {
    added: number;
    rejected: { nomor_urut?: number; message: string }[];
}

/**
 * Import banyak soal sekaligus (hasil baca dokumen Word). Melewati sanitizer proxy
 * dan validator GAS yang sama dengan entri manual — tidak ada jalur pintas.
 */
export async function importQuestions(
    questions: (Partial<QuestionWritePayload> & { kunci_jawaban: string })[],
    /** Kumpulan soal tujuan; kosong = soal masuk Bank Soal tanpa kumpulan. */
    id_kumpulan?: string
): Promise<ApiResponse<ImportQuestionsResult>> {
    return fetchApi<ImportQuestionsResult>('importQuestions', 'POST', { questions, id_kumpulan });
}

// ===== KUMPULAN SOAL =====
// Tidak ada aksi hapus: status "Tidak aktif" sudah menjawab "kumpulan ini sedang
// tidak dipakai" tanpa pernah kehilangan satu soal pun.

export const getQuestionCollections = () => fetchApi<QuestionCollection[]>('getQuestionCollections');

/**
 * Pindahkan soal ke kumpulan lain, atau keluarkan dari kumpulannya dengan
 * `id_kumpulan: ""`. Hanya mengubah pengelompokan — soal tetap di Bank Soal.
 */
export const moveQuestions = (id_soal: string[], id_kumpulan: string) =>
    fetchApi<{ moved: number; skipped: { id_soal: string; message: string }[] }>(
        'moveQuestions', 'POST', { id_soal, id_kumpulan }
    );

export const createQuestionCollection = (data: { nama_kumpulan: string; id_mapel?: string }) =>
    fetchApi<{ id_kumpulan: string }>('createQuestionCollection', 'POST', { ...data });

export const updateQuestionCollection = (
    id_kumpulan: string,
    data: { nama_kumpulan?: string; status?: 'AKTIF' | 'NONAKTIF' }
) => fetchApi<{ id_kumpulan: string; jumlah_soal: number }>('updateQuestionCollection', 'POST', { id_kumpulan, ...data });

export async function updateConfig(key: string, value: string | number | boolean): Promise<ApiResponse> {
    return fetchApi('updateConfig', 'POST', { key, value });
}

export async function exportResults(): Promise<ApiResponse<unknown[][]>> {
    return fetchApi<unknown[][]>('exportResults');
}

// ===== PIN AUTHENTICATION APIs =====

export async function getExamPinStatus(): Promise<ApiResponse<{ isPinRequired: boolean }>> {
    return fetchApi<{ isPinRequired: boolean }>('getExamPinStatus');
}

export async function validateExamPin(pin: string): Promise<ApiResponse> {
    return fetchApi('validateExamPin', 'POST', { pin });
}

export async function setExamPin(pin: string, adminPassword: string): Promise<ApiResponse> {
    return fetchApi('setExamPin', 'POST', { pin, adminPassword });
}

// ===== LIVE SCORE PIN (terpisah dari exam PIN) =====

export async function validateLiveScorePin(pin: string): Promise<ApiResponse> {
    return fetchApi('validateLiveScorePin', 'POST', { pin });
}

// ===== EXAM STATUS =====

export async function getExamStatus(): Promise<ApiResponse<{ exam_status: 'OPEN' | 'CLOSED' }>> {
    return fetchApi<{ exam_status: 'OPEN' | 'CLOSED' }>('getExamStatus');
}

export async function setExamStatus(status: 'OPEN' | 'CLOSED'): Promise<ApiResponse> {
    return fetchApi('setExamStatus', 'POST', { status });
}

// ===== ADAKAN UJIAN =====

export async function getExamSummary(): Promise<ApiResponse<ExamSummary>> {
    return fetchApi<ExamSummary>('getExamSummary');
}

/**
 * Satu-satunya jalur penyimpanan nama/mapel/durasi ujian. Server memvalidasi ulang
 * dan menolak membuka ujian tanpa soal aktif, jadi layar guru tidak perlu menebak.
 */
export async function saveExamConfig(input: SaveExamConfigInput): Promise<ApiResponse<ExamSummary>> {
    return fetchApi<ExamSummary>('saveExamConfig', 'POST', { ...input });
}

// ===== KELOLA SISWA =====

export interface StudentInput {
    id_siswa?: string;
    username: string;
    password: string;
    nama_lengkap: string;
    kelas: string;
}

export async function createStudent(data: StudentInput): Promise<ApiResponse> {
    return fetchApi('createStudent', 'POST', { ...data });
}

export async function updateStudent(
    id_siswa: string,
    // foto_url: kosongkan dengan "" untuk menghapus foto; server hanya menerima
    // URL yang memang dihasilkan uploadImage.
    data: { nama_lengkap?: string; username?: string; password?: string; kelas?: string; foto_url?: string }
): Promise<ApiResponse> {
    return fetchApi('updateStudent', 'POST', { id_siswa, ...data });
}

export async function deleteStudent(id_siswa: string): Promise<ApiResponse> {
    return fetchApi('deleteStudent', 'POST', { id_siswa });
}

export async function importStudents(students: StudentInput[]): Promise<ApiResponse<{ added: number; skipped: number }>> {
    return fetchApi<{ added: number; skipped: number }>('importStudents', 'POST', { students });
}

export async function deleteAllStudents(): Promise<ApiResponse<{ deleted: number }>> {
    return fetchApi<{ deleted: number }>('deleteAllStudents', 'POST');
}

// ===== DATA KELAS APIs =====

export const getKelas = () => fetchApi<Kelas[]>('getKelas');
export const createKelas = (data: { nama_kelas: string; tingkat: string }) =>
  fetchApi('createKelas', 'POST', data);
export const updateKelas = (id_kelas: string, data: { nama_kelas: string; tingkat: string }) =>
  fetchApi('updateKelas', 'POST', { id_kelas, ...data });
export const deleteKelas = (id_kelas: string) =>
  fetchApi('deleteKelas', 'POST', { id_kelas });
export const deleteAllKelas = () => fetchApi('deleteAllKelas', 'POST');

// ===== MATA PELAJARAN APIs =====

export const getMataPelajaran = () => fetchApi<MataPelajaran[]>('getMataPelajaran');
export const createMataPelajaran = (data: { kode_mapel: string; nama_mapel: string }) =>
  fetchApi('createMataPelajaran', 'POST', data);
export const updateMataPelajaran = (id_mapel: string, data: { kode_mapel: string; nama_mapel: string }) =>
  fetchApi('updateMataPelajaran', 'POST', { id_mapel, ...data });
export const deleteMataPelajaran = (id_mapel: string) =>
  fetchApi('deleteMataPelajaran', 'POST', { id_mapel });
export const deleteAllMataPelajaran = () => fetchApi('deleteAllMataPelajaran', 'POST');

// ===== UPLOAD GAMBAR KE GOOGLE DRIVE =====

export async function uploadImage(
  base64Data: string,
  mimeType: string,
  fileName: string
): Promise<ApiResponse<{ url: string; fileId: string }>> {
  return fetchApi<{ url: string; fileId: string }>('uploadImage', 'POST', {
    base64Data,
    mimeType,
    fileName,
  });
}

// ===== PRINT SETTINGS APIs =====

export interface PrintSettings {
  school_name: string;        // nama sekolah
  school_address: string;     // alamat sekolah
  school_city: string;        // kota
  kepala_sekolah_nama: string;
  kepala_sekolah_nip: string;
  guru_mapel_nama: string;
  guru_mapel_nip: string;
  guru_mapel_mapel: string;   // nama mata pelajaran yang diajarkan
  guru_wali_nama: string;     // guru wali kelas (optional)
  guru_wali_nip: string;
  tahun_pelajaran: string;    // e.g. "2025/2026"
  semester: string;           // "Ganjil" | "Genap"
}

// Store print settings as individual config keys via existing updateConfig
export const getPrintSettings = () =>
  fetchApi<PrintSettings>('getPrintSettings');

export const savePrintSettings = (settings: PrintSettings) =>
  fetchApi('savePrintSettings', 'POST', { settings });

// ===== DATA ANALISIS HASIL BELAJAR =====
// Endpoint admin-only ini hanya menyiapkan statistik. Personal API key dan
// panggilan provider AI tetap di browser.

import type { ClassStats, StudentStats } from './learningAnalysis';

function getAiUrl(): string {
  if (typeof window !== 'undefined') {
    const match = window.location.pathname.match(/^\/s\/([^/]+)/);
    if (match) return `/api/${match[1]}/ai-analysis`;
  }
  return '/api/ai-analysis';
}

async function postAi<T>(body: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(getAiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    try {
      return await res.json() as ApiResponse<T>;
    } catch {
      return { success: false, message: `Server returned invalid response (${res.status})` };
    }
  } catch {
    return { success: false, message: 'Analisis AI belum dapat dibuat. Silakan coba lagi beberapa saat.' };
  }
}

/** Statistik deterministic saja — tidak memanggil AI, tidak memakai kuota. */
export const getStudentStats = (id_siswa: string) =>
  postAi<{ stats: StudentStats }>({ mode: 'stats', id_siswa });

/** Statistik anonim rekap kelas; tidak memanggil provider AI. */
export const getClassStats = (kelas: string) =>
  postAi<{ stats: ClassStats; names: Record<string, string>; kelas: string }>({ mode: 'class_stats', kelas });
