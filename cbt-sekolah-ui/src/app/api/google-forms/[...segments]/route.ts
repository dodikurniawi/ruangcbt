import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  isStrongSecret,
  verifySessionToken,
  type SessionClaims,
} from "@/lib/security";
import {
  GOOGLE_FORMS_TOKEN_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_STATE_TTL_SECONDS,
  bindGoogleSession,
  createGoogleAuthorizationUrl,
  exchangeGoogleCode,
  getGoogleOAuthConfig,
  googleConnectionStatus,
  openGoogleCookie,
  revokeGoogleToken,
  sealGoogleCookie,
  validGoogleState,
  validGoogleToken,
  type GoogleOAuthState,
  type GoogleTokenSession,
} from "@/lib/googleOAuth";
import { fetchGoogleImage, getGoogleForm, listGoogleForms } from "@/lib/googleForms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ segments: string[] }> };

interface AdminContext {
  secret: string;
  sessionToken: string;
  session: SessionClaims;
  binding: string;
}

interface ImageTicket {
  version: 1;
  schoolId: string;
  subject: string;
  sessionBinding: string;
  sourceUrl: string;
  expiresAt: number;
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handle(request, "GET", (await context.params).segments);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handle(request, "POST", (await context.params).segments);
}

async function handle(request: NextRequest, method: "GET" | "POST", segments: string[]) {
  const path = segments.join("/");
  const config = getGoogleOAuthConfig();
  if (path === "status" && method === "GET" && !config) {
    return NextResponse.json({ success: true, data: googleConnectionStatus(false, null) });
  }
  if (!config) return teacherError("Integrasi Google Form belum dikonfigurasi admin sistem.", 503);

  const admin = getAdminContext(request);
  if (admin instanceof NextResponse) {
    if (path === "oauth/callback") {
      return popupResponse(false, "Sesi RuangCBT Anda sudah berakhir. Login kembali sebagai admin.", config.redirectUri);
    }
    return admin;
  }

  try {
    if (path === "oauth/start" && method === "GET") {
      const nonce = randomBytes(32).toString("base64url");
      const state: GoogleOAuthState = {
        version: 1,
        nonce,
        schoolId: admin.session.school_id,
        subject: admin.session.subject,
        sessionBinding: admin.binding,
        expiresAt: Math.floor(Date.now() / 1000) + GOOGLE_OAUTH_STATE_TTL_SECONDS,
      };
      const response = NextResponse.redirect(createGoogleAuthorizationUrl(config, nonce));
      response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, sealGoogleCookie(state, admin.secret, "oauth-state"), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/google-forms/oauth/callback",
        maxAge: GOOGLE_OAUTH_STATE_TTL_SECONDS,
      });
      return response;
    }

    if (path === "oauth/callback" && method === "GET") {
      return oauthCallback(request, admin, config);
    }

    const token = getTokenSession(request, admin);
    if (path === "status" && method === "GET") {
      return NextResponse.json({ success: true, data: googleConnectionStatus(true, token) });
    }
    if (!token) return teacherError("Sesi Google Anda sudah berakhir. Hubungkan kembali akun Google.", 401);

    if (path === "forms" && method === "GET") {
      const pageToken = new URL(request.url).searchParams.get("pageToken")?.trim() ?? "";
      if (pageToken && (pageToken.length > 1024 || !/^[A-Za-z0-9._~+/=-]+$/.test(pageToken))) {
        return teacherError("Permintaan daftar Form tidak valid.", 400);
      }
      const data = await listGoogleForms(token.accessToken, pageToken);
      return NextResponse.json({ success: true, data });
    }

    if (segments[0] === "forms" && segments.length === 2 && method === "GET") {
      const formId = segments[1];
      if (!/^[A-Za-z0-9_-]{10,256}$/.test(formId)) return teacherError("Form ini tidak dapat dibaca oleh RuangCBT.", 400);
      const preview = await getGoogleForm(token.accessToken, formId, (contentUri) => {
        const ticket: ImageTicket = {
          version: 1,
          schoolId: admin.session.school_id,
          subject: admin.session.subject,
          sessionBinding: admin.binding,
          sourceUrl: contentUri,
          expiresAt: Math.floor(Date.now() / 1000) + 10 * 60,
        };
        return `/api/google-forms/image?ticket=${encodeURIComponent(sealGoogleCookie(ticket, admin.secret, "image-ticket"))}`;
      });
      return NextResponse.json({ success: true, data: preview });
    }

    if (path === "image" && method === "GET") {
      const sealed = new URL(request.url).searchParams.get("ticket") ?? "";
      const ticket = sealed.length <= 8000
        ? openGoogleCookie<ImageTicket>(sealed, admin.secret, "image-ticket")
        : null;
      if (!validImageTicket(ticket, admin)) return teacherError("Gambar tidak berhasil diambil.", 403);
      const image = await fetchGoogleImage(token.accessToken, ticket.sourceUrl);
      return new Response(Buffer.from(image.bytes), {
        status: 200,
        headers: {
          "Content-Type": image.mimeType,
          "Cache-Control": "private, max-age=300",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    if (path === "disconnect" && method === "POST") {
      try {
        await revokeGoogleToken(token.accessToken);
      } catch {
        // Token lokal tetap dihapus. Revoke jaringan gagal tidak boleh membuat guru terjebak terhubung.
      }
      const response = NextResponse.json({ success: true, message: "Akun Google sudah dilepas dari sesi ini." });
      clearTokenCookie(response);
      return response;
    }

    return teacherError("Permintaan Google Form tidak dikenal.", 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Form tidak dapat diproses.";
    return teacherError(message, /Sesi Google/.test(message) ? 401 : 502);
  }
}

async function oauthCallback(
  request: NextRequest,
  admin: AdminContext,
  config: NonNullable<ReturnType<typeof getGoogleOAuthConfig>>,
) {
  const requestUrl = new URL(request.url);
  const expected = new URL(config.redirectUri);
  if (requestUrl.origin !== expected.origin || requestUrl.pathname !== expected.pathname) {
    return popupResponse(false, "Alamat kembali Google belum dikonfigurasi dengan benar.", config.redirectUri);
  }

  const stateValue = requestUrl.searchParams.get("state") ?? "";
  const code = requestUrl.searchParams.get("code") ?? "";
  const oauthError = requestUrl.searchParams.get("error");
  const saved = openGoogleCookie<GoogleOAuthState>(
    request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value,
    admin.secret,
    "oauth-state",
  );
  if (
    oauthError ||
    code.length < 5 || code.length > 4096 ||
    !validGoogleState(
      saved,
      stateValue,
      admin.session.school_id,
      admin.session.subject,
      admin.binding,
    )
  ) {
    const response = popupResponse(false, "Google belum memberikan izin untuk membaca Form.", config.redirectUri);
    clearStateCookie(response);
    return response;
  }

  try {
    const exchanged = await exchangeGoogleCode(config, code);
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = Math.max(1, Math.min(exchanged.expiresIn, admin.session.exp - now));
    const token: GoogleTokenSession = {
      version: 1,
      accessToken: exchanged.accessToken,
      schoolId: admin.session.school_id,
      subject: admin.session.subject,
      sessionBinding: admin.binding,
      expiresAt: now + expiresIn,
    };
    const response = popupResponse(true, "Akun Google terhubung.", config.redirectUri);
    response.cookies.set(GOOGLE_FORMS_TOKEN_COOKIE, sealGoogleCookie(token, admin.secret, "token"), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/google-forms",
      maxAge: expiresIn,
    });
    clearStateCookie(response);
    return response;
  } catch {
    const response = popupResponse(false, "Google belum memberikan izin untuk membaca Form.", config.redirectUri);
    clearStateCookie(response);
    return response;
  }
}

function getAdminContext(request: NextRequest): AdminContext | NextResponse {
  const secret = process.env.SESSION_SIGNING_SECRET;
  if (!isStrongSecret(secret)) return teacherError("Konfigurasi session server belum lengkap.", 503);
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const session = verifySessionToken(sessionToken, secret);
  if (!session) return teacherError("Sesi RuangCBT Anda sudah berakhir. Login kembali sebagai admin.", 401);
  if (session.role !== "admin") return teacherError("Akses hanya tersedia untuk admin.", 403);
  return { secret, sessionToken, session, binding: bindGoogleSession(sessionToken, secret) };
}

function getTokenSession(request: NextRequest, admin: AdminContext): GoogleTokenSession | null {
  const token = openGoogleCookie<GoogleTokenSession>(
    request.cookies.get(GOOGLE_FORMS_TOKEN_COOKIE)?.value,
    admin.secret,
    "token",
  );
  return validGoogleToken(
    token,
    admin.session.school_id,
    admin.session.subject,
    admin.binding,
  ) ? token : null;
}

function validImageTicket(ticket: ImageTicket | null, admin: AdminContext): ticket is ImageTicket {
  return Boolean(
    ticket &&
    ticket.version === 1 &&
    ticket.expiresAt > Math.floor(Date.now() / 1000) &&
    ticket.schoolId === admin.session.school_id &&
    ticket.subject === admin.session.subject &&
    ticket.sessionBinding === admin.binding &&
    ticket.sourceUrl.startsWith("https://"),
  );
}

function teacherError(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

function popupResponse(success: boolean, message: string, redirectUri: string) {
  const origin = new URL(redirectUri).origin;
  const event = JSON.stringify({ type: "ruangcbt-google-forms", success, message });
  const html = `<!doctype html><html lang="id"><meta charset="utf-8"><title>Google Form</title>` +
    `<body><p>${success ? "Akun Google terhubung. Jendela ini boleh ditutup." : "Google Form belum terhubung. Jendela ini boleh ditutup."}</p>` +
    `<script>if(window.opener){window.opener.postMessage(${event},${JSON.stringify(origin)});window.close()}</script></body></html>`;
  return new NextResponse(html, {
    status: success ? 200 : 400,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function clearStateCookie(response: NextResponse) {
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/google-forms/oauth/callback",
    maxAge: 0,
  });
}

function clearTokenCookie(response: NextResponse) {
  response.cookies.set(GOOGLE_FORMS_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/google-forms",
    maxAge: 0,
  });
}
