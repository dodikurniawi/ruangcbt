// Kontrak analisis hasil belajar: payload yang boleh sampai ke Gemini, schema
// jawabannya, dan validasi jawaban itu sebelum guru melihatnya.
//
// Pembagian tugas yang dipegang file ini:
//   angka  → dihitung GAS (handleGetStudentAnalysis), tidak pernah oleh AI;
//   AI     → hanya menafsirkan angka itu dan menyusun rekomendasi;
//   server → memvalidasi tafsiran itu sebelum dikirim ke UI.

import type { AISchema } from "./aiProvider.ts";

export interface CategoryStat {
  name: string;
  /** Jumlah soal yang mendapat skor penuh; bukan jumlah poin. */
  correct: number;
  /** Jumlah soal dalam kategori; bukan total bobot. */
  total: number;
  earnedScore: number;
  maxScore: number;
  accuracy: number;
}

/** Statistik deterministic dari GAS. Tidak memuat nama siswa. */
export interface StudentStats {
  exam_id: string;
  exam_mapel: string;
  mapel_nama: string;
  kelas: string;
  score: number;
  kkm: number;
  status: "TUNTAS" | "PERLU_TINDAK_LANJUT";
  total_questions: number;
  correct: number;
  partial: number;
  wrong: number;
  unanswered: number;
  uncategorized: number;
  categories: CategoryStat[];
  result_hash: string;
}

export interface PriorityArea extends CategoryStat {
  category: string;
  observation: string;
}

export interface Recommendation {
  priority: "TINGGI" | "SEDANG" | "RENDAH";
  action: string;
  reason: string;
}

export interface StudentAnalysis {
  summary: string;
  priorityAreas: PriorityArea[];
  recommendations: Recommendation[];
}

export const NOT_ENOUGH_DATA_SUMMARY =
  "Data belum cukup untuk mengidentifikasi pola tertentu.";

export const DEFAULT_KKM = 70;

/** Config.kkm bila valid; fallback kontrak sistem 70. */
export function resolveKkm(value: unknown): number {
  const kkm = Number(value);
  return Number.isFinite(kkm) && kkm > 0 && kkm <= 100 ? kkm : DEFAULT_KKM;
}

export function isPassingScore(score: unknown, kkm: unknown): boolean {
  const numericScore = Number(score);
  return Number.isFinite(numericScore) && numericScore >= resolveKkm(kkm);
}

/** Nilai di bawah KKM → siswa eligible analisis tindak lanjut AI. */
export function isEligibleForAi(stats: Pick<StudentStats, "score" | "kkm">): boolean {
  return Number.isFinite(stats.score) && !isPassingScore(stats.score, stats.kkm);
}

/** Pola hanya bisa dibaca bila ada kategori soal; tanpa itu AI tidak dipanggil. */
export function hasPatternData(stats: Pick<StudentStats, "categories">): boolean {
  return stats.categories.length > 0;
}

/**
 * Payload minimal untuk Gemini: hanya angka agregat + nama materi.
 *
 * Yang sengaja tidak ikut: nama siswa, id siswa, username/password, kelas, token,
 * jawaban mentah, kunci jawaban, exam_id, identitas tenant. Identifier siswa yang
 * dipakai AI adalah label anonim.
 */
export function buildStudentPayload(stats: StudentStats) {
  return {
    siswa: "Siswa",
    mapel: stats.mapel_nama || "Tidak diketahui",
    score: stats.score,
    kkm: stats.kkm,
    totalSoal: stats.total_questions,
    benar: stats.correct,
    sebagianBenar: stats.partial,
    salah: stats.wrong,
    tidakDijawab: stats.unanswered,
    categories: stats.categories.map((c) => ({
      name: c.name,
      correct: c.correct,
      total: c.total,
      earnedScore: c.earnedScore,
      maxScore: c.maxScore,
      accuracy: c.accuracy,
    })),
  };
}

export const STUDENT_SYSTEM_INSTRUCTION = `Kamu membantu guru Indonesia membaca hasil ujian CBT satu siswa.

Tugasmu hanya MENAFSIRKAN angka yang diberikan dan menyusun tindak lanjut pembelajaran.

Aturan wajib:
- Jangan menghitung ulang, mengubah, atau mengoreksi nilai, akurasi, KKM, maupun jumlah soal. Pakai angka apa adanya.
- Field benar/correct berarti soal dengan skor penuh, sebagianBenar berarti soal dengan partial credit, dan salah berarti nol poin.
- Nilai partial credit ada pada earnedScore/maxScore; jangan membulatkannya menjadi benar atau salah.
- Jangan menyebut materi/kategori yang tidak ada pada data.
- Jangan menyebut penyebab di luar data ujian (keluarga, kesehatan, motivasi, kebiasaan belajar, gangguan belajar).
- Jangan membuat diagnosis psikologis, medis, atau gangguan belajar.
- Jangan memberi label pada siswa (malas, bodoh, lemah, tidak mampu, dan sejenisnya).
- Bila data tidak cukup untuk menyimpulkan pola, katakan "${NOT_ENOUGH_DATA_SUMMARY}".

Gaya bahasa: sederhana, natural, untuk guru. Pakai rumusan berbasis data seperti
"berdasarkan hasil ujian...", "terlihat pola...", "perlu diperkuat...", "disarankan guru...".

Rekomendasi harus konkret dan dapat dikerjakan guru (penguatan konsep, latihan bertahap,
evaluasi ulang), maksimal 4 butir, urut dari prioritas tertinggi.`;

export const STUDENT_SCHEMA: AISchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    priorityAreas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          correct: { type: "integer" },
          total: { type: "integer" },
          accuracy: { type: "number" },
          observation: { type: "string" },
        },
        required: ["category", "correct", "total", "accuracy", "observation"],
        propertyOrdering: ["category", "correct", "total", "accuracy", "observation"],
      },
    },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          priority: { type: "string", enum: ["TINGGI", "SEDANG", "RENDAH"] },
          action: { type: "string" },
          reason: { type: "string" },
        },
        required: ["priority", "action", "reason"],
        propertyOrdering: ["priority", "action", "reason"],
      },
    },
  },
  required: ["summary", "priorityAreas", "recommendations"],
  propertyOrdering: ["summary", "priorityAreas", "recommendations"],
};

function trimmedString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text === "") return null;
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

const PRIORITIES = new Set(["TINGGI", "SEDANG", "RENDAH"]);

/**
 * Validasi jawaban Gemini terhadap statistik server.
 *
 * Angka pada priorityAreas TIDAK diambil dari AI: yang dipakai adalah angka server
 * untuk kategori bernama sama. Kategori karangan (tidak ada pada data) dibuang.
 * Bentuk yang tidak sesuai schema → null, dan pemanggil menampilkan pesan generik,
 * bukan response mentah.
 */
export function validateStudentAnalysis(
  raw: unknown,
  stats: StudentStats
): StudentAnalysis | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;

  const summary = trimmedString(value.summary, 600);
  if (!summary) return null;
  if (!Array.isArray(value.priorityAreas) || !Array.isArray(value.recommendations)) return null;

  const byName = new Map(stats.categories.map((c) => [c.name.toLowerCase(), c]));
  const priorityAreas: PriorityArea[] = [];
  for (const item of value.priorityAreas.slice(0, 5)) {
    if (typeof item !== "object" || item === null) continue;
    const entry = item as Record<string, unknown>;
    const category = trimmedString(entry.category, 120);
    const observation = trimmedString(entry.observation, 400);
    const known = category ? byName.get(category.toLowerCase()) : undefined;
    if (!known || !observation) continue;
    priorityAreas.push({
      name: known.name,
      category: known.name,
      correct: known.correct,
      total: known.total,
      earnedScore: known.earnedScore,
      maxScore: known.maxScore,
      accuracy: known.accuracy,
      observation,
    });
  }

  const recommendations: Recommendation[] = [];
  for (const item of value.recommendations.slice(0, 4)) {
    if (typeof item !== "object" || item === null) continue;
    const entry = item as Record<string, unknown>;
    const action = trimmedString(entry.action, 300);
    const reason = trimmedString(entry.reason, 300);
    const priority = typeof entry.priority === "string" ? entry.priority.toUpperCase() : "";
    if (!action || !reason || !PRIORITIES.has(priority)) continue;
    recommendations.push({
      priority: priority as Recommendation["priority"],
      action,
      reason,
    });
  }

  // Analisis tanpa satu pun rekomendasi tidak berguna bagi guru — tolak.
  if (recommendations.length === 0) return null;

  return { summary, priorityAreas, recommendations };
}

// ===== ANALISIS KELAS (halaman Cetak → Rekap Nilai) =====
// Payload kelas memakai label anonim S1..Sn. Pemetaan label → nama tetap di server;
// nama siswa tidak pernah ikut ke Gemini.

export interface ClassStudentStat {
  label: string;
  score: number;
}

export interface ClassStats {
  kkm: number;
  total_peserta: number;
  selesai: number;
  rata_rata: number;
  tuntas: number;
  tidak_tuntas: number;
  students: ClassStudentStat[];
}

export interface ClassAnalysis {
  catatan_perhatian: string;
  catatan_prestasi: string;
  catatan_mapel: string;
  rekomendasi_wali: string;
}

export const CLASS_SYSTEM_INSTRUCTION = `Kamu membantu wali kelas Indonesia membaca rekap nilai satu kelas.

Tugasmu hanya MENAFSIRKAN angka yang diberikan dan menyusun tindak lanjut pembelajaran.

Aturan wajib:
- Jangan menghitung ulang atau mengubah nilai, rata-rata, dan KKM. Pakai angka apa adanya.
- Siswa hanya boleh dirujuk dengan label yang ada pada data (mis. S1, S2). Jangan mengarang nama.
- Jangan membuat diagnosis psikologis/medis/gangguan belajar dan jangan memberi label pada siswa.
- Jangan menyebut penyebab di luar data ujian.
- Bila data tidak cukup, katakan "${NOT_ENOUGH_DATA_SUMMARY}".

Gaya bahasa: sederhana dan natural untuk guru, berbasis data, tanpa markup HTML.
Setiap catatan 2-3 kalimat.`;

export const CLASS_SCHEMA: AISchema = {
  type: "object",
  properties: {
    catatan_perhatian: { type: "string" },
    catatan_prestasi: { type: "string" },
    catatan_mapel: { type: "string" },
    rekomendasi_wali: { type: "string" },
  },
  required: ["catatan_perhatian", "catatan_prestasi", "catatan_mapel", "rekomendasi_wali"],
  propertyOrdering: [
    "catatan_perhatian", "catatan_prestasi", "catatan_mapel", "rekomendasi_wali",
  ],
};

export function validateClassAnalysis(raw: unknown): ClassAnalysis | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  const perhatian = trimmedString(value.catatan_perhatian, 900);
  const prestasi = trimmedString(value.catatan_prestasi, 900);
  const mapel = trimmedString(value.catatan_mapel, 900);
  const wali = trimmedString(value.rekomendasi_wali, 1200);
  if (!perhatian || !prestasi || !mapel || !wali) return null;
  return {
    catatan_perhatian: perhatian,
    catatan_prestasi: prestasi,
    catatan_mapel: mapel,
    rekomendasi_wali: wali,
  };
}

/**
 * Ganti label anonim pada teks AI dengan nama siswa, di server, setelah Gemini
 * menjawab. Label yang lebih panjang disubstitusi lebih dulu supaya "S12" tidak
 * tertimpa pemetaan "S1".
 */
export function restoreLabels(text: string, names: Map<string, string>): string {
  const labels = [...names.keys()].sort((a, b) => b.length - a.length);
  let output = text;
  for (const label of labels) {
    output = output.split(label).join(names.get(label) as string);
  }
  return output;
}
