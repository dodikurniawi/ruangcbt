// Anggaran waktu satu percobaan request, dipakai klien dan server proxy.
//
// Batas klien selalu LEBIH LONGGAR dari batas server untuk action yang sama:
// dengan begitu yang sampai ke guru/siswa adalah pesan milik server ("Google
// tidak merespons", "Sekolah tidak ditemukan"), bukan abort milik browser yang
// tidak membawa keterangan apa pun.

/** GAS tenant untuk action biasa: login, config, soal, autosave, submit. */
export const GAS_TIMEOUT_MS = 12_000;
/** GAS tenant untuk action yang memang panjang: import massal, unggah, ekspor. */
export const GAS_HEAVY_TIMEOUT_MS = 50_000;
/** Registry hanya membaca satu baris; lambat = cold start, bukan pekerjaan berat. */
export const REGISTRY_TIMEOUT_MS = 8_000;

export const CLIENT_TIMEOUT_MS = 20_000;
export const CLIENT_HEAVY_TIMEOUT_MS = 55_000;

/**
 * Action yang wajar memakan puluhan detik karena memang memproses banyak baris
 * atau byte. Memaksakan anggaran login ke sini akan memutus operasi yang sah.
 */
export const HEAVY_ACTIONS: ReadonlySet<string> = new Set([
  "importQuestions",
  "importStudents",
  "uploadImage",
  "exportResults",
  "deleteAllStudents",
  "deleteAllKelas",
  "deleteAllMataPelajaran",
  "moveQuestions",
  "getAdminQuestions",
]);

export function gasTimeoutMs(action: string): number {
  return HEAVY_ACTIONS.has(action) ? GAS_HEAVY_TIMEOUT_MS : GAS_TIMEOUT_MS;
}

export function clientTimeoutMs(action: string): number {
  return HEAVY_ACTIONS.has(action) ? CLIENT_HEAVY_TIMEOUT_MS : CLIENT_TIMEOUT_MS;
}

/**
 * Dibedakan dari Error biasa supaya pemanggil dapat menjawab "server tidak
 * menjawab tepat waktu" tanpa menyamakannya dengan kegagalan jaringan atau
 * penolakan bisnis.
 */
export class RequestTimeoutError extends Error {
  readonly timeoutMs: number;
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = "RequestTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

/**
 * fetch dengan batas waktu yang pasti. Abort milik kita dilaporkan sebagai
 * RequestTimeoutError; error lain (DNS, TLS, koneksi putus) diteruskan apa
 * adanya supaya tidak tersamar menjadi timeout.
 */
export async function fetchWithTimeout(
  input: URL | string,
  init: RequestInit,
  timeoutMs: number,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetcher(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new RequestTimeoutError(timeoutMs);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
