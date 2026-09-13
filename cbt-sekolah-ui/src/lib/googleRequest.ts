export const GOOGLE_REQUEST_TIMEOUT_MS = 15_000;

/**
 * Pesan yang boleh sampai ke guru. Error di luar daftar ini selalu diganti
 * pesan umum supaya detail internal (stack, URL, credential) tidak pernah bocor.
 */
export const GOOGLE_MESSAGES = Object.freeze({
  timeout: "Google tidak merespons. Silakan coba lagi.",
  busy: "Google sedang sibuk. Tunggu sebentar lalu coba lagi.",
  denied: "Google belum memberikan izin untuk membaca Form.",
  partialScope:
    "Izin Google belum lengkap. Ulangi Hubungkan Akun Google dan centang semua izin yang diminta.",
  expired: "Sesi Google Anda sudah berakhir. Hubungkan kembali akun Google.",
  unreadable: "Form ini tidak dapat dibaca oleh RuangCBT.",
  image: "Gambar tidak berhasil diambil.",
});

const SAFE_MESSAGES: ReadonlySet<string> = new Set(Object.values(GOOGLE_MESSAGES));

export function teacherMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  return SAFE_MESSAGES.has(message) ? message : "Google Form tidak dapat diproses. Silakan coba lagi.";
}

export async function fetchGoogleWithTimeout(
  input: URL | string,
  init: RequestInit,
  fetcher: typeof fetch = fetch,
  timeoutMs = GOOGLE_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetcher(input, { ...init, signal: controller.signal });
  } catch {
    throw new Error(GOOGLE_MESSAGES.timeout);
  } finally {
    clearTimeout(timeout);
  }
}
