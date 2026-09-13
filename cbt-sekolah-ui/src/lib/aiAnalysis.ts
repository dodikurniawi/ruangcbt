// Endpoint data analisis: menyiapkan statistik terautentikasi untuk client.
// Personal API key dan panggilan provider tidak pernah melewati endpoint ini.

import { NextRequest, NextResponse } from "next/server.js";
import { SESSION_COOKIE, isStrongSecret, verifySessionToken } from "./security.ts";
import { callGas, type ProxyTarget } from "./proxy.ts";
import {
  isPassingScore,
  resolveKkm,
  type ClassStats,
  type StudentStats,
} from "./learningAnalysis.ts";

type TargetResolver = () => Promise<ProxyTarget | null>;

interface AiDataRequestBody {
  mode?: unknown;
  id_siswa?: unknown;
  kelas?: unknown;
}

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function handleAiAnalysisRequest(
  request: NextRequest,
  schoolId: string,
  resolveTarget: TargetResolver,
) {
  const sessionSecret = process.env.SESSION_SIGNING_SECRET;
  if (!isStrongSecret(sessionSecret)) return fail("Konfigurasi session server belum lengkap", 503);

  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, sessionSecret);
  if (!session) return fail("Sesi diperlukan", 401);
  if (session.role !== "admin" || session.school_id !== schoolId) return fail("Akses ditolak", 403);

  let body: AiDataRequestBody;
  try {
    body = await request.json() as AiDataRequestBody;
  } catch {
    return fail("Request tidak valid", 400);
  }

  const mode = typeof body.mode === "string" ? body.mode : "";
  if (mode !== "stats" && mode !== "class_stats") return fail("Request tidak valid", 400);

  const target = await resolveTarget();
  if (!target) return fail("Sekolah tidak ditemukan", 404);
  if (!isStrongSecret(target.sharedSecret)) return fail("Konfigurasi keamanan sekolah belum lengkap", 503);

  try {
    return mode === "class_stats"
      ? await handleClassStatsMode(target, body)
      : await handleStudentStatsMode(target, body);
  } catch (error) {
    // Jangan pernah log request body: boundary ini sengaja bebas credential.
    console.error(`AI data error [${schoolId}]:`, error instanceof Error ? error.message : "unknown");
    return fail("Data analisis belum dapat dimuat. Silakan coba lagi.", 502);
  }
}

async function handleStudentStatsMode(target: ProxyTarget, body: AiDataRequestBody) {
  const id_siswa = typeof body.id_siswa === "string" ? body.id_siswa.trim() : "";
  if (!id_siswa) return fail("Siswa tidak valid", 400);

  const upstream = await callGas(target, "GET", "getStudentAnalysis", { id_siswa });
  if (!upstream.data.success || typeof upstream.data.data !== "object" || upstream.data.data === null) {
    return fail(String(upstream.data.message || "Data hasil ujian tidak tersedia"), 404);
  }
  return NextResponse.json({
    success: true,
    data: { stats: upstream.data.data as unknown as StudentStats },
  });
}

interface GasUser {
  nama_lengkap?: unknown;
  kelas?: unknown;
  skor_akhir?: unknown;
  status_ujian?: unknown;
}

async function handleClassStatsMode(target: ProxyTarget, body: AiDataRequestBody) {
  const kelas = typeof body.kelas === "string" ? body.kelas.trim() : "";
  const [usersRes, configRes] = await Promise.all([
    callGas(target, "GET", "getUsers", {}),
    callGas(target, "GET", "getConfig", {}),
  ]);
  if (!usersRes.data.success || !Array.isArray(usersRes.data.data)) {
    return fail("Data siswa tidak tersedia", 502);
  }

  const config = (configRes.data.data ?? {}) as { kkm?: unknown };
  const kkm = resolveKkm(config.kkm);
  const rows = (usersRes.data.data as GasUser[]).filter(
    (user) => !kelas || String(user.kelas ?? "") === kelas,
  );
  const selesai = rows.filter(
    (user) => user.status_ujian === "SELESAI" && Number.isFinite(Number(user.skor_akhir)),
  );
  if (selesai.length === 0) return fail("Belum ada siswa yang menyelesaikan ujian", 409);

  const names: Record<string, string> = {};
  const students = selesai.map((user, index) => {
    const label = `S${index + 1}`;
    names[label] = String(user.nama_lengkap ?? label);
    return { label, score: Math.round(Number(user.skor_akhir) * 100) / 100 };
  });
  const tuntas = students.filter((student) => isPassingScore(student.score, kkm)).length;
  const stats: ClassStats = {
    kkm,
    total_peserta: rows.length,
    selesai: students.length,
    rata_rata: Math.round(
      (students.reduce((sum, student) => sum + student.score, 0) / students.length) * 100,
    ) / 100,
    tuntas,
    tidak_tuntas: students.length - tuntas,
    students,
  };

  return NextResponse.json({
    success: true,
    data: { stats, names, kelas: kelas || "Semua Kelas" },
  });
}
