import type { FillInAnswerKey, FillInQuestionData } from "../types/index.ts";

/**
 * Draft FILL_IN pada form admin. `acceptedAnswers` adalah plain text — bukan rich
 * text — karena isinya dibandingkan, bukan dirender.
 */
export interface FillInDraft {
  petunjuk: string;
  acceptedAnswers: string[];
  caseSensitive: boolean;
  trim: boolean;
}

/** Default kontrak: trim aktif, case-insensitive. */
export const EMPTY_FILL_IN_DRAFT: FillInDraft = {
  petunjuk: "",
  acceptedAnswers: [""],
  caseSensitive: false,
  trim: true,
};

function parseKey(raw: unknown): Record<string, unknown> {
  if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw !== "string" || raw.trim() === "") return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

/** Bentuk ulang draft dari soal tersimpan; kunci rusak jatuh ke default. */
export function toFillInDraft(data: FillInQuestionData, serializedKey: unknown): FillInDraft {
  const key = parseKey(serializedKey);
  const accepted = Array.isArray(key.accepted_answers)
    ? key.accepted_answers.filter((value): value is string => typeof value === "string")
    : [];
  return {
    petunjuk: data?.petunjuk ?? "",
    acceptedAnswers: accepted.length > 0 ? accepted : [""],
    caseSensitive: key.case_sensitive === true,
    trim: key.trim !== false,
  };
}

/**
 * Normalisasi yang sama dengan GAS, dipakai form hanya untuk mendeteksi duplikat
 * lebih awal. Skor tetap dihitung server.
 */
function normalize(value: string, draft: Pick<FillInDraft, "caseSensitive" | "trim">): string {
  const trimmed = draft.trim ? value.trim() : value;
  return draft.caseSensitive ? trimmed : trimmed.toLowerCase();
}

export function validateFillInDraft(draft: FillInDraft): string | null {
  const petunjuk = draft.petunjuk.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  if (petunjuk === "") return "Petunjuk pengisian wajib diisi.";
  if (draft.acceptedAnswers.length === 0) return "Tambahkan minimal satu jawaban yang diterima.";

  const seen = new Set<string>();
  for (const value of draft.acceptedAnswers) {
    if (typeof value !== "string" || value.trim() === "") {
      return "Setiap jawaban yang diterima wajib diisi.";
    }
    const normalized = normalize(value, draft);
    if (seen.has(normalized)) return "Jawaban yang diterima tidak boleh duplikat.";
    seen.add(normalized);
  }
  return null;
}

export function serializeFillInDraft(draft: FillInDraft): {
  data_soal: FillInQuestionData;
  kunci_jawaban: string;
} {
  const key: FillInAnswerKey = {
    accepted_answers: draft.acceptedAnswers.map((value) => (draft.trim ? value.trim() : value)),
    case_sensitive: draft.caseSensitive,
    trim: draft.trim,
  };
  return { data_soal: { petunjuk: draft.petunjuk }, kunci_jawaban: JSON.stringify(key) };
}
