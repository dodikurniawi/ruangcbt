import type { MatchingAnswer, MatchingQuestionData, QuestionDataItem } from "../types/index.ts";

/**
 * Draft MATCHING pada form admin. ID item adalah authority — teks boleh berubah
 * tanpa menyentuh ID, sehingga kunci lama tetap menunjuk item yang sama.
 */
export interface MatchingDraft {
  kiri: QuestionDataItem[];
  kanan: QuestionDataItem[];
  /** id item kiri → id item kanan. */
  pasangan: Record<string, string>;
}

export const EMPTY_MATCHING_DRAFT: MatchingDraft = {
  kiri: [{ id: "1", teks: "" }],
  kanan: [{ id: "A", teks: "" }],
  pasangan: {},
};

/** Salinan dalam, supaya draft baru tidak berbagi array dengan konstanta di atas. */
export function emptyMatchingDraft(): MatchingDraft {
  return {
    kiri: [{ id: "1", teks: "" }],
    kanan: [{ id: "A", teks: "" }],
    pasangan: {},
  };
}

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

/**
 * ID berikutnya untuk satu kolom. Kiri memakai angka, kanan memakai huruf; ID
 * lama tidak pernah dipakai ulang selama item-nya masih ada, jadi menambah atau
 * menghapus item tidak menggeser pasangan yang sudah dibuat.
 */
export function nextMatchingId(items: readonly QuestionDataItem[], side: "kiri" | "kanan"): string {
  const used = new Set(items.map((item) => item.id));
  if (side === "kiri") {
    let n = 1;
    while (used.has(String(n))) n++;
    return String(n);
  }
  let n = 0;
  // A..Z lalu AA, AB, … supaya kolom kanan tidak pernah kehabisan ID.
  for (;;) {
    let label = "";
    let value = n;
    do {
      label = String.fromCharCode(65 + (value % 26)) + label;
      value = Math.floor(value / 26) - 1;
    } while (value >= 0);
    if (!used.has(label)) return label;
    n++;
  }
}

/** Bentuk ulang draft dari soal tersimpan; pasangan rusak dibuang, bukan crash. */
export function toMatchingDraft(data: MatchingQuestionData, serializedKey: unknown): MatchingDraft {
  const kiri = Array.isArray(data?.kiri) ? data.kiri.map((item) => ({ ...item })) : [];
  const kanan = Array.isArray(data?.kanan) ? data.kanan.map((item) => ({ ...item })) : [];
  const rightIds = new Set(kanan.map((item) => item.id));

  const key = parseKey(serializedKey);
  const pasangan: Record<string, string> = {};
  for (const item of kiri) {
    const target = key[item.id];
    if (typeof target === "string" && rightIds.has(target)) pasangan[item.id] = target;
  }
  return { kiri, kanan, pasangan };
}

export function validateMatchingDraft(draft: MatchingDraft): string | null {
  if (draft.kiri.length === 0) return "Tambahkan minimal satu item kiri.";
  if (draft.kanan.length === 0) return "Tambahkan minimal satu item kanan.";

  for (const [side, items] of [["kiri", draft.kiri], ["kanan", draft.kanan]] as const) {
    const ids = new Set<string>();
    for (const item of items) {
      const id = item.id.trim();
      const text = item.teks.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
      if (id === "") return `Setiap item ${side} wajib memiliki ID.`;
      if (ids.has(id)) return `ID item ${side} harus unik.`;
      if (text === "") return `Setiap item ${side} wajib diisi.`;
      ids.add(id);
    }
  }

  const rightIds = new Set(draft.kanan.map((item) => item.id.trim()));
  for (const item of draft.kiri) {
    const target = draft.pasangan[item.id];
    if (!target) return "Setiap item kiri wajib dipasangkan dengan satu item kanan.";
    if (!rightIds.has(target)) return "Pasangan menunjuk item kanan yang sudah tidak ada.";
  }
  return null;
}

export function serializeMatchingDraft(draft: MatchingDraft): {
  data_soal: MatchingQuestionData;
  kunci_jawaban: string;
} {
  const key: Record<string, string> = {};
  const kiri = draft.kiri.map((item) => {
    const id = item.id.trim();
    key[id] = draft.pasangan[item.id];
    return { id, teks: item.teks };
  });
  const kanan = draft.kanan.map((item) => ({ id: item.id.trim(), teks: item.teks }));
  return { data_soal: { kiri, kanan }, kunci_jawaban: JSON.stringify(key) };
}

/**
 * Pasangkan satu item kiri. Pilihan lain dipertahankan sehingga jawaban parsial
 * tetap utuh; memilih ulang item yang sama menimpa pilihan sebelumnya.
 */
export function updateMatchingAnswer(
  current: unknown,
  leftId: string,
  rightId: string,
): MatchingAnswer {
  const answer = current !== null && typeof current === "object" && !Array.isArray(current)
    ? current as MatchingAnswer
    : {};
  if (rightId === "") {
    const next = { ...answer };
    delete next[leftId];
    return next;
  }
  return { ...answer, [leftId]: rightId };
}
