(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/hooks/useTenantRouter.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useTenantPath",
    ()=>useTenantPath,
    "useTenantRouter",
    ()=>useTenantRouter
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
function getTenantPrefix(pathname) {
    const match = pathname.match(/^\/s\/([^/]+)/);
    return match ? `/s/${match[1]}` : '';
}
function useTenantRouter() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
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
_s(useTenantRouter, "gA9e4WsoP6a20xDgQgrFkfMP8lc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"]
    ];
});
function useTenantPath() {
    _s1();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const prefix = getTenantPrefix(pathname);
    return (path)=>`${prefix}${path}`;
}
_s1(useTenantPath, "xbyQPtUVMO7MNj7WjJlpdWqRcTo=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/timeouts.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/api.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$timeouts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/timeouts.ts [app-client] (ecmascript)");
;
// Resolve proxy URL: tenant-aware when inside /s/[schoolId]/, fallback to single-tenant
function getApiUrl() {
    if ("TURBOPACK compile-time truthy", 1) {
        const match = window.location.pathname.match(/^\/s\/([^/]+)/);
        if (match) return `/api/${match[1]}/proxy`;
    }
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
        const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$timeouts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetchWithTimeout"])(url, options, (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$timeouts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clientTimeoutMs"])(action));
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
        if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$timeouts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RequestTimeoutError"]) {
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
    if ("TURBOPACK compile-time truthy", 1) {
        const match = window.location.pathname.match(/^\/s\/([^/]+)/);
        if (match) return `/api/${match[1]}/ai-analysis`;
    }
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/admin/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AdminDashboard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useTenantRouter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/useTenantRouter.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/swr/dist/index/index.mjs [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
function StatusBadge({ status }) {
    const map = {
        SELESAI: "bg-emerald-50 text-emerald-800 border border-emerald-300/60 font-bold",
        SEDANG: "bg-blue-50 text-blue-800 border border-blue-300/60 font-bold",
        DISKUALIFIKASI: "bg-rose-50 text-rose-800 border border-rose-300/60 font-bold",
        BELUM: "bg-slate-100 text-slate-700 border border-slate-300/60 font-semibold"
    };
    const label = {
        SELESAI: "Selesai",
        SEDANG: "Sedang Ujian",
        DISKUALIFIKASI: "Diskualifikasi",
        BELUM: "Belum Mulai"
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs shadow-2xs ${map[status]}`,
        children: [
            status === "SEDANG" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "w-2 h-2 bg-blue-700 rounded-full animate-ping"
            }, void 0, false, {
                fileName: "[project]/src/app/admin/page.tsx",
                lineNumber: 26,
                columnNumber: 31
            }, this),
            status === "SELESAI" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "w-2 h-2 bg-emerald-600 rounded-full"
            }, void 0, false, {
                fileName: "[project]/src/app/admin/page.tsx",
                lineNumber: 27,
                columnNumber: 32
            }, this),
            status === "DISKUALIFIKASI" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "material-symbols-outlined text-[14px]",
                children: "warning"
            }, void 0, false, {
                fileName: "[project]/src/app/admin/page.tsx",
                lineNumber: 28,
                columnNumber: 39
            }, this),
            label[status]
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/admin/page.tsx",
        lineNumber: 25,
        columnNumber: 5
    }, this);
}
_c = StatusBadge;
function AdminDashboard() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useTenantRouter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTenantRouter"])();
    const tenantPath = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useTenantRouter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTenantPath"])();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const isLinkActive = (path)=>{
        if (path === "/admin") {
            return pathname.endsWith("/admin") || pathname.endsWith("/admin/");
        }
        return pathname.includes(path);
    };
    const [isSidebarOpen, setIsSidebarOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [search, setSearch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [filterClass, setFilterClass] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("All Classes");
    const [isTogglingStatus, setIsTogglingStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [resettingId, setResettingId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Draft "Adakan Ujian". null = belum disentuh guru, jadi ikut nilai tersimpan.
    const [draft, setDraft] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [showConfirm, setShowConfirm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [examError, setExamError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [notice, setNotice] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    // Admin auth guard
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AdminDashboard.useEffect": ()=>{
            if (sessionStorage.getItem("admin_auth") !== "true") {
                router.replace("/admin/login");
            }
        }
    }["AdminDashboard.useEffect"], [
        router
    ]);
    const { data: usersRes, mutate: mutateUsers, isLoading: usersLoading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])("getUsers", __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getUsers"], {
        refreshInterval: 5000
    });
    const { data: summaryRes, mutate: mutateSummary } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])("getExamSummary", __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getExamSummary"], {
        refreshInterval: 10000
    });
    const { data: mapelRes } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])("getMataPelajaran", __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMataPelajaran"]);
    const users = usersRes?.data ?? [];
    const summary = summaryRes?.data;
    const mapelList = mapelRes?.data ?? [];
    // Derive directly from SWR data
    const examName = summary?.exam_name || "Dashboard Monitoring";
    const examOpen = summary?.exam_status === "OPEN";
    const form = draft ?? {
        exam_name: summary?.exam_name ?? "",
        exam_mapel: summary?.exam_mapel ?? "",
        exam_duration: String(summary?.exam_duration ?? 90),
        exam_kumpulan: summary?.exam_kumpulan ?? []
    };
    const mapelName = (id)=>mapelList.find((m)=>m.id_mapel === id)?.nama_mapel ?? id;
    // Kumpulan soal aktif yang boleh dipakai pada mapel yang sedang dipilih.
    const kumpulanPilihan = (summary?.collections ?? []).filter((c)=>c.status === "AKTIF" && c.jumlah_soal > 0 && (!c.id_mapel || c.id_mapel === form.exam_mapel));
    const kumpulanTerpilih = form.exam_kumpulan.filter((id)=>kumpulanPilihan.some((c)=>c.id_kumpulan === id));
    // Jumlah soal aktif untuk mapel yang sedang dipilih di form, bukan yang tersimpan.
    // Tanpa kumpulan terpilih, ujian memakai seluruh kumpulan aktif pada mapel itu.
    const draftQuestionCount = !form.exam_mapel ? 0 : kumpulanTerpilih.length > 0 ? kumpulanPilihan.filter((c)=>kumpulanTerpilih.includes(c.id_kumpulan)).reduce((total, c)=>total + c.jumlah_soal, 0) : summary?.question_counts?.[form.exam_mapel] ?? 0;
    const toggleKumpulan = (id)=>{
        setExamError("");
        const next = form.exam_kumpulan.includes(id) ? form.exam_kumpulan.filter((item)=>item !== id) : [
            ...form.exam_kumpulan,
            id
        ];
        setDraft({
            ...form,
            exam_kumpulan: next
        });
    };
    const durationNumber = Number(form.exam_duration);
    const setField = (field, value)=>{
        setExamError("");
        // Ganti mapel = pilihan kumpulan lama tidak lagi relevan.
        const resetKumpulan = field === "exam_mapel" ? {
            exam_kumpulan: []
        } : {};
        setDraft({
            ...form,
            [field]: value,
            ...resetKumpulan
        });
    };
    // Penjaga yang sama juga berlaku di server; ini hanya supaya guru tahu lebih awal.
    const blockingReason = ()=>{
        if (!form.exam_name.trim()) return "Nama ujian wajib diisi.";
        if (!form.exam_mapel) return "Pilih mata pelajaran yang akan diujikan.";
        if (!Number.isInteger(durationNumber) || durationNumber < 1 || durationNumber > 600) {
            return "Durasi ujian harus berupa angka antara 1 dan 600 menit.";
        }
        if (draftQuestionCount === 0) {
            return kumpulanTerpilih.length > 0 ? "Kumpulan soal yang dipilih belum berisi soal. Pilih kumpulan lain atau tambahkan soal dulu." : `Belum ada soal aktif untuk mata pelajaran ${mapelName(form.exam_mapel)}. Tambahkan soal di Bank Soal terlebih dahulu.`;
        }
        return "";
    };
    const handleReviewOpen = ()=>{
        const reason = blockingReason();
        if (reason) {
            setExamError(reason);
            return;
        }
        setExamError("");
        setShowConfirm(true);
    };
    const handleOpenExam = async ()=>{
        setIsTogglingStatus(true);
        setExamError("");
        const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveExamConfig"])({
            exam_name: form.exam_name.trim(),
            exam_mapel: form.exam_mapel,
            exam_duration: durationNumber,
            exam_status: "OPEN",
            exam_kumpulan: kumpulanTerpilih
        });
        if (res.success) {
            setShowConfirm(false);
            setDraft(null);
            setNotice("Ujian berhasil dibuka. Siswa sekarang dapat mulai mengerjakan.");
            await mutateSummary();
        } else {
            setExamError(res.message || "Gagal membuka ujian. Silakan coba lagi.");
        }
        setIsTogglingStatus(false);
    };
    const handleCloseExam = async ()=>{
        setIsTogglingStatus(true);
        setExamError("");
        const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setExamStatus"])("CLOSED");
        if (res.success) {
            setNotice("Ujian telah ditutup. Siswa baru tidak dapat memulai ujian. Data siswa yang sudah selesai tetap tersimpan.");
            await mutateSummary();
        } else {
            setExamError("Gagal menutup ujian. Silakan coba lagi.");
        }
        setIsTogglingStatus(false);
    };
    const classes = Array.from(new Set(users.map((u)=>u.kelas))).filter(Boolean);
    const filtered = users.filter((u)=>{
        const matchSearch = u.nama_lengkap.toLowerCase().includes(search.toLowerCase()) || u.id_siswa.toLowerCase().includes(search.toLowerCase());
        const matchClass = filterClass === "All Classes" || u.kelas === filterClass;
        return matchSearch && matchClass;
    });
    const stats = {
        total: users.length,
        sedang: users.filter((u)=>u.status_ujian === "SEDANG").length,
        selesai: users.filter((u)=>u.status_ujian === "SELESAI").length,
        diskualifikasi: users.filter((u)=>u.status_ujian === "DISKUALIFIKASI").length
    };
    const handleResetLogin = async (id_siswa)=>{
        setResettingId(id_siswa);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resetUserLogin"])(id_siswa);
        await mutateUsers();
        setResettingId(null);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bg-[#F7F9FC] text-slate-800 font-body-student min-h-screen flex",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-xs",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-8 h-8 rounded-lg bg-[#1D4ED8] text-white flex items-center justify-center font-bold",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "material-symbols-outlined text-xl",
                                    children: "school"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/admin/page.tsx",
                                    lineNumber: 201,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/admin/page.tsx",
                                lineNumber: 200,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-extrabold text-base tracking-wider text-slate-900",
                                children: [
                                    "CBT ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[#1D4ED8]",
                                        children: "ADMIN"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 203,
                                        columnNumber: 88
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/page.tsx",
                                lineNumber: 203,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/admin/page.tsx",
                        lineNumber: 199,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setIsSidebarOpen(!isSidebarOpen),
                        className: "p-1 text-slate-700 cursor-pointer focus:outline-none",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "material-symbols-outlined text-2xl",
                            children: isSidebarOpen ? "close" : "menu"
                        }, void 0, false, {
                            fileName: "[project]/src/app/admin/page.tsx",
                            lineNumber: 206,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/admin/page.tsx",
                        lineNumber: 205,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/admin/page.tsx",
                lineNumber: 198,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                className: `fixed left-0 top-0 h-full w-64 flex flex-col bg-[#FFFFFF] shadow-sm border-r border-slate-200/80 z-50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-6 flex justify-between items-center border-b border-slate-100",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        href: tenantPath("/"),
                                        className: "flex items-center gap-2.5 text-slate-900 hover:opacity-95 transition-opacity",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "w-9 h-9 rounded-xl bg-[#1D4ED8] text-white flex items-center justify-center shadow-md shadow-blue-700/20",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "material-symbols-outlined text-xl",
                                                    children: "school"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                    lineNumber: 216,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/page.tsx",
                                                lineNumber: 215,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                                className: "font-black text-lg tracking-wider text-slate-900",
                                                children: [
                                                    "CBT ",
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-[#1D4ED8]",
                                                        children: "ADMIN"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/page.tsx",
                                                        lineNumber: 218,
                                                        columnNumber: 84
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/admin/page.tsx",
                                                lineNumber: 218,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 214,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1",
                                        children: "Portal Pengawas Ujian"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 220,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/page.tsx",
                                lineNumber: 213,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setIsSidebarOpen(false),
                                className: "text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer",
                                title: "Sembunyikan Sidebar",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "material-symbols-outlined text-2xl",
                                    children: "menu_open"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/admin/page.tsx",
                                    lineNumber: 227,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/admin/page.tsx",
                                lineNumber: 222,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/admin/page.tsx",
                        lineNumber: 212,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                        className: "flex-grow px-4 space-y-1 mt-6 overflow-y-auto",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: tenantPath("/admin"),
                                onClick: ()=>setIsSidebarOpen(false),
                                className: `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isLinkActive("/admin") && !isLinkActive("/kelas") && !isLinkActive("/mata-pelajaran") && !isLinkActive("/management") && !isLinkActive("/questions") && !isLinkActive("/cetak") && !isLinkActive("/analisis") ? "bg-[#1D4ED8] text-white font-bold shadow-md shadow-blue-700/20" : "text-slate-600 hover:text-[#1D4ED8] hover:bg-blue-50/60 font-semibold"}`,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "material-symbols-outlined text-[20px]",
                                        children: "dashboard"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 242,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm",
                                        children: "Dashboard"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 243,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/page.tsx",
                                lineNumber: 233,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-[10px] uppercase tracking-widest text-slate-400 font-bold px-4 mb-1 mt-5",
                                children: "Master Data"
                            }, void 0, false, {
                                fileName: "[project]/src/app/admin/page.tsx",
                                lineNumber: 246,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: tenantPath("/admin/kelas"),
                                onClick: ()=>setIsSidebarOpen(false),
                                className: `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isLinkActive("/kelas") ? "bg-[#1D4ED8] text-white font-bold shadow-md shadow-blue-700/20" : "text-slate-600 hover:text-[#1D4ED8] hover:bg-blue-50/60 font-semibold"}`,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "material-symbols-outlined text-[20px]",
                                        children: "class"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 256,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm",
                                        children: "Data Kelas"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 257,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/page.tsx",
                                lineNumber: 247,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: tenantPath("/admin/mata-pelajaran"),
                                onClick: ()=>setIsSidebarOpen(false),
                                className: `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isLinkActive("/mata-pelajaran") ? "bg-[#1D4ED8] text-white font-bold shadow-md shadow-blue-700/20" : "text-slate-600 hover:text-[#1D4ED8] hover:bg-blue-50/60 font-semibold"}`,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "material-symbols-outlined text-[20px]",
                                        children: "book_2"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 268,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm",
                                        children: "Mata Pelajaran"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 269,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/page.tsx",
                                lineNumber: 259,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-[10px] uppercase tracking-widest text-slate-400 font-bold px-4 mb-1 mt-5",
                                children: "Administrasi"
                            }, void 0, false, {
                                fileName: "[project]/src/app/admin/page.tsx",
                                lineNumber: 272,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: tenantPath("/admin/management"),
                                onClick: ()=>setIsSidebarOpen(false),
                                className: `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isLinkActive("/management") ? "bg-[#1D4ED8] text-white font-bold shadow-md shadow-blue-700/20" : "text-slate-600 hover:text-[#1D4ED8] hover:bg-blue-50/60 font-semibold"}`,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "material-symbols-outlined text-[20px]",
                                        children: "group"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 282,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm",
                                        children: "Data Siswa"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 283,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/page.tsx",
                                lineNumber: 273,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: tenantPath("/admin/questions"),
                                onClick: ()=>setIsSidebarOpen(false),
                                className: `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isLinkActive("/questions") ? "bg-[#1D4ED8] text-white font-bold shadow-md shadow-blue-700/20" : "text-slate-600 hover:text-[#1D4ED8] hover:bg-blue-50/60 font-semibold"}`,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "material-symbols-outlined text-[20px]",
                                        children: "inventory_2"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 294,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm",
                                        children: "Bank Soal"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 295,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/page.tsx",
                                lineNumber: 285,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: tenantPath("/admin/cetak"),
                                onClick: ()=>setIsSidebarOpen(false),
                                className: `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isLinkActive("/cetak") ? "bg-[#1D4ED8] text-white font-bold shadow-md shadow-blue-700/20" : "text-slate-600 hover:text-[#1D4ED8] hover:bg-blue-50/60 font-semibold"}`,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "material-symbols-outlined text-[20px]",
                                        children: "print"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 306,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm",
                                        children: "Cetak"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 307,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/page.tsx",
                                lineNumber: 297,
                                columnNumber: 12
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: tenantPath("/admin/analisis"),
                                onClick: ()=>setIsSidebarOpen(false),
                                className: `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isLinkActive("/analisis") ? "bg-[#1D4ED8] text-white font-bold shadow-md shadow-blue-700/20" : "text-slate-600 hover:text-[#1D4ED8] hover:bg-blue-50/60 font-semibold"}`,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "material-symbols-outlined text-[20px]",
                                        children: "analytics"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 318,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm",
                                        children: "Analisis Soal"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 319,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/page.tsx",
                                lineNumber: 309,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-[10px] uppercase tracking-widest text-slate-400 font-bold px-4 mb-1 mt-5",
                                children: "Ujian"
                            }, void 0, false, {
                                fileName: "[project]/src/app/admin/page.tsx",
                                lineNumber: 322,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: tenantPath("/admin"),
                                onClick: ()=>setIsSidebarOpen(false),
                                className: `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isLinkActive("/admin") && !isLinkActive("/kelas") && !isLinkActive("/mata-pelajaran") && !isLinkActive("/management") && !isLinkActive("/questions") && !isLinkActive("/cetak") && !isLinkActive("/analisis") ? "bg-[#1D4ED8] text-white font-bold shadow-md shadow-blue-700/20" : "text-slate-600 hover:text-[#1D4ED8] hover:bg-blue-50/60 font-semibold"}`,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "material-symbols-outlined text-[20px]",
                                        children: "quiz"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 332,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm",
                                        children: "Adakan Ujian & Monitoring"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 333,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/page.tsx",
                                lineNumber: 323,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/admin/page.tsx",
                        lineNumber: 232,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-6 border-t border-slate-100 bg-slate-50/50",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: async ()=>{
                                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logout"])();
                                sessionStorage.removeItem("admin_auth");
                                router.replace("/admin/login");
                            },
                            className: "flex items-center gap-3 text-red-600 hover:text-red-700 hover:bg-red-50 p-2.5 rounded-xl transition-colors cursor-pointer w-full text-left font-bold text-xs uppercase tracking-wider",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "material-symbols-outlined text-red-600 text-[20px]",
                                    children: "logout"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/admin/page.tsx",
                                    lineNumber: 343,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Keluar Admin"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/admin/page.tsx",
                                    lineNumber: 344,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/admin/page.tsx",
                            lineNumber: 339,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/admin/page.tsx",
                        lineNumber: 338,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/admin/page.tsx",
                lineNumber: 211,
                columnNumber: 7
            }, this),
            isSidebarOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                onClick: ()=>setIsSidebarOpen(false),
                className: "fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
            }, void 0, false, {
                fileName: "[project]/src/app/admin/page.tsx",
                lineNumber: 349,
                columnNumber: 25
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: `flex-1 min-h-screen p-6 md:p-10 w-full transition-all pt-24 md:pt-10 ${isSidebarOpen ? "md:ml-64" : "ml-0"}`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                        className: "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-3",
                                children: [
                                    !isSidebarOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setIsSidebarOpen(true),
                                        className: "p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-[#1D4ED8] transition-all shadow-xs cursor-pointer flex items-center justify-center shrink-0",
                                        title: "Tampilkan Sidebar",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "material-symbols-outlined text-2xl",
                                            children: "menu"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/admin/page.tsx",
                                            lineNumber: 361,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 356,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                className: "font-black text-2xl md:text-3xl text-slate-900 tracking-tight",
                                                children: "Dashboard Monitoring Ujian"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/page.tsx",
                                                lineNumber: 365,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs uppercase font-black tracking-wider text-[#1D4ED8] mt-1",
                                                children: examName
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/page.tsx",
                                                lineNumber: 366,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 364,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/page.tsx",
                                lineNumber: 354,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>mutateUsers(),
                                className: "flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-extrabold text-xs uppercase tracking-wider hover:bg-slate-50 transition-all shadow-xs cursor-pointer hover:border-blue-300",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "material-symbols-outlined text-[18px] text-[#1D4ED8]",
                                        children: "refresh"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 370,
                                        columnNumber: 13
                                    }, this),
                                    "Refresh Data"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/page.tsx",
                                lineNumber: 369,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/admin/page.tsx",
                        lineNumber: 353,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        id: "adakan-ujian",
                        className: "mb-8",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: `border rounded-3xl shadow-xs transition-all ${examOpen ? "bg-white border-emerald-200 shadow-emerald-500/5" : "bg-white border-slate-200/90"}`,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "p-6 border-b border-slate-100 flex items-center gap-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: `w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 ${examOpen ? "bg-gradient-to-br from-emerald-600 to-teal-600" : "bg-gradient-to-br from-[#1D4ED8] to-blue-700"}`,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "material-symbols-outlined text-2xl",
                                                children: examOpen ? "lock_open" : "edit_calendar"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/page.tsx",
                                                lineNumber: 384,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/admin/page.tsx",
                                            lineNumber: 381,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    className: "font-black text-lg text-slate-900",
                                                    children: "Adakan Ujian"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                    lineNumber: 387,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-0.5",
                                                    children: "Atur ujian, buka untuk siswa, lalu pantau"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                    lineNumber: 388,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/admin/page.tsx",
                                            lineNumber: 386,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/admin/page.tsx",
                                    lineNumber: 380,
                                    columnNumber: 13
                                }, this),
                                notice && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mx-6 mt-6 bg-emerald-50 text-emerald-800 px-4 py-3 rounded-xl border border-emerald-200 font-bold text-xs flex items-start gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "material-symbols-outlined text-[18px] shrink-0",
                                            children: "check_circle"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/admin/page.tsx",
                                            lineNumber: 396,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "leading-relaxed",
                                            children: notice
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/admin/page.tsx",
                                            lineNumber: 397,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>setNotice(""),
                                            className: "ml-auto text-emerald-700 cursor-pointer shrink-0",
                                            "aria-label": "Tutup pesan",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "material-symbols-outlined text-[18px]",
                                                children: "close"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/page.tsx",
                                                lineNumber: 399,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/admin/page.tsx",
                                            lineNumber: 398,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/admin/page.tsx",
                                    lineNumber: 395,
                                    columnNumber: 15
                                }, this),
                                examError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mx-6 mt-6 bg-red-50 text-red-800 px-4 py-3 rounded-xl border border-red-200 font-bold text-xs flex items-start gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "material-symbols-outlined text-[18px] shrink-0",
                                            children: "error"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/admin/page.tsx",
                                            lineNumber: 405,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "leading-relaxed",
                                            children: examError
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/admin/page.tsx",
                                            lineNumber: 406,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/admin/page.tsx",
                                    lineNumber: 404,
                                    columnNumber: 15
                                }, this),
                                !summary ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "p-6 text-xs font-bold uppercase tracking-wider text-slate-400",
                                    children: "Memuat pengaturan ujian..."
                                }, void 0, false, {
                                    fileName: "[project]/src/app/admin/page.tsx",
                                    lineNumber: 411,
                                    columnNumber: 15
                                }, this) : examOpen ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "p-6 space-y-6",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full font-black text-xs uppercase tracking-wide bg-emerald-600 text-white shadow-xs",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "w-2 h-2 rounded-full bg-white animate-pulse"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/page.tsx",
                                                        lineNumber: 416,
                                                        columnNumber: 21
                                                    }, this),
                                                    "Ujian sedang berlangsung"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/admin/page.tsx",
                                                lineNumber: 415,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/admin/page.tsx",
                                            lineNumber: 414,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dl", {
                                            className: "grid grid-cols-2 lg:grid-cols-4 gap-5",
                                            children: [
                                                {
                                                    label: "Nama Ujian",
                                                    value: summary.exam_name || "—"
                                                },
                                                {
                                                    label: "Mata Pelajaran",
                                                    value: mapelName(summary.exam_mapel) || "—"
                                                },
                                                {
                                                    label: "Durasi",
                                                    value: `${summary.exam_duration} menit`
                                                },
                                                {
                                                    label: "Jumlah Soal",
                                                    value: `${summary.question_count} soal`
                                                }
                                            ].map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                                            className: "font-extrabold text-[10px] text-slate-400 uppercase tracking-widest mb-1",
                                                            children: item.label
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                            lineNumber: 428,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                                            className: "font-black text-sm text-slate-900",
                                                            children: item.value
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                            lineNumber: 429,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, item.label, true, {
                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                    lineNumber: 427,
                                                    columnNumber: 21
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/admin/page.tsx",
                                            lineNumber: 420,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs font-bold text-slate-500 leading-relaxed",
                                            children: "Siswa yang sudah mulai mengerjakan tetap memakai soal dan durasi seperti saat mereka mulai, walaupun Bank Soal atau pengaturan ini diubah setelahnya."
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/admin/page.tsx",
                                            lineNumber: 433,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex flex-col sm:flex-row gap-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: handleCloseExam,
                                                    disabled: isTogglingStatus,
                                                    className: "px-7 py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer disabled:opacity-60 bg-red-600 hover:bg-red-700 text-white shadow-red-600/20",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "material-symbols-outlined text-lg",
                                                            children: "do_not_disturb_on"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                            lineNumber: 443,
                                                            columnNumber: 21
                                                        }, this),
                                                        isTogglingStatus ? "Memproses..." : "Tutup Ujian"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                    lineNumber: 438,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                    href: tenantPath("/monitoring"),
                                                    target: "_blank",
                                                    className: "px-7 py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-[#1D4ED8] transition-all",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "material-symbols-outlined text-lg",
                                                            children: "monitoring"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                            lineNumber: 451,
                                                            columnNumber: 21
                                                        }, this),
                                                        "Buka Live Monitoring"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                    lineNumber: 446,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/admin/page.tsx",
                                            lineNumber: 437,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-[11px] font-bold text-slate-400 leading-relaxed",
                                            children: "Halaman Live Monitoring dapat dibuka langsung lewat tautannya, tanpa login. Bagikan ke guru lain, kepala sekolah, atau orang tua bila perlu."
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/admin/page.tsx",
                                            lineNumber: 455,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/admin/page.tsx",
                                    lineNumber: 413,
                                    columnNumber: 15
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "p-6 space-y-6",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full font-black text-xs uppercase tracking-wide bg-red-600 text-white shadow-xs",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "w-2 h-2 rounded-full bg-white"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                            lineNumber: 464,
                                                            columnNumber: 21
                                                        }, this),
                                                        "Ujian belum dibuka"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                    lineNumber: 463,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-xs font-black uppercase px-2.5 py-1 rounded-lg bg-red-100 text-red-800",
                                                    children: "Siswa belum bisa login"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                    lineNumber: 467,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/admin/page.tsx",
                                            lineNumber: 462,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-1 lg:grid-cols-2 gap-5",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "lg:col-span-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "exam_name",
                                                            className: "font-extrabold text-[10px] text-slate-500 uppercase tracking-widest block mb-2",
                                                            children: "Nama Ujian"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                            lineNumber: 474,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            id: "exam_name",
                                                            value: form.exam_name,
                                                            onChange: (e)=>setField("exam_name", e.target.value),
                                                            maxLength: 120,
                                                            placeholder: "Contoh: Sumatif Akhir Semester Genap",
                                                            className: "w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 outline-none font-bold text-xs text-slate-700 transition-all"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                            lineNumber: 475,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                    lineNumber: 473,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "exam_mapel",
                                                            className: "font-extrabold text-[10px] text-slate-500 uppercase tracking-widest block mb-2",
                                                            children: "Mata Pelajaran"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                            lineNumber: 485,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                            id: "exam_mapel",
                                                            value: form.exam_mapel,
                                                            onChange: (e)=>setField("exam_mapel", e.target.value),
                                                            className: "w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 outline-none font-bold text-xs text-slate-700 transition-all bg-white",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: "",
                                                                    children: "— Pilih mata pelajaran —"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                                    lineNumber: 492,
                                                                    columnNumber: 23
                                                                }, this),
                                                                mapelList.map((m)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                        value: m.id_mapel,
                                                                        children: m.nama_mapel
                                                                    }, m.id_mapel, false, {
                                                                        fileName: "[project]/src/app/admin/page.tsx",
                                                                        lineNumber: 494,
                                                                        columnNumber: 25
                                                                    }, this))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                            lineNumber: 486,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                    lineNumber: 484,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            htmlFor: "exam_duration",
                                                            className: "font-extrabold text-[10px] text-slate-500 uppercase tracking-widest block mb-2",
                                                            children: "Durasi (menit)"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                            lineNumber: 499,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            id: "exam_duration",
                                                            type: "number",
                                                            min: 1,
                                                            max: 600,
                                                            value: form.exam_duration,
                                                            onChange: (e)=>setField("exam_duration", e.target.value),
                                                            className: "w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 outline-none font-bold text-xs text-slate-700 transition-all"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                            lineNumber: 500,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                    lineNumber: 498,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/admin/page.tsx",
                                            lineNumber: 472,
                                            columnNumber: 17
                                        }, this),
                                        form.exam_mapel && kumpulanPilihan.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "border border-slate-200/80 rounded-2xl p-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "font-extrabold text-[10px] text-slate-500 uppercase tracking-widest mb-3",
                                                    children: "Pilih Kumpulan Soal"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                    lineNumber: 516,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "grid gap-2 sm:grid-cols-2",
                                                    children: kumpulanPilihan.map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            className: "flex items-center gap-3 px-3.5 py-3 rounded-xl border border-slate-200 hover:border-blue-400 cursor-pointer",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                    type: "checkbox",
                                                                    checked: kumpulanTerpilih.includes(c.id_kumpulan),
                                                                    onChange: ()=>toggleKumpulan(c.id_kumpulan),
                                                                    className: "rounded text-blue-600 cursor-pointer focus:ring-blue-500"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                                    lineNumber: 525,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "min-w-0",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "block font-black text-xs text-slate-800 truncate",
                                                                            children: c.nama_kumpulan
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                                            lineNumber: 532,
                                                                            columnNumber: 29
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "block font-bold text-[11px] text-slate-500",
                                                                            children: [
                                                                                c.jumlah_soal,
                                                                                " soal"
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                                            lineNumber: 533,
                                                                            columnNumber: 29
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                                    lineNumber: 531,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, c.id_kumpulan, true, {
                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                            lineNumber: 521,
                                                            columnNumber: 25
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                    lineNumber: 519,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "mt-2.5 text-[11px] font-medium text-slate-400",
                                                    children: [
                                                        "Tidak memilih apa pun berarti semua kumpulan aktif ",
                                                        mapelName(form.exam_mapel),
                                                        " dipakai."
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                    lineNumber: 538,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/admin/page.tsx",
                                            lineNumber: 515,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "bg-slate-50 border border-slate-200/80 rounded-2xl px-5 py-4 flex items-center gap-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "material-symbols-outlined text-[#1D4ED8]",
                                                    children: "inventory_2"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                    lineNumber: 545,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "font-black text-sm text-slate-900",
                                                            children: form.exam_mapel ? `${draftQuestionCount} soal` : "Pilih mata pelajaran dulu"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                            lineNumber: 547,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "font-bold text-[11px] text-slate-500",
                                                            children: !form.exam_mapel ? "Jumlah soal muncul setelah mata pelajaran dipilih." : kumpulanTerpilih.length > 0 ? `Soal dari ${kumpulanTerpilih.length} kumpulan yang dipilih akan dipakai pada ujian ini.` : `Semua soal aktif ${mapelName(form.exam_mapel)} akan dipakai pada ujian ini.`
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                            lineNumber: 550,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                    lineNumber: 546,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/admin/page.tsx",
                                            lineNumber: 544,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: handleReviewOpen,
                                            disabled: isTogglingStatus,
                                            className: "w-full lg:w-auto px-7 py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer disabled:opacity-60 bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "material-symbols-outlined text-lg",
                                                    children: "play_circle"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                    lineNumber: 565,
                                                    columnNumber: 19
                                                }, this),
                                                "Buka Ujian"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/admin/page.tsx",
                                            lineNumber: 560,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/admin/page.tsx",
                                    lineNumber: 461,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/admin/page.tsx",
                            lineNumber: 377,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/admin/page.tsx",
                        lineNumber: 376,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8",
                        children: [
                            {
                                label: "Total Siswa",
                                value: stats.total,
                                icon: "groups",
                                sub: "Peserta Terdaftar",
                                border: "border-l-4 border-[#1D4ED8]",
                                color: "bg-blue-50 text-[#1D4ED8] border border-blue-200/60"
                            },
                            {
                                label: "Sedang Ujian",
                                value: stats.sedang,
                                icon: "play_circle",
                                sub: `${stats.total ? Math.round(stats.sedang / stats.total * 100) : 0}% Progres Ujian`,
                                border: "border-l-4 border-amber-500",
                                color: "bg-amber-50 text-amber-600 border border-amber-200/60"
                            },
                            {
                                label: "Selesai",
                                value: stats.selesai,
                                icon: "check_circle",
                                sub: "Sudah Mengumpulkan",
                                border: "border-l-4 border-emerald-500",
                                color: "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                            },
                            {
                                label: "Diskualifikasi",
                                value: stats.diskualifikasi,
                                icon: "report",
                                sub: "Melanggar Aturan",
                                border: "border-l-4 border-red-600",
                                color: "bg-red-50 text-red-600 border border-red-200/60",
                                valueColor: "text-red-600"
                            }
                        ].map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs hover:-translate-y-1 transition-all duration-300 ${s.border}`,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex justify-between items-start mb-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "font-extrabold text-xs text-slate-500 uppercase tracking-wider",
                                                children: s.label
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/page.tsx",
                                                lineNumber: 583,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: `p-2.5 rounded-2xl ${s.color}`,
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "material-symbols-outlined text-[24px]",
                                                    children: s.icon
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                    lineNumber: 585,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/page.tsx",
                                                lineNumber: 584,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 582,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-baseline gap-2.5 mt-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                                className: `font-black text-4xl text-slate-900 tracking-tight ${s.valueColor ?? ""}`,
                                                children: usersLoading ? "—" : s.value
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/page.tsx",
                                                lineNumber: 589,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "font-bold text-[11px] text-slate-500 uppercase tracking-wide",
                                                children: s.sub
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/page.tsx",
                                                lineNumber: 592,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 588,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, s.label, true, {
                                fileName: "[project]/src/app/admin/page.tsx",
                                lineNumber: 581,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/app/admin/page.tsx",
                        lineNumber: 574,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: "bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "p-6 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                className: "font-black text-lg text-slate-900",
                                                children: "Live Student Monitoring"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/page.tsx",
                                                lineNumber: 602,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5",
                                                children: "Pemantauan Aktivitas Real-time Siswa"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/page.tsx",
                                                lineNumber: 603,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 601,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-col sm:flex-row gap-3 w-full lg:w-auto",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "relative w-full sm:w-64",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]",
                                                        children: "search"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/page.tsx",
                                                        lineNumber: 608,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8] outline-none transition-all",
                                                        placeholder: "Cari nama siswa...",
                                                        type: "text",
                                                        value: search,
                                                        onChange: (e)=>setSearch(e.target.value)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/page.tsx",
                                                        lineNumber: 609,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/admin/page.tsx",
                                                lineNumber: 607,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                className: "w-full sm:w-auto px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 focus:ring-2 focus:ring-[#1D4ED8]/20 outline-none transition-all",
                                                value: filterClass,
                                                onChange: (e)=>setFilterClass(e.target.value),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "All Classes",
                                                        children: "Semua Kelas"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/page.tsx",
                                                        lineNumber: 623,
                                                        columnNumber: 17
                                                    }, this),
                                                    classes.map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: c,
                                                            children: c
                                                        }, c, false, {
                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                            lineNumber: 624,
                                                            columnNumber: 37
                                                        }, this))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/admin/page.tsx",
                                                lineNumber: 618,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/page.tsx",
                                        lineNumber: 605,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/page.tsx",
                                lineNumber: 600,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "overflow-x-auto",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                    className: "w-full text-left border-collapse min-w-[800px]",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                            className: "bg-slate-100/90 text-slate-700 border-b border-slate-200",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-6 py-4 font-black text-xs uppercase tracking-wider w-16",
                                                        children: "No"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/page.tsx",
                                                        lineNumber: 633,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-6 py-4 font-black text-xs uppercase tracking-wider",
                                                        children: "Nama Siswa"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/page.tsx",
                                                        lineNumber: 634,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-6 py-4 font-black text-xs uppercase tracking-wider w-32",
                                                        children: "Kelas"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/page.tsx",
                                                        lineNumber: 635,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-6 py-4 font-black text-xs uppercase tracking-wider w-40",
                                                        children: "Status"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/page.tsx",
                                                        lineNumber: 636,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-6 py-4 font-black text-xs uppercase tracking-wider w-32",
                                                        children: "Skor"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/page.tsx",
                                                        lineNumber: 637,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-6 py-4 font-black text-xs uppercase tracking-wider w-40",
                                                        children: "Pelanggaran"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/page.tsx",
                                                        lineNumber: 638,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-6 py-4 font-black text-xs uppercase tracking-wider text-right w-36",
                                                        children: "Aksi Reset"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/page.tsx",
                                                        lineNumber: 639,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/admin/page.tsx",
                                                lineNumber: 632,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/admin/page.tsx",
                                            lineNumber: 631,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                            className: "divide-y divide-slate-100",
                                            children: usersLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    colSpan: 7,
                                                    className: "px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider",
                                                    children: "Memuat data siswa..."
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                    lineNumber: 644,
                                                    columnNumber: 23
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/page.tsx",
                                                lineNumber: 644,
                                                columnNumber: 19
                                            }, this) : filtered.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    colSpan: 7,
                                                    className: "px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider",
                                                    children: "Tidak ada data siswa."
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                    lineNumber: 646,
                                                    columnNumber: 23
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/page.tsx",
                                                lineNumber: 646,
                                                columnNumber: 19
                                            }, this) : filtered.map((u, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                    className: `hover:bg-blue-50/40 transition-colors ${u.status_ujian === "DISKUALIFIKASI" ? "bg-red-50/40" : ""}`,
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-6 py-4 font-bold text-xs text-slate-500",
                                                            children: idx + 1
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                            lineNumber: 650,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-6 py-4",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex items-center gap-3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "w-8 h-8 rounded-full bg-blue-100 text-[#1D4ED8] flex items-center justify-center font-black text-xs shadow-2xs",
                                                                        children: u.nama_lengkap.charAt(0).toUpperCase()
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/admin/page.tsx",
                                                                        lineNumber: 653,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "font-extrabold text-xs text-slate-900 uppercase tracking-wide",
                                                                        children: u.nama_lengkap
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/admin/page.tsx",
                                                                        lineNumber: 656,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/admin/page.tsx",
                                                                lineNumber: 652,
                                                                columnNumber: 25
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                            lineNumber: 651,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-6 py-4 font-bold text-xs text-slate-600 uppercase",
                                                            children: u.kelas
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                            lineNumber: 659,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-6 py-4",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(StatusBadge, {
                                                                status: u.status_ujian
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/admin/page.tsx",
                                                                lineNumber: 660,
                                                                columnNumber: 49
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                            lineNumber: 660,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-6 py-4 font-black text-sm text-[#1D4ED8]",
                                                            children: u.skor_akhir != null ? `${u.skor_akhir}` : "—"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                            lineNumber: 661,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: `px-6 py-4 font-bold text-xs ${(u.violation_count ?? 0) > 0 ? "text-red-600 font-black" : "text-slate-400"}`,
                                                            children: (u.violation_count ?? 0) > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full font-black text-xs",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "material-symbols-outlined text-[14px]",
                                                                        children: "warning"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/admin/page.tsx",
                                                                        lineNumber: 667,
                                                                        columnNumber: 29
                                                                    }, this),
                                                                    u.violation_count,
                                                                    "x"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/admin/page.tsx",
                                                                lineNumber: 666,
                                                                columnNumber: 27
                                                            }, this) : "0"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                            lineNumber: 664,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-6 py-4 text-right",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>handleResetLogin(u.id_siswa),
                                                                disabled: resettingId === u.id_siswa,
                                                                title: "Reset status & sesi login siswa",
                                                                className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#1D4ED8] text-slate-700 hover:text-white font-extrabold text-xs transition-all cursor-pointer disabled:opacity-40 shadow-2xs",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "material-symbols-outlined text-[16px]",
                                                                        children: resettingId === u.id_siswa ? "progress_activity" : "restart_alt"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/admin/page.tsx",
                                                                        lineNumber: 681,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        children: "Reset"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/app/admin/page.tsx",
                                                                        lineNumber: 684,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/admin/page.tsx",
                                                                lineNumber: 675,
                                                                columnNumber: 25
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/admin/page.tsx",
                                                            lineNumber: 674,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, u.id_siswa, true, {
                                                    fileName: "[project]/src/app/admin/page.tsx",
                                                    lineNumber: 649,
                                                    columnNumber: 21
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/admin/page.tsx",
                                            lineNumber: 642,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/admin/page.tsx",
                                    lineNumber: 630,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/admin/page.tsx",
                                lineNumber: 629,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "font-bold text-[11px] text-slate-500 uppercase tracking-wider",
                                    children: [
                                        "Menampilkan ",
                                        filtered.length,
                                        " dari ",
                                        users.length,
                                        " siswa terdaftar"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/admin/page.tsx",
                                    lineNumber: 695,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/admin/page.tsx",
                                lineNumber: 694,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/admin/page.tsx",
                        lineNumber: 599,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/admin/page.tsx",
                lineNumber: 352,
                columnNumber: 7
            }, this),
            showConfirm && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[100] flex items-center justify-center p-6",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-200/80",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            className: "font-black text-lg text-slate-900 mb-1",
                            children: "Buka Ujian?"
                        }, void 0, false, {
                            fileName: "[project]/src/app/admin/page.tsx",
                            lineNumber: 706,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6",
                            children: "Periksa dulu sebelum siswa masuk"
                        }, void 0, false, {
                            fileName: "[project]/src/app/admin/page.tsx",
                            lineNumber: 707,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dl", {
                            className: "space-y-4 mb-6",
                            children: [
                                {
                                    label: "Nama",
                                    value: form.exam_name.trim()
                                },
                                {
                                    label: "Mapel",
                                    value: mapelName(form.exam_mapel)
                                },
                                {
                                    label: "Kumpulan soal",
                                    value: kumpulanTerpilih.length > 0 ? kumpulanPilihan.filter((c)=>kumpulanTerpilih.includes(c.id_kumpulan)).map((c)=>c.nama_kumpulan).join(", ") : "Semua kumpulan aktif"
                                },
                                {
                                    label: "Durasi",
                                    value: `${durationNumber} menit`
                                },
                                {
                                    label: "Jumlah soal",
                                    value: `${draftQuestionCount} soal`
                                }
                            ].map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                            className: "font-extrabold text-[10px] text-slate-400 uppercase tracking-widest",
                                            children: item.label
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/admin/page.tsx",
                                            lineNumber: 726,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                            className: "font-black text-sm text-slate-900 mt-0.5",
                                            children: item.value
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/admin/page.tsx",
                                            lineNumber: 727,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, item.label, true, {
                                    fileName: "[project]/src/app/admin/page.tsx",
                                    lineNumber: 725,
                                    columnNumber: 17
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/app/admin/page.tsx",
                            lineNumber: 709,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs font-bold text-slate-500 leading-relaxed bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 mb-6",
                            children: "Setelah siswa mulai mengerjakan, soal dan durasi yang mereka dapatkan tidak berubah, walaupun Bank Soal atau pengaturan ujian diubah setelahnya."
                        }, void 0, false, {
                            fileName: "[project]/src/app/admin/page.tsx",
                            lineNumber: 732,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setShowConfirm(false),
                                    disabled: isTogglingStatus,
                                    className: "flex-1 py-3.5 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-xs uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-60",
                                    children: "Batal"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/admin/page.tsx",
                                    lineNumber: 738,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: handleOpenExam,
                                    disabled: isTogglingStatus,
                                    className: "flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-60",
                                    children: isTogglingStatus ? "Memproses..." : "Buka Ujian"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/admin/page.tsx",
                                    lineNumber: 745,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/admin/page.tsx",
                            lineNumber: 737,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/admin/page.tsx",
                    lineNumber: 705,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/admin/page.tsx",
                lineNumber: 704,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/admin/page.tsx",
        lineNumber: 196,
        columnNumber: 5
    }, this);
}
_s(AdminDashboard, "MP2VrUdvF0N5zJbPWHw5mSSif/8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useTenantRouter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTenantRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useTenantRouter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTenantPath"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"]
    ];
});
_c1 = AdminDashboard;
var _c, _c1;
__turbopack_context__.k.register(_c, "StatusBadge");
__turbopack_context__.k.register(_c1, "AdminDashboard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_0h_x2fu._.js.map