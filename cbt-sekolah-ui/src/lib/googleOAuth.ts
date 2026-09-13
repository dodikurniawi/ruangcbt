import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const GOOGLE_OAUTH_STATE_COOKIE = "ruangcbt_google_oauth_state";
export const GOOGLE_FORMS_TOKEN_COOKIE = "ruangcbt_google_forms_token";
export const GOOGLE_OAUTH_STATE_TTL_SECONDS = 10 * 60;

export const GOOGLE_FORMS_SCOPES = Object.freeze([
  "https://www.googleapis.com/auth/forms.body.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
]);

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleOAuthState {
  version: 1;
  nonce: string;
  schoolId: string;
  subject: string;
  sessionBinding: string;
  expiresAt: number;
}

export interface GoogleTokenSession {
  version: 1;
  accessToken: string;
  schoolId: string;
  subject: string;
  sessionBinding: string;
  expiresAt: number;
}

interface TokenResponse {
  access_token?: unknown;
  expires_in?: unknown;
  token_type?: unknown;
}

export function getGoogleOAuthConfig(
  env: Record<string, string | undefined> = process.env,
): GoogleOAuthConfig | null {
  const clientId = env.GOOGLE_OAUTH_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ?? "";
  const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ?? "";
  if (!clientId || !clientSecret || !redirectUri) return null;
  try {
    const parsed = new URL(redirectUri);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") return null;
  } catch {
    return null;
  }
  return { clientId, clientSecret, redirectUri };
}

export function createGoogleAuthorizationUrl(config: GoogleOAuthConfig, state: string): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_FORMS_SCOPES.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "online");
  return url.toString();
}

export function bindGoogleSession(sessionToken: string, secret: string): string {
  return createHmac("sha256", deriveKey(secret, "google-session-binding"))
    .update(sessionToken)
    .digest("base64url");
}

export function sameSecretValue(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sealGoogleCookie(
  value: unknown,
  secret: string,
  purpose: "oauth-state" | "token" | "image-ticket",
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret, purpose), iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return [iv, encrypted, cipher.getAuthTag()].map((part) => part.toString("base64url")).join(".");
}

export function openGoogleCookie<T>(
  sealed: string | undefined,
  secret: string,
  purpose: "oauth-state" | "token" | "image-ticket",
): T | null {
  if (!sealed) return null;
  const parts = sealed.split(".");
  if (parts.length !== 3) return null;
  try {
    const iv = Buffer.from(parts[0], "base64url");
    const encrypted = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    if (iv.length !== 12 || tag.length !== 16) return null;
    const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret, purpose), iv);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function validGoogleState(
  state: GoogleOAuthState | null,
  nonce: string,
  schoolId: string,
  subject: string,
  binding: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): state is GoogleOAuthState {
  return Boolean(
    state &&
    state.version === 1 &&
    state.expiresAt > nowSeconds &&
    sameSecretValue(state.nonce, nonce) &&
    state.schoolId === schoolId &&
    state.subject === subject &&
    sameSecretValue(state.sessionBinding, binding),
  );
}

export function validGoogleToken(
  token: GoogleTokenSession | null,
  schoolId: string,
  subject: string,
  binding: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): token is GoogleTokenSession {
  return Boolean(
    token &&
    token.version === 1 &&
    token.accessToken &&
    token.expiresAt > nowSeconds + 15 &&
    token.schoolId === schoolId &&
    token.subject === subject &&
    sameSecretValue(token.sessionBinding, binding),
  );
}

/** Bentuk status yang aman dikirim ke browser; credential tidak pernah ikut. */
export function googleConnectionStatus(configured: boolean, token: GoogleTokenSession | null) {
  return { configured, connected: token !== null };
}

export async function exchangeGoogleCode(
  config: GoogleOAuthConfig,
  code: string,
  fetcher: typeof fetch = fetch,
): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Google belum memberikan izin untuk membaca Form.");

  const data = await response.json() as TokenResponse;
  const accessToken = typeof data.access_token === "string" ? data.access_token : "";
  const expiresIn = typeof data.expires_in === "number" ? Math.floor(data.expires_in) : 0;
  if (!accessToken || String(data.token_type ?? "").toLowerCase() !== "bearer" || expiresIn < 60) {
    throw new Error("Google belum memberikan izin untuk membaca Form.");
  }
  return { accessToken, expiresIn: Math.min(expiresIn, 60 * 60) };
}

export async function revokeGoogleToken(accessToken: string, fetcher: typeof fetch = fetch): Promise<void> {
  await fetcher("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token: accessToken }),
    cache: "no-store",
  });
}

function deriveKey(secret: string, purpose: string): Buffer {
  return createHmac("sha256", secret).update(`ruangcbt:${purpose}:v1`).digest();
}
