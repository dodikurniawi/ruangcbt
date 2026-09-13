import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  GOOGLE_FORMS_SCOPES,
  bindGoogleSession,
  createGoogleAuthorizationUrl,
  exchangeGoogleCode,
  fetchGoogleWithTimeout,
  GOOGLE_MESSAGES,
  getGoogleOAuthConfig,
  googleTokenBelongsToSession,
  grantedAllScopes,
  teacherMessage,
  openGoogleCookie,
  sealGoogleCookie,
  validGoogleState,
  validGoogleToken,
  type GoogleOAuthState,
  type GoogleTokenSession,
} from "./googleOAuth.ts";

const secret = "session-signing-secret-32-characters-minimum";
const sessionToken = "signed-admin-session";
const binding = bindGoogleSession(sessionToken, secret);
const now = 2_000_000_000;

{
  assert.equal(getGoogleOAuthConfig({}), null);
  assert.equal(getGoogleOAuthConfig({
    GOOGLE_OAUTH_CLIENT_ID: "client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
    GOOGLE_OAUTH_REDIRECT_URI: "http://evil.test/api/google-forms/oauth/callback",
  }), null, "redirect production harus HTTPS atau localhost");

  const config = getGoogleOAuthConfig({
    GOOGLE_OAUTH_CLIENT_ID: "client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
    GOOGLE_OAUTH_REDIRECT_URI: "https://cbt.test/api/google-forms/oauth/callback",
  });
  assert.ok(config);
  const url = new URL(createGoogleAuthorizationUrl(config, "csrf-state"));
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.searchParams.get("state"), "csrf-state");
  assert.equal(url.searchParams.get("access_type"), "online", "tidak meminta refresh token");
  assert.deepEqual(url.searchParams.get("scope")?.split(" "), [...GOOGLE_FORMS_SCOPES]);
}

{
  const state: GoogleOAuthState = {
    version: 1,
    nonce: "csrf-state",
    schoolId: "tenant-a",
    subject: "admin",
    sessionBinding: binding,
    expiresAt: now + 600,
  };
  const sealed = sealGoogleCookie(state, secret, "oauth-state");
  assert.equal(sealed.includes("csrf-state"), false, "state context tidak terbaca client");
  const opened = openGoogleCookie<GoogleOAuthState>(sealed, secret, "oauth-state");
  assert.equal(validGoogleState(opened, "csrf-state", "tenant-a", "admin", binding, now), true);
  assert.equal(validGoogleState(opened, "wrong-state", "tenant-a", "admin", binding, now), false);
  assert.equal(validGoogleState(opened, "csrf-state", "tenant-b", "admin", binding, now), false);
  assert.equal(validGoogleState(opened, "csrf-state", "tenant-a", "admin", "wrong-binding", now), false);
  assert.equal(validGoogleState(opened, "csrf-state", "tenant-a", "admin", binding, now + 600), false,
    "state kedaluwarsa ditolak");
  assert.equal(openGoogleCookie(`${sealed}tampered`, secret, "oauth-state"), null);
}

{
  const token: GoogleTokenSession = {
    version: 1,
    accessToken: "google-access-token-must-not-leak",
    schoolId: "tenant-a",
    subject: "admin",
    sessionBinding: binding,
    expiresAt: now + 3600,
  };
  const sealed = sealGoogleCookie(token, secret, "token");
  assert.equal(sealed.includes(token.accessToken), false, "access token hanya ada sebagai ciphertext HttpOnly");
  const opened = openGoogleCookie<GoogleTokenSession>(sealed, secret, "token");
  assert.equal(validGoogleToken(opened, "tenant-a", "admin", binding, now), true);
  assert.equal(validGoogleToken(opened, "tenant-b", "admin", binding, now), false, "token tenant lain ditolak");
  assert.equal(validGoogleToken(opened, "tenant-a", "admin", "new-session", now), false, "token terikat sesi admin");
  assert.equal(validGoogleToken(opened, "tenant-a", "admin", binding, now + 3600), false, "token expired ditolak");
  assert.equal(googleTokenBelongsToSession(opened, "tenant-a", "admin", binding), true,
    "disconnect tetap dapat membersihkan credential milik sesi walau token expired");
}

{
  const config = {
    clientId: "client-id",
    clientSecret: "client-secret",
    redirectUri: "https://cbt.test/api/google-forms/oauth/callback",
  };
  let requestUrl = "";
  let requestBody = "";
  const exchanged = await exchangeGoogleCode(config, "authorization-code", async (input, init) => {
    requestUrl = String(input);
    requestBody = String(init?.body);
    return Response.json({
      access_token: "server-only-token",
      expires_in: 3600,
      token_type: "Bearer",
      scope: GOOGLE_FORMS_SCOPES.join(" "),
    });
  });
  assert.deepEqual(exchanged, { accessToken: "server-only-token", expiresIn: 3600 });
  assert.equal(requestUrl.includes("authorization-code"), false, "authorization code tidak masuk URL token exchange");
  assert.match(requestBody, /code=authorization-code/);
  assert.equal(JSON.stringify({ connected: true }).includes(exchanged.accessToken), false, "status client tidak memuat token");

  await assert.rejects(
    exchangeGoogleCode(config, "bad-code", async () => Response.json({ error: "invalid_grant" }, { status: 400 })),
    /Google belum memberikan izin/,
  );
  await assert.rejects(
    exchangeGoogleCode(config, "bad-json", async () => new Response("not-json")),
    /Google belum memberikan izin/,
  );
}

{
  await assert.rejects(
    fetchGoogleWithTimeout("https://forms.googleapis.com", {}, async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      }), 5),
    /Google tidak merespons/,
  );

  const routeSource = readFileSync(new URL("../app/api/google-forms/[...segments]/route.ts", import.meta.url), "utf8");
  assert.ok(
    routeSource.indexOf('path === "disconnect"') < routeSource.indexOf("if (!token)"),
    "disconnect harus idempotent dan membersihkan cookie sebelum guard token valid",
  );
}

{
  // Granular consent: guru bisa mencentang sebagian izin saja. Token setengah izin
  // harus ditolak di titik tukar, bukan gagal di tengah import.
  assert.equal(grantedAllScopes(GOOGLE_FORMS_SCOPES.join(" ")), true);
  assert.equal(grantedAllScopes(GOOGLE_FORMS_SCOPES[0]), false, "hanya scope Forms tidak cukup");
  assert.equal(grantedAllScopes(GOOGLE_FORMS_SCOPES[1]), false, "hanya scope Drive tidak cukup");
  assert.equal(grantedAllScopes(undefined), false);

  const config = {
    clientId: "client-id",
    clientSecret: "client-secret",
    redirectUri: "https://cbt.test/api/google-forms/oauth/callback",
  };
  const tokenBody = (scope: string) => Response.json({
    access_token: "server-only-token",
    expires_in: 3600,
    token_type: "Bearer",
    scope,
  });
  await assert.rejects(
    exchangeGoogleCode(config, "partial-consent", async () => tokenBody(GOOGLE_FORMS_SCOPES[0])),
    /Izin Google belum lengkap/,
  );
  assert.equal(
    (await exchangeGoogleCode(config, "full-consent", async () => tokenBody(GOOGLE_FORMS_SCOPES.join(" ")))).accessToken,
    "server-only-token",
  );
}

{
  // Error tak terduga tidak boleh sampai ke browser guru apa adanya.
  assert.equal(teacherMessage(new Error(GOOGLE_MESSAGES.expired)), GOOGLE_MESSAGES.expired);
  assert.equal(
    teacherMessage(new TypeError("connect ECONNREFUSED 10.0.0.5:443 token=ya29.secret")),
    "Google Form tidak dapat diproses. Silakan coba lagi.",
  );
  assert.equal(teacherMessage("ya29.raw-access-token"), "Google Form tidak dapat diproses. Silakan coba lagi.");
}

console.log("googleOAuth: state, CSRF, replay guard, sealed token, isolation, timeout, scope consent, error redaction, disconnect PASS");
