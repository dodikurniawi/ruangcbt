// Draft soal hasil AI untuk SELURUH tipe yang didukung form admin.
//
// Pemisahan tanggung jawab: berkas ini hanya menyusun permintaan ke AI dan
// menerjemahkan jawabannya menjadi draft form. Ia tidak memanggil jaringan dan
// tidak menyentuh API key, sehingga seluruh aturannya dapat diuji tanpa provider.
//
// ID item (pernyataan, kiri/kanan menjodohkan) DITETAPKAN DI SINI, bukan diminta
// dari AI: ID adalah authority kunci jawaban, dan model yang salah menulis ID
// menghasilkan kunci yang menunjuk item tidak ada.

import type { AISchema } from "./aiProvider.ts";
import { validateTrueFalseDraft, type TrueFalseDraftStatement } from "./trueFalse.ts";
import { validateFillInDraft, EMPTY_FILL_IN_DRAFT, type FillInDraft } from "./fillIn.ts";
import { validateMatchingDraft, type MatchingDraft } from "./matching.ts";
import type { QuestionDataItem } from "../types/index.ts";

export type GeneratedQuestionType = "SINGLE" | "COMPLEX" | "TRUE_FALSE" | "MATCHING" | "FILL_IN";

export interface GenerateQuestionContext {
  topik: string;
  kelas: string;
  mapel: string;
}

/** Potongan form yang boleh ditimpa hasil AI. Field tipe lain tidak disentuh. */
export interface GeneratedDraft {
  pertanyaan: string;
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  opsi_e: string;
  kunci_jawaban: string;
  pernyataan: TrueFalseDraftStatement[];
  fillIn: FillInDraft;
  matching: MatchingDraft;
}

export type DraftResult =
  | { ok: true; patch: Partial<GeneratedDraft>; wikipediaSearchTerm: string }
  | { ok: false; message: string };

const OPTION_LETTERS = ["A", "B", "C", "D", "E"] as const;

// Satu konteks yang sama untuk semua tipe, supaya perbedaan antar tipe hanya
// pada bentuk jawabannya.
function header(ctx: GenerateQuestionContext): string {
  return [
    `Buat 1 soal untuk siswa kelas ${ctx.kelas} di Indonesia, mata pelajaran ${ctx.mapel}, topik "${ctx.topik}".`,
    "Gunakan Bahasa Indonesia baku yang sesuai jenjang kelas tersebut.",
    'Sertakan "wikipedia_search_term": kata kunci bahasa Inggris untuk mencari gambar pendukung di Wikimedia Commons (string kosong bila soal tidak butuh gambar).',
  ].join("\n");
}

const WIKI_PROPERTY: Record<string, AISchema> = {
  wikipedia_search_term: { type: "string" },
};

/** Prompt + responseSchema + anggaran token untuk satu tipe soal. */
export function buildQuestionRequest(
  tipe: GeneratedQuestionType,
  ctx: GenerateQuestionContext,
): { prompt: string; schema: AISchema; maxOutputTokens: number } {
  switch (tipe) {
    case "COMPLEX":
      return {
        prompt: [
          header(ctx),
          "Jenis soal: PILIHAN KOMPLEKS — lima opsi (A sampai E) dengan DUA ATAU LEBIH jawaban benar.",
          '"kunci_jawaban" berisi huruf opsi yang benar, minimal dua huruf.',
        ].join("\n"),
        schema: {
          type: "object",
          properties: {
            pertanyaan: { type: "string" },
            opsi_a: { type: "string" }, opsi_b: { type: "string" }, opsi_c: { type: "string" },
            opsi_d: { type: "string" }, opsi_e: { type: "string" },
            kunci_jawaban: { type: "array", items: { type: "string", enum: [...OPTION_LETTERS] } },
            ...WIKI_PROPERTY,
          },
          required: ["pertanyaan", "opsi_a", "opsi_b", "opsi_c", "opsi_d", "opsi_e", "kunci_jawaban"],
          propertyOrdering: ["pertanyaan", "opsi_a", "opsi_b", "opsi_c", "opsi_d", "opsi_e", "kunci_jawaban", "wikipedia_search_term"],
        },
        maxOutputTokens: 1024,
      };

    case "TRUE_FALSE":
      return {
        prompt: [
          header(ctx),
          'Jenis soal: BENAR/SALAH — satu teks pengantar ("pertanyaan") diikuti 3 sampai 5 pernyataan.',
          'Setiap pernyataan dinilai "BENAR" atau "SALAH". Campur keduanya, jangan semua bernilai sama.',
        ].join("\n"),
        schema: {
          type: "object",
          properties: {
            pertanyaan: { type: "string" },
            pernyataan: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  teks: { type: "string" },
                  kunci: { type: "string", enum: ["BENAR", "SALAH"] },
                },
                required: ["teks", "kunci"],
                propertyOrdering: ["teks", "kunci"],
              },
            },
            ...WIKI_PROPERTY,
          },
          required: ["pertanyaan", "pernyataan"],
          propertyOrdering: ["pertanyaan", "pernyataan", "wikipedia_search_term"],
        },
        maxOutputTokens: 2048,
      };

    case "FILL_IN":
      return {
        prompt: [
          header(ctx),
          "Jenis soal: ISIAN SINGKAT — siswa mengetik jawabannya.",
          '"jawaban_diterima" berisi SEMUA bentuk jawaban yang patut diterima (ejaan alternatif, singkatan, dengan atau tanpa satuan).',
          'Jawaban harus singkat, bukan kalimat panjang. "petunjuk" boleh dikosongkan bila pertanyaannya sudah jelas.',
        ].join("\n"),
        schema: {
          type: "object",
          properties: {
            pertanyaan: { type: "string" },
            petunjuk: { type: "string" },
            jawaban_diterima: { type: "array", items: { type: "string" } },
            ...WIKI_PROPERTY,
          },
          required: ["pertanyaan", "jawaban_diterima"],
          propertyOrdering: ["pertanyaan", "petunjuk", "jawaban_diterima", "wikipedia_search_term"],
        },
        maxOutputTokens: 1024,
      };

    case "MATCHING":
      return {
        prompt: [
          header(ctx),
          'Jenis soal: MENJODOHKAN — "pertanyaan" berisi instruksi, lalu 3 sampai 5 pasangan.',
          'Setiap pasangan: "kiri" (yang dijodohkan) dan "kanan" (jodohnya yang benar).',
          "Tulis pasangan dalam urutan yang benar; aplikasi yang akan mengacak kolom kanan.",
        ].join("\n"),
        schema: {
          type: "object",
          properties: {
            pertanyaan: { type: "string" },
            pasangan: {
              type: "array",
              items: {
                type: "object",
                properties: { kiri: { type: "string" }, kanan: { type: "string" } },
                required: ["kiri", "kanan"],
                propertyOrdering: ["kiri", "kanan"],
              },
            },
            ...WIKI_PROPERTY,
          },
          required: ["pertanyaan", "pasangan"],
          propertyOrdering: ["pertanyaan", "pasangan", "wikipedia_search_term"],
        },
        maxOutputTokens: 2048,
      };

    default:
      return {
        prompt: [
          header(ctx),
          "Jenis soal: PILIHAN GANDA — empat opsi (A sampai D) dengan TEPAT SATU jawaban benar.",
          "Opsi yang salah harus masuk akal sebagai pengecoh, bukan asal berbeda.",
        ].join("\n"),
        schema: {
          type: "object",
          properties: {
            pertanyaan: { type: "string" },
            opsi_a: { type: "string" }, opsi_b: { type: "string" },
            opsi_c: { type: "string" }, opsi_d: { type: "string" },
            kunci_jawaban: { type: "string", enum: ["A", "B", "C", "D"] },
            ...WIKI_PROPERTY,
          },
          required: ["pertanyaan", "opsi_a", "opsi_b", "opsi_c", "opsi_d", "kunci_jawaban"],
          propertyOrdering: ["pertanyaan", "opsi_a", "opsi_b", "opsi_c", "opsi_d", "kunci_jawaban", "wikipedia_search_term"],
        },
        maxOutputTokens: 1024,
      };
  }
}

// ===== TERJEMAHAN JAWABAN AI → DRAFT FORM =====

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/**
 * Acak kolom kanan supaya kunci tidak jatuh berurutan 1→A, 2→B, 3→C: soal yang
 * jawabannya sejajar dapat ditebak tanpa memahami materinya.
 * RNG dapat disuntik agar test deterministic.
 */
function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // Hasil yang kebetulan tetap sejajar diputar satu posisi: tujuan acakan ini
  // bukan keacakan statistik, melainkan memastikan urutannya tidak sejajar.
  if (out.length > 1 && out.every((item, i) => item === items[i])) out.push(out.shift() as T);
  return out;
}

/** Ubah JSON hasil AI menjadi potongan form, atau tolak dengan alasan untuk guru. */
export function toQuestionDraft(
  tipe: GeneratedQuestionType,
  parsed: unknown,
  rng: () => number = Math.random,
): DraftResult {
  const body = asRecord(parsed);
  if (!body) return { ok: false, message: "AI tidak mengembalikan data soal yang dapat dibaca." };

  const pertanyaan = text(body.pertanyaan);
  if (!pertanyaan) return { ok: false, message: "AI tidak mengembalikan redaksi soal." };
  const wikipediaSearchTerm = text(body.wikipedia_search_term);

  switch (tipe) {
    case "TRUE_FALSE": {
      const rows = Array.isArray(body.pernyataan) ? body.pernyataan : [];
      const pernyataan: TrueFalseDraftStatement[] = rows
        .map((row) => asRecord(row))
        .filter((row): row is Record<string, unknown> => row !== null)
        .map((row, index) => ({
          id: String(index + 1),
          teks: text(row.teks),
          kunci: text(row.kunci).toUpperCase() === "SALAH" ? "SALAH" as const : "BENAR" as const,
        }))
        .filter((statement) => statement.teks !== "");
      const invalid = validateTrueFalseDraft(pernyataan);
      if (invalid) return { ok: false, message: `Hasil AI belum lengkap: ${invalid}` };
      return { ok: true, patch: { pertanyaan, pernyataan }, wikipediaSearchTerm };
    }

    case "FILL_IN": {
      const accepted = (Array.isArray(body.jawaban_diterima) ? body.jawaban_diterima : [])
        .map(text)
        .filter((value) => value !== "");
      const fillIn: FillInDraft = {
        ...EMPTY_FILL_IN_DRAFT,
        petunjuk: text(body.petunjuk),
        acceptedAnswers: accepted.length > 0 ? accepted : [""],
      };
      const invalid = validateFillInDraft(fillIn);
      if (invalid) return { ok: false, message: `Hasil AI belum lengkap: ${invalid}` };
      return { ok: true, patch: { pertanyaan, fillIn }, wikipediaSearchTerm };
    }

    case "MATCHING": {
      const pairs = (Array.isArray(body.pasangan) ? body.pasangan : [])
        .map((row) => asRecord(row))
        .filter((row): row is Record<string, unknown> => row !== null)
        .map((row) => ({ kiri: text(row.kiri), kanan: text(row.kanan) }))
        .filter((pair) => pair.kiri !== "" && pair.kanan !== "");

      const kiri: QuestionDataItem[] = pairs.map((pair, index) => ({
        id: String(index + 1),
        teks: pair.kiri,
      }));
      // ID kolom kanan mengikuti POSISI setelah diacak, sedangkan pasangan dibentuk
      // dari isinya — jadi acakan tidak pernah menggeser kunci.
      const kananTexts = shuffled(pairs.map((pair) => pair.kanan), rng);
      const kanan: QuestionDataItem[] = kananTexts.map((teks, index) => ({
        id: String.fromCharCode(65 + index),
        teks,
      }));
      const idOfText = new Map(kanan.map((item) => [item.teks, item.id]));
      const pasangan: Record<string, string> = {};
      pairs.forEach((pair, index) => {
        const target = idOfText.get(pair.kanan);
        if (target) pasangan[String(index + 1)] = target;
      });

      const matching: MatchingDraft = { kiri, kanan, pasangan };
      const invalid = validateMatchingDraft(matching);
      if (invalid) return { ok: false, message: `Hasil AI belum lengkap: ${invalid}` };
      return { ok: true, patch: { pertanyaan, matching }, wikipediaSearchTerm };
    }

    case "COMPLEX": {
      const letters = (Array.isArray(body.kunci_jawaban) ? body.kunci_jawaban : [body.kunci_jawaban])
        .map((value) => text(value).toUpperCase())
        .filter((letter) => (OPTION_LETTERS as readonly string[]).includes(letter));
      const options = {
        opsi_a: text(body.opsi_a), opsi_b: text(body.opsi_b), opsi_c: text(body.opsi_c),
        opsi_d: text(body.opsi_d), opsi_e: text(body.opsi_e),
      };
      if (!options.opsi_a || !options.opsi_b || !options.opsi_c || !options.opsi_d) {
        return { ok: false, message: "Hasil AI belum lengkap: opsi A–D harus terisi." };
      }
      // Kunci yang menunjuk opsi kosong akan tersimpan sebagai jawaban yang tidak
      // pernah dapat dipilih siswa.
      const filled = [...new Set(letters)].sort()
        .filter((letter) => options[`opsi_${letter.toLowerCase()}` as keyof typeof options] !== "");
      if (filled.length < 2) {
        return { ok: false, message: "Hasil AI belum lengkap: pilihan kompleks butuh minimal dua kunci jawaban." };
      }
      return {
        ok: true,
        patch: { pertanyaan, ...options, kunci_jawaban: filled.join(",") },
        wikipediaSearchTerm,
      };
    }

    default: {
      const options = {
        opsi_a: text(body.opsi_a), opsi_b: text(body.opsi_b),
        opsi_c: text(body.opsi_c), opsi_d: text(body.opsi_d), opsi_e: "",
      };
      if (!options.opsi_a || !options.opsi_b || !options.opsi_c || !options.opsi_d) {
        return { ok: false, message: "Hasil AI belum lengkap: opsi A–D harus terisi." };
      }
      const kunci = text(body.kunci_jawaban).toUpperCase();
      if (!["A", "B", "C", "D"].includes(kunci)) {
        return { ok: false, message: "Hasil AI belum lengkap: kunci jawaban harus salah satu dari A–D." };
      }
      return { ok: true, patch: { pertanyaan, ...options, kunci_jawaban: kunci }, wikipediaSearchTerm };
    }
  }
}
