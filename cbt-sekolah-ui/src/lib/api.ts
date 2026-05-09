import type {
    ApiResponse,
    User,
    Question,
    LiveScoreEntry,
    LiveScoreStats,
    ExamConfig,
    AnswersRecord,
    Kelas,
    MataPelajaran
} from '@/types';

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

        if (method === 'POST' && body) {
            options.body = JSON.stringify({ action, ...body });
        }

        const response = await fetch(url, options);
        const data = await response.json();

        return data;
    } catch (error) {
        console.error('API Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Network error'
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

// ===== EXAM APIs =====

export async function getQuestions(): Promise<ApiResponse<Question[]>> {
    return fetchApi<Question[]>('getQuestions');
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

export async function syncAnswers(id_siswa: string, answers: AnswersRecord): Promise<ApiResponse> {
    return fetchApi('syncAnswers', 'POST', { id_siswa, answers });
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

export async function createQuestion(data: Partial<Question> & { kunci_jawaban: string }): Promise<ApiResponse> {
    return fetchApi('createQuestion', 'POST', { data });
}

export async function updateQuestion(
    id_soal: string,
    data: Partial<Question> & { kunci_jawaban: string }
): Promise<ApiResponse> {
    return fetchApi('updateQuestion', 'POST', { id_soal, data });
}

export async function deleteQuestion(id_soal: string): Promise<ApiResponse> {
    return fetchApi('deleteQuestion', 'POST', { id_soal });
}

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

export async function deleteStudent(id_siswa: string): Promise<ApiResponse> {
    return fetchApi('deleteStudent', 'POST', { id_siswa });
}

export async function importStudents(students: StudentInput[]): Promise<ApiResponse<{ added: number; skipped: number }>> {
    return fetchApi<{ added: number; skipped: number }>('importStudents', 'POST', { students });
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


