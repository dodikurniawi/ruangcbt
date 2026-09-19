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
"[project]/src/app/pin-verification/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>PinVerification
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useTenantRouter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/useTenantRouter.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
function PinVerification() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useTenantRouter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTenantRouter"])();
    const tenantPath = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useTenantRouter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTenantPath"])();
    const [pin, setPin] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([
        "",
        "",
        "",
        ""
    ]);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const handleInputChange = (value, index)=>{
        if (/[^0-9]/.test(value)) return;
        const newPin = [
            ...pin
        ];
        newPin[index] = value;
        setPin(newPin);
        if (value !== "" && index < 3) {
            document.getElementById(`pin-${index + 1}`)?.focus();
        }
    };
    const handleKeyDown = (e, index)=>{
        if (e.key === "Backspace" && pin[index] === "" && index > 0) {
            document.getElementById(`pin-${index - 1}`)?.focus();
        }
    };
    const handleSubmit = async ()=>{
        const pinString = pin.join("");
        if (pinString.length < 4) return;
        setIsLoading(true);
        setError(false);
        try {
            const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["validateExamPin"])(pinString);
            if (res.success) {
                sessionStorage.setItem("pin_verified", "true");
                router.push("/exam");
            } else {
                setError(true);
                setPin([
                    "",
                    "",
                    "",
                    ""
                ]);
                setTimeout(()=>{
                    setError(false);
                    document.getElementById("pin-0")?.focus();
                }, 3000);
            }
        } catch  {
            setError(true);
            setTimeout(()=>setError(false), 3000);
        } finally{
            setIsLoading(false);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bg-background text-on-background font-body-student min-h-screen flex flex-col items-center justify-center p-lg pattern-bg relative overflow-hidden",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "fixed top-0 left-0 w-full flex justify-between items-center px-lg py-sm bg-white dark:bg-surface border-b border-outline-variant shadow-sm z-50",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "material-symbols-outlined text-primary text-[28px]",
                                children: "school"
                            }, void 0, false, {
                                fileName: "[project]/src/app/pin-verification/page.tsx",
                                lineNumber: 61,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-headline-student text-headline-student font-extrabold text-primary",
                                children: "CBT Sekolah"
                            }, void 0, false, {
                                fileName: "[project]/src/app/pin-verification/page.tsx",
                                lineNumber: 62,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/pin-verification/page.tsx",
                        lineNumber: 60,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-md",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-label-bold text-label-bold text-on-surface-variant",
                                children: "Portal Ujian"
                            }, void 0, false, {
                                fileName: "[project]/src/app/pin-verification/page.tsx",
                                lineNumber: 65,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "material-symbols-outlined text-on-surface-variant",
                                children: "person"
                            }, void 0, false, {
                                fileName: "[project]/src/app/pin-verification/page.tsx",
                                lineNumber: 66,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/pin-verification/page.tsx",
                        lineNumber: 64,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/pin-verification/page.tsx",
                lineNumber: 59,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: "w-full max-w-[440px] bg-white dark:bg-surface/90 border border-outline-variant/30 shadow-2xl rounded-3xl p-xl flex flex-col items-center text-center relative z-10 transition-all hover:shadow-3xl mt-16",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-lg relative w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute inset-0 bg-primary/5 rounded-full animate-pulse"
                            }, void 0, false, {
                                fileName: "[project]/src/app/pin-verification/page.tsx",
                                lineNumber: 72,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-14 h-14 bg-primary-container rounded-full flex items-center justify-center relative z-10 shadow-sm",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "material-symbols-outlined text-on-primary-container text-[28px]",
                                    children: "lock"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/pin-verification/page.tsx",
                                    lineNumber: 74,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/pin-verification/page.tsx",
                                lineNumber: 73,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/pin-verification/page.tsx",
                        lineNumber: 71,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-sm mb-lg",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "font-headline-student text-headline-student font-extrabold text-on-surface",
                                children: "Verifikasi PIN"
                            }, void 0, false, {
                                fileName: "[project]/src/app/pin-verification/page.tsx",
                                lineNumber: 79,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "font-body-student text-[15px] leading-relaxed text-on-surface-variant px-sm max-w-[320px] mx-auto",
                                children: "Masukkan PIN ujian yang diberikan oleh pengawas untuk memulai."
                            }, void 0, false, {
                                fileName: "[project]/src/app/pin-verification/page.tsx",
                                lineNumber: 80,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/pin-verification/page.tsx",
                        lineNumber: 78,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                        onSubmit: (e)=>{
                            e.preventDefault();
                            handleSubmit();
                        },
                        className: "w-full space-y-lg",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex justify-center gap-sm",
                                children: pin.map((char, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        id: `pin-${index}`,
                                        className: `w-14 h-18 text-center text-display-exam font-display-exam bg-surface border-2 rounded-2xl focus:border-primary focus:bg-white dark:focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/15 outline-none transition-all text-on-surface font-bold shadow-sm ${error ? "border-error focus:border-error focus:ring-error/15" : "border-outline-variant"}`,
                                        maxLength: 1,
                                        placeholder: "0",
                                        type: "text",
                                        inputMode: "numeric",
                                        value: char,
                                        onChange: (e)=>handleInputChange(e.target.value, index),
                                        onKeyDown: (e)=>handleKeyDown(e, index)
                                    }, index, false, {
                                        fileName: "[project]/src/app/pin-verification/page.tsx",
                                        lineNumber: 88,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/src/app/pin-verification/page.tsx",
                                lineNumber: 86,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "w-full h-14 bg-primary text-on-primary font-label-bold text-label-bold rounded-xl shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25 hover:bg-primary/95 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none",
                                type: "submit",
                                disabled: isLoading || pin.join("").length < 4,
                                children: isLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "material-symbols-outlined animate-spin",
                                            children: "progress_activity"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/pin-verification/page.tsx",
                                            lineNumber: 112,
                                            columnNumber: 17
                                        }, this),
                                        "Memverifikasi..."
                                    ]
                                }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        "Masuk Ujian",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "material-symbols-outlined",
                                            children: "arrow_forward"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/pin-verification/page.tsx",
                                            lineNumber: 118,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true)
                            }, void 0, false, {
                                fileName: "[project]/src/app/pin-verification/page.tsx",
                                lineNumber: 105,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/pin-verification/page.tsx",
                        lineNumber: 85,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-xl border-t border-outline-variant/20 w-full pt-lg flex justify-center",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: tenantPath("/login"),
                            className: "flex items-center gap-sm font-label-bold text-label-bold text-on-surface-variant hover:text-error hover:bg-error/5 transition-all px-lg py-sm rounded-xl cursor-pointer",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "material-symbols-outlined text-[20px]",
                                    children: "logout"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/pin-verification/page.tsx",
                                    lineNumber: 129,
                                    columnNumber: 13
                                }, this),
                                "Keluar"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/pin-verification/page.tsx",
                            lineNumber: 125,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/pin-verification/page.tsx",
                        lineNumber: 124,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/pin-verification/page.tsx",
                lineNumber: 70,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
                className: "fixed bottom-6 left-0 right-0 text-center",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "font-caption text-caption text-outline",
                    children: [
                        "Sistem Ujian Berbasis Komputer © ",
                        new Date().getFullYear()
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/pin-verification/page.tsx",
                    lineNumber: 136,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/pin-verification/page.tsx",
                lineNumber: 135,
                columnNumber: 7
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed top-24 left-1/2 -translate-x-1/2 bg-error-container text-on-error-container px-lg py-md rounded-xl shadow-lg border border-outline-variant flex items-center gap-md z-50",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "material-symbols-outlined text-error",
                        children: "error"
                    }, void 0, false, {
                        fileName: "[project]/src/app/pin-verification/page.tsx",
                        lineNumber: 143,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "font-label-bold text-label-bold",
                        children: "PIN salah. Silakan coba lagi."
                    }, void 0, false, {
                        fileName: "[project]/src/app/pin-verification/page.tsx",
                        lineNumber: 144,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/pin-verification/page.tsx",
                lineNumber: 142,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/pin-verification/page.tsx",
        lineNumber: 58,
        columnNumber: 5
    }, this);
}
_s(PinVerification, "ISK5KvZl++UT7C8A+803exIkOKM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useTenantRouter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTenantRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useTenantRouter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTenantPath"]
    ];
});
_c = PinVerification;
var _c;
__turbopack_context__.k.register(_c, "PinVerification");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/node_modules/next/dist/shared/lib/router/utils/format-url.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
// Format function modified from nodejs
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    formatUrl: null,
    formatWithValidation: null,
    urlObjectKeys: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    formatUrl: function() {
        return formatUrl;
    },
    formatWithValidation: function() {
        return formatWithValidation;
    },
    urlObjectKeys: function() {
        return urlObjectKeys;
    }
});
const _interop_require_wildcard = __turbopack_context__.r("[project]/node_modules/@swc/helpers/cjs/_interop_require_wildcard.cjs [app-client] (ecmascript)");
const _querystring = /*#__PURE__*/ _interop_require_wildcard._(__turbopack_context__.r("[project]/node_modules/next/dist/shared/lib/router/utils/querystring.js [app-client] (ecmascript)"));
const slashedProtocols = /https?|ftp|gopher|file/;
function formatUrl(urlObj) {
    let { auth, hostname } = urlObj;
    let protocol = urlObj.protocol || '';
    let pathname = urlObj.pathname || '';
    let hash = urlObj.hash || '';
    let query = urlObj.query || '';
    let host = false;
    auth = auth ? encodeURIComponent(auth).replace(/%3A/i, ':') + '@' : '';
    if (urlObj.host) {
        host = auth + urlObj.host;
    } else if (hostname) {
        host = auth + (~hostname.indexOf(':') ? `[${hostname}]` : hostname);
        if (urlObj.port) {
            host += ':' + urlObj.port;
        }
    }
    if (query && typeof query === 'object') {
        query = String(_querystring.urlQueryToSearchParams(query));
    }
    let search = urlObj.search || query && `?${query}` || '';
    if (protocol && !protocol.endsWith(':')) protocol += ':';
    if (urlObj.slashes || (!protocol || slashedProtocols.test(protocol)) && host !== false) {
        host = '//' + (host || '');
        if (pathname && pathname[0] !== '/') pathname = '/' + pathname;
    } else if (!host) {
        host = '';
    }
    if (hash && hash[0] !== '#') hash = '#' + hash;
    if (search && search[0] !== '?') search = '?' + search;
    pathname = pathname.replace(/[?#]/g, encodeURIComponent);
    search = search.replace('#', '%23');
    return `${protocol}${host}${pathname}${search}${hash}`;
}
const urlObjectKeys = [
    'auth',
    'hash',
    'host',
    'hostname',
    'href',
    'path',
    'pathname',
    'port',
    'protocol',
    'query',
    'search',
    'slashes'
];
function formatWithValidation(url) {
    if ("TURBOPACK compile-time truthy", 1) {
        if (url !== null && typeof url === 'object') {
            Object.keys(url).forEach((key)=>{
                if (!urlObjectKeys.includes(key)) {
                    console.warn(`Unknown key passed via urlObject into url.format: ${key}`);
                }
            });
        }
    }
    return formatUrl(url);
}
}),
"[project]/node_modules/next/dist/client/use-merged-ref.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useMergedRef", {
    enumerable: true,
    get: function() {
        return useMergedRef;
    }
});
const _react = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
function useMergedRef(refA, refB) {
    const cleanupA = (0, _react.useRef)(null);
    const cleanupB = (0, _react.useRef)(null);
    // NOTE: In theory, we could skip the wrapping if only one of the refs is non-null.
    // (this happens often if the user doesn't pass a ref to Link/Form/Image)
    // But this can cause us to leak a cleanup-ref into user code (previously via `<Link legacyBehavior>`),
    // and the user might pass that ref into ref-merging library that doesn't support cleanup refs
    // (because it hasn't been updated for React 19)
    // which can then cause things to blow up, because a cleanup-returning ref gets called with `null`.
    // So in practice, it's safer to be defensive and always wrap the ref, even on React 19.
    return (0, _react.useCallback)((current)=>{
        if (current === null) {
            const cleanupFnA = cleanupA.current;
            if (cleanupFnA) {
                cleanupA.current = null;
                cleanupFnA();
            }
            const cleanupFnB = cleanupB.current;
            if (cleanupFnB) {
                cleanupB.current = null;
                cleanupFnB();
            }
        } else {
            if (refA) {
                cleanupA.current = applyRef(refA, current);
            }
            if (refB) {
                cleanupB.current = applyRef(refB, current);
            }
        }
    }, [
        refA,
        refB
    ]);
}
function applyRef(refA, current) {
    if (typeof refA === 'function') {
        const cleanup = refA(current);
        if (typeof cleanup === 'function') {
            return cleanup;
        } else {
            return ()=>refA(null);
        }
    } else {
        refA.current = current;
        return ()=>{
            refA.current = null;
        };
    }
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
}
}),
"[project]/node_modules/next/dist/shared/lib/router/utils/is-local-url.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "isLocalURL", {
    enumerable: true,
    get: function() {
        return isLocalURL;
    }
});
const _utils = __turbopack_context__.r("[project]/node_modules/next/dist/shared/lib/utils.js [app-client] (ecmascript)");
const _hasbasepath = __turbopack_context__.r("[project]/node_modules/next/dist/client/has-base-path.js [app-client] (ecmascript)");
function isLocalURL(url) {
    // prevent a hydration mismatch on href for url with anchor refs
    if (!(0, _utils.isAbsoluteUrl)(url)) return true;
    try {
        // absolute urls can be local if they are on the same origin
        const locationOrigin = (0, _utils.getLocationOrigin)();
        const resolved = new URL(url, locationOrigin);
        return resolved.origin === locationOrigin && (0, _hasbasepath.hasBasePath)(resolved.pathname);
    } catch (_) {
        return false;
    }
}
}),
"[project]/node_modules/next/dist/shared/lib/utils/error-once.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "errorOnce", {
    enumerable: true,
    get: function() {
        return errorOnce;
    }
});
let errorOnce = (_)=>{};
if ("TURBOPACK compile-time truthy", 1) {
    const errors = new Set();
    errorOnce = (msg)=>{
        if (!errors.has(msg)) {
            console.error(msg);
        }
        errors.add(msg);
    };
}
}),
"[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    default: null,
    useLinkStatus: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    /**
 * A React component that extends the HTML `<a>` element to provide
 * [prefetching](https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating#2-prefetching)
 * and client-side navigation. This is the primary way to navigate between routes in Next.js.
 *
 * @remarks
 * - Prefetching is only enabled in production.
 *
 * @see https://nextjs.org/docs/app/api-reference/components/link
 */ default: function() {
        return LinkComponent;
    },
    useLinkStatus: function() {
        return useLinkStatus;
    }
});
const _interop_require_wildcard = __turbopack_context__.r("[project]/node_modules/@swc/helpers/cjs/_interop_require_wildcard.cjs [app-client] (ecmascript)");
const _jsxruntime = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/jsx-runtime.js [app-client] (ecmascript)");
const _react = /*#__PURE__*/ _interop_require_wildcard._(__turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"));
const _formaturl = __turbopack_context__.r("[project]/node_modules/next/dist/shared/lib/router/utils/format-url.js [app-client] (ecmascript)");
const _approutercontextsharedruntime = __turbopack_context__.r("[project]/node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js [app-client] (ecmascript)");
const _usemergedref = __turbopack_context__.r("[project]/node_modules/next/dist/client/use-merged-ref.js [app-client] (ecmascript)");
const _utils = __turbopack_context__.r("[project]/node_modules/next/dist/shared/lib/utils.js [app-client] (ecmascript)");
const _addbasepath = __turbopack_context__.r("[project]/node_modules/next/dist/client/add-base-path.js [app-client] (ecmascript)");
const _warnonce = __turbopack_context__.r("[project]/node_modules/next/dist/shared/lib/utils/warn-once.js [app-client] (ecmascript)");
const _routerreducertypes = __turbopack_context__.r("[project]/node_modules/next/dist/client/components/router-reducer/router-reducer-types.js [app-client] (ecmascript)");
const _links = __turbopack_context__.r("[project]/node_modules/next/dist/client/components/links.js [app-client] (ecmascript)");
const _islocalurl = __turbopack_context__.r("[project]/node_modules/next/dist/shared/lib/router/utils/is-local-url.js [app-client] (ecmascript)");
const _types = __turbopack_context__.r("[project]/node_modules/next/dist/client/components/segment-cache/types.js [app-client] (ecmascript)");
const _erroronce = __turbopack_context__.r("[project]/node_modules/next/dist/shared/lib/utils/error-once.js [app-client] (ecmascript)");
function isModifiedEvent(event) {
    const eventTarget = event.currentTarget;
    const target = eventTarget.getAttribute('target');
    return target && target !== '_self' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || // triggers resource download
    event.nativeEvent && event.nativeEvent.which === 2;
}
function linkClicked(e, href, linkInstanceRef, replace, scroll, onNavigate, transitionTypes) {
    if (typeof window !== 'undefined') {
        const { nodeName } = e.currentTarget;
        // anchors inside an svg have a lowercase nodeName
        const isAnchorNodeName = nodeName.toUpperCase() === 'A';
        if (isAnchorNodeName && isModifiedEvent(e) || e.currentTarget.hasAttribute('download')) {
            // ignore click for browser’s default behavior
            return;
        }
        if (!(0, _islocalurl.isLocalURL)(href)) {
            if (replace) {
                // browser default behavior does not replace the history state
                // so we need to do it manually
                e.preventDefault();
                location.replace(href);
            }
            // ignore click for browser’s default behavior
            return;
        }
        e.preventDefault();
        if (onNavigate) {
            let isDefaultPrevented = false;
            onNavigate({
                preventDefault: ()=>{
                    isDefaultPrevented = true;
                }
            });
            if (isDefaultPrevented) {
                return;
            }
        }
        const { dispatchNavigateAction } = __turbopack_context__.r("[project]/node_modules/next/dist/client/components/app-router-instance.js [app-client] (ecmascript)");
        _react.default.startTransition(()=>{
            dispatchNavigateAction(href, replace ? 'replace' : 'push', scroll === false ? _routerreducertypes.ScrollBehavior.NoScroll : _routerreducertypes.ScrollBehavior.Default, linkInstanceRef.current, transitionTypes);
        });
    }
}
function formatStringOrUrl(urlObjOrString) {
    if (typeof urlObjOrString === 'string') {
        return urlObjOrString;
    }
    return (0, _formaturl.formatUrl)(urlObjOrString);
}
function LinkComponent(props) {
    const [linkStatus, setOptimisticLinkStatus] = (0, _react.useOptimistic)(_links.IDLE_LINK_STATUS);
    let children;
    const linkInstanceRef = (0, _react.useRef)(null);
    const { href: hrefProp, as: asProp, children: childrenProp, prefetch: prefetchProp = null, passHref, replace, shallow, scroll, onClick, onMouseEnter: onMouseEnterProp, onTouchStart: onTouchStartProp, legacyBehavior = false, onNavigate, transitionTypes, ref: forwardedRef, unstable_dynamicOnHover, ...restProps } = props;
    children = childrenProp;
    if (legacyBehavior && (typeof children === 'string' || typeof children === 'number')) {
        children = /*#__PURE__*/ (0, _jsxruntime.jsx)("a", {
            children: children
        });
    }
    const router = _react.default.useContext(_approutercontextsharedruntime.AppRouterContext);
    const prefetchEnabled = prefetchProp !== false;
    const fetchStrategy = prefetchProp !== false ? getFetchStrategyFromPrefetchProp(prefetchProp) : _types.FetchStrategy.PPR;
    if ("TURBOPACK compile-time truthy", 1) {
        function createPropError(args) {
            return Object.defineProperty(new Error(`Failed prop type: The prop \`${args.key}\` expects a ${args.expected} in \`<Link>\`, but got \`${args.actual}\` instead.` + (typeof window !== 'undefined' ? "\nOpen your browser's console to view the Component stack trace." : '')), "__NEXT_ERROR_CODE", {
                value: "E319",
                enumerable: false,
                configurable: true
            });
        }
        // TypeScript trick for type-guarding:
        const requiredPropsGuard = {
            href: true
        };
        const requiredProps = Object.keys(requiredPropsGuard);
        requiredProps.forEach((key)=>{
            if (key === 'href') {
                if (props[key] == null || typeof props[key] !== 'string' && typeof props[key] !== 'object') {
                    throw createPropError({
                        key,
                        expected: '`string` or `object`',
                        actual: props[key] === null ? 'null' : typeof props[key]
                    });
                }
            } else {
                // TypeScript trick for type-guarding:
                const _ = key;
            }
        });
        // TypeScript trick for type-guarding:
        const optionalPropsGuard = {
            as: true,
            replace: true,
            scroll: true,
            shallow: true,
            passHref: true,
            prefetch: true,
            unstable_dynamicOnHover: true,
            onClick: true,
            onMouseEnter: true,
            onTouchStart: true,
            legacyBehavior: true,
            onNavigate: true,
            transitionTypes: true
        };
        const optionalProps = Object.keys(optionalPropsGuard);
        optionalProps.forEach((key)=>{
            const valType = typeof props[key];
            if (key === 'as') {
                if (props[key] && valType !== 'string' && valType !== 'object') {
                    throw createPropError({
                        key,
                        expected: '`string` or `object`',
                        actual: valType
                    });
                }
            } else if (key === 'onClick' || key === 'onMouseEnter' || key === 'onTouchStart' || key === 'onNavigate') {
                if (props[key] && valType !== 'function') {
                    throw createPropError({
                        key,
                        expected: '`function`',
                        actual: valType
                    });
                }
            } else if (key === 'replace' || key === 'scroll' || key === 'shallow' || key === 'passHref' || key === 'legacyBehavior' || key === 'unstable_dynamicOnHover') {
                if (props[key] != null && valType !== 'boolean') {
                    throw createPropError({
                        key,
                        expected: '`boolean`',
                        actual: valType
                    });
                }
            } else if (key === 'prefetch') {
                if (props[key] != null && valType !== 'boolean' && props[key] !== 'auto') {
                    throw createPropError({
                        key,
                        expected: '`boolean | "auto"`',
                        actual: valType
                    });
                }
            } else if (key === 'transitionTypes') {
                if (props[key] != null && !Array.isArray(props[key])) {
                    throw createPropError({
                        key,
                        expected: '`string[]`',
                        actual: valType
                    });
                }
            } else {
                // TypeScript trick for type-guarding:
                const _ = key;
            }
        });
    }
    const resolvedHref = asProp || hrefProp;
    const formattedHref = formatStringOrUrl(resolvedHref);
    if ("TURBOPACK compile-time truthy", 1) {
        if (props.locale) {
            (0, _warnonce.warnOnce)('The `locale` prop is not supported in `next/link` while using the `app` router. Read more about app router internalization: https://nextjs.org/docs/app/building-your-application/routing/internationalization');
        }
        if (!asProp) {
            let href;
            if (typeof resolvedHref === 'string') {
                href = resolvedHref;
            } else if (typeof resolvedHref === 'object' && typeof resolvedHref.pathname === 'string') {
                href = resolvedHref.pathname;
            }
            if (href) {
                const hasDynamicSegment = href.split('/').some((segment)=>segment.startsWith('[') && segment.endsWith(']'));
                if (hasDynamicSegment) {
                    throw Object.defineProperty(new Error(`Dynamic href \`${href}\` found in <Link> while using the \`/app\` router, this is not supported. Read more: https://nextjs.org/docs/messages/app-dir-dynamic-href`), "__NEXT_ERROR_CODE", {
                        value: "E267",
                        enumerable: false,
                        configurable: true
                    });
                }
            }
        }
    }
    // This will return the first child, if multiple are provided it will throw an error
    let child;
    if (legacyBehavior) {
        if (children?.$$typeof === Symbol.for('react.lazy')) {
            throw Object.defineProperty(new Error(`\`<Link legacyBehavior>\` received a direct child that is either a Server Component, or JSX that was loaded with React.lazy(). This is not supported. Either remove legacyBehavior, or make the direct child a Client Component that renders the Link's \`<a>\` tag.`), "__NEXT_ERROR_CODE", {
                value: "E863",
                enumerable: false,
                configurable: true
            });
        }
        if ("TURBOPACK compile-time truthy", 1) {
            if (onClick) {
                console.warn(`"onClick" was passed to <Link> with \`href\` of \`${formattedHref}\` but "legacyBehavior" was set. The legacy behavior requires onClick be set on the child of next/link`);
            }
            if (onMouseEnterProp) {
                console.warn(`"onMouseEnter" was passed to <Link> with \`href\` of \`${formattedHref}\` but "legacyBehavior" was set. The legacy behavior requires onMouseEnter be set on the child of next/link`);
            }
            try {
                child = _react.default.Children.only(children);
            } catch (err) {
                if (!children) {
                    throw Object.defineProperty(new Error(`No children were passed to <Link> with \`href\` of \`${formattedHref}\` but one child is required https://nextjs.org/docs/messages/link-no-children`), "__NEXT_ERROR_CODE", {
                        value: "E320",
                        enumerable: false,
                        configurable: true
                    });
                }
                throw Object.defineProperty(new Error(`Multiple children were passed to <Link> with \`href\` of \`${formattedHref}\` but only one child is supported https://nextjs.org/docs/messages/link-multiple-children` + (typeof window !== 'undefined' ? " \nOpen your browser's console to view the Component stack trace." : '')), "__NEXT_ERROR_CODE", {
                    value: "E266",
                    enumerable: false,
                    configurable: true
                });
            }
        } else //TURBOPACK unreachable
        ;
    } else {
        if ("TURBOPACK compile-time truthy", 1) {
            if (children?.type === 'a') {
                throw Object.defineProperty(new Error('Invalid <Link> with <a> child. Please remove <a> or use <Link legacyBehavior>.\nLearn more: https://nextjs.org/docs/messages/invalid-new-link-with-extra-anchor'), "__NEXT_ERROR_CODE", {
                    value: "E209",
                    enumerable: false,
                    configurable: true
                });
            }
        }
    }
    const childRef = legacyBehavior ? child && typeof child === 'object' && child.ref : forwardedRef;
    // Use a callback ref to attach an IntersectionObserver to the anchor tag on
    // mount. In the future we will also use this to keep track of all the
    // currently mounted <Link> instances, e.g. so we can re-prefetch them after
    // a revalidation or refresh.
    const observeLinkVisibilityOnMount = _react.default.useCallback({
        "LinkComponent.useCallback[observeLinkVisibilityOnMount]": (element)=>{
            if (router !== null) {
                linkInstanceRef.current = (0, _links.mountLinkInstance)(element, formattedHref, router, fetchStrategy, prefetchEnabled, setOptimisticLinkStatus);
            }
            return ({
                "LinkComponent.useCallback[observeLinkVisibilityOnMount]": ()=>{
                    if (linkInstanceRef.current) {
                        (0, _links.unmountLinkForCurrentNavigation)(linkInstanceRef.current);
                        linkInstanceRef.current = null;
                    }
                    (0, _links.unmountPrefetchableInstance)(element);
                }
            })["LinkComponent.useCallback[observeLinkVisibilityOnMount]"];
        }
    }["LinkComponent.useCallback[observeLinkVisibilityOnMount]"], [
        prefetchEnabled,
        formattedHref,
        router,
        fetchStrategy,
        setOptimisticLinkStatus
    ]);
    const mergedRef = (0, _usemergedref.useMergedRef)(observeLinkVisibilityOnMount, childRef);
    const childProps = {
        ref: mergedRef,
        onClick (e) {
            if ("TURBOPACK compile-time truthy", 1) {
                if (!e) {
                    throw Object.defineProperty(new Error(`Component rendered inside next/link has to pass click event to "onClick" prop.`), "__NEXT_ERROR_CODE", {
                        value: "E312",
                        enumerable: false,
                        configurable: true
                    });
                }
            }
            if (!legacyBehavior && typeof onClick === 'function') {
                onClick(e);
            }
            if (legacyBehavior && child.props && typeof child.props.onClick === 'function') {
                child.props.onClick(e);
            }
            if (!router) {
                return;
            }
            if (e.defaultPrevented) {
                return;
            }
            linkClicked(e, formattedHref, linkInstanceRef, replace, scroll, onNavigate, transitionTypes);
        },
        onMouseEnter (e) {
            if (!legacyBehavior && typeof onMouseEnterProp === 'function') {
                onMouseEnterProp(e);
            }
            if (legacyBehavior && child.props && typeof child.props.onMouseEnter === 'function') {
                child.props.onMouseEnter(e);
            }
            if (!router) {
                return;
            }
            if ("TURBOPACK compile-time truthy", 1) {
                return;
            }
            //TURBOPACK unreachable
            ;
            const upgradeToDynamicPrefetch = undefined;
        },
        onTouchStart: ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : function onTouchStart(e) {
            if (!legacyBehavior && typeof onTouchStartProp === 'function') {
                onTouchStartProp(e);
            }
            if (legacyBehavior && child.props && typeof child.props.onTouchStart === 'function') {
                child.props.onTouchStart(e);
            }
            if (!router) {
                return;
            }
            if (!prefetchEnabled) {
                return;
            }
            const upgradeToDynamicPrefetch = unstable_dynamicOnHover === true;
            (0, _links.onNavigationIntent)(e.currentTarget, upgradeToDynamicPrefetch);
        }
    };
    // If the url is absolute, we can bypass the logic to prepend the basePath.
    if ((0, _utils.isAbsoluteUrl)(formattedHref)) {
        childProps.href = formattedHref;
    } else if (!legacyBehavior || passHref || child.type === 'a' && !('href' in child.props)) {
        childProps.href = (0, _addbasepath.addBasePath)(formattedHref);
    }
    let link;
    if (legacyBehavior) {
        if ("TURBOPACK compile-time truthy", 1) {
            (0, _erroronce.errorOnce)('`legacyBehavior` is deprecated and will be removed in a future ' + 'release. A codemod is available to upgrade your components:\n\n' + 'npx @next/codemod@latest new-link .\n\n' + 'Learn more: https://nextjs.org/docs/app/building-your-application/upgrading/codemods#remove-a-tags-from-link-components');
        }
        link = /*#__PURE__*/ _react.default.cloneElement(child, childProps);
    } else {
        link = /*#__PURE__*/ (0, _jsxruntime.jsx)("a", {
            ...restProps,
            ...childProps,
            children: children
        });
    }
    return /*#__PURE__*/ (0, _jsxruntime.jsx)(LinkStatusContext.Provider, {
        value: linkStatus,
        children: link
    });
}
const LinkStatusContext = /*#__PURE__*/ (0, _react.createContext)(_links.IDLE_LINK_STATUS);
const useLinkStatus = ()=>{
    return (0, _react.useContext)(LinkStatusContext);
};
function getFetchStrategyFromPrefetchProp(prefetchProp) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    else {
        return prefetchProp === null || prefetchProp === 'auto' ? _types.FetchStrategy.PPR : // (although invalid values should've been filtered out by prop validation in dev)
        _types.FetchStrategy.Full;
    }
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
}
}),
"[project]/node_modules/next/navigation.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/client/components/navigation.js [app-client] (ecmascript)");
}),
]);

//# sourceMappingURL=_09g3xrs._.js.map