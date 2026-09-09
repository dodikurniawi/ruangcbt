import type { AnswersRecord } from "@/types";

/**
 * Logika pemulihan jawaban, dipisahkan dari komponen agar dapat diuji langsung.
 * Sisi server menyimpan jawaban di Users kolom 14; sisi klien menyimpannya di
 * sessionStorage lewat zustand persist.
 */

/** Ubah nilai mentah dari sheet menjadi AnswersRecord. Nilai rusak dianggap tidak ada. */
export function deserializeAnswers(raw: unknown): AnswersRecord | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "object") {
    return Array.isArray(raw) ? null : (raw as AnswersRecord);
  }
  if (typeof raw !== "string" || raw.trim() === "") return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as AnswersRecord;
  } catch {
    return null;
  }
}

/**
 * Pilih jawaban mana yang dipakai saat siswa masuk lagi.
 * Jawaban lokal selalu menang — perangkat siswa memegang state paling baru,
 * karena salinan server tertinggal maksimal satu siklus autosave.
 * Salinan server hanya dipakai ketika lokal benar-benar kosong.
 */
export function pickAnswers(
  local: AnswersRecord | null | undefined,
  server: AnswersRecord | null | undefined
): AnswersRecord {
  if (local && Object.keys(local).length > 0) return local;
  if (server && Object.keys(server).length > 0) return server;
  return local ?? {};
}

/** True bila jawaban dari server perlu dipulihkan ke store. */
export function shouldRecover(
  local: AnswersRecord | null | undefined,
  server: unknown
): boolean {
  if (local && Object.keys(local).length > 0) return false;
  const parsed = deserializeAnswers(server);
  return parsed !== null && Object.keys(parsed).length > 0;
}
