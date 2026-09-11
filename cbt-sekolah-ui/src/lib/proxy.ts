import { NextRequest, NextResponse } from "next/server.js";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  ACTION_RULES,
  authorizeAction,
  bindStudentIdentity,
  createSessionToken,
  isStrongSecret,
  verifySessionToken,
  type ProxyMethod,
} from "./security.ts";
import { sanitizeQuestionPayload } from "./questionSanitize.ts";

export interface ProxyTarget {
  gasUrl: string;
  sharedSecret: string;
}

type TargetResolver = () => Promise<ProxyTarget | null>;

const STUDENT_IDENTITY_ACTIONS = new Set(["syncAnswers", "submitExam", "reportViolation"]);
const QUESTION_WRITE_ACTIONS = new Set(["createQuestion", "updateQuestion"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function handleProxyRequest(
  request: NextRequest,
  method: ProxyMethod,
  schoolId: string,
  resolveTarget: TargetResolver
) {
  const parsed = await parseRequest(request, method);
  if (!parsed) {
    return NextResponse.json({ success: false, message: "Request tidak valid" }, { status: 400 });
  }

  const sessionSecret = process.env.SESSION_SIGNING_SECRET;
  const validSessionSecret = isStrongSecret(sessionSecret) ? sessionSecret : null;
  const rule = ACTION_RULES[parsed.action];
  const createsSession = parsed.action === "login" || parsed.action === "adminLogin";
  if (rule && (rule.role !== "public" || createsSession) && !validSessionSecret) {
    return NextResponse.json(
      { success: false, message: "Konfigurasi session server belum lengkap" },
      { status: 503 }
    );
  }
  const session = validSessionSecret
    ? verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, validSessionSecret)
    : null;
  const decision = authorizeAction(parsed.action, method, schoolId, session);

  if (!decision.allowed) {
    const message = decision.status === 401 ? "Sesi diperlukan" : "Akses ditolak";
    return NextResponse.json({ success: false, message }, { status: decision.status });
  }

  if (parsed.action === "logout") {
    const response = NextResponse.json({ success: true, message: "Logout berhasil" });
    clearSessionCookie(response);
    return response;
  }

  let body = parsed.body;
  if (decision.rule.role === "student" && STUDENT_IDENTITY_ACTIONS.has(parsed.action)) {
    if (!session) {
      return NextResponse.json({ success: false, message: "Sesi diperlukan" }, { status: 401 });
    }
    const bound = bindStudentIdentity(body, session);
    if (!bound.allowed) {
      return NextResponse.json({ success: false, message: "Identitas siswa tidak sesuai sesi" }, { status: 403 });
    }
    body = bound.body;
  }

  // Rich text soal masuk lewat request, jadi disanitasi di boundary server sebelum
  // pernah tersimpan. Renderer tetap menyanitasi ulang untuk data lama.
  if (QUESTION_WRITE_ACTIONS.has(parsed.action)) {
    if (!isPlainObject(body.data)) {
      return NextResponse.json({ success: false, message: "Data soal tidak valid" }, { status: 400 });
    }
    body = { ...body, data: sanitizeQuestionPayload(body.data) };
  }

  const target = await resolveTarget();
  if (!target) {
    return NextResponse.json({ success: false, message: "Sekolah tidak ditemukan" }, { status: 404 });
  }
  if (!isStrongSecret(target.sharedSecret)) {
    return NextResponse.json(
      { success: false, message: "Konfigurasi keamanan sekolah belum lengkap" },
      { status: 503 }
    );
  }

  try {
    const upstream = await callGas(target, method, parsed.action, body);
    const response = NextResponse.json(upstream.data, { status: upstream.status });

    if (upstream.data.success && (parsed.action === "login" || parsed.action === "adminLogin")) {
      if (!validSessionSecret) {
        return NextResponse.json(
          { success: false, message: "Konfigurasi session server belum lengkap" },
          { status: 503 }
        );
      }
      const subject = parsed.action === "adminLogin"
        ? "admin"
        : String((upstream.data.data as { id_siswa?: unknown } | undefined)?.id_siswa ?? "");
      if (!subject) {
        return NextResponse.json({ success: false, message: "Respons login tidak valid" }, { status: 502 });
      }
      const token = createSessionToken(
        schoolId,
        subject,
        parsed.action === "adminLogin" ? "admin" : "student",
        validSessionSecret
      );
      response.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_TTL_SECONDS,
      });
    } else if (upstream.data.success && parsed.action === "submitExam") {
      clearSessionCookie(response);
    }

    return response;
  } catch (error) {
    console.error(`Proxy ${method} error [${schoolId}]:`, error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, message: "Failed to connect to server" },
      { status: 502 }
    );
  }
}

async function parseRequest(request: NextRequest, method: ProxyMethod) {
  if (method === "GET") {
    const action = new URL(request.url).searchParams.get("action")?.trim();
    return action ? { action, body: {} as Record<string, unknown> } : null;
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action.trim() : "";
    return action ? { action, body } : null;
  } catch {
    return null;
  }
}

async function callGas(
  target: ProxyTarget,
  method: ProxyMethod,
  action: string,
  body: Record<string, unknown>
): Promise<{ data: Record<string, unknown> & { success?: boolean }; status: number }> {
  const gasUrl = new URL(target.gasUrl);
  let response: Response;

  if (method === "GET") {
    gasUrl.searchParams.set("action", action);
    gasUrl.searchParams.set("proxy_secret", target.sharedSecret);
    response = await fetch(gasUrl, { method: "GET", cache: "no-store" });
  } else {
    response = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...body, action, proxy_secret: target.sharedSecret }),
      cache: "no-store",
    });
  }

  const text = await response.text();
  try {
    return {
      data: JSON.parse(text) as Record<string, unknown> & { success?: boolean },
      status: response.ok ? 200 : 502,
    };
  } catch {
    throw new Error(`GAS returned non-JSON response (${response.status})`);
  }
}

function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
