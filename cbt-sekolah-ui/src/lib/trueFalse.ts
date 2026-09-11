import type { TrueFalseAnswer, TrueFalseQuestionData, TrueFalseValue } from "../types/index.ts";

export interface TrueFalseDraftStatement {
  id: string;
  teks: string;
  kunci: TrueFalseValue;
}

export const EMPTY_TRUE_FALSE_STATEMENT: TrueFalseDraftStatement = {
  id: "1",
  teks: "",
  kunci: "BENAR",
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

export function toTrueFalseDraft(
  data: TrueFalseQuestionData,
  serializedKey: unknown,
): TrueFalseDraftStatement[] {
  const key = parseKey(serializedKey);
  // data_soal bisa hilang/rusak (GAS membuang sel kolom 17 yang tidak bisa diparse);
  // form admin harus tetap terbuka, bukan crash.
  const statements = Array.isArray(data?.pernyataan) ? data.pernyataan : [];
  return statements.map((statement) => ({
    id: statement.id,
    teks: statement.teks,
    kunci: key[statement.id] === "SALAH" ? "SALAH" : "BENAR",
  }));
}

export function nextTrueFalseStatement(
  statements: readonly TrueFalseDraftStatement[],
): TrueFalseDraftStatement {
  const used = new Set(statements.map((statement) => statement.id));
  let id = 1;
  while (used.has(String(id))) id++;
  return { id: String(id), teks: "", kunci: "BENAR" };
}

export function validateTrueFalseDraft(statements: readonly TrueFalseDraftStatement[]): string | null {
  if (statements.length === 0) return "Tambahkan minimal satu pernyataan.";
  const ids = new Set<string>();
  for (const statement of statements) {
    const id = statement.id.trim();
    const text = statement.teks.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    if (id === "") return "Setiap pernyataan wajib memiliki ID.";
    if (ids.has(id)) return "ID pernyataan harus unik.";
    if (text === "") return "Setiap pernyataan wajib diisi.";
    if (statement.kunci !== "BENAR" && statement.kunci !== "SALAH") {
      return "Kunci pernyataan harus BENAR atau SALAH.";
    }
    ids.add(id);
  }
  return null;
}

export function serializeTrueFalseDraft(statements: readonly TrueFalseDraftStatement[]): {
  data_soal: TrueFalseQuestionData;
  kunci_jawaban: string;
} {
  const key: TrueFalseAnswer = {};
  const pernyataan = statements.map((statement) => {
    const id = statement.id.trim();
    key[id] = statement.kunci;
    return { id, teks: statement.teks };
  });
  return { data_soal: { pernyataan }, kunci_jawaban: JSON.stringify(key) };
}

export function updateTrueFalseAnswer(
  current: unknown,
  statementId: string,
  value: TrueFalseValue,
): TrueFalseAnswer {
  const answer = current !== null && typeof current === "object" && !Array.isArray(current)
    ? current as TrueFalseAnswer
    : {};
  return { ...answer, [statementId]: value };
}
