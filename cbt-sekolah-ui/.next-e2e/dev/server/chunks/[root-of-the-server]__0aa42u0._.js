module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/node:crypto [external] (node:crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:crypto", () => require("node:crypto"));

module.exports = mod;
}),
"[project]/src/lib/security.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ACTION_RULES",
    ()=>ACTION_RULES,
    "SESSION_COOKIE",
    ()=>SESSION_COOKIE,
    "SESSION_TTL_SECONDS",
    ()=>SESSION_TTL_SECONDS,
    "authorizeAction",
    ()=>authorizeAction,
    "bindStudentIdentity",
    ()=>bindStudentIdentity,
    "createSessionToken",
    ()=>createSessionToken,
    "isStrongSecret",
    ()=>isStrongSecret,
    "verifySessionToken",
    ()=>verifySessionToken
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:crypto [external] (node:crypto, cjs)");
;
const SESSION_COOKIE = "ruangcbt_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const ACTION_RULES = Object.freeze({
    getConfig: {
        method: "GET",
        role: "public"
    },
    getLiveScore: {
        method: "GET",
        role: "public"
    },
    validateLiveScorePin: {
        method: "POST",
        role: "public"
    },
    login: {
        method: "POST",
        role: "public"
    },
    adminLogin: {
        method: "POST",
        role: "public"
    },
    logout: {
        method: "POST",
        role: "public"
    },
    getQuestions: {
        method: "GET",
        role: "student"
    },
    getExamPinStatus: {
        method: "GET",
        role: "student"
    },
    getExamStatus: {
        method: "GET",
        role: "student"
    },
    validateExamPin: {
        method: "POST",
        role: "student"
    },
    syncAnswers: {
        method: "POST",
        role: "student"
    },
    submitExam: {
        method: "POST",
        role: "student"
    },
    reportViolation: {
        method: "POST",
        role: "student"
    },
    getAdminQuestions: {
        method: "GET",
        role: "admin"
    },
    getUsers: {
        method: "GET",
        role: "admin"
    },
    exportResults: {
        method: "GET",
        role: "admin"
    },
    // Dipanggil route AI (src/lib/aiAnalysis.ts) yang menyuntik id_siswa sendiri.
    // Lewat proxy biasa action ini tidak berguna: body GET selalu kosong, jadi GAS
    // menolaknya karena id_siswa tidak ada.
    getStudentAnalysis: {
        method: "GET",
        role: "admin"
    },
    getMataPelajaran: {
        method: "GET",
        role: "admin"
    },
    getQuestionCollections: {
        method: "GET",
        role: "admin"
    },
    getKelas: {
        method: "GET",
        role: "admin"
    },
    getPrintSettings: {
        method: "GET",
        role: "admin"
    },
    getExamSummary: {
        method: "GET",
        role: "admin"
    },
    resetUserLogin: {
        method: "POST",
        role: "admin"
    },
    createQuestion: {
        method: "POST",
        role: "admin"
    },
    updateQuestion: {
        method: "POST",
        role: "admin"
    },
    deleteQuestion: {
        method: "POST",
        role: "admin"
    },
    importQuestions: {
        method: "POST",
        role: "admin"
    },
    moveQuestions: {
        method: "POST",
        role: "admin"
    },
    createQuestionCollection: {
        method: "POST",
        role: "admin"
    },
    updateQuestionCollection: {
        method: "POST",
        role: "admin"
    },
    updateConfig: {
        method: "POST",
        role: "admin"
    },
    setExamPin: {
        method: "POST",
        role: "admin"
    },
    setExamStatus: {
        method: "POST",
        role: "admin"
    },
    saveExamConfig: {
        method: "POST",
        role: "admin"
    },
    createStudent: {
        method: "POST",
        role: "admin"
    },
    updateStudent: {
        method: "POST",
        role: "admin"
    },
    deleteStudent: {
        method: "POST",
        role: "admin"
    },
    importStudents: {
        method: "POST",
        role: "admin"
    },
    deleteAllStudents: {
        method: "POST",
        role: "admin"
    },
    uploadImage: {
        method: "POST",
        role: "admin"
    },
    createMataPelajaran: {
        method: "POST",
        role: "admin"
    },
    updateMataPelajaran: {
        method: "POST",
        role: "admin"
    },
    deleteMataPelajaran: {
        method: "POST",
        role: "admin"
    },
    deleteAllMataPelajaran: {
        method: "POST",
        role: "admin"
    },
    createKelas: {
        method: "POST",
        role: "admin"
    },
    updateKelas: {
        method: "POST",
        role: "admin"
    },
    deleteKelas: {
        method: "POST",
        role: "admin"
    },
    deleteAllKelas: {
        method: "POST",
        role: "admin"
    },
    savePrintSettings: {
        method: "POST",
        role: "admin"
    }
});
function authorizeAction(action, method, schoolId, session) {
    const rule = ACTION_RULES[action];
    if (!rule || rule.method !== method) {
        return {
            allowed: false,
            status: 403,
            reason: "unknown_action"
        };
    }
    if (rule.role === "public") return {
        allowed: true,
        rule
    };
    if (!session) return {
        allowed: false,
        status: 401,
        reason: "missing_session"
    };
    if (session.school_id !== schoolId) {
        return {
            allowed: false,
            status: 403,
            reason: "tenant_mismatch"
        };
    }
    if (session.role !== rule.role) {
        return {
            allowed: false,
            status: 403,
            reason: "wrong_role"
        };
    }
    return {
        allowed: true,
        rule
    };
}
function bindStudentIdentity(body, session) {
    const suppliedId = body.id_siswa;
    if (suppliedId !== undefined && String(suppliedId) !== session.subject) {
        return {
            allowed: false
        };
    }
    return {
        allowed: true,
        body: {
            ...body,
            id_siswa: session.subject
        }
    };
}
function isStrongSecret(secret) {
    return typeof secret === "string" && secret.length >= 32;
}
function createSessionToken(schoolId, subject, role, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
    if (!isStrongSecret(secret)) throw new Error("Session signing secret must be at least 32 characters");
    const claims = {
        version: 1,
        session_id: (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["randomBytes"])(16).toString("base64url"),
        school_id: schoolId,
        subject,
        role,
        issued_at: nowSeconds,
        exp: nowSeconds + SESSION_TTL_SECONDS
    };
    const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
    return `${payload}.${signature(payload, secret)}`;
}
function verifySessionToken(token, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
    if (!token || !isStrongSecret(secret)) return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const expected = Buffer.from(signature(parts[0], secret));
    const received = Buffer.from(parts[1]);
    if (expected.length !== received.length || !(0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["timingSafeEqual"])(expected, received)) return null;
    try {
        const claims = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
        if (claims.version !== 1 || claims.role !== "student" && claims.role !== "admin" || typeof claims.school_id !== "string" || !claims.school_id || typeof claims.subject !== "string" || !claims.subject || typeof claims.issued_at !== "number" || typeof claims.exp !== "number" || claims.issued_at > nowSeconds + 60 || claims.exp <= nowSeconds) return null;
        return claims;
    } catch  {
        return null;
    }
}
function signature(payload, secret) {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["createHmac"])("sha256", secret).update(payload).digest("base64url");
}
}),
"[project]/src/lib/questionSanitize.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
"[project]/src/lib/googleRequest.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GOOGLE_MESSAGES",
    ()=>GOOGLE_MESSAGES,
    "GOOGLE_REQUEST_TIMEOUT_MS",
    ()=>GOOGLE_REQUEST_TIMEOUT_MS,
    "fetchGoogleWithTimeout",
    ()=>fetchGoogleWithTimeout,
    "teacherMessage",
    ()=>teacherMessage
]);
const GOOGLE_REQUEST_TIMEOUT_MS = 15_000;
const GOOGLE_MESSAGES = Object.freeze({
    timeout: "Google tidak merespons. Silakan coba lagi.",
    busy: "Google sedang sibuk. Tunggu sebentar lalu coba lagi.",
    denied: "Google belum memberikan izin untuk membaca Form.",
    partialScope: "Izin Google belum lengkap. Ulangi Hubungkan Akun Google dan centang semua izin yang diminta.",
    expired: "Sesi Google Anda sudah berakhir. Hubungkan kembali akun Google.",
    unreadable: "Form ini tidak dapat dibaca oleh RuangCBT.",
    image: "Gambar tidak berhasil diambil."
});
const SAFE_MESSAGES = new Set(Object.values(GOOGLE_MESSAGES));
function teacherMessage(error) {
    const message = error instanceof Error ? error.message : "";
    return SAFE_MESSAGES.has(message) ? message : "Google Form tidak dapat diproses. Silakan coba lagi.";
}
async function fetchGoogleWithTimeout(input, init, fetcher = fetch, timeoutMs = GOOGLE_REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(), timeoutMs);
    try {
        return await fetcher(input, {
            ...init,
            signal: controller.signal
        });
    } catch  {
        throw new Error(GOOGLE_MESSAGES.timeout);
    } finally{
        clearTimeout(timeout);
    }
}
}),
"[project]/src/lib/googleOAuth.ts [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GOOGLE_FORMS_SCOPES",
    ()=>GOOGLE_FORMS_SCOPES,
    "GOOGLE_FORMS_TOKEN_COOKIE",
    ()=>GOOGLE_FORMS_TOKEN_COOKIE,
    "GOOGLE_OAUTH_STATE_COOKIE",
    ()=>GOOGLE_OAUTH_STATE_COOKIE,
    "GOOGLE_OAUTH_STATE_TTL_SECONDS",
    ()=>GOOGLE_OAUTH_STATE_TTL_SECONDS,
    "bindGoogleSession",
    ()=>bindGoogleSession,
    "createGoogleAuthorizationUrl",
    ()=>createGoogleAuthorizationUrl,
    "exchangeGoogleCode",
    ()=>exchangeGoogleCode,
    "getGoogleOAuthConfig",
    ()=>getGoogleOAuthConfig,
    "googleConnectionStatus",
    ()=>googleConnectionStatus,
    "googleTokenBelongsToSession",
    ()=>googleTokenBelongsToSession,
    "grantedAllScopes",
    ()=>grantedAllScopes,
    "openGoogleCookie",
    ()=>openGoogleCookie,
    "revokeGoogleToken",
    ()=>revokeGoogleToken,
    "sameSecretValue",
    ()=>sameSecretValue,
    "sealGoogleCookie",
    ()=>sealGoogleCookie,
    "validGoogleState",
    ()=>validGoogleState,
    "validGoogleToken",
    ()=>validGoogleToken
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:crypto [external] (node:crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$googleRequest$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/googleRequest.ts [app-route] (ecmascript)");
;
;
;
const GOOGLE_OAUTH_STATE_COOKIE = "ruangcbt_google_oauth_state";
const GOOGLE_FORMS_TOKEN_COOKIE = "ruangcbt_google_forms_token";
const GOOGLE_OAUTH_STATE_TTL_SECONDS = 10 * 60;
const GOOGLE_FORMS_SCOPES = Object.freeze([
    "https://www.googleapis.com/auth/forms.body.readonly",
    "https://www.googleapis.com/auth/drive.metadata.readonly"
]);
function grantedAllScopes(scope) {
    const granted = new Set(typeof scope === "string" ? scope.split(" ").filter(Boolean) : []);
    return GOOGLE_FORMS_SCOPES.every((required)=>granted.has(required));
}
function getGoogleOAuthConfig(env = process.env) {
    const clientId = env.GOOGLE_OAUTH_CLIENT_ID?.trim() ?? "";
    const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ?? "";
    const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ?? "";
    if (!clientId || !clientSecret || !redirectUri) return null;
    try {
        const parsed = new URL(redirectUri);
        if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") return null;
    } catch  {
        return null;
    }
    return {
        clientId,
        clientSecret,
        redirectUri
    };
}
function createGoogleAuthorizationUrl(config, state) {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", GOOGLE_FORMS_SCOPES.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "online");
    return url.toString();
}
function bindGoogleSession(sessionToken, secret) {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["createHmac"])("sha256", deriveKey(secret, "google-session-binding")).update(sessionToken).digest("base64url");
}
function sameSecretValue(left, right) {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["timingSafeEqual"])(a, b);
}
function sealGoogleCookie(value, secret, purpose) {
    const iv = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["randomBytes"])(12);
    const cipher = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["createCipheriv"])("aes-256-gcm", deriveKey(secret, purpose), iv);
    const plaintext = Buffer.from(JSON.stringify(value), "utf8");
    const encrypted = Buffer.concat([
        cipher.update(plaintext),
        cipher.final()
    ]);
    return [
        iv,
        encrypted,
        cipher.getAuthTag()
    ].map((part)=>part.toString("base64url")).join(".");
}
function openGoogleCookie(sealed, secret, purpose) {
    if (!sealed) return null;
    const parts = sealed.split(".");
    if (parts.length !== 3) return null;
    try {
        const iv = Buffer.from(parts[0], "base64url");
        const encrypted = Buffer.from(parts[1], "base64url");
        const tag = Buffer.from(parts[2], "base64url");
        if (iv.length !== 12 || tag.length !== 16) return null;
        const decipher = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["createDecipheriv"])("aes-256-gcm", deriveKey(secret, purpose), iv);
        decipher.setAuthTag(tag);
        return JSON.parse(Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]).toString("utf8"));
    } catch  {
        return null;
    }
}
function validGoogleState(state, nonce, schoolId, subject, binding, nowSeconds = Math.floor(Date.now() / 1000)) {
    return Boolean(state && state.version === 1 && state.expiresAt > nowSeconds && sameSecretValue(state.nonce, nonce) && state.schoolId === schoolId && state.subject === subject && sameSecretValue(state.sessionBinding, binding));
}
function validGoogleToken(token, schoolId, subject, binding, nowSeconds = Math.floor(Date.now() / 1000)) {
    return Boolean(googleTokenBelongsToSession(token, schoolId, subject, binding) && token.expiresAt > nowSeconds + 15);
}
function googleTokenBelongsToSession(token, schoolId, subject, binding) {
    return Boolean(token && token.version === 1 && typeof token.accessToken === "string" && token.accessToken && token.schoolId === schoolId && token.subject === subject && sameSecretValue(token.sessionBinding, binding));
}
function googleConnectionStatus(configured, token) {
    return {
        configured,
        connected: token !== null
    };
}
async function exchangeGoogleCode(config, code, fetcher = fetch) {
    const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$googleRequest$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fetchGoogleWithTimeout"])("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            code,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: config.redirectUri,
            grant_type: "authorization_code"
        }),
        cache: "no-store"
    }, fetcher);
    if (!response.ok) throw new Error(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$googleRequest$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["GOOGLE_MESSAGES"].denied);
    let data;
    try {
        data = await response.json();
    } catch  {
        throw new Error(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$googleRequest$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["GOOGLE_MESSAGES"].denied);
    }
    const accessToken = typeof data.access_token === "string" ? data.access_token : "";
    const expiresIn = typeof data.expires_in === "number" ? Math.floor(data.expires_in) : 0;
    if (!accessToken || String(data.token_type ?? "").toLowerCase() !== "bearer" || expiresIn < 60) {
        throw new Error(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$googleRequest$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["GOOGLE_MESSAGES"].denied);
    }
    if (!grantedAllScopes(data.scope)) throw new Error(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$googleRequest$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["GOOGLE_MESSAGES"].partialScope);
    return {
        accessToken,
        expiresIn: Math.min(expiresIn, 60 * 60)
    };
}
async function revokeGoogleToken(accessToken, fetcher = fetch) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$googleRequest$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fetchGoogleWithTimeout"])("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            token: accessToken
        }),
        cache: "no-store"
    }, fetcher);
}
function deriveKey(secret, purpose) {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["createHmac"])("sha256", secret).update(`ruangcbt:${purpose}:v1`).digest();
}
}),
"[project]/src/lib/timeouts.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
"[project]/src/lib/proxy.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "callGas",
    ()=>callGas,
    "handleProxyRequest",
    ()=>handleProxyRequest
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$security$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/security.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$questionSanitize$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/questionSanitize.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$googleOAuth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/lib/googleOAuth.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$timeouts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/timeouts.ts [app-route] (ecmascript)");
;
;
;
;
;
const STUDENT_IDENTITY_ACTIONS = new Set([
    "syncAnswers",
    "submitExam",
    "reportViolation"
]);
const QUESTION_WRITE_ACTIONS = new Set([
    "createQuestion",
    "updateQuestion"
]);
function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
async function handleProxyRequest(request, method, schoolId, resolveTarget) {
    const parsed = await parseRequest(request, method);
    if (!parsed) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            message: "Request tidak valid",
            code: "bad_request"
        }, {
            status: 400
        });
    }
    const sessionSecret = process.env.SESSION_SIGNING_SECRET;
    const validSessionSecret = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$security$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isStrongSecret"])(sessionSecret) ? sessionSecret : null;
    const rule = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$security$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ACTION_RULES"][parsed.action];
    const createsSession = parsed.action === "login" || parsed.action === "adminLogin";
    if (rule && (rule.role !== "public" || createsSession) && !validSessionSecret) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            message: "Konfigurasi session server belum lengkap",
            code: "server_config"
        }, {
            status: 503
        });
    }
    const session = validSessionSecret ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$security$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifySessionToken"])(request.cookies.get(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$security$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SESSION_COOKIE"])?.value, validSessionSecret) : null;
    const decision = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$security$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["authorizeAction"])(parsed.action, method, schoolId, session);
    if (!decision.allowed) {
        const message = decision.status === 401 ? "Sesi diperlukan" : "Akses ditolak";
        const code = decision.status === 401 ? "unauthenticated" : "forbidden";
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            message,
            code
        }, {
            status: decision.status
        });
    }
    if (parsed.action === "logout") {
        const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            message: "Logout berhasil"
        });
        clearSessionCookie(response);
        return response;
    }
    let body = parsed.body;
    if (decision.rule.role === "student" && STUDENT_IDENTITY_ACTIONS.has(parsed.action)) {
        if (!session) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: false,
                message: "Sesi diperlukan",
                code: "unauthenticated"
            }, {
                status: 401
            });
        }
        const bound = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$security$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bindStudentIdentity"])(body, session);
        if (!bound.allowed) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: false,
                message: "Identitas siswa tidak sesuai sesi",
                code: "forbidden"
            }, {
                status: 403
            });
        }
        body = bound.body;
    }
    // Soal dilayani per attempt, jadi GAS perlu tahu siswanya. Identitas selalu
    // diambil dari sesi bertanda tangan — siswa tidak pernah dapat memilih attempt,
    // exam, atau daftar soal milik orang lain lewat query.
    if (parsed.action === "getQuestions" && session) {
        body = {
            ...body,
            id_siswa: session.subject
        };
    }
    // Rich text soal masuk lewat request, jadi disanitasi di boundary server sebelum
    // pernah tersimpan. Renderer tetap menyanitasi ulang untuk data lama.
    if (QUESTION_WRITE_ACTIONS.has(parsed.action)) {
        if (!isPlainObject(body.data)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: false,
                message: "Data soal tidak valid",
                code: "validation"
            }, {
                status: 400
            });
        }
        body = {
            ...body,
            data: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$questionSanitize$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sanitizeQuestionPayload"])(body.data)
        };
    }
    // Import Word mengirim banyak soal sekaligus; tiap soal melewati sanitizer yang
    // sama dengan entri manual, sebelum GAS memvalidasinya satu per satu.
    if (parsed.action === "importQuestions") {
        if (!Array.isArray(body.questions) || !body.questions.every(isPlainObject)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: false,
                message: "Data soal tidak valid",
                code: "validation"
            }, {
                status: 400
            });
        }
        body = {
            ...body,
            questions: body.questions.map(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$questionSanitize$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sanitizeQuestionPayload"])
        };
    }
    const target = await resolveTarget();
    if (!target) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            message: "Sekolah tidak ditemukan",
            code: "tenant_not_found"
        }, {
            status: 404
        });
    }
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$security$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isStrongSecret"])(target.sharedSecret)) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            message: "Konfigurasi keamanan sekolah belum lengkap",
            code: "tenant_config"
        }, {
            status: 503
        });
    }
    try {
        const upstream = await callGas(target, method, parsed.action, body);
        const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(upstream.data, {
            status: upstream.status
        });
        if (upstream.data.success && (parsed.action === "login" || parsed.action === "adminLogin")) {
            if (!validSessionSecret) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: false,
                    message: "Konfigurasi session server belum lengkap",
                    code: "server_config"
                }, {
                    status: 503
                });
            }
            const subject = parsed.action === "adminLogin" ? "admin" : String(upstream.data.data?.id_siswa ?? "");
            if (!subject) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: false,
                    message: "Respons login tidak valid",
                    code: "upstream_invalid"
                }, {
                    status: 502
                });
            }
            const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$security$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createSessionToken"])(schoolId, subject, parsed.action === "adminLogin" ? "admin" : "student", validSessionSecret);
            response.cookies.set(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$security$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SESSION_COOKIE"], token, {
                httpOnly: true,
                secure: ("TURBOPACK compile-time value", "development") === "production",
                sameSite: "lax",
                path: "/",
                maxAge: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$security$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SESSION_TTL_SECONDS"]
            });
        } else if (upstream.data.success && parsed.action === "submitExam") {
            clearSessionCookie(response);
        }
        return response;
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.error(`Proxy ${method} ${parsed.action} error [${schoolId}]:`, detail);
        // Timeout dibedakan dari kegagalan upstream lain supaya layar dapat menyarankan
        // "coba lagi" alih-alih menampilkan kegagalan permanen. Detail internal (URL
        // GAS, stack) tidak pernah ikut ke klien.
        if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$timeouts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["RequestTimeoutError"]) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: false,
                message: "Server sekolah tidak merespons tepat waktu. Silakan coba lagi.",
                code: "upstream_timeout"
            }, {
                status: 504
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            message: "Gagal terhubung ke server backend (GAS).",
            code: "upstream_error"
        }, {
            status: 502
        });
    }
}
async function parseRequest(request, method) {
    if (method === "GET") {
        const action = new URL(request.url).searchParams.get("action")?.trim();
        return action ? {
            action,
            body: {}
        } : null;
    }
    try {
        const body = await request.json();
        const action = typeof body.action === "string" ? body.action.trim() : "";
        return action ? {
            action,
            body
        } : null;
    } catch  {
        return null;
    }
}
async function callGas(target, method, action, body) {
    const gasUrl = new URL(target.gasUrl);
    // Anggaran waktu per action: import massal tidak boleh dipotong oleh batas
    // yang dirancang untuk login.
    const timeoutMs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$timeouts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["gasTimeoutMs"])(action);
    let response;
    if (method === "GET") {
        gasUrl.searchParams.set("action", action);
        // Hanya nilai yang sudah diturunkan server (mis. id_siswa dari sesi) yang sampai
        // di sini; body GET selalu dimulai kosong, bukan dari query milik klien.
        for (const [key, value] of Object.entries(body)){
            if (typeof value === "string" && value) gasUrl.searchParams.set(key, value);
        }
        gasUrl.searchParams.set("proxy_secret", target.sharedSecret);
        response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$timeouts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fetchWithTimeout"])(gasUrl, {
            method: "GET",
            cache: "no-store"
        }, timeoutMs);
    } else {
        response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$timeouts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fetchWithTimeout"])(gasUrl, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({
                ...body,
                action,
                proxy_secret: target.sharedSecret
            }),
            cache: "no-store"
        }, timeoutMs);
    }
    const text = await response.text();
    try {
        return {
            data: JSON.parse(text),
            status: response.ok ? 200 : 502
        };
    } catch  {
        throw new Error(`GAS returned non-JSON response (${response.status})`);
    }
}
function clearSessionCookie(response) {
    response.cookies.set(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$security$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SESSION_COOKIE"], "", {
        httpOnly: true,
        secure: ("TURBOPACK compile-time value", "development") === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0
    });
    response.cookies.set(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$googleOAuth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["GOOGLE_FORMS_TOKEN_COOKIE"], "", {
        httpOnly: true,
        secure: ("TURBOPACK compile-time value", "development") === "production",
        sameSite: "lax",
        path: "/api/google-forms",
        maxAge: 0
    });
    response.cookies.set(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$googleOAuth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["GOOGLE_OAUTH_STATE_COOKIE"], "", {
        httpOnly: true,
        secure: ("TURBOPACK compile-time value", "development") === "production",
        sameSite: "lax",
        path: "/api/google-forms/oauth/callback",
        maxAge: 0
    });
}
}),
"[project]/src/app/api/proxy/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$proxy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/proxy.ts [app-route] (ecmascript)");
;
const GAS_URL = process.env.GAS_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
const GAS_SHARED_SECRET = process.env.GAS_SHARED_SECRET || '';
const SCHOOL_ID = process.env.SINGLE_TENANT_SCHOOL_ID || 'default';
async function resolveTarget() {
    return GAS_URL ? {
        gasUrl: GAS_URL,
        sharedSecret: GAS_SHARED_SECRET
    } : null;
}
async function GET(request) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$proxy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["handleProxyRequest"])(request, 'GET', SCHOOL_ID, resolveTarget);
}
async function POST(request) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$proxy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["handleProxyRequest"])(request, 'POST', SCHOOL_ID, resolveTarget);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0aa42u0._.js.map