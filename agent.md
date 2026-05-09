# BACKEND INTEGRATION BRIEF — CBT Web Application

You are integrating a new Next.js frontend with an existing backend system.
The backend is Google Apps Script (GAS) deployed as a Web App, using Google Sheets as a database.
Your job is to replace all dummy/mock data in the new frontend with real API calls,
following the exact patterns described below.

---

## ARCHITECTURE OVERVIEW

Browser (Next.js FE)
└─→ /api/proxy  (Next.js API Route — avoids CORS)
└─→ Google Apps Script Web App URL
└─→ Google Sheets (4 tabs: Config, Users, Questions, Responses)



The frontend NEVER calls GAS directly. All requests go through the internal proxy route.
This is non-negotiable — direct GAS calls from the browser will fail with CORS errors.

---

## ENVIRONMENT VARIABLES

Create `.env.local` at the project root:

```env
# GAS Web App URL (single deployment)
GAS_API_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec

# Multi-tenant registry (optional — only if serving multiple schools)
REGISTRY_GAS_URL=https://script.google.com/macros/s/YOUR_REGISTRY_ID/exec
STEP 1 — Create the Proxy Route
Create file: src/app/api/proxy/route.ts


import { NextRequest, NextResponse } from 'next/server';

const GAS_URL = process.env.GAS_API_URL || '';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    if (!action) return NextResponse.json({ success: false, message: 'Action required' }, { status: 400 });
    try {
        const response = await fetch(`${GAS_URL}?action=${action}`);
        const text = await response.text();
        return NextResponse.json(JSON.parse(text));
    } catch (error) {
        return NextResponse.json({ success: false, message: 'Failed to connect to server' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const response = await fetch(GAS_URL, {
            method: 'POST',
            // GAS requires text/plain — do NOT use application/json
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(body),
        });
        const text = await response.text();
        return NextResponse.json(JSON.parse(text));
    } catch (error) {
        return NextResponse.json({ success: false, message: 'Failed to connect to server' }, { status: 500 });
    }
}
STEP 2 — Create the API Layer
Create file: src/lib/api.ts

This is the ONLY file that makes fetch calls. All pages import from here — never fetch directly.


// All API responses follow this shape:
// { success: boolean, data?: T, message?: string }

function getApiUrl(): string {
    if (typeof window !== 'undefined') {
        // Multi-tenant: detect /s/[schoolId]/ in URL
        const match = window.location.pathname.match(/^\/s\/([^/]+)/);
        if (match) return `/api/${match[1]}/proxy`;
    }
    return '/api/proxy';
}

async function fetchApi<T>(
    action: string,
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, unknown>
): Promise<{ success: boolean; data?: T; message?: string }> {
    const apiUrl = getApiUrl();
    const url = method === 'GET' ? `${apiUrl}?action=${action}` : apiUrl;
    const options: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
    if (method === 'POST' && body) options.body = JSON.stringify({ action, ...body });
    const res = await fetch(url, options);
    return res.json();
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
export const login = (username: string, password: string) =>
    fetchApi('login', 'POST', { username, password });

export const adminLogin = (password: string) =>
    fetchApi('adminLogin', 'POST', { password });

// ── EXAM ──────────────────────────────────────────────────────────────────────
export const getQuestions = () => fetchApi('getQuestions');
export const getConfig    = () => fetchApi('getConfig');

export const syncAnswers = (id_siswa: string, answers: Record<string, unknown>) =>
    fetchApi('syncAnswers', 'POST', { id_siswa, answers });

export const submitExam = (id_siswa: string, answers: Record<string, unknown>, forced = false) =>
    fetchApi('submitExam', 'POST', { id_siswa, answers, forced });

export const reportViolation = (id_siswa: string, type: string) =>
    fetchApi('reportViolation', 'POST', { id_siswa, type });

// ── EXAM GATE ─────────────────────────────────────────────────────────────────
export const getExamPinStatus  = () => fetchApi('getExamPinStatus');
export const validateExamPin   = (pin: string) => fetchApi('validateExamPin', 'POST', { pin });
export const getExamStatus     = () => fetchApi('getExamStatus');
export const setExamStatus     = (status: 'OPEN' | 'CLOSED') =>
    fetchApi('setExamStatus', 'POST', { status });

// ── LIVE SCORE ────────────────────────────────────────────────────────────────
export const getLiveScore        = () => fetchApi('getLiveScore');
export const validateLiveScorePin = (pin: string) =>
    fetchApi('validateLiveScorePin', 'POST', { pin });

// ── ADMIN — USERS ─────────────────────────────────────────────────────────────
export const getUsers       = () => fetchApi('getUsers');
export const resetUserLogin = (id_siswa: string) =>
    fetchApi('resetUserLogin', 'POST', { id_siswa });

export const createStudent = (data: {
    id_siswa?: string; username: string; password: string;
    nama_lengkap: string; kelas: string;
}) => fetchApi('createStudent', 'POST', { ...data });

export const deleteStudent = (id_siswa: string) =>
    fetchApi('deleteStudent', 'POST', { id_siswa });

export const importStudents = (students: unknown[]) =>
    fetchApi('importStudents', 'POST', { students });

// ── ADMIN — QUESTIONS ─────────────────────────────────────────────────────────
export const createQuestion = (data: unknown) =>
    fetchApi('createQuestion', 'POST', { data });

export const updateQuestion = (id_soal: string, data: unknown) =>
    fetchApi('updateQuestion', 'POST', { id_soal, data });

export const deleteQuestion = (id_soal: string) =>
    fetchApi('deleteQuestion', 'POST', { id_soal });

// ── ADMIN — CONFIG ────────────────────────────────────────────────────────────
export const updateConfig = (key: string, value: unknown) =>
    fetchApi('updateConfig', 'POST', { key, value });

export const exportResults = () => fetchApi('exportResults');
STEP 3 — TypeScript Types
Create file: src/types/index.ts


export interface ExamConfig {
    exam_name: string;
    exam_duration: number;    // minutes
    max_violations: number;
    auto_submit: boolean;
    shuffle_questions: boolean;
    admin_password?: string;
    live_score_pin?: string;
    exam_pin?: string;
    exam_status?: 'OPEN' | 'CLOSED';
}

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
}

export interface Question {
    id_soal: string;
    nomor_urut: number;
    tipe: 'SINGLE' | 'COMPLEX';
    pertanyaan: string;
    gambar_url?: string | null;   // Google Drive or ImgBB URL
    opsi_a: string;
    opsi_b: string;
    opsi_c: string;
    opsi_d: string;
    opsi_e?: string | null;       // optional 5th option
    bobot: number;
    kategori?: string | null;
    // kunci_jawaban is NOT returned to client — only sent on create/update
}

export interface LiveScoreEntry {
    rank: number;
    nama: string;
    kelas: string;
    skor: number;
    status: 'SELESAI' | 'DISKUALIFIKASI' | 'SEDANG' | 'BELUM';
    waktu_selesai: string;
    waktu_submit_ms: number;
}

export type AnswersRecord = Record<string, string | string[]>;
STEP 4 — Global Exam State (Zustand)
Install: npm install zustand

Create file: src/store/examStore.ts


import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Question, AnswersRecord } from '@/types';

interface ExamStore {
    user: User | null;
    setUser: (u: User | null) => void;
    questions: Question[];
    setQuestions: (q: Question[]) => void;
    currentQuestionIndex: number;
    setCurrentQuestionIndex: (i: number) => void;
    nextQuestion: () => void;
    prevQuestion: () => void;
    answers: AnswersRecord;
    setAnswer: (id: string, answer: string | string[]) => void;
    timeRemaining: number;   // seconds
    setTimeRemaining: (t: number) => void;
    decrementTime: () => void;
    violations: number;
    incrementViolations: () => number;
    lastSync: Date | null;
    setLastSync: (d: Date) => void;
    isSyncing: boolean;
    setIsSyncing: (b: boolean) => void;
    isSubmitted: boolean;
    setIsSubmitted: (b: boolean) => void;
    resetExam: () => void;
}

export const useExamStore = create<ExamStore>()(
    persist(
        (set, get) => ({
            user: null, setUser: (user) => set({ user }),
            questions: [], setQuestions: (questions) => set({ questions }),
            currentQuestionIndex: 0,
            setCurrentQuestionIndex: (i) => set({ currentQuestionIndex: i }),
            nextQuestion: () => {
                const { currentQuestionIndex, questions } = get();
                if (currentQuestionIndex < questions.length - 1)
                    set({ currentQuestionIndex: currentQuestionIndex + 1 });
            },
            prevQuestion: () => {
                const { currentQuestionIndex } = get();
                if (currentQuestionIndex > 0)
                    set({ currentQuestionIndex: currentQuestionIndex - 1 });
            },
            answers: {},
            setAnswer: (id, answer) => set(s => ({ answers: { ...s.answers, [id]: answer } })),
            timeRemaining: 0,
            setTimeRemaining: (t) => set({ timeRemaining: t }),
            decrementTime: () => {
                const { timeRemaining } = get();
                if (timeRemaining > 0) set({ timeRemaining: timeRemaining - 1 });
            },
            violations: 0,
            incrementViolations: () => {
                const n = get().violations + 1;
                set({ violations: n });
                return n;
            },
            lastSync: null, setLastSync: (d) => set({ lastSync: d }),
            isSyncing: false, setIsSyncing: (b) => set({ isSyncing: b }),
            isSubmitted: false, setIsSubmitted: (b) => set({ isSubmitted: b }),
            resetExam: () => set({
                user: null, questions: [], currentQuestionIndex: 0,
                answers: {}, timeRemaining: 0, violations: 0,
                lastSync: null, isSyncing: false, isSubmitted: false,
            }),
        }),
        {
            name: 'cbt-exam-storage',
            storage: createJSONStorage(() => sessionStorage),
            partialize: (s) => ({
                user: s.user, answers: s.answers,
                timeRemaining: s.timeRemaining, violations: s.violations,
                currentQuestionIndex: s.currentQuestionIndex,
            }),
        }
    )
);
STEP 5 — Data Fetching Pattern
Install: npm install swr


// Pattern untuk halaman yang perlu polling (dashboard, live score):
import useSWR from 'swr';
import { getUsers } from '@/lib/api';

const { data, isLoading, mutate } = useSWR('getUsers', getUsers, {
    refreshInterval: 5000   // poll every 5s
});
const users = data?.data || [];

// Pattern untuk action (submit, create, delete):
const handleSubmit = async () => {
    const res = await createStudent({ username, password, nama_lengkap, kelas });
    if (res.success) {
        mutate(); // revalidate the list
    } else {
        alert(res.message);
    }
};
STEP 6 — Authentication Patterns

// ── Student login ─────────────────────────────────────────────────────────────
// Page: /login
// On success: store user in useExamStore, redirect to /pin-verify or /exam
const res = await login(username, password);
if (res.success && res.data) {
    useExamStore.getState().setUser(res.data);
    router.push('/pin-verify');  // or /exam if no PIN required
}

// ── Admin login ───────────────────────────────────────────────────────────────
// Page: /admin
// On success: store flag in sessionStorage, redirect to /admin/dashboard
const res = await adminLogin(password);
if (res.success) {
    sessionStorage.setItem('admin_auth', 'true');
    router.push('/admin/dashboard');
}

// ── Admin guard (run in every admin page) ─────────────────────────────────────
useEffect(() => {
    if (sessionStorage.getItem('admin_auth') !== 'true') {
        router.replace('/admin');
    }
}, []);

// ── Exam gate (run at /exam page mount) ──────────────────────────────────────
useEffect(() => {
    const init = async () => {
        // 1. Check if exam is open
        const statusRes = await getExamStatus();
        if (statusRes.data?.exam_status === 'CLOSED') {
            router.replace('/exam/closed'); return;
        }
        // 2. Check PIN requirement
        const pinRes = await getExamPinStatus();
        if (pinRes.data?.isPinRequired && !sessionStorage.getItem('pin_verified')) {
            router.replace('/pin-verify'); return;
        }
        // 3. Load questions
        const qRes = await getQuestions();
        if (qRes.success) useExamStore.getState().setQuestions(qRes.data);
        // 4. Load config for timer
        const cfgRes = await getConfig();
        if (cfgRes.success) {
            const secs = (cfgRes.data.exam_duration || 90) * 60;
            useExamStore.getState().setTimeRemaining(secs);
        }
    };
    init();
}, []);
STEP 7 — Exam Submit Pattern

// Auto-sync every 30 seconds during exam
useEffect(() => {
    const interval = setInterval(async () => {
        const { user, answers } = useExamStore.getState();
        if (user && Object.keys(answers).length > 0) {
            await syncAnswers(user.id_siswa, answers);
        }
    }, 30000);
    return () => clearInterval(interval);
}, []);

// Manual submit
const handleSubmit = async (forced = false) => {
    const { user, answers } = useExamStore.getState();
    if (!user) return;
    const res = await submitExam(user.id_siswa, answers, forced);
    if (res.success) {
        useExamStore.getState().resetExam();
        router.replace('/exam/thankyou');
        // Pass score via URL or sessionStorage:
        sessionStorage.setItem('exam_score', res.score || '0');
    }
};
STEP 8 — Question Form with Image
For the question create/edit form (at /admin/questions):


// gambar_url field — two modes:

// Mode A: URL input (free, uses Google Drive)
<input
    type="url"
    placeholder="https://drive.google.com/file/d/..."
    value={form.gambar_url || ''}
    onChange={e => setForm({ ...form, gambar_url: e.target.value })}
/>
// Auto-convert Google Drive share URL to direct image URL:
function toDirectImageUrl(url: string): string {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? `https://drive.google.com/uc?export=view&id=${match[1]}` : url;
}

// Mode B: File upload to ImgBB (free CDN, no Google Drive needed)
// Requires NEXT_PUBLIC_IMGBB_KEY in .env.local
async function uploadImage(file: File): Promise<string> {
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(
        `https://api.imgbb.com/1/upload?key=${process.env.NEXT_PUBLIC_IMGBB_KEY}`,
        { method: 'POST', body: form }
    );
    const data = await res.json();
    if (!data.success) throw new Error('Upload failed');
    return data.data.url;
}

// Usage in form:
<input
    type="file"
    accept="image/png,image/jpeg,image/webp"
    onChange={async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        const url = await uploadImage(file);
        setForm(f => ({ ...f, gambar_url: url }));
        setIsUploading(false);
    }}
/>
{form.gambar_url && (
    <img src={form.gambar_url} alt="preview" className="mt-2 max-h-40 rounded-lg object-contain" />
)}

// Save to GAS — send kunci_jawaban only on create/edit, never expose to students:
await createQuestion({
    nomor_urut: form.nomor_urut,
    tipe: form.tipe,           // 'SINGLE' or 'COMPLEX'
    pertanyaan: form.pertanyaan,
    gambar_url: form.gambar_url || null,
    opsi_a: form.opsi_a,
    opsi_b: form.opsi_b,
    opsi_c: form.opsi_c,
    opsi_d: form.opsi_d,
    opsi_e: form.opsi_e || null,
    kunci_jawaban: form.kunci_jawaban,  // 'C' for SINGLE, 'A,C' for COMPLEX
    bobot: form.bobot || 1,
    kategori: form.kategori || null,
});
STATUS ENUMS — Use Exactly These Strings

// status_ujian — User table
'BELUM'           // not started
'SEDANG'          // currently taking exam
'SELESAI'         // submitted successfully
'DISKUALIFIKASI'  // disqualified (3 violations)

// exam_status — Config table (exam gate)
'OPEN'    // students can login
'CLOSED'  // login blocked, show /exam/closed page

// question tipe
'SINGLE'   // radio — one correct answer (kunci_jawaban: "C")
'COMPLEX'  // checkbox — multiple correct answers (kunci_jawaban: "A,C")
WHAT NEVER TO DO
Never call GAS URL directly from browser — always use /api/proxy
Never send kunci_jawaban to the student exam page — GAS intentionally omits it from getQuestions
Never store admin password in state or localStorage — use sessionStorage.setItem('admin_auth','true') flag only
Never use useRouter from next/navigation directly — use useTenantRouter hook so multi-tenant paths work
Never hardcode school IDs or GAS URLs — read from env vars or from URL pathname
Never paginate the student table — GAS supports max 80 students, client-side slice(0,50) is enough
QUICK SMOKE TEST
After setup, open browser console and run:


// Test proxy is working:
fetch('/api/proxy?action=getConfig').then(r => r.json()).then(console.log)
// Expected: { success: true, data: { exam_name: '...', exam_duration: 90, ... } }

fetch('/api/proxy?action=getUsers').then(r => r.json()).then(console.log)
// Expected: { success: true, data: [ { id_siswa: '...', nama_lengkap: '...', ... } ] }
If you get { success: false, message: 'Failed to connect' }, check:

GAS_API_URL is set in .env.local
GAS is deployed as "Execute as Me, Anyone can access"
Dev server was restarted after changing .env.local


---

**Tips penggunaan prompt ini:**
- Paste **semuanya sekaligus** sebagai context awal ke AI agent
- Jika agent hanya perlu satu halaman, tambahkan di akhir: *"Now implement the `/admin/questions` page using these patterns"*
- Untuk image upload, tambahkan ke `.env.local`: `NEXT_PUBLIC_IMGBB_KEY=` → daftar gratis di [imgbb.com/api](https://api.imgbb.com/)