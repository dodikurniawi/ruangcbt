import type { Answer } from "@/types";

/**
 * Satu-satunya sumber kebenaran untuk "apakah jawaban sudah diisi".
 *
 * Ini BUKAN option-selection semantics (apakah opsi X dipilih) — itu urusan
 * renderer per tipe. Fungsi ini hanya menjawab: kosong atau tidak.
 *
 * Tidak memakai truthiness. String "0", angka 0, dan (kelak) boolean false
 * adalah jawaban yang valid, bukan "belum dijawab".
 *
 *   unanswered : undefined | null | "" | " " | [] | {}
 *   answered   : string non-kosong | array non-kosong | object dengan >=1 entri
 *                | boolean | number  (dua terakhir defensif untuk tipe masa depan)
 */
export function isAnswered(answer: unknown): boolean {
  if (answer === undefined || answer === null) return false;
  if (typeof answer === "string") return answer.trim() !== "";
  if (Array.isArray(answer)) return answer.length > 0;
  if (typeof answer === "object") {
    return Object.keys(answer as Record<string, unknown>).length > 0;
  }
  // boolean / number: tidak pernah jadi truthiness bug — selalu dianggap terisi.
  return true;
}

/** Jumlah soal terjawab dalam satu AnswersRecord. Memakai isAnswered yang sama. */
export function countAnswered(answers: Record<string, Answer>): number {
  let n = 0;
  for (const key of Object.keys(answers)) {
    if (isAnswered(answers[key])) n++;
  }
  return n;
}
