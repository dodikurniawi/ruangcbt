import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "ruangcbt_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export type SessionRole = "student" | "admin";
export type ProxyMethod = "GET" | "POST";

export interface SessionClaims {
  version: 1;
  school_id: string;
  subject: string;
  role: SessionRole;
  issued_at: number;
  exp: number;
}

type RequiredRole = "public" | SessionRole;

interface ActionRule {
  method: ProxyMethod;
  role: RequiredRole;
}

export const ACTION_RULES: Readonly<Record<string, ActionRule>> = Object.freeze({
  getConfig: { method: "GET", role: "public" },
  getLiveScore: { method: "GET", role: "public" },
  validateLiveScorePin: { method: "POST", role: "public" },
  login: { method: "POST", role: "public" },
  adminLogin: { method: "POST", role: "public" },
  logout: { method: "POST", role: "public" },

  getQuestions: { method: "GET", role: "student" },
  getExamPinStatus: { method: "GET", role: "student" },
  getExamStatus: { method: "GET", role: "student" },
  validateExamPin: { method: "POST", role: "student" },
  syncAnswers: { method: "POST", role: "student" },
  submitExam: { method: "POST", role: "student" },
  reportViolation: { method: "POST", role: "student" },

  getAdminQuestions: { method: "GET", role: "admin" },
  getUsers: { method: "GET", role: "admin" },
  exportResults: { method: "GET", role: "admin" },
  getMataPelajaran: { method: "GET", role: "admin" },
  getKelas: { method: "GET", role: "admin" },
  getPrintSettings: { method: "GET", role: "admin" },
  getExamSummary: { method: "GET", role: "admin" },
  resetUserLogin: { method: "POST", role: "admin" },
  createQuestion: { method: "POST", role: "admin" },
  updateQuestion: { method: "POST", role: "admin" },
  deleteQuestion: { method: "POST", role: "admin" },
  importQuestions: { method: "POST", role: "admin" },
  updateConfig: { method: "POST", role: "admin" },
  setExamPin: { method: "POST", role: "admin" },
  setExamStatus: { method: "POST", role: "admin" },
  saveExamConfig: { method: "POST", role: "admin" },
  createStudent: { method: "POST", role: "admin" },
  updateStudent: { method: "POST", role: "admin" },
  deleteStudent: { method: "POST", role: "admin" },
  importStudents: { method: "POST", role: "admin" },
  deleteAllStudents: { method: "POST", role: "admin" },
  uploadImage: { method: "POST", role: "admin" },
  createMataPelajaran: { method: "POST", role: "admin" },
  updateMataPelajaran: { method: "POST", role: "admin" },
  deleteMataPelajaran: { method: "POST", role: "admin" },
  deleteAllMataPelajaran: { method: "POST", role: "admin" },
  createKelas: { method: "POST", role: "admin" },
  updateKelas: { method: "POST", role: "admin" },
  deleteKelas: { method: "POST", role: "admin" },
  deleteAllKelas: { method: "POST", role: "admin" },
  savePrintSettings: { method: "POST", role: "admin" },
});

export type AuthorizationDecision =
  | { allowed: true; rule: ActionRule }
  | { allowed: false; status: 401 | 403; reason: "unknown_action" | "missing_session" | "tenant_mismatch" | "wrong_role" };

export function authorizeAction(
  action: string,
  method: ProxyMethod,
  schoolId: string,
  session: SessionClaims | null
): AuthorizationDecision {
  const rule = ACTION_RULES[action];
  if (!rule || rule.method !== method) {
    return { allowed: false, status: 403, reason: "unknown_action" };
  }
  if (rule.role === "public") return { allowed: true, rule };
  if (!session) return { allowed: false, status: 401, reason: "missing_session" };
  if (session.school_id !== schoolId) {
    return { allowed: false, status: 403, reason: "tenant_mismatch" };
  }
  if (session.role !== rule.role) {
    return { allowed: false, status: 403, reason: "wrong_role" };
  }
  return { allowed: true, rule };
}

export function bindStudentIdentity(
  body: Record<string, unknown>,
  session: SessionClaims
): { allowed: true; body: Record<string, unknown> } | { allowed: false } {
  const suppliedId = body.id_siswa;
  if (suppliedId !== undefined && String(suppliedId) !== session.subject) {
    return { allowed: false };
  }
  return { allowed: true, body: { ...body, id_siswa: session.subject } };
}

export function isStrongSecret(secret: string | undefined): secret is string {
  return typeof secret === "string" && secret.length >= 32;
}

export function createSessionToken(
  schoolId: string,
  subject: string,
  role: SessionRole,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): string {
  if (!isStrongSecret(secret)) throw new Error("Session signing secret must be at least 32 characters");
  const claims: SessionClaims = {
    version: 1,
    school_id: schoolId,
    subject,
    role,
    issued_at: nowSeconds,
    exp: nowSeconds + SESSION_TTL_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function verifySessionToken(
  token: string | undefined,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): SessionClaims | null {
  if (!token || !isStrongSecret(secret)) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const expected = Buffer.from(signature(parts[0], secret));
  const received = Buffer.from(parts[1]);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const claims = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as Partial<SessionClaims>;
    if (
      claims.version !== 1 ||
      (claims.role !== "student" && claims.role !== "admin") ||
      typeof claims.school_id !== "string" || !claims.school_id ||
      typeof claims.subject !== "string" || !claims.subject ||
      typeof claims.issued_at !== "number" ||
      typeof claims.exp !== "number" ||
      claims.issued_at > nowSeconds + 60 ||
      claims.exp <= nowSeconds
    ) return null;
    return claims as SessionClaims;
  } catch {
    return null;
  }
}

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}
