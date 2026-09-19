module.exports = [
"[project]/src/hooks/useTenantRouter.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useTenantPath",
    ()=>useTenantPath,
    "useTenantRouter",
    ()=>useTenantRouter
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
'use client';
;
function getTenantPrefix(pathname) {
    const match = pathname.match(/^\/s\/([^/]+)/);
    return match ? `/s/${match[1]}` : '';
}
function useTenantRouter() {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePathname"])();
    const prefix = getTenantPrefix(pathname);
    return {
        back: ()=>router.back(),
        forward: ()=>router.forward(),
        refresh: ()=>router.refresh(),
        prefetch: (href)=>router.prefetch(`${prefix}${href}`),
        push: (href, options)=>router.push(`${prefix}${href}`, options),
        replace: (href, options)=>router.replace(`${prefix}${href}`, options)
    };
}
function useTenantPath() {
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePathname"])();
    const prefix = getTenantPrefix(pathname);
    return (path)=>`${prefix}${path}`;
}
}),
"[project]/src/lib/timeouts.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Anggaran waktu satu percobaan request, dipakai klien dan server proxy.
//
// Batas klien selalu LEBIH LONGGAR dari batas server untuk action yang sama:
// dengan begitu yang sampai ke guru/siswa adalah pesan milik server ("Google
// tidak merespons", "Sekolah tidak ditemukan"), bukan abort milik browser yang
// tidak membawa keterangan apa pun.
/** GAS tenant untuk action biasa: login, config, soal, autosave, submit. */ __turbopack_context__.s([
    "CLIENT_HEAVY_TIMEOUT_MS",
    ()=>CLIENT_HEAVY_TIMEOUT_MS,
    "CLIENT_TIMEOUT_MS",
    ()=>CLIENT_TIMEOUT_MS,
    "GAS_HEAVY_TIMEOUT_MS",
    ()=>GAS_HEAVY_TIMEOUT_MS,
    "GAS_TIMEOUT_MS",
    ()=>GAS_TIMEOUT_MS,
    "HEAVY_ACTIONS",
    ()=>HEAVY_ACTIONS,
    "REGISTRY_TIMEOUT_MS",
    ()=>REGISTRY_TIMEOUT_MS,
    "RequestTimeoutError",
    ()=>RequestTimeoutError,
    "clientTimeoutMs",
    ()=>clientTimeoutMs,
    "fetchWithTimeout",
    ()=>fetchWithTimeout,
    "gasTimeoutMs",
    ()=>gasTimeoutMs
]);
const GAS_TIMEOUT_MS = 12_000;
const GAS_HEAVY_TIMEOUT_MS = 50_000;
const REGISTRY_TIMEOUT_MS = 8_000;
const CLIENT_TIMEOUT_MS = 20_000;
const CLIENT_HEAVY_TIMEOUT_MS = 55_000;
const HEAVY_ACTIONS = new Set([
    "importQuestions",
    "importStudents",
    "uploadImage",
    "exportResults",
    "deleteAllStudents",
    "deleteAllKelas",
    "deleteAllMataPelajaran",
    "moveQuestions",
    "getAdminQuestions"
]);
function gasTimeoutMs(action) {
    return HEAVY_ACTIONS.has(action) ? GAS_HEAVY_TIMEOUT_MS : GAS_TIMEOUT_MS;
}
function clientTimeoutMs(action) {
    return HEAVY_ACTIONS.has(action) ? CLIENT_HEAVY_TIMEOUT_MS : CLIENT_TIMEOUT_MS;
}
class RequestTimeoutError extends Error {
    timeoutMs;
    constructor(timeoutMs){
        super(`Request timed out after ${timeoutMs}ms`);
        this.name = "RequestTimeoutError";
        this.timeoutMs = timeoutMs;
    }
}
async function fetchWithTimeout(input, init, timeoutMs, fetcher = fetch) {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), timeoutMs);
    try {
        return await fetcher(input, {
            ...init,
            signal: controller.signal
        });
    } catch (error) {
        if (controller.signal.aborted) throw new RequestTimeoutError(timeoutMs);
        throw error;
    } finally{
        clearTimeout(timer);
    }
}
}),
"[project]/src/lib/api.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "adminLogin",
    ()=>adminLogin,
    "createKelas",
    ()=>createKelas,
    "createMataPelajaran",
    ()=>createMataPelajaran,
    "createQuestion",
    ()=>createQuestion,
    "createQuestionCollection",
    ()=>createQuestionCollection,
    "createStudent",
    ()=>createStudent,
    "deleteAllKelas",
    ()=>deleteAllKelas,
    "deleteAllMataPelajaran",
    ()=>deleteAllMataPelajaran,
    "deleteAllStudents",
    ()=>deleteAllStudents,
    "deleteKelas",
    ()=>deleteKelas,
    "deleteMataPelajaran",
    ()=>deleteMataPelajaran,
    "deleteQuestion",
    ()=>deleteQuestion,
    "deleteStudent",
    ()=>deleteStudent,
    "exportResults",
    ()=>exportResults,
    "getAdminQuestions",
    ()=>getAdminQuestions,
    "getClassStats",
    ()=>getClassStats,
    "getConfig",
    ()=>getConfig,
    "getExamPinStatus",
    ()=>getExamPinStatus,
    "getExamStatus",
    ()=>getExamStatus,
    "getExamSummary",
    ()=>getExamSummary,
    "getKelas",
    ()=>getKelas,
    "getLiveScore",
    ()=>getLiveScore,
    "getMataPelajaran",
    ()=>getMataPelajaran,
    "getPrintSettings",
    ()=>getPrintSettings,
    "getQuestionCollections",
    ()=>getQuestionCollections,
    "getQuestions",
    ()=>getQuestions,
    "getStudentStats",
    ()=>getStudentStats,
    "getUsers",
    ()=>getUsers,
    "importQuestions",
    ()=>importQuestions,
    "importStudents",
    ()=>importStudents,
    "login",
    ()=>login,
    "logout",
    ()=>logout,
    "moveQuestions",
    ()=>moveQuestions,
    "reportViolation",
    ()=>reportViolation,
    "resetUserLogin",
    ()=>resetUserLogin,
    "resolvePinRequired",
    ()=>resolvePinRequired,
    "saveExamConfig",
    ()=>saveExamConfig,
    "savePrintSettings",
    ()=>savePrintSettings,
    "setExamPin",
    ()=>setExamPin,
    "setExamStatus",
    ()=>setExamStatus,
    "submitExam",
    ()=>submitExam,
    "syncAnswers",
    ()=>syncAnswers,
    "updateConfig",
    ()=>updateConfig,
    "updateKelas",
    ()=>updateKelas,
    "updateMataPelajaran",
    ()=>updateMataPelajaran,
    "updateQuestion",
    ()=>updateQuestion,
    "updateQuestionCollection",
    ()=>updateQuestionCollection,
    "updateStudent",
    ()=>updateStudent,
    "uploadImage",
    ()=>uploadImage,
    "validateExamPin",
    ()=>validateExamPin,
    "validateLiveScorePin",
    ()=>validateLiveScorePin
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$timeouts$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/timeouts.ts [app-ssr] (ecmascript)");
;
// Resolve proxy URL: tenant-aware when inside /s/[schoolId]/, fallback to single-tenant
function getApiUrl() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return '/api/proxy';
}
/**
 * Base fetch wrapper using local proxy
 * The proxy forwards requests to Google Apps Script
 */ async function fetchApi(action, method = 'GET', body) {
    try {
        const apiUrl = getApiUrl();
        const url = method === 'GET' ? `${apiUrl}?action=${action}` : apiUrl;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        if (method === 'POST') {
            options.body = JSON.stringify({
                action,
                ...body ?? {}
            });
        }
        const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$timeouts$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fetchWithTimeout"])(url, options, (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$timeouts$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clientTimeoutMs"])(action));
        let data;
        try {
            data = await response.json();
        } catch  {
            // Badan non-JSON berarti perantara (gateway/proxy) yang menjawab, bukan
            // aplikasi. Dibedakan dari penolakan bisnis yang selalu berbentuk JSON.
            data = {
                success: false,
                message: `Server memberi respons yang tidak dikenali (${response.status}).`,
                code: 'invalid_response'
            };
        }
        return data;
    } catch (error) {
        // Batas waktu klien adalah jaring terakhir: server sudah punya batasnya
        // sendiri yang lebih ketat, jadi sampai di sini artinya jawabannya memang
        // tidak pernah datang. Pesan dipisahkan dari kegagalan jaringan biasa.
        if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$timeouts$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RequestTimeoutError"]) {
            return {
                success: false,
                message: 'Server tidak merespons tepat waktu. Periksa koneksi lalu coba lagi.',
                code: 'timeout'
            };
        }
        console.error('API Error:', action);
        return {
            success: false,
            message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
            code: 'network'
        };
    }
}
async function login(username, password) {
    return fetchApi('login', 'POST', {
        username,
        password
    });
}
async function adminLogin(password) {
    return fetchApi('adminLogin', 'POST', {
        password
    });
}
async function logout() {
    return fetchApi('logout', 'POST');
}
async function getQuestions() {
    return fetchApi('getQuestions');
}
async function getAdminQuestions() {
    return fetchApi('getAdminQuestions');
}
async function getConfig() {
    const res = await fetchApi('getConfig');
    if (res.success && res.data) {
        if (!res.data.exam_name || res.data.exam_name === 'Try Out Internal Persiapan TKA') {
            res.data.exam_name = 'RuangCBT';
        }
    }
    return res;
}
async function resolvePinRequired(config) {
    if (config && typeof config.isPinRequired === 'boolean') return config.isPinRequired;
    const res = await getExamPinStatus();
    return res.data?.isPinRequired === true;
}
async function syncAnswers(id_siswa, answers) {
    return fetchApi('syncAnswers', 'POST', {
        id_siswa,
        answers
    });
}
async function submitExam(id_siswa, answers, forced = false) {
    return fetchApi('submitExam', 'POST', {
        id_siswa,
        answers,
        forced
    });
}
async function reportViolation(id_siswa, type) {
    return fetchApi('reportViolation', 'POST', {
        id_siswa,
        type
    });
}
async function getLiveScore() {
    return fetchApi('getLiveScore');
}
async function getUsers() {
    return fetchApi('getUsers');
}
async function resetUserLogin(id_siswa) {
    return fetchApi('resetUserLogin', 'POST', {
        id_siswa
    });
}
async function createQuestion(data) {
    return fetchApi('createQuestion', 'POST', {
        data
    });
}
async function updateQuestion(id_soal, data) {
    return fetchApi('updateQuestion', 'POST', {
        id_soal,
        data
    });
}
async function deleteQuestion(id_soal) {
    return fetchApi('deleteQuestion', 'POST', {
        id_soal
    });
}
async function importQuestions(questions, /** Kumpulan soal tujuan; kosong = soal masuk Bank Soal tanpa kumpulan. */ id_kumpulan) {
    return fetchApi('importQuestions', 'POST', {
        questions,
        id_kumpulan
    });
}
const getQuestionCollections = ()=>fetchApi('getQuestionCollections');
const moveQuestions = (id_soal, id_kumpulan)=>fetchApi('moveQuestions', 'POST', {
        id_soal,
        id_kumpulan
    });
const createQuestionCollection = (data)=>fetchApi('createQuestionCollection', 'POST', {
        ...data
    });
const updateQuestionCollection = (id_kumpulan, data)=>fetchApi('updateQuestionCollection', 'POST', {
        id_kumpulan,
        ...data
    });
async function updateConfig(key, value) {
    return fetchApi('updateConfig', 'POST', {
        key,
        value
    });
}
async function exportResults() {
    return fetchApi('exportResults');
}
async function getExamPinStatus() {
    return fetchApi('getExamPinStatus');
}
async function validateExamPin(pin) {
    return fetchApi('validateExamPin', 'POST', {
        pin
    });
}
async function setExamPin(pin, adminPassword) {
    return fetchApi('setExamPin', 'POST', {
        pin,
        adminPassword
    });
}
async function validateLiveScorePin(pin) {
    return fetchApi('validateLiveScorePin', 'POST', {
        pin
    });
}
async function getExamStatus() {
    return fetchApi('getExamStatus');
}
async function setExamStatus(status) {
    return fetchApi('setExamStatus', 'POST', {
        status
    });
}
async function getExamSummary() {
    return fetchApi('getExamSummary');
}
async function saveExamConfig(input) {
    return fetchApi('saveExamConfig', 'POST', {
        ...input
    });
}
async function createStudent(data) {
    return fetchApi('createStudent', 'POST', {
        ...data
    });
}
async function updateStudent(id_siswa, // foto_url: kosongkan dengan "" untuk menghapus foto; server hanya menerima
// URL yang memang dihasilkan uploadImage.
data) {
    return fetchApi('updateStudent', 'POST', {
        id_siswa,
        ...data
    });
}
async function deleteStudent(id_siswa) {
    return fetchApi('deleteStudent', 'POST', {
        id_siswa
    });
}
async function importStudents(students) {
    return fetchApi('importStudents', 'POST', {
        students
    });
}
async function deleteAllStudents() {
    return fetchApi('deleteAllStudents', 'POST');
}
const getKelas = ()=>fetchApi('getKelas');
const createKelas = (data)=>fetchApi('createKelas', 'POST', data);
const updateKelas = (id_kelas, data)=>fetchApi('updateKelas', 'POST', {
        id_kelas,
        ...data
    });
const deleteKelas = (id_kelas)=>fetchApi('deleteKelas', 'POST', {
        id_kelas
    });
const deleteAllKelas = ()=>fetchApi('deleteAllKelas', 'POST');
const getMataPelajaran = ()=>fetchApi('getMataPelajaran');
const createMataPelajaran = (data)=>fetchApi('createMataPelajaran', 'POST', data);
const updateMataPelajaran = (id_mapel, data)=>fetchApi('updateMataPelajaran', 'POST', {
        id_mapel,
        ...data
    });
const deleteMataPelajaran = (id_mapel)=>fetchApi('deleteMataPelajaran', 'POST', {
        id_mapel
    });
const deleteAllMataPelajaran = ()=>fetchApi('deleteAllMataPelajaran', 'POST');
async function uploadImage(base64Data, mimeType, fileName) {
    return fetchApi('uploadImage', 'POST', {
        base64Data,
        mimeType,
        fileName
    });
}
const getPrintSettings = ()=>fetchApi('getPrintSettings');
const savePrintSettings = (settings)=>fetchApi('savePrintSettings', 'POST', {
        settings
    });
function getAiUrl() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return '/api/ai-analysis';
}
async function postAi(body) {
    try {
        const res = await fetch(getAiUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        try {
            return await res.json();
        } catch  {
            return {
                success: false,
                message: `Server returned invalid response (${res.status})`
            };
        }
    } catch  {
        return {
            success: false,
            message: 'Analisis AI belum dapat dibuat. Silakan coba lagi beberapa saat.'
        };
    }
}
const getStudentStats = (id_siswa)=>postAi({
        mode: 'stats',
        id_siswa
    });
const getClassStats = (kelas)=>postAi({
        mode: 'class_stats',
        kelas
    });
}),
"[project]/src/store/examStore.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useExamStore",
    ()=>useExamStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/react.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$middleware$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/middleware.mjs [app-ssr] (ecmascript)");
;
;
const initialState = {
    user: null,
    questions: [],
    currentQuestionIndex: 0,
    answers: {},
    timeRemaining: 0,
    violations: 0,
    lastSync: null,
    isSyncing: false,
    isSubmitted: false,
    isExamStarted: false
};
const useExamStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["create"])()((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$middleware$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["persist"])((set, get)=>({
        ...initialState,
        // User
        setUser: (user)=>set({
                user
            }),
        // Questions
        setQuestions: (questions)=>set({
                questions
            }),
        // Navigation
        setCurrentQuestionIndex: (index)=>set({
                currentQuestionIndex: index
            }),
        nextQuestion: ()=>{
            const { currentQuestionIndex, questions } = get();
            if (currentQuestionIndex < questions.length - 1) {
                set({
                    currentQuestionIndex: currentQuestionIndex + 1
                });
            }
        },
        prevQuestion: ()=>{
            const { currentQuestionIndex } = get();
            if (currentQuestionIndex > 0) {
                set({
                    currentQuestionIndex: currentQuestionIndex - 1
                });
            }
        },
        // Answers
        setAnswer: (questionId, answer)=>{
            const { answers } = get();
            set({
                answers: {
                    ...answers,
                    [questionId]: answer
                }
            });
        },
        setAllAnswers: (answers)=>set({
                answers
            }),
        // Timer
        setTimeRemaining: (time)=>set({
                timeRemaining: time
            }),
        decrementTime: ()=>{
            const { timeRemaining } = get();
            if (timeRemaining > 0) {
                set({
                    timeRemaining: timeRemaining - 1
                });
            }
        },
        // Violations
        incrementViolations: ()=>{
            const { violations } = get();
            const newCount = violations + 1;
            set({
                violations: newCount
            });
            return newCount;
        },
        setViolations: (count)=>set({
                violations: count
            }),
        // Sync
        setLastSync: (date)=>set({
                lastSync: date
            }),
        setIsSyncing: (syncing)=>set({
                isSyncing: syncing
            }),
        // Exam status
        setIsSubmitted: (submitted)=>set({
                isSubmitted: submitted
            }),
        setIsExamStarted: (started)=>set({
                isExamStarted: started
            }),
        // Reset
        resetExam: ()=>set(initialState)
    }), {
    name: 'cbt-exam-storage',
    storage: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$middleware$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createJSONStorage"])(()=>sessionStorage),
    partialize: (state)=>({
            user: state.user,
            answers: state.answers,
            timeRemaining: state.timeRemaining,
            violations: state.violations,
            currentQuestionIndex: state.currentQuestionIndex,
            isExamStarted: state.isExamStarted
        })
}));
}),
"[project]/src/lib/answerRecovery.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "deserializeAnswers",
    ()=>deserializeAnswers,
    "pickAnswers",
    ()=>pickAnswers,
    "shouldRecover",
    ()=>shouldRecover
]);
function deserializeAnswers(raw) {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === "object") {
        return Array.isArray(raw) ? null : raw;
    }
    if (typeof raw !== "string" || raw.trim() === "") return null;
    try {
        const parsed = JSON.parse(raw);
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
        return parsed;
    } catch  {
        return null;
    }
}
function pickAnswers(local, server) {
    if (local && Object.keys(local).length > 0) return local;
    if (server && Object.keys(server).length > 0) return server;
    return local ?? {};
}
function shouldRecover(local, server) {
    if (local && Object.keys(local).length > 0) return false;
    const parsed = deserializeAnswers(server);
    return parsed !== null && Object.keys(parsed).length > 0;
}
}),
"[project]/src/app/login/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>LoginPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useTenantRouter$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/useTenantRouter.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$examStore$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/store/examStore.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$answerRecovery$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/answerRecovery.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
// Nilai Config bisa datang sebagai number (nomor WA tersimpan sebagai angka).
function buildWaUrl(raw) {
    const digits = String(raw ?? "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("62")) return `https://wa.me/${digits}`;
    if (digits.startsWith("0")) return `https://wa.me/62${digits.slice(1)}`;
    return `https://wa.me/62${digits}`;
}
function LoginPage() {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useTenantRouter$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTenantRouter"])();
    const setUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$examStore$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useExamStore"])((s)=>s.setUser);
    const [username, setUsername] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [password, setPassword] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [showPassword, setShowPassword] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [adminWaUrl, setAdminWaUrl] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getConfig"])().then((res)=>{
            if (res.success && res.data?.admin_wa) {
                setAdminWaUrl(buildWaUrl(res.data.admin_wa));
            }
        });
    }, []);
    const handleSubmit = async (e)=>{
        e.preventDefault();
        setError("");
        setIsLoading(true);
        try {
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["login"])(username, password);
            if (res.success && res.data) {
                setUser(res.data);
                // ponytail: recover server-saved answers on re-entry if local store is empty
                const saved = res.data.saved_answers;
                const local = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$examStore$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useExamStore"].getState().answers;
                if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$answerRecovery$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shouldRecover"])(local, saved)) {
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$examStore$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useExamStore"].getState().setAllAnswers((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$answerRecovery$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deserializeAnswers"])(saved));
                }
                router.push("/pin-verification");
            } else {
                setError(res.message || "Username atau password salah.");
            }
        } catch  {
            setError("Gagal terhubung ke server.");
        } finally{
            setIsLoading(false);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen flex items-center justify-center p-4 sm:p-6 font-body-student text-slate-900 bg-slate-50 pattern-bg relative overflow-hidden",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 shadow-sm z-50"
            }, void 0, false, {
                fileName: "[project]/src/app/login/page.tsx",
                lineNumber: 65,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed -top-24 -left-24 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none animate-glow"
            }, void 0, false, {
                fileName: "[project]/src/app/login/page.tsx",
                lineNumber: 66,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed -bottom-24 -right-24 w-[30rem] h-[30rem] bg-indigo-500/15 rounded-full blur-3xl pointer-events-none animate-glow"
            }, void 0, false, {
                fileName: "[project]/src/app/login/page.tsx",
                lineNumber: 67,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 bg-gradient-to-tr from-blue-400/5 to-indigo-400/5 rounded-full blur-3xl pointer-events-none"
            }, void 0, false, {
                fileName: "[project]/src/app/login/page.tsx",
                lineNumber: 68,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: "w-full max-w-[440px] flex flex-col items-center relative z-10 my-auto py-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-6 flex flex-col items-center text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/25 ring-4 ring-blue-100/60 animate-float mb-3",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "material-symbols-outlined text-white text-[36px]",
                                    "data-icon": "school",
                                    children: "school"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/login/page.tsx",
                                    lineNumber: 74,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/login/page.tsx",
                                lineNumber: 73,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 mb-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "w-2 h-2 rounded-full bg-blue-600 animate-pulse"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/login/page.tsx",
                                        lineNumber: 79,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[11px] font-semibold tracking-wide uppercase text-blue-700",
                                        children: "RuangCBT System"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/login/page.tsx",
                                        lineNumber: 80,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/login/page.tsx",
                                lineNumber: 78,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-gradient-blue",
                                    children: "CBT Mandiri"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/login/page.tsx",
                                    lineNumber: 83,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/login/page.tsx",
                                lineNumber: 82,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/login/page.tsx",
                        lineNumber: 72,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "w-full glass-card rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-950/10 border border-slate-200/80 relative backdrop-blur-xl",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mb-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                        className: "text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-1.5",
                                        children: "Selamat Datang"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/login/page.tsx",
                                        lineNumber: 90,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-slate-500 leading-relaxed",
                                        children: "Silakan masuk ke akun siswa Kamu untuk memulai ujian."
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/login/page.tsx",
                                        lineNumber: 93,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/login/page.tsx",
                                lineNumber: 89,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                                className: "flex flex-col gap-4",
                                onSubmit: handleSubmit,
                                children: [
                                    error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "bg-red-50 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 border border-red-200/80 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "material-symbols-outlined text-red-500 text-[20px] shrink-0",
                                                "data-icon": "error",
                                                children: "error"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/login/page.tsx",
                                                lineNumber: 102,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-xs font-semibold leading-snug",
                                                children: error
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/login/page.tsx",
                                                lineNumber: 105,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/login/page.tsx",
                                        lineNumber: 101,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-col gap-1.5",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block font-semibold text-xs tracking-wider uppercase text-slate-600 px-1",
                                                htmlFor: "username",
                                                children: "Username"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/login/page.tsx",
                                                lineNumber: 111,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "relative group",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "material-symbols-outlined text-[20px]",
                                                            "data-icon": "person",
                                                            children: "person"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/login/page.tsx",
                                                            lineNumber: 119,
                                                            columnNumber: 19
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/login/page.tsx",
                                                        lineNumber: 118,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "w-full h-12 sm:h-13 pl-11 pr-4 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/15 focus:border-blue-600 transition-all text-slate-900 placeholder:text-slate-400 font-medium text-sm outline-none",
                                                        id: "username",
                                                        name: "username",
                                                        placeholder: "Masukkan nomor induk siswa",
                                                        required: true,
                                                        type: "text",
                                                        value: username,
                                                        onChange: (e)=>setUsername(e.target.value)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/login/page.tsx",
                                                        lineNumber: 123,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/login/page.tsx",
                                                lineNumber: 117,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/login/page.tsx",
                                        lineNumber: 110,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-col gap-1.5",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex justify-between items-center px-1",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block font-semibold text-xs tracking-wider uppercase text-slate-600",
                                                    htmlFor: "password",
                                                    children: "Password"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/login/page.tsx",
                                                    lineNumber: 139,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/login/page.tsx",
                                                lineNumber: 138,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "relative group",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "material-symbols-outlined text-[20px]",
                                                            "data-icon": "lock",
                                                            children: "lock"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/login/page.tsx",
                                                            lineNumber: 148,
                                                            columnNumber: 19
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/login/page.tsx",
                                                        lineNumber: 147,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "w-full h-12 sm:h-13 pl-11 pr-11 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/15 focus:border-blue-600 transition-all text-slate-900 placeholder:text-slate-400 font-medium text-sm outline-none",
                                                        id: "password",
                                                        name: "password",
                                                        placeholder: "••••••••",
                                                        required: true,
                                                        type: showPassword ? "text" : "password",
                                                        value: password,
                                                        onChange: (e)=>setPassword(e.target.value)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/login/page.tsx",
                                                        lineNumber: 152,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        className: "absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer",
                                                        type: "button",
                                                        onClick: ()=>setShowPassword(!showPassword),
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "material-symbols-outlined text-[20px]",
                                                            "data-icon": showPassword ? "visibility_off" : "visibility",
                                                            children: showPassword ? "visibility_off" : "visibility"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/login/page.tsx",
                                                            lineNumber: 167,
                                                            columnNumber: 19
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/login/page.tsx",
                                                        lineNumber: 162,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/login/page.tsx",
                                                lineNumber: 146,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/login/page.tsx",
                                        lineNumber: 137,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "submit",
                                        disabled: isLoading,
                                        className: "w-full h-12 sm:h-13 mt-2 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/35 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer",
                                        children: isLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "material-symbols-outlined animate-spin text-[20px]",
                                                    "data-icon": "progress_activity",
                                                    children: "progress_activity"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/login/page.tsx",
                                                    lineNumber: 182,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Memverifikasi..."
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/login/page.tsx",
                                                    lineNumber: 185,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Masuk Sekarang"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/login/page.tsx",
                                                    lineNumber: 189,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "material-symbols-outlined text-[20px]",
                                                    "data-icon": "login",
                                                    children: "login"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/login/page.tsx",
                                                    lineNumber: 190,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/login/page.tsx",
                                        lineNumber: 175,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/login/page.tsx",
                                lineNumber: 98,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-6 pt-5 border-t border-slate-100 text-center",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xs text-slate-500",
                                    children: [
                                        "Butuh bantuan? Hubungi",
                                        " ",
                                        adminWaUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                            href: adminWaUrl,
                                            target: "_blank",
                                            rel: "noopener noreferrer",
                                            className: "text-blue-600 font-semibold hover:underline inline-flex items-center gap-1 transition-all",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Administrator Sekolah"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/login/page.tsx",
                                                    lineNumber: 209,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "material-symbols-outlined text-[14px]",
                                                    children: "open_in_new"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/login/page.tsx",
                                                    lineNumber: 210,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/login/page.tsx",
                                            lineNumber: 203,
                                            columnNumber: 17
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-blue-600 font-semibold",
                                            children: "Administrator Sekolah"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/login/page.tsx",
                                            lineNumber: 213,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/login/page.tsx",
                                    lineNumber: 200,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/login/page.tsx",
                                lineNumber: 199,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/login/page.tsx",
                        lineNumber: 88,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-slate-200/80 shadow-sm backdrop-blur-md text-slate-500 text-xs font-medium",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "material-symbols-outlined text-emerald-500 text-[16px]",
                                "data-icon": "verified_user",
                                children: "verified_user"
                            }, void 0, false, {
                                fileName: "[project]/src/app/login/page.tsx",
                                lineNumber: 221,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Sistem Ujian Terverifikasi"
                            }, void 0, false, {
                                fileName: "[project]/src/app/login/page.tsx",
                                lineNumber: 224,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/login/page.tsx",
                        lineNumber: 220,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/login/page.tsx",
                lineNumber: 70,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/login/page.tsx",
        lineNumber: 63,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=src_05woweu._.js.map