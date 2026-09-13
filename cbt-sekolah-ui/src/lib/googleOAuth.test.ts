import assert from "node:assert/strict";
import {
  GOOGLE_FORMS_SCOPES,
  bindGoogleSession,
  createGoogleAuthorizationUrl,
  exchangeGoogleCode,
  getGoogleOAuthConfig,
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
    return Response.json({ access_token: "server-only-token", expires_in: 3600, token_type: "Bearer" });
  });
  assert.deepEqual(exchanged, { accessToken: "server-only-token", expiresIn: 3600 });
  assert.equal(requestUrl.includes("authorization-code"), false, "authorization code tidak masuk URL token exchange");
  assert.match(requestBody, /code=authorization-code/);
  assert.equal(JSON.stringify({ connected: true }).includes(exchanged.accessToken), false, "status client tidak memuat token");

  await assert.rejects(
    exchangeGoogleCode(config, "bad-code", async () => Response.json({ error: "invalid_grant" }, { status: 400 })),
    /Google belum memberikan izin/,
  );
}

console.log("googleOAuth: state, CSRF, sealed token, tenant/session binding, expiry, exchange PASS");
