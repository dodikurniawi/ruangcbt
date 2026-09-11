import { QUESTION_TYPES_IMPLEMENTED, type QuestionDataItem, type StudentQuestion } from "../types/index.ts";

/**
 * Bentuk UI jawaban yang boleh dipakai untuk satu soal.
 *
 * Renderer TIDAK boleh menebak: soal yang tipenya tidak dikenal, atau soal
 * terstruktur yang `data_soal`-nya hilang/rusak (GAS sengaja membuang sel kolom
 * 17 yang tidak bisa di-parse), harus jatuh ke "unsupported" — bukan ke UI opsi
 * A–E. Menampilkan A–E untuk soal MATCHING berarti siswa mengirim jawaban
 * berbentuk salah dan mendapat nol tanpa pernah tahu kenapa.
 */
export type QuestionRenderKind = "CHOICE" | "TRUE_FALSE" | "MATCHING" | "FILL_IN" | "UNSUPPORTED";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function itemList(value: unknown): QuestionDataItem[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const items: QuestionDataItem[] = [];
  for (const raw of value) {
    if (!isPlainObject(raw)) return null;
    if (typeof raw.id !== "string" || raw.id.trim() === "") return null;
    items.push({ id: raw.id, teks: typeof raw.teks === "string" ? raw.teks : "" });
  }
  return items;
}

/** Daftar pernyataan TRUE_FALSE yang aman dirender, atau null bila rusak. */
export function trueFalseStatements(question: StudentQuestion): QuestionDataItem[] | null {
  if (question.tipe !== "TRUE_FALSE") return null;
  const data: unknown = question.data_soal;
  return isPlainObject(data) ? itemList(data.pernyataan) : null;
}

/** Kolom kiri/kanan MATCHING yang aman dirender, atau null bila rusak. */
export function matchingColumns(
  question: StudentQuestion,
): { kiri: QuestionDataItem[]; kanan: QuestionDataItem[] } | null {
  if (question.tipe !== "MATCHING") return null;
  const data: unknown = question.data_soal;
  if (!isPlainObject(data)) return null;
  const kiri = itemList(data.kiri);
  const kanan = itemList(data.kanan);
  return kiri && kanan ? { kiri, kanan } : null;
}

/** Petunjuk FILL_IN (boleh kosong); null bila `data_soal` bukan bentuk FILL_IN. */
export function fillInPetunjuk(question: StudentQuestion): string | null {
  if (question.tipe !== "FILL_IN") return null;
  const data: unknown = question.data_soal;
  if (!isPlainObject(data)) return null;
  return typeof data.petunjuk === "string" ? data.petunjuk : null;
}

/**
 * Satu-satunya penentu UI jawaban di renderer siswa. Tidak ada cabang "selain X
 * berarti pilihan ganda".
 */
export function questionRenderKind(question: StudentQuestion): QuestionRenderKind {
  const tipe: string = question.tipe;
  if (!(QUESTION_TYPES_IMPLEMENTED as readonly string[]).includes(tipe)) return "UNSUPPORTED";
  if (tipe === "SINGLE" || tipe === "COMPLEX") return "CHOICE";
  if (tipe === "TRUE_FALSE") return trueFalseStatements(question) ? "TRUE_FALSE" : "UNSUPPORTED";
  if (tipe === "MATCHING") return matchingColumns(question) ? "MATCHING" : "UNSUPPORTED";
  return fillInPetunjuk(question) === null ? "UNSUPPORTED" : "FILL_IN";
}
