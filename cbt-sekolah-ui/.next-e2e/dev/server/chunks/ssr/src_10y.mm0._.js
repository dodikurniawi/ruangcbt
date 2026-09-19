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
"[project]/src/lib/examFocus.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Lapisan fokus ujian: fullscreen + dedup pelanggaran.
// Fullscreen hanya UX/fokus — server tetap pemilik attempt, timer, dan skor.
// ponytail: subset dokumen yang dipakai, supaya bisa diuji tanpa DOM asli.
__turbopack_context__.s([
    "LEAVE_COOLDOWN_MS",
    ()=>LEAVE_COOLDOWN_MS,
    "LEAVE_VIOLATIONS",
    ()=>LEAVE_VIOLATIONS,
    "createViolationDeduper",
    ()=>createViolationDeduper,
    "exitExamFullscreen",
    ()=>exitExamFullscreen,
    "isFullscreenActive",
    ()=>isFullscreenActive,
    "isFullscreenSupported",
    ()=>isFullscreenSupported,
    "requestExamFullscreen",
    ()=>requestExamFullscreen
]);
function isFullscreenSupported(doc, el) {
    return typeof el.requestFullscreen === "function" && doc.fullscreenEnabled !== false;
}
function isFullscreenActive(doc) {
    return doc.fullscreenElement !== null && doc.fullscreenElement !== undefined;
}
async function requestExamFullscreen(doc, el) {
    if (!isFullscreenSupported(doc, el)) return false;
    try {
        await el.requestFullscreen();
        return true;
    } catch  {
        return false;
    }
}
async function exitExamFullscreen(doc) {
    if (!isFullscreenActive(doc) || typeof doc.exitFullscreen !== "function") return;
    try {
        await doc.exitFullscreen();
    } catch  {
    // Browser menolak exit: biarkan, hasil ujian sudah tersimpan di server.
    }
}
const LEAVE_VIOLATIONS = [
    "tab_switch",
    "blur",
    "exit_fullscreen"
];
const LEAVE_COOLDOWN_MS = 1500;
function createViolationDeduper(cooldownMs = LEAVE_COOLDOWN_MS) {
    const lastAt = new Map();
    return function shouldReport(type, now) {
        const key = LEAVE_VIOLATIONS.includes(type) ? "leave" : type;
        const prev = lastAt.get(key);
        if (prev !== undefined && now - prev < cooldownMs) return false;
        lastAt.set(key, now);
        return true;
    };
}
}),
"[project]/src/hooks/useExamSecurity.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useExamSecurity",
    ()=>useExamSecurity
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$examFocus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/examFocus.ts [app-ssr] (ecmascript)");
'use client';
;
;
function useExamSecurity({ maxViolations, onViolation, onMaxViolations, enabled = true }) {
    const violationsRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    const isBlockedRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    // Satu tindakan siswa memicu beberapa event; deduper menahan duplikatnya.
    const shouldReportRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$examFocus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createViolationDeduper"])());
    const handleViolation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((type)=>{
        if (!enabled || isBlockedRef.current) return;
        if (!shouldReportRef.current(type, Date.now())) return;
        violationsRef.current += 1;
        const count = violationsRef.current;
        onViolation(type, count);
        if (count >= maxViolations) {
            isBlockedRef.current = true;
            // Delay auto-submit by 10 seconds to show countdown warning
            setTimeout(()=>{
                onMaxViolations();
            }, 10000);
        }
    }, [
        enabled,
        maxViolations,
        onViolation,
        onMaxViolations
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!enabled) return;
        // Tab visibility change
        const handleVisibilityChange = ()=>{
            if (document.hidden) {
                handleViolation('tab_switch');
            }
        };
        // Keluar dari mode layar penuh saat ujian aktif
        const handleFullscreenChange = ()=>{
            if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$examFocus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isFullscreenActive"])(document)) {
                handleViolation('exit_fullscreen');
            }
        };
        // Window blur (click outside)
        const handleBlur = ()=>{
            handleViolation('blur');
        };
        // Context menu (right click)
        const handleContextMenu = (e)=>{
            e.preventDefault();
        // Only warning, no strike
        };
        // Keyboard shortcuts
        const handleKeyDown = (e)=>{
            // Prevent Ctrl+C, Ctrl+V, Ctrl+U, F12, Ctrl+Shift+I
            const blockedCombos = [
                e.ctrlKey && e.key === 'c',
                e.ctrlKey && e.key === 'v',
                e.ctrlKey && e.key === 'u',
                e.key === 'F12',
                e.ctrlKey && e.shiftKey && e.key === 'I',
                e.ctrlKey && e.shiftKey && e.key === 'J',
                e.ctrlKey && e.shiftKey && e.key === 'C',
                e.metaKey && e.key === 'c',
                e.metaKey && e.key === 'v',
                e.metaKey && e.altKey && e.key === 'i'
            ];
            if (blockedCombos.some(Boolean)) {
                e.preventDefault();
                handleViolation('keyboard_shortcut');
            }
        };
        // Copy event
        const handleCopy = (e)=>{
            e.preventDefault();
            handleViolation('copy');
        };
        // Paste event
        const handlePaste = (e)=>{
            e.preventDefault();
            handleViolation('paste');
        };
        // Add event listeners
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('paste', handlePaste);
        // CSS to prevent text selection
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        return ()=>{
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('paste', handlePaste);
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
        };
    }, [
        enabled,
        handleViolation
    ]);
}
}),
"[project]/src/lib/examTimer.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "calculateExamDeadline",
    ()=>calculateExamDeadline,
    "remainingExamSeconds",
    ()=>remainingExamSeconds
]);
function calculateExamDeadline(waktuMulai, examDurationMinutes) {
    const duration = Number(examDurationMinutes);
    if (!waktuMulai || !Number.isFinite(duration) || duration < 0) return null;
    const startMs = waktuMulai instanceof Date ? waktuMulai.getTime() : Date.parse(waktuMulai);
    if (!Number.isFinite(startMs)) return null;
    return startMs + duration * 60_000;
}
function remainingExamSeconds(deadlineMs, nowMs) {
    if (deadlineMs === null || !Number.isFinite(deadlineMs) || !Number.isFinite(nowMs)) return 0;
    return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}
}),
"[project]/src/lib/questionSanitize.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BASE_RICH_TEXT_FIELDS",
    ()=>BASE_RICH_TEXT_FIELDS,
    "DATA_SOAL_TEXT_PATHS",
    ()=>DATA_SOAL_TEXT_PATHS,
    "LEGACY_OPTION_FIELDS",
    ()=>LEGACY_OPTION_FIELDS,
    "sanitizeDataSoal",
    ()=>sanitizeDataSoal,
    "sanitizeQuestionHtml",
    ()=>sanitizeQuestionHtml,
    "sanitizeQuestionPayload",
    ()=>sanitizeQuestionPayload
]);
// Allowlist sanitizer untuk rich-text soal.
//
// Soal disimpan sebagai HTML karena guru memang butuh format (bold, list, ukuran
// font) dan dirender lewat dangerouslySetInnerHTML. Tanpa sanitasi, HTML dari
// request tersimpan apa adanya dan menjadi stored XSS bagi siswa maupun admin.
//
// ponytail: satu implementasi berbasis string dipakai di server (proxy) dan di
// browser (renderer). Sanitizer ini tidak mem-parse HTML seperti browser; ia
// membangun ulang output hanya dari tag dan atribut yang dikenal, sehingga
// markup yang tidak dikenali hilang alih-alih lolos setengah jadi.
const ALLOWED_TAGS = new Set([
    "p",
    "br",
    "div",
    "span",
    "b",
    "strong",
    "i",
    "em",
    "u",
    "s",
    "strike",
    "ul",
    "ol",
    "li",
    "sub",
    "sup",
    "font",
    "a"
]);
const VOID_TAGS = new Set([
    "br"
]);
// Tag yang isinya ikut dibuang, bukan hanya markup-nya.
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|template|noscript)\b[\s\S]*?<\/\1\s*>/gi;
const UNCLOSED_DANGEROUS = /<(script|style|iframe|object|embed|template|noscript)\b[\s\S]*$/gi;
const COMMENTS = /<!--[\s\S]*?-->/g;
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
const SAFE_URL = /^(?:https?:|mailto:|\/|#)/i;
const FONT_SIZE = /^[1-7]$/;
function attr(rawAttrs, name) {
    const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i");
    const m = rawAttrs.match(re);
    if (!m) return null;
    return (m[2] ?? m[3] ?? m[4] ?? "").trim();
}
function escapeText(text) {
    return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(value) {
    return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function openTag(tag, rawAttrs) {
    if (tag === "a") {
        const href = attr(rawAttrs, "href") ?? "";
        // javascript:, data:, vbscript: dan skema lain tidak pernah diteruskan.
        if (!SAFE_URL.test(href)) return "<a>";
        return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer nofollow">`;
    }
    if (tag === "font") {
        const size = attr(rawAttrs, "size") ?? "";
        return FONT_SIZE.test(size) ? `<font size="${size}">` : "<font>";
    }
    // Semua atribut lain (on*, style, src, srcdoc, formaction, …) dibuang.
    return `<${tag}>`;
}
function sanitizeQuestionHtml(input) {
    if (typeof input !== "string" || input === "") return "";
    const stripped = input.replace(COMMENTS, "").replace(DROP_WITH_CONTENT, "").replace(UNCLOSED_DANGEROUS, "");
    const out = [];
    const open = [];
    let cursor = 0;
    let match;
    TAG.lastIndex = 0;
    while((match = TAG.exec(stripped)) !== null){
        out.push(escapeText(stripped.slice(cursor, match.index)));
        cursor = TAG.lastIndex;
        const closing = match[1] === "/";
        const tag = match[2].toLowerCase();
        if (!ALLOWED_TAGS.has(tag)) continue;
        if (VOID_TAGS.has(tag)) {
            if (!closing) out.push(`<${tag}>`);
            continue;
        }
        if (closing) {
            const at = open.lastIndexOf(tag);
            if (at === -1) continue; // penutup tanpa pembuka: buang
            while(open.length > at)out.push(`</${open.pop()}>`);
            continue;
        }
        open.push(tag);
        out.push(openTag(tag, match[3] ?? ""));
    }
    out.push(escapeText(stripped.slice(cursor)));
    while(open.length > 0)out.push(`</${open.pop()}>`);
    return out.join("");
}
const BASE_RICH_TEXT_FIELDS = [
    "pertanyaan"
];
const LEGACY_OPTION_FIELDS = [
    "opsi_a",
    "opsi_b",
    "opsi_c",
    "opsi_d",
    "opsi_e"
];
const DATA_SOAL_TEXT_PATHS = Object.freeze({
    TRUE_FALSE: [
        "pernyataan[].teks"
    ],
    MATCHING: [
        "kiri[].teks",
        "kanan[].teks"
    ],
    FILL_IN: [
        "petunjuk"
    ],
    SINGLE: [],
    COMPLEX: []
});
function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
/** Daftar {id, teks} yang utuh — bentuk yang sama dipakai TRUE_FALSE dan MATCHING. */ function isCompleteItemList(value) {
    return Array.isArray(value) && value.every((item)=>isPlainObject(item) && Object.keys(item).every((field)=>field === "id" || field === "teks") && typeof item.id === "string" && item.id.trim() !== "" && typeof item.teks === "string");
}
function hasCompleteTrueFalseStructure(value) {
    if (!isPlainObject(value)) return false;
    if (Object.keys(value).some((field)=>field !== "pernyataan")) return false;
    return isCompleteItemList(value.pernyataan);
}
function hasCompleteMatchingStructure(value) {
    if (!isPlainObject(value)) return false;
    if (Object.keys(value).some((field)=>field !== "kiri" && field !== "kanan")) return false;
    return isCompleteItemList(value.kiri) && isCompleteItemList(value.kanan);
}
function hasCompleteFillInStructure(value) {
    if (!isPlainObject(value)) return false;
    if (Object.keys(value).some((field)=>field !== "petunjuk")) return false;
    return typeof value.petunjuk === "string";
}
/**
 * Tipe production-active yang payload rusaknya TIDAK boleh diperbaiki diam-diam
 * menjadi subset valid — data_soal dibuang seluruhnya agar validator GAS menolak
 * request, bukan menyimpan separuh soal.
 */ const COMPLETE_STRUCTURE_GUARDS = Object.freeze({
    TRUE_FALSE: hasCompleteTrueFalseStructure,
    MATCHING: hasCompleteMatchingStructure,
    FILL_IN: hasCompleteFillInStructure
});
/**
 * Normalisasi satu daftar item bernomor: hanya `id` dan `teks` yang bertahan,
 * `teks` disanitasi, entri rusak dibuang. Struktur asing tidak diteruskan.
 */ function sanitizeItemList(value) {
    if (!Array.isArray(value)) return [];
    const items = [];
    for (const raw of value){
        if (!isPlainObject(raw)) continue;
        const id = typeof raw.id === "string" ? raw.id.trim() : "";
        if (id === "") continue;
        items.push({
            id,
            teks: sanitizeQuestionHtml(raw.teks)
        });
    }
    return items;
}
function sanitizeDataSoal(tipe, dataSoal) {
    if (!isPlainObject(dataSoal)) return undefined;
    switch(tipe){
        case "TRUE_FALSE":
            {
                const pernyataan = sanitizeItemList(dataSoal.pernyataan);
                return pernyataan.length > 0 ? {
                    pernyataan
                } : undefined;
            }
        case "MATCHING":
            {
                const kiri = sanitizeItemList(dataSoal.kiri);
                const kanan = sanitizeItemList(dataSoal.kanan);
                return kiri.length > 0 || kanan.length > 0 ? {
                    kiri,
                    kanan
                } : undefined;
            }
        case "FILL_IN":
            {
                const petunjuk = sanitizeQuestionHtml(dataSoal.petunjuk);
                return petunjuk === "" ? undefined : {
                    petunjuk
                };
            }
        default:
            // SINGLE/COMPLEX dan tipe tak dikenal tidak punya isi terstruktur.
            return undefined;
    }
}
function sanitizeQuestionPayload(data) {
    const clean = {
        ...data
    };
    for (const field of [
        ...BASE_RICH_TEXT_FIELDS,
        ...LEGACY_OPTION_FIELDS
    ]){
        if (typeof clean[field] === "string") {
            clean[field] = sanitizeQuestionHtml(clean[field]);
        }
    }
    if ("data_soal" in clean) {
        const sanitized = sanitizeDataSoal(clean.tipe, clean.data_soal);
        const guard = typeof clean.tipe === "string" ? COMPLETE_STRUCTURE_GUARDS[clean.tipe] : undefined;
        if (guard && !guard(clean.data_soal)) delete clean.data_soal;
        else if (sanitized === undefined) delete clean.data_soal;
        else clean.data_soal = sanitized;
    }
    return clean;
}
}),
"[project]/src/lib/answerSemantics.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "countAnswered",
    ()=>countAnswered,
    "isAnswered",
    ()=>isAnswered
]);
function isAnswered(answer) {
    if (answer === undefined || answer === null) return false;
    if (typeof answer === "string") return answer.trim() !== "";
    if (Array.isArray(answer)) return answer.length > 0;
    if (typeof answer === "object") {
        return Object.keys(answer).length > 0;
    }
    // boolean / number: tidak pernah jadi truthiness bug — selalu dianggap terisi.
    return true;
}
function countAnswered(answers) {
    let n = 0;
    for (const key of Object.keys(answers)){
        if (isAnswered(answers[key])) n++;
    }
    return n;
}
}),
"[project]/src/lib/trueFalse.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EMPTY_TRUE_FALSE_STATEMENT",
    ()=>EMPTY_TRUE_FALSE_STATEMENT,
    "nextTrueFalseStatement",
    ()=>nextTrueFalseStatement,
    "serializeTrueFalseDraft",
    ()=>serializeTrueFalseDraft,
    "toTrueFalseDraft",
    ()=>toTrueFalseDraft,
    "updateTrueFalseAnswer",
    ()=>updateTrueFalseAnswer,
    "validateTrueFalseDraft",
    ()=>validateTrueFalseDraft
]);
const EMPTY_TRUE_FALSE_STATEMENT = {
    id: "1",
    teks: "",
    kunci: "BENAR"
};
function parseKey(raw) {
    if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
        return raw;
    }
    if (typeof raw !== "string" || raw.trim() === "") return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch  {
        return {};
    }
}
function toTrueFalseDraft(data, serializedKey) {
    const key = parseKey(serializedKey);
    // data_soal bisa hilang/rusak (GAS membuang sel kolom 17 yang tidak bisa diparse);
    // form admin harus tetap terbuka, bukan crash.
    const statements = Array.isArray(data?.pernyataan) ? data.pernyataan : [];
    return statements.map((statement)=>({
            id: statement.id,
            teks: statement.teks,
            kunci: key[statement.id] === "SALAH" ? "SALAH" : "BENAR"
        }));
}
function nextTrueFalseStatement(statements) {
    const used = new Set(statements.map((statement)=>statement.id));
    let id = 1;
    while(used.has(String(id)))id++;
    return {
        id: String(id),
        teks: "",
        kunci: "BENAR"
    };
}
function validateTrueFalseDraft(statements) {
    if (statements.length === 0) return "Tambahkan minimal satu pernyataan.";
    const ids = new Set();
    for (const statement of statements){
        const id = statement.id.trim();
        const text = statement.teks.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
        if (id === "") return "Setiap pernyataan wajib memiliki ID.";
        if (ids.has(id)) return "ID pernyataan harus unik.";
        if (text === "") return "Setiap pernyataan wajib diisi.";
        if (statement.kunci !== "BENAR" && statement.kunci !== "SALAH") {
            return "Kunci pernyataan harus BENAR atau SALAH.";
        }
        ids.add(id);
    }
    return null;
}
function serializeTrueFalseDraft(statements) {
    const key = {};
    const pernyataan = statements.map((statement)=>{
        const id = statement.id.trim();
        key[id] = statement.kunci;
        return {
            id,
            teks: statement.teks
        };
    });
    return {
        data_soal: {
            pernyataan
        },
        kunci_jawaban: JSON.stringify(key)
    };
}
function updateTrueFalseAnswer(current, statementId, value) {
    const answer = current !== null && typeof current === "object" && !Array.isArray(current) ? current : {};
    return {
        ...answer,
        [statementId]: value
    };
}
}),
"[project]/src/lib/matching.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EMPTY_MATCHING_DRAFT",
    ()=>EMPTY_MATCHING_DRAFT,
    "emptyMatchingDraft",
    ()=>emptyMatchingDraft,
    "nextMatchingId",
    ()=>nextMatchingId,
    "serializeMatchingDraft",
    ()=>serializeMatchingDraft,
    "toMatchingDraft",
    ()=>toMatchingDraft,
    "updateMatchingAnswer",
    ()=>updateMatchingAnswer,
    "validateMatchingDraft",
    ()=>validateMatchingDraft
]);
const EMPTY_MATCHING_DRAFT = {
    kiri: [
        {
            id: "1",
            teks: ""
        }
    ],
    kanan: [
        {
            id: "A",
            teks: ""
        }
    ],
    pasangan: {}
};
function emptyMatchingDraft() {
    return {
        kiri: [
            {
                id: "1",
                teks: ""
            }
        ],
        kanan: [
            {
                id: "A",
                teks: ""
            }
        ],
        pasangan: {}
    };
}
function parseKey(raw) {
    if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
        return raw;
    }
    if (typeof raw !== "string" || raw.trim() === "") return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch  {
        return {};
    }
}
function nextMatchingId(items, side) {
    const used = new Set(items.map((item)=>item.id));
    if (side === "kiri") {
        let n = 1;
        while(used.has(String(n)))n++;
        return String(n);
    }
    let n = 0;
    // A..Z lalu AA, AB, … supaya kolom kanan tidak pernah kehabisan ID.
    for(;;){
        let label = "";
        let value = n;
        do {
            label = String.fromCharCode(65 + value % 26) + label;
            value = Math.floor(value / 26) - 1;
        }while (value >= 0)
        if (!used.has(label)) return label;
        n++;
    }
}
function toMatchingDraft(data, serializedKey) {
    const kiri = Array.isArray(data?.kiri) ? data.kiri.map((item)=>({
            ...item
        })) : [];
    const kanan = Array.isArray(data?.kanan) ? data.kanan.map((item)=>({
            ...item
        })) : [];
    const rightIds = new Set(kanan.map((item)=>item.id));
    const key = parseKey(serializedKey);
    const pasangan = {};
    for (const item of kiri){
        const target = key[item.id];
        if (typeof target === "string" && rightIds.has(target)) pasangan[item.id] = target;
    }
    return {
        kiri,
        kanan,
        pasangan
    };
}
function validateMatchingDraft(draft) {
    if (draft.kiri.length === 0) return "Tambahkan minimal satu item kiri.";
    if (draft.kanan.length === 0) return "Tambahkan minimal satu item kanan.";
    for (const [side, items] of [
        [
            "kiri",
            draft.kiri
        ],
        [
            "kanan",
            draft.kanan
        ]
    ]){
        const ids = new Set();
        for (const item of items){
            const id = item.id.trim();
            const text = item.teks.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
            if (id === "") return `Setiap item ${side} wajib memiliki ID.`;
            if (ids.has(id)) return `ID item ${side} harus unik.`;
            if (text === "") return `Setiap item ${side} wajib diisi.`;
            ids.add(id);
        }
    }
    const rightIds = new Set(draft.kanan.map((item)=>item.id.trim()));
    for (const item of draft.kiri){
        const target = draft.pasangan[item.id];
        if (!target) return "Setiap item kiri wajib dipasangkan dengan satu item kanan.";
        if (!rightIds.has(target)) return "Pasangan menunjuk item kanan yang sudah tidak ada.";
    }
    return null;
}
function serializeMatchingDraft(draft) {
    const key = {};
    const kiri = draft.kiri.map((item)=>{
        const id = item.id.trim();
        key[id] = draft.pasangan[item.id];
        return {
            id,
            teks: item.teks
        };
    });
    const kanan = draft.kanan.map((item)=>({
            id: item.id.trim(),
            teks: item.teks
        }));
    return {
        data_soal: {
            kiri,
            kanan
        },
        kunci_jawaban: JSON.stringify(key)
    };
}
function updateMatchingAnswer(current, leftId, rightId) {
    const answer = current !== null && typeof current === "object" && !Array.isArray(current) ? current : {};
    if (rightId === "") {
        const next = {
            ...answer
        };
        delete next[leftId];
        return next;
    }
    return {
        ...answer,
        [leftId]: rightId
    };
}
}),
"[project]/src/types/index.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// =====================================
// Type Definitions for CBT Application
// =====================================
// Config types
__turbopack_context__.s([
    "ADMIN_ONLY_QUESTION_FIELDS",
    ()=>ADMIN_ONLY_QUESTION_FIELDS,
    "KUMPULAN_BAWAAN_ID",
    ()=>KUMPULAN_BAWAAN_ID,
    "QUESTION_TYPES",
    ()=>QUESTION_TYPES,
    "QUESTION_TYPES_IMPLEMENTED",
    ()=>QUESTION_TYPES_IMPLEMENTED,
    "QUESTION_WRITE_FIELDS",
    ()=>QUESTION_WRITE_FIELDS,
    "STUDENT_QUESTION_FIELDS",
    ()=>STUDENT_QUESTION_FIELDS
]);
const QUESTION_TYPES = [
    'SINGLE',
    'COMPLEX',
    'TRUE_FALSE',
    'MATCHING',
    'FILL_IN'
];
const QUESTION_TYPES_IMPLEMENTED = [
    'SINGLE',
    'COMPLEX',
    'TRUE_FALSE',
    'MATCHING',
    'FILL_IN'
];
const QUESTION_WRITE_FIELDS = [
    'id_soal',
    'nomor_urut',
    'tipe',
    'pertanyaan',
    'gambar_url',
    'opsi_a',
    'opsi_b',
    'opsi_c',
    'opsi_d',
    'opsi_e',
    'kunci_jawaban',
    'bobot',
    'kategori',
    'id_mapel',
    'data_soal',
    'id_kumpulan'
];
const STUDENT_QUESTION_FIELDS = [
    'id_soal',
    'nomor_urut',
    'tipe',
    'pertanyaan',
    'gambar_url',
    'opsi_a',
    'opsi_b',
    'opsi_c',
    'opsi_d',
    'opsi_e',
    'bobot',
    'kategori',
    'id_mapel',
    'nama_mapel',
    'data_soal'
];
const ADMIN_ONLY_QUESTION_FIELDS = [
    'kunci_jawaban',
    'status_soal',
    'versi_dari',
    'id_kumpulan'
];
const KUMPULAN_BAWAAN_ID = 'K_LAMA';
}),
"[project]/src/lib/questionRender.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "fillInPetunjuk",
    ()=>fillInPetunjuk,
    "matchingColumns",
    ()=>matchingColumns,
    "questionRenderKind",
    ()=>questionRenderKind,
    "trueFalseStatements",
    ()=>trueFalseStatements
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$types$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/types/index.ts [app-ssr] (ecmascript)");
;
function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function itemList(value) {
    if (!Array.isArray(value) || value.length === 0) return null;
    const items = [];
    for (const raw of value){
        if (!isPlainObject(raw)) return null;
        if (typeof raw.id !== "string" || raw.id.trim() === "") return null;
        items.push({
            id: raw.id,
            teks: typeof raw.teks === "string" ? raw.teks : ""
        });
    }
    return items;
}
function trueFalseStatements(question) {
    if (question.tipe !== "TRUE_FALSE") return null;
    const data = question.data_soal;
    return isPlainObject(data) ? itemList(data.pernyataan) : null;
}
function matchingColumns(question) {
    if (question.tipe !== "MATCHING") return null;
    const data = question.data_soal;
    if (!isPlainObject(data)) return null;
    const kiri = itemList(data.kiri);
    const kanan = itemList(data.kanan);
    return kiri && kanan ? {
        kiri,
        kanan
    } : null;
}
function fillInPetunjuk(question) {
    if (question.tipe !== "FILL_IN") return null;
    const data = question.data_soal;
    if (!isPlainObject(data)) return null;
    return typeof data.petunjuk === "string" ? data.petunjuk : null;
}
function questionRenderKind(question) {
    const tipe = question.tipe;
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$types$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["QUESTION_TYPES_IMPLEMENTED"].includes(tipe)) return "UNSUPPORTED";
    if (tipe === "SINGLE" || tipe === "COMPLEX") return "CHOICE";
    if (tipe === "TRUE_FALSE") return trueFalseStatements(question) ? "TRUE_FALSE" : "UNSUPPORTED";
    if (tipe === "MATCHING") return matchingColumns(question) ? "MATCHING" : "UNSUPPORTED";
    return fillInPetunjuk(question) === null ? "UNSUPPORTED" : "FILL_IN";
}
}),
"[project]/src/app/exam/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ExamPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useTenantRouter$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/useTenantRouter.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$examStore$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/store/examStore.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useExamSecurity$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/useExamSecurity.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$examFocus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/examFocus.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$examTimer$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/examTimer.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$questionSanitize$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/questionSanitize.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$answerSemantics$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/answerSemantics.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$trueFalse$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/trueFalse.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$matching$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/matching.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$questionRender$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/questionRender.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
;
;
;
;
;
;
function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = seconds % 60;
    if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function getOptionText(opt, q) {
    return q[`opsi_${opt}`] ?? "";
}
const OPTIONS = [
    "a",
    "b",
    "c",
    "d",
    "e"
];
// Status koneksi dibaca lewat useSyncExternalStore: React memang menyediakan API ini
// untuk berlangganan state di luar React, sehingga tidak perlu setState di badan effect.
function subscribeOnline(onChange) {
    window.addEventListener("online", onChange);
    window.addEventListener("offline", onChange);
    return ()=>{
        window.removeEventListener("online", onChange);
        window.removeEventListener("offline", onChange);
    };
}
const getOnlineSnapshot = ()=>navigator.onLine;
// Server tidak tahu status koneksi klien; anggap online agar hidrasi tidak berbeda.
const getOnlineServerSnapshot = ()=>true;
function ExamPage() {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useTenantRouter$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTenantRouter"])();
    const { user, questions, currentQuestionIndex, answers, timeRemaining, violations, setQuestions, setTimeRemaining, setAnswer, setCurrentQuestionIndex, nextQuestion, prevQuestion, setIsSubmitted, resetExam, setLastSync, setIsSyncing, setIsExamStarted } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$examStore$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useExamStore"])();
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [loadError, setLoadError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [isSubmitting, setIsSubmitting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showSubmitConfirm, setShowSubmitConfirm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [violationToast, setViolationToast] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [maxViolations, setMaxViolations] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(3);
    const [examName, setExamName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("RuangCBT");
    const [subjectName, setSubjectName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [deadlineMs, setDeadlineMs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [syncStatus, setSyncStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('idle');
    const isOnline = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSyncExternalStore"])(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);
    // Offline selalu menang atas hasil sinkronisasi terakhir saat ditampilkan.
    const displayStatus = isOnline ? syncStatus : 'offline';
    // Gerbang mulai: fullscreen wajib berasal dari klik siswa, bukan dari effect.
    const [hasStarted, setHasStarted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [fullscreenGranted, setFullscreenGranted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isFullscreenOn, setIsFullscreenOn] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [raguraguSet, setRaguraguSet] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(new Set());
    const [fontSize, setFontSize] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('base');
    const fontSizeClass = {
        sm: 'text-sm',
        base: 'text-base',
        lg: 'text-lg'
    }[fontSize];
    const toggleRaguragu = (questionId)=>{
        setRaguraguSet((prev)=>{
            const next = new Set(prev);
            if (next.has(questionId)) next.delete(questionId);
            else next.add(questionId);
            return next;
        });
    };
    const timerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const syncRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const hasSubmittedRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    const doSubmit = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (forced)=>{
        if (!user || hasSubmittedRef.current) return;
        hasSubmittedRef.current = true;
        setIsSubmitting(true);
        if (timerRef.current) clearInterval(timerRef.current);
        if (syncRef.current) clearInterval(syncRef.current);
        try {
            // BR#9: always use latest state, never closure
            const latestAnswers = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$examStore$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useExamStore"].getState().answers;
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["submitExam"])(user.id_siswa, latestAnswers, forced);
            if (res.success) {
                // Submit sudah dikonfirmasi server; baru lepas fullscreen.
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$examFocus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["exitExamFullscreen"])(document);
                sessionStorage.setItem("exam_score", res.score ?? "0");
                sessionStorage.setItem("exam_status", forced ? "DISKUALIFIKASI" : "SELESAI");
                setIsSubmitted(true);
                resetExam();
                router.replace("/student-status");
            } else {
                hasSubmittedRef.current = false;
                setIsSubmitting(false);
            }
        } catch  {
            hasSubmittedRef.current = false;
            setIsSubmitting(false);
        }
    }, [
        user,
        setIsSubmitted,
        resetExam,
        router
    ]);
    const handleViolation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (type, count)=>{
        if (!user) return;
        setViolationToast(`Peringatan: ${type.replace("_", " ")}. Pelanggaran ke-${count}`);
        setTimeout(()=>setViolationToast(""), 4000);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["reportViolation"])(user.id_siswa, type);
    }, [
        user
    ]);
    const handleMaxViolations = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        doSubmit(true);
    }, [
        doSubmit
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useExamSecurity$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useExamSecurity"])({
        maxViolations,
        onViolation: handleViolation,
        onMaxViolations: handleMaxViolations,
        enabled: hasStarted && !isLoading && !isSubmitting
    });
    // Status fullscreen dipantau untuk menampilkan ajakan kembali; pelanggaran
    // sendiri dicatat oleh useExamSecurity supaya tidak ada sistem kedua.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const sync = ()=>setIsFullscreenOn((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$examFocus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isFullscreenActive"])(document));
        sync();
        document.addEventListener("fullscreenchange", sync);
        return ()=>document.removeEventListener("fullscreenchange", sync);
    }, []);
    // Dipanggil langsung dari klik siswa: gesture masih hidup saat request.
    const handleStartExam = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$examFocus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["requestExamFullscreen"])(document, document.documentElement).then(setFullscreenGranted);
        setHasStarted(true);
    }, []);
    const handleReenterFullscreen = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$examFocus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["requestExamFullscreen"])(document, document.documentElement).then(setFullscreenGranted);
    }, []);
    // Load exam data on mount
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const init = async ()=>{
            if (!user) {
                router.replace("/login");
                return;
            }
            // Satu panggilan Config melayani ketiga keputusan masuk ujian: status ujian,
            // kebutuhan PIN, dan parameter ujian. Sebelumnya tiga round-trip berurutan
            // untuk objek Config yang sama.
            const cfgRes = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getConfig"])();
            const cfg = cfgRes.success && cfgRes.data ? cfgRes.data : null;
            if (cfg?.exam_status === "CLOSED") {
                router.replace("/student-status");
                return;
            }
            if (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["resolvePinRequired"])(cfg) && !sessionStorage.getItem("pin_verified")) {
                router.replace("/pin-verification");
                return;
            }
            // Durasi beku milik attempt menang atas Config: admin yang mengubah durasi
            // di tengah ujian tidak boleh menggeser deadline siswa yang sudah mulai.
            // Config hanya dipakai bila attempt belum membawa durasinya sendiri.
            const examDuration = user.exam_duration ?? cfg?.exam_duration ?? 90;
            const calculatedDeadline = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$examTimer$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["calculateExamDeadline"])(user.waktu_mulai, examDuration);
            if (calculatedDeadline === null) {
                setLoadError("Waktu mulai ujian tidak valid. Silakan login kembali.");
                setIsLoading(false);
                return;
            }
            setDeadlineMs(calculatedDeadline);
            setTimeRemaining((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$examTimer$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["remainingExamSeconds"])(calculatedDeadline, Date.now()));
            if (cfg) {
                setExamName(cfg.exam_name || "RuangCBT");
                setMaxViolations(cfg.max_violations ?? 3);
            }
            if (questions.length === 0) {
                const qRes = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getQuestions"])();
                if (qRes.success && qRes.data) {
                    setQuestions(qRes.data);
                    setIsExamStarted(true);
                    // Derive subject name from the first question that has nama_mapel
                    const firstMapel = qRes.data.find((q)=>q.nama_mapel);
                    if (firstMapel?.nama_mapel) {
                        setSubjectName(firstMapel.nama_mapel);
                    }
                } else {
                    setLoadError("Gagal memuat soal. Coba refresh halaman.");
                    setIsLoading(false);
                    return;
                }
            }
            setIsLoading(false);
        };
        // Kegagalan tak terduga tidak boleh meninggalkan layar pada "Memuat soal
        // ujian..." selamanya: setiap jalur keluar wajib berakhir dengan pesan atau
        // perpindahan halaman.
        init().catch(()=>{
            setLoadError("Gagal menyiapkan ujian. Periksa koneksi lalu muat ulang halaman.");
            setIsLoading(false);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // Countdown display only; deadlineMs remains the source of truth.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (isLoading || isSubmitting || deadlineMs === null) return;
        const refreshRemaining = ()=>{
            setTimeRemaining((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$examTimer$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["remainingExamSeconds"])(deadlineMs, Date.now()));
        };
        refreshRemaining();
        timerRef.current = setInterval(()=>{
            refreshRemaining();
        }, 1000);
        return ()=>{
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [
        isLoading,
        isSubmitting,
        deadlineMs,
        setTimeRemaining
    ]);
    // Auto-submit at zero (deferred to avoid setState-in-render warning)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (isLoading || isSubmitting || questions.length === 0 || timeRemaining !== 0) return;
        const t = setTimeout(()=>doSubmit(false), 0);
        return ()=>clearTimeout(t);
    }, [
        timeRemaining,
        isLoading,
        isSubmitting,
        questions.length,
        doSubmit
    ]);
    // Auto-sync every 10s (BR#3) with error handling and online/offline awareness
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (isLoading || !user) return;
        const handleOnline = ()=>{
            // Immediate sync on reconnect
            const a = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$examStore$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useExamStore"].getState().answers;
            if (Object.keys(a).length > 0 && !hasSubmittedRef.current) {
                setSyncStatus('saving');
                setIsSyncing(true);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["syncAnswers"])(user.id_siswa, a).then((res)=>{
                    if (res.success) {
                        setLastSync(new Date());
                        setSyncStatus('saved');
                    } else {
                        setSyncStatus('failed');
                    }
                    setIsSyncing(false);
                });
            }
        };
        // Status offline ditampilkan lewat isOnline (useSyncExternalStore), bukan state di sini.
        window.addEventListener('online', handleOnline);
        syncRef.current = setInterval(async ()=>{
            if (hasSubmittedRef.current) return;
            if (!navigator.onLine) return;
            const currentAnswers = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$examStore$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useExamStore"].getState().answers;
            if (Object.keys(currentAnswers).length === 0) return;
            setSyncStatus('saving');
            setIsSyncing(true);
            try {
                const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["syncAnswers"])(user.id_siswa, currentAnswers);
                if (res.success) {
                    setLastSync(new Date());
                    setSyncStatus('saved');
                } else {
                    // ponytail: don't claim saved if sync failed
                    setSyncStatus('failed');
                }
            } catch  {
                setSyncStatus('failed');
            }
            setIsSyncing(false);
        }, 10000);
        return ()=>{
            if (syncRef.current) clearInterval(syncRef.current);
            window.removeEventListener('online', handleOnline);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        isLoading,
        user?.id_siswa
    ]);
    if (isLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen flex items-center justify-center bg-background font-body-student",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col items-center gap-lg",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "material-symbols-outlined text-primary text-[48px] animate-spin",
                        children: "progress_activity"
                    }, void 0, false, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 313,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "font-headline-student text-on-surface",
                        children: "Memuat soal ujian..."
                    }, void 0, false, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 314,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/exam/page.tsx",
                lineNumber: 312,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/exam/page.tsx",
            lineNumber: 311,
            columnNumber: 7
        }, this);
    }
    if (loadError) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen flex items-center justify-center bg-background font-body-student p-lg",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "max-w-md text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "material-symbols-outlined text-error text-[48px]",
                        children: "error"
                    }, void 0, false, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 324,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "font-headline-student text-on-surface mt-md",
                        children: loadError
                    }, void 0, false, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 325,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>window.location.reload(),
                        className: "mt-xl px-xl py-sm bg-primary text-on-primary rounded-lg font-label-bold cursor-pointer",
                        children: "Refresh"
                    }, void 0, false, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 326,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/exam/page.tsx",
                lineNumber: 323,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/exam/page.tsx",
            lineNumber: 322,
            columnNumber: 7
        }, this);
    }
    if (!hasStarted) {
        const fsSupported = typeof document !== "undefined" && (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$examFocus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isFullscreenSupported"])(document, document.documentElement);
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen flex items-center justify-center bg-slate-100 font-body-student p-lg",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-xl text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "material-symbols-outlined text-[#2563EB] text-[48px]",
                        children: "fullscreen"
                    }, void 0, false, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 339,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "font-headline-student text-lg font-extrabold text-slate-800 mt-2",
                        children: "Siap mengerjakan ujian?"
                    }, void 0, false, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 340,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "font-body-student text-sm text-slate-500 leading-relaxed mt-2",
                        children: fsSupported ? "Setelah menekan “Mulai Ujian”, ujian akan dibuka dalam mode layar penuh agar kamu tetap fokus." : "Perangkat ini tidak mendukung mode layar penuh. Ujian tetap dapat dikerjakan seperti biasa."
                    }, void 0, false, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 341,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: "text-left text-xs text-slate-600 mt-4 space-y-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: "✓ Koneksi internet stabil"
                            }, void 0, false, {
                                fileName: "[project]/src/app/exam/page.tsx",
                                lineNumber: 347,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: "✓ Baterai cukup"
                            }, void 0, false, {
                                fileName: "[project]/src/app/exam/page.tsx",
                                lineNumber: 348,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: "✓ Tidak perlu membuka aplikasi/tab lain"
                            }, void 0, false, {
                                fileName: "[project]/src/app/exam/page.tsx",
                                lineNumber: 349,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 346,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[11px] text-slate-400 mt-4 leading-relaxed",
                        children: "Meninggalkan halaman ujian atau keluar dari layar penuh akan tercatat sebagai pelanggaran dan terlihat oleh pengawas."
                    }, void 0, false, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 351,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: handleStartExam,
                        className: "w-full mt-6 h-12 bg-[#2563EB] text-white rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer hover:opacity-95 transition-all",
                        children: "Mulai Ujian"
                    }, void 0, false, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 354,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/exam/page.tsx",
                lineNumber: 338,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/exam/page.tsx",
            lineNumber: 337,
            columnNumber: 7
        }, this);
    }
    const currentQuestion = questions[currentQuestionIndex];
    const renderKind = currentQuestion ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$questionRender$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["questionRenderKind"])(currentQuestion) : "UNSUPPORTED";
    const answeredCount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$answerSemantics$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["countAnswered"])(answers);
    const totalQuestions = questions.length;
    const isTimeWarning = timeRemaining <= 300;
    const handleSelectAnswer = (questionId, opt, isComplex)=>{
        const upper = opt.toUpperCase();
        if (isComplex) {
            const current = answers[questionId] || [];
            const updated = current.includes(upper) ? current.filter((o)=>o !== upper) : [
                ...current,
                upper
            ];
            setAnswer(questionId, updated);
        } else {
            setAnswer(questionId, upper);
        }
    };
    // Tanpa truthiness: bentuk jawaban yang menentukan, bukan "kosong berarti false".
    const isOptionSelected = (questionId, opt)=>{
        const ans = answers[questionId];
        const upper = opt.toUpperCase();
        return Array.isArray(ans) ? ans.includes(upper) : ans === upper;
    };
    const handleTrueFalseAnswer = (questionId, statementId, value)=>{
        const current = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$examStore$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useExamStore"].getState().answers[questionId];
        setAnswer(questionId, (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$trueFalse$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["updateTrueFalseAnswer"])(current, statementId, value));
    };
    // Pasangan disimpan sebagai id kiri → id kanan; pilihan lain tidak tersentuh
    // sehingga jawaban parsial tetap utuh sampai autosave berikutnya.
    const handleMatchingAnswer = (questionId, leftId, rightId)=>{
        const current = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$examStore$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useExamStore"].getState().answers[questionId];
        setAnswer(questionId, (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$matching$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["updateMatchingAnswer"])(current, leftId, rightId));
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bg-slate-100 font-body-student text-slate-800 min-h-screen flex flex-col",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "sticky top-0 z-50 flex flex-col flex-shrink-0 shadow-md",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-[#0f172a] h-[72px] px-6 flex justify-between items-center border-b border-slate-800",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "material-symbols-outlined text-sky-400 text-3xl",
                                        children: "school"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/exam/page.tsx",
                                        lineNumber: 411,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-extrabold text-xl tracking-wider text-white",
                                        children: [
                                            "CBT",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-sky-400",
                                                children: "SEKOLAH"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/exam/page.tsx",
                                                lineNumber: 413,
                                                columnNumber: 18
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/exam/page.tsx",
                                        lineNumber: 412,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/exam/page.tsx",
                                lineNumber: 410,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-col text-center",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1",
                                        children: "MATA PELAJARAN"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/exam/page.tsx",
                                        lineNumber: 419,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-white font-extrabold text-sm tracking-wide",
                                        children: [
                                            subjectName || examName,
                                            " – KELAS ",
                                            user?.kelas || "X"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/exam/page.tsx",
                                        lineNumber: 422,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/exam/page.tsx",
                                lineNumber: 418,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-3 px-4 py-2 rounded-xl border border-slate-800 bg-slate-900/60 shadow-inner",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-col items-end",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-none mb-1",
                                                children: "SISA WAKTU"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/exam/page.tsx",
                                                lineNumber: 430,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: `text-2xl font-black leading-none tracking-wider font-mono ${isTimeWarning ? "text-red-400 animate-pulse" : "text-white"}`,
                                                children: formatTime(timeRemaining)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/exam/page.tsx",
                                                lineNumber: 433,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/exam/page.tsx",
                                        lineNumber: 429,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "material-symbols-outlined text-sky-400 text-2xl",
                                        children: "schedule"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/exam/page.tsx",
                                        lineNumber: 437,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/exam/page.tsx",
                                lineNumber: 428,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800",
                                title: displayStatus === 'saved' ? 'Jawaban tersimpan' : displayStatus === 'saving' ? 'Menyimpan...' : displayStatus === 'failed' ? 'Gagal menyimpan' : displayStatus === 'offline' ? 'Offline' : 'Menunggu',
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: `w-2 h-2 rounded-full ${displayStatus === 'saved' ? 'bg-emerald-400' : displayStatus === 'saving' ? 'bg-amber-400 animate-pulse' : displayStatus === 'failed' ? 'bg-red-400' : displayStatus === 'offline' ? 'bg-slate-500' : 'bg-slate-600'}`
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/exam/page.tsx",
                                        lineNumber: 447,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: `text-[9px] font-bold uppercase tracking-wider ${displayStatus === 'saved' ? 'text-emerald-400' : displayStatus === 'saving' ? 'text-amber-400' : displayStatus === 'failed' ? 'text-red-400' : displayStatus === 'offline' ? 'text-slate-500' : 'text-slate-500'}`,
                                        children: displayStatus === 'saved' ? 'Tersimpan' : displayStatus === 'saving' ? 'Menyimpan...' : displayStatus === 'failed' ? 'Gagal' : displayStatus === 'offline' ? 'Offline' : '—'
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/exam/page.tsx",
                                        lineNumber: 453,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/exam/page.tsx",
                                lineNumber: 441,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 408,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-[#1e293b] h-[56px] px-6 flex justify-between items-center border-b border-slate-700",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-1.5 text-slate-400",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "material-symbols-outlined text-sm",
                                                children: "format_size"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/exam/page.tsx",
                                                lineNumber: 472,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[10px] font-extrabold uppercase tracking-widest",
                                                children: "T FONT SIZE"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/exam/page.tsx",
                                                lineNumber: 473,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/exam/page.tsx",
                                        lineNumber: 471,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-1.5",
                                        children: [
                                            'sm',
                                            'base',
                                            'lg'
                                        ].map((sz)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setFontSize(sz),
                                                className: `w-8 h-8 rounded-lg border text-xs font-bold transition-all cursor-pointer ${fontSize === sz ? "bg-[#2563EB] border-[#2563EB] text-white shadow-sm" : "border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white"}`,
                                                children: sz === 'sm' ? "A" : sz === 'base' ? "A+" : "A++"
                                            }, sz, false, {
                                                fileName: "[project]/src/app/exam/page.tsx",
                                                lineNumber: 477,
                                                columnNumber: 17
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/exam/page.tsx",
                                        lineNumber: 475,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/exam/page.tsx",
                                lineNumber: 470,
                                columnNumber: 11
                            }, this),
                            violations > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-red-600 text-white rounded-lg px-4 py-1.5 flex items-center gap-3 shadow-md border border-red-500 max-w-md animate-pulse",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "material-symbols-outlined text-white text-[20px]",
                                        style: {
                                            fontVariationSettings: "'FILL' 1"
                                        },
                                        children: "warning"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/exam/page.tsx",
                                        lineNumber: 495,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-col",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-xs font-extrabold uppercase tracking-wider leading-none",
                                                children: [
                                                    "PELANGGARAN TERDETEKSI!! (",
                                                    violations,
                                                    "/",
                                                    maxViolations,
                                                    ")"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/exam/page.tsx",
                                                lineNumber: 497,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[10px] text-red-100 mt-0.5 font-medium",
                                                children: [
                                                    "Sisa ",
                                                    maxViolations - violations,
                                                    " peringatan sebelum ujian ditangguhkan."
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/exam/page.tsx",
                                                lineNumber: 498,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/exam/page.tsx",
                                        lineNumber: 496,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/exam/page.tsx",
                                lineNumber: 494,
                                columnNumber: 13
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex-1"
                            }, void 0, false, {
                                fileName: "[project]/src/app/exam/page.tsx",
                                lineNumber: 502,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-col text-right",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-none mb-1",
                                                children: "IDENTITAS PESERTA"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/exam/page.tsx",
                                                lineNumber: 508,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-sky-400 font-extrabold text-xs uppercase",
                                                children: user?.nama_lengkap || user?.username
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/exam/page.tsx",
                                                lineNumber: 509,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/exam/page.tsx",
                                        lineNumber: 507,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-black text-sm shadow-sm border border-slate-700",
                                        children: (user?.nama_lengkap || user?.username || "P").slice(0, 1).toUpperCase()
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/exam/page.tsx",
                                        lineNumber: 511,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/exam/page.tsx",
                                lineNumber: 506,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 468,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/exam/page.tsx",
                lineNumber: 406,
                columnNumber: 7
            }, this),
            violationToast && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-red-50 text-red-700 border border-red-200 px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-bounce",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "material-symbols-outlined text-red-500",
                        children: "warning"
                    }, void 0, false, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 521,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "font-bold text-xs uppercase tracking-wide",
                        children: violationToast
                    }, void 0, false, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 522,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/exam/page.tsx",
                lineNumber: 520,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-1 relative min-h-0",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 overflow-y-auto p-8 pb-32 bg-white",
                        children: currentQuestion && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "max-w-3xl mx-auto",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-4 border-b border-slate-100 pb-4 mb-6",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "w-10 h-10 rounded-full bg-[#2563EB] text-white font-extrabold text-sm flex items-center justify-center shadow-md shadow-blue-500/10",
                                            children: currentQuestion.nomor_urut
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/exam/page.tsx",
                                            lineNumber: 534,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-slate-400 font-extrabold text-xs uppercase tracking-widest",
                                            children: "PERTANYAAN"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/exam/page.tsx",
                                            lineNumber: 537,
                                            columnNumber: 17
                                        }, this),
                                        currentQuestion.tipe === "COMPLEX" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "ml-auto font-extrabold text-[10px] uppercase tracking-wider bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-200",
                                            children: "PILIHAN GANDA KOMPLEKS (LEBIH DARI SATU)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/exam/page.tsx",
                                            lineNumber: 541,
                                            columnNumber: 19
                                        }, this),
                                        currentQuestion.tipe === "TRUE_FALSE" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "ml-auto font-extrabold text-[10px] uppercase tracking-wider bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200",
                                            children: "BENAR / SALAH PER PERNYATAAN"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/exam/page.tsx",
                                            lineNumber: 546,
                                            columnNumber: 19
                                        }, this),
                                        currentQuestion.tipe === "FILL_IN" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "ml-auto font-extrabold text-[10px] uppercase tracking-wider bg-sky-50 text-sky-700 px-3 py-1 rounded-full border border-sky-200",
                                            children: "ISIAN SINGKAT"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/exam/page.tsx",
                                            lineNumber: 551,
                                            columnNumber: 19
                                        }, this),
                                        currentQuestion.tipe === "MATCHING" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "ml-auto font-extrabold text-[10px] uppercase tracking-wider bg-violet-50 text-violet-700 px-3 py-1 rounded-full border border-violet-200",
                                            children: "PASANGKAN SETIAP ITEM"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/exam/page.tsx",
                                            lineNumber: 556,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/exam/page.tsx",
                                    lineNumber: 533,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: `font-body-student text-slate-800 leading-relaxed my-6 font-medium ${fontSizeClass}`,
                                    dangerouslySetInnerHTML: {
                                        __html: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$questionSanitize$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sanitizeQuestionHtml"])(currentQuestion.pertanyaan)
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/src/app/exam/page.tsx",
                                    lineNumber: 563,
                                    columnNumber: 15
                                }, this),
                                currentQuestion.gambar_url && /* eslint-disable-next-line @next/next/no-img-element */ /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                    src: currentQuestion.gambar_url,
                                    alt: "Gambar soal",
                                    className: "max-h-60 rounded-lg object-contain border border-slate-200 bg-slate-50 mb-6",
                                    onError: (e)=>{
                                        const el = e.currentTarget;
                                        const idMatch = el.src.match(/[?&]id=([-\w]{25,})/);
                                        const idPath = el.src.match(/\/d\/([-\w]{25,})/);
                                        const fileId = idMatch?.[1] ?? idPath?.[1];
                                        if (fileId && !el.dataset.retried) {
                                            el.dataset.retried = "1";
                                            el.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
                                        }
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/src/app/exam/page.tsx",
                                    lineNumber: 571,
                                    columnNumber: 17
                                }, this),
                                renderKind === "MATCHING" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex flex-col gap-3",
                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$questionRender$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["matchingColumns"])(currentQuestion).kiri.map((item)=>{
                                        const current = answers[currentQuestion.id_soal];
                                        const selected = current !== null && typeof current === "object" && !Array.isArray(current) ? current[item.id] ?? "" : "";
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex flex-col sm:flex-row sm:items-center gap-3 border border-slate-200 rounded-xl p-4 bg-slate-50/50",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-start gap-3 flex-1 min-w-0",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0",
                                                            children: item.id
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/exam/page.tsx",
                                                            lineNumber: 603,
                                                            columnNumber: 27
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: `text-slate-700 font-medium leading-relaxed ${fontSizeClass}`,
                                                            dangerouslySetInnerHTML: {
                                                                __html: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$questionSanitize$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sanitizeQuestionHtml"])(item.teks)
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/exam/page.tsx",
                                                            lineNumber: 606,
                                                            columnNumber: 27
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/exam/page.tsx",
                                                    lineNumber: 602,
                                                    columnNumber: 25
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                    value: selected,
                                                    onChange: (e)=>handleMatchingAnswer(currentQuestion.id_soal, item.id, e.target.value),
                                                    className: `w-full sm:w-64 shrink-0 border-2 rounded-xl px-3 py-2.5 font-medium bg-white outline-none cursor-pointer transition-colors ${fontSizeClass} ${selected ? "border-[#2563EB] text-slate-800" : "border-slate-300 text-slate-500"}`,
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "",
                                                            children: "Pilih pasangan"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/exam/page.tsx",
                                                            lineNumber: 618,
                                                            columnNumber: 27
                                                        }, this),
                                                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$questionRender$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["matchingColumns"])(currentQuestion).kanan.map((right)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: right.id,
                                                                children: [
                                                                    right.id,
                                                                    ". ",
                                                                    right.teks.replace(/<[^>]*>/g, "")
                                                                ]
                                                            }, right.id, true, {
                                                                fileName: "[project]/src/app/exam/page.tsx",
                                                                lineNumber: 620,
                                                                columnNumber: 29
                                                            }, this))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/exam/page.tsx",
                                                    lineNumber: 611,
                                                    columnNumber: 25
                                                }, this)
                                            ]
                                        }, item.id, true, {
                                            fileName: "[project]/src/app/exam/page.tsx",
                                            lineNumber: 598,
                                            columnNumber: 23
                                        }, this);
                                    })
                                }, void 0, false, {
                                    fileName: "[project]/src/app/exam/page.tsx",
                                    lineNumber: 591,
                                    columnNumber: 17
                                }, this) : renderKind === "FILL_IN" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex flex-col gap-4",
                                    children: [
                                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$questionRender$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fillInPetunjuk"])(currentQuestion) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: `text-slate-600 font-medium leading-relaxed border-l-4 border-sky-300 bg-sky-50/60 rounded-r-xl px-4 py-3 ${fontSizeClass}`,
                                            dangerouslySetInnerHTML: {
                                                __html: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$questionSanitize$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sanitizeQuestionHtml"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$questionRender$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fillInPetunjuk"])(currentQuestion) ?? "")
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/exam/page.tsx",
                                            lineNumber: 632,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: typeof answers[currentQuestion.id_soal] === "string" ? answers[currentQuestion.id_soal] : "",
                                            onChange: (e)=>setAnswer(currentQuestion.id_soal, e.target.value),
                                            placeholder: "Tulis jawabanmu di sini",
                                            autoComplete: "off",
                                            className: `w-full border-2 border-slate-300 focus:border-[#2563EB] rounded-xl px-4 py-3 text-slate-800 font-medium outline-none transition-colors ${fontSizeClass}`
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/exam/page.tsx",
                                            lineNumber: 637,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/exam/page.tsx",
                                    lineNumber: 630,
                                    columnNumber: 17
                                }, this) : renderKind === "TRUE_FALSE" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex flex-col gap-4",
                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$questionRender$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["trueFalseStatements"])(currentQuestion).map((statement, index)=>{
                                        const current = answers[currentQuestion.id_soal];
                                        const selected = current !== null && typeof current === "object" && !Array.isArray(current) ? current[statement.id] : undefined;
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "border border-slate-200 rounded-xl p-4 bg-slate-50/50",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-start gap-3 mb-3",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0",
                                                            children: index + 1
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/exam/page.tsx",
                                                            lineNumber: 658,
                                                            columnNumber: 27
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: `text-slate-700 font-medium leading-relaxed ${fontSizeClass}`,
                                                            dangerouslySetInnerHTML: {
                                                                __html: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$questionSanitize$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sanitizeQuestionHtml"])(statement.teks)
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/exam/page.tsx",
                                                            lineNumber: 661,
                                                            columnNumber: 27
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/exam/page.tsx",
                                                    lineNumber: 657,
                                                    columnNumber: 25
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "grid grid-cols-2 gap-3",
                                                    children: [
                                                        "BENAR",
                                                        "SALAH"
                                                    ].map((value)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            onClick: ()=>handleTrueFalseAnswer(currentQuestion.id_soal, statement.id, value),
                                                            className: `py-3 rounded-xl border-2 font-bold text-sm cursor-pointer transition-all ${selected === value ? "border-[#2563EB] bg-[#2563EB] text-white shadow-sm" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"}`,
                                                            children: value
                                                        }, value, false, {
                                                            fileName: "[project]/src/app/exam/page.tsx",
                                                            lineNumber: 668,
                                                            columnNumber: 29
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/exam/page.tsx",
                                                    lineNumber: 666,
                                                    columnNumber: 25
                                                }, this)
                                            ]
                                        }, statement.id, true, {
                                            fileName: "[project]/src/app/exam/page.tsx",
                                            lineNumber: 656,
                                            columnNumber: 23
                                        }, this);
                                    })
                                }, void 0, false, {
                                    fileName: "[project]/src/app/exam/page.tsx",
                                    lineNumber: 649,
                                    columnNumber: 17
                                }, this) : renderKind === "CHOICE" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex flex-col gap-3",
                                    children: OPTIONS.map((opt)=>{
                                        const label = getOptionText(opt, currentQuestion);
                                        if (!label) return null;
                                        const selected = isOptionSelected(currentQuestion.id_soal, opt);
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>handleSelectAnswer(currentQuestion.id_soal, opt, currentQuestion.tipe === "COMPLEX"),
                                            className: `flex items-start gap-4 border rounded-xl p-4 cursor-pointer text-left transition-all ${selected ? "border-[#2563EB] bg-blue-50/50 shadow-sm" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"}`,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: `w-9 h-9 rounded-lg border-2 flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${selected ? "bg-[#2563EB] border-[#2563EB] text-white shadow-sm" : "bg-white border-slate-300 text-slate-500"}`,
                                                    children: opt.toUpperCase()
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/exam/page.tsx",
                                                    lineNumber: 701,
                                                    columnNumber: 25
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: `text-slate-700 font-medium leading-relaxed self-center ${fontSizeClass}`,
                                                    children: label
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/exam/page.tsx",
                                                    lineNumber: 708,
                                                    columnNumber: 25
                                                }, this)
                                            ]
                                        }, opt, true, {
                                            fileName: "[project]/src/app/exam/page.tsx",
                                            lineNumber: 692,
                                            columnNumber: 23
                                        }, this);
                                    })
                                }, void 0, false, {
                                    fileName: "[project]/src/app/exam/page.tsx",
                                    lineNumber: 686,
                                    columnNumber: 17
                                }, this) : // Tipe tidak dikenal atau data soal rusak: jangan tawarkan UI jawaban
                                // yang salah bentuk. Soal lain tetap dapat dikerjakan.
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "border-2 border-dashed border-amber-300 bg-amber-50/70 rounded-xl p-5 text-amber-800",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "font-bold text-sm mb-1",
                                            children: "Soal ini belum dapat ditampilkan."
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/exam/page.tsx",
                                            lineNumber: 719,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs font-medium",
                                            children: "Lewati soal ini dan laporkan ke pengawas ujian. Jawaban soal lain tetap tersimpan."
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/exam/page.tsx",
                                            lineNumber: 720,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/exam/page.tsx",
                                    lineNumber: 718,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/exam/page.tsx",
                            lineNumber: 531,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 529,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "w-[288px] shrink-0 bg-slate-50 border-l border-slate-200 flex flex-col h-[calc(100vh-128px)] sticky top-[128px] overflow-hidden",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-slate-800 text-white px-4 py-3 flex justify-between items-center h-12 flex-shrink-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[10px] font-extrabold uppercase tracking-wider",
                                        children: "NAVIGASI SOAL"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/exam/page.tsx",
                                        lineNumber: 733,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "bg-[#2563EB] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                                        children: [
                                            questions.length,
                                            " SOAL"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/exam/page.tsx",
                                        lineNumber: 734,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/exam/page.tsx",
                                lineNumber: 732,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "p-4 overflow-y-auto flex-grow min-h-0",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-5 gap-2",
                                    children: questions.map((q, idx)=>{
                                        const isCurrent = idx === currentQuestionIndex;
                                        const answered = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$answerSemantics$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isAnswered"])(answers[q.id_soal]);
                                        const isRaguragu = raguraguSet.has(q.id_soal);
                                        let btnClass = "";
                                        if (isCurrent) {
                                            btnClass = "border-2 border-[#2563EB] text-[#2563EB] bg-white ring-2 ring-blue-500/10";
                                        } else if (isRaguragu) {
                                            btnClass = "bg-orange-400 text-white shadow-sm shadow-orange-400/20";
                                        } else if (answered) {
                                            btnClass = "bg-blue-600 text-white shadow-sm shadow-blue-500/20";
                                        } else {
                                            btnClass = "bg-white border border-slate-300 text-slate-500 hover:bg-slate-50";
                                        }
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>setCurrentQuestionIndex(idx),
                                            className: `w-full aspect-square rounded-lg text-xs font-extrabold flex items-center justify-center cursor-pointer transition-all ${btnClass}`,
                                            children: q.nomor_urut
                                        }, q.id_soal, false, {
                                            fileName: "[project]/src/app/exam/page.tsx",
                                            lineNumber: 759,
                                            columnNumber: 19
                                        }, this);
                                    })
                                }, void 0, false, {
                                    fileName: "[project]/src/app/exam/page.tsx",
                                    lineNumber: 741,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/exam/page.tsx",
                                lineNumber: 740,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "p-4 border-t border-slate-200 bg-slate-50/50 flex-shrink-0",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-1.5",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "w-3 h-3 rounded bg-blue-600 shrink-0"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/exam/page.tsx",
                                                    lineNumber: 775,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Terjawab"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/exam/page.tsx",
                                                    lineNumber: 776,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/exam/page.tsx",
                                            lineNumber: 774,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-1.5",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "w-3 h-3 rounded bg-orange-400 shrink-0"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/exam/page.tsx",
                                                    lineNumber: 779,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Ragu-ragu"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/exam/page.tsx",
                                                    lineNumber: 780,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/exam/page.tsx",
                                            lineNumber: 778,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-1.5",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "w-3 h-3 rounded border border-slate-300 bg-white shrink-0"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/exam/page.tsx",
                                                    lineNumber: 783,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Kosong"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/exam/page.tsx",
                                                    lineNumber: 784,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/exam/page.tsx",
                                            lineNumber: 782,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-1.5",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "w-3 h-3 rounded border-2 border-[#2563EB] bg-white shrink-0"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/exam/page.tsx",
                                                    lineNumber: 787,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Sekarang"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/exam/page.tsx",
                                                    lineNumber: 788,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/exam/page.tsx",
                                            lineNumber: 786,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/exam/page.tsx",
                                    lineNumber: 773,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/exam/page.tsx",
                                lineNumber: 772,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "px-4 py-3 border-t border-slate-200 bg-slate-50 flex-shrink-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-between",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[10px] uppercase text-slate-400 font-extrabold tracking-wider",
                                                children: "PROGRESS JAWABAN"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/exam/page.tsx",
                                                lineNumber: 796,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "font-bold text-slate-800 text-sm",
                                                children: [
                                                    answeredCount,
                                                    "/",
                                                    questions.length
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/exam/page.tsx",
                                                lineNumber: 797,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/exam/page.tsx",
                                        lineNumber: 795,
                                        columnNumber: 13
                                    }, this),
                                    questions.length - answeredCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-amber-600 text-[10px] font-bold mt-1.5 flex items-center gap-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "material-symbols-outlined text-xs",
                                                children: "warning"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/exam/page.tsx",
                                                lineNumber: 801,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: [
                                                    "Sisa ",
                                                    questions.length - answeredCount,
                                                    " soal belum dijawab"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/exam/page.tsx",
                                                lineNumber: 802,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/exam/page.tsx",
                                        lineNumber: 800,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/exam/page.tsx",
                                lineNumber: 794,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "p-4 border-t border-slate-200 bg-slate-50 flex-shrink-0",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setShowSubmitConfirm(true),
                                    disabled: isSubmitting,
                                    className: "w-full bg-[#10b981] hover:bg-emerald-600 disabled:opacity-60 text-white font-extrabold rounded-xl h-12 uppercase tracking-wider cursor-pointer transition-all text-xs",
                                    children: "SELESAI UJIAN"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/exam/page.tsx",
                                    lineNumber: 809,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/exam/page.tsx",
                                lineNumber: 808,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 730,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/exam/page.tsx",
                lineNumber: 527,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed bottom-0 left-0 right-[288px] h-20 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between z-40",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: prevQuestion,
                        disabled: currentQuestionIndex === 0,
                        className: "border border-slate-300 text-slate-600 rounded-xl px-6 h-11 font-bold text-xs uppercase hover:bg-slate-50 transition-all disabled:opacity-40 flex items-center gap-2 cursor-pointer",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "material-symbols-outlined text-[16px]",
                                children: "chevron_left"
                            }, void 0, false, {
                                fileName: "[project]/src/app/exam/page.tsx",
                                lineNumber: 828,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Sebelumnya"
                            }, void 0, false, {
                                fileName: "[project]/src/app/exam/page.tsx",
                                lineNumber: 829,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 823,
                        columnNumber: 9
                    }, this),
                    currentQuestion && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>toggleRaguragu(currentQuestion.id_soal),
                        className: `rounded-xl px-6 h-11 font-extrabold text-xs uppercase transition-all flex items-center gap-2 cursor-pointer border ${raguraguSet.has(currentQuestion.id_soal) ? "bg-orange-100 border-orange-400 text-orange-600 shadow-sm" : "border-orange-300 text-orange-500 hover:bg-orange-50/50"}`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "material-symbols-outlined text-[16px]",
                                style: {
                                    fontVariationSettings: raguraguSet.has(currentQuestion.id_soal) ? "'FILL' 1" : undefined
                                },
                                children: "help_outline"
                            }, void 0, false, {
                                fileName: "[project]/src/app/exam/page.tsx",
                                lineNumber: 842,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Ragu-Ragu"
                            }, void 0, false, {
                                fileName: "[project]/src/app/exam/page.tsx",
                                lineNumber: 843,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 834,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: nextQuestion,
                        disabled: currentQuestionIndex === totalQuestions - 1,
                        className: "bg-[#2563EB] text-white rounded-xl px-6 h-11 font-bold text-xs uppercase hover:opacity-95 transition-all disabled:opacity-40 flex items-center gap-2 cursor-pointer",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Berikutnya"
                            }, void 0, false, {
                                fileName: "[project]/src/app/exam/page.tsx",
                                lineNumber: 853,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "material-symbols-outlined text-[16px]",
                                children: "chevron_right"
                            }, void 0, false, {
                                fileName: "[project]/src/app/exam/page.tsx",
                                lineNumber: 854,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 848,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/exam/page.tsx",
                lineNumber: 821,
                columnNumber: 7
            }, this),
            fullscreenGranted && !isFullscreenOn && !isSubmitting && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed bottom-24 left-1/2 -translate-x-1/2 z-[90] bg-white border border-amber-300 shadow-lg rounded-xl px-5 py-3 flex items-center gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "material-symbols-outlined text-amber-500",
                        children: "warning"
                    }, void 0, false, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 861,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "font-body-student text-xs text-slate-600",
                        children: "Mode layar penuh telah ditutup."
                    }, void 0, false, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 862,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: handleReenterFullscreen,
                        className: "bg-[#2563EB] text-white rounded-lg px-4 h-9 font-bold text-[11px] uppercase tracking-wider cursor-pointer hover:opacity-95",
                        children: "Kembali ke Layar Penuh"
                    }, void 0, false, {
                        fileName: "[project]/src/app/exam/page.tsx",
                        lineNumber: 863,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/exam/page.tsx",
                lineNumber: 860,
                columnNumber: 9
            }, this),
            showSubmitConfirm && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 bg-[#0f172a]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-lg",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white rounded-2xl p-xl max-w-sm w-full shadow-2xl border border-slate-200",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            className: "font-headline-student text-lg font-extrabold text-slate-800 mb-2",
                            children: "Kumpulkan Ujian?"
                        }, void 0, false, {
                            fileName: "[project]/src/app/exam/page.tsx",
                            lineNumber: 876,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "font-body-student text-xs text-slate-500 leading-relaxed mb-6",
                            children: [
                                questions.length - answeredCount > 0 ? `Masih ada ${questions.length - answeredCount} soal belum dijawab. ` : "Semua soal sudah dijawab dengan lengkap. ",
                                "Aksi ini bersifat final dan tidak bisa dibatalkan."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/exam/page.tsx",
                            lineNumber: 877,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex gap-md",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setShowSubmitConfirm(false),
                                    className: "flex-grow h-12 border border-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-all cursor-pointer",
                                    children: "Batal"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/exam/page.tsx",
                                    lineNumber: 884,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>{
                                        setShowSubmitConfirm(false);
                                        doSubmit(false);
                                    },
                                    disabled: isSubmitting,
                                    className: "flex-grow h-12 bg-[#10b981] hover:bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-60",
                                    children: "Ya, Kumpulkan"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/exam/page.tsx",
                                    lineNumber: 890,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/exam/page.tsx",
                            lineNumber: 883,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/exam/page.tsx",
                    lineNumber: 875,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/exam/page.tsx",
                lineNumber: 874,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/exam/page.tsx",
        lineNumber: 404,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=src_10y.mm0._.js.map