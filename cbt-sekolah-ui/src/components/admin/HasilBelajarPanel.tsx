"use client";

// Tab "Hasil Belajar Siswa" pada halaman Analisis.
//
// Angka (nilai, KKM, benar/salah per materi) datang dari server dan tampil tanpa
// memanggil AI. Provider baru dipanggil dari browser saat guru menekan tombol, dan
// hanya untuk siswa dengan nilai di bawah KKM.

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { getStudentStats, getUsers } from "@/lib/api";
import { generateAIJson } from "@/lib/aiProvider";
import { getProviderApiKey, getSelectedProvider } from "@/lib/aiSettings";
import {
  STUDENT_SCHEMA,
  STUDENT_SYSTEM_INSTRUCTION,
  buildStudentPayload,
  canRequestAiAnalysis,
  validateStudentAnalysis,
  type StudentAnalysis,
  type StudentStats,
} from "@/lib/learningAnalysis";
import { useTenantPath } from "@/hooks/useTenantRouter";
import type { User } from "@/types";

interface CachedAnalysis {
  analysis: StudentAnalysis;
  model: string;
  analyzed_at: string;
}

const CACHE_PREFIX = "ai_analysis";

// Cache per tenant + siswa + sidik jari hasil ujian: ganti sekolah, siswa, atau
// hasil ujian berarti key berbeda, jadi hasil lama tidak pernah muncul kembali.
function cacheKey(schoolId: string, provider: string, idSiswa: string, resultHash: string): string {
  return `${CACHE_PREFIX}:${schoolId}:${provider}:${idSiswa}:${resultHash}`;
}

function currentSchoolId(): string {
  if (typeof window === "undefined") return "default";
  const match = window.location.pathname.match(/^\/s\/([^/]+)/);
  return match ? match[1] : "default";
}

function loadCached(key: string): CachedAnalysis | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as CachedAnalysis : null;
  } catch {
    return null;
  }
}

function saveCached(key: string, value: CachedAnalysis) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota penuh — analisis tetap tampil untuk sesi ini */ }
}

const PRIORITY_STYLE: Record<string, string> = {
  TINGGI: "bg-red-50 text-red-700 border-red-100",
  SEDANG: "bg-amber-50 text-amber-700 border-amber-100",
  RENDAH: "bg-slate-50 text-slate-600 border-slate-200",
};

export default function HasilBelajarPanel() {
  const tenantPath = useTenantPath();
  const { data: usersRes, isLoading } = useSWR("getUsers", getUsers);
  const students: User[] = (usersRes?.data ?? []).filter(
    (u) => u.status_ujian === "SELESAI" || u.status_ujian === "DISKUALIFIKASI"
  );

  const [selectedId, setSelectedId] = useState("");
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [statsError, setStatsError] = useState("");
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const [cached, setCached] = useState<CachedAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState("");
  const [notEnoughData, setNotEnoughData] = useState(false);

  const selected = students.find((s) => s.id_siswa === selectedId) ?? null;

  // Pemilihan siswa mereset state lewat handler (bukan di dalam effect), jadi effect
  // ini hanya mengambil statistik dari server.
  useEffect(() => {
    if (!selectedId) return;
    let active = true;

    getStudentStats(selectedId).then((res) => {
      if (!active) return;
      if (!res.success || !res.data) {
        setStats(null);
        setStatsError(res.message ?? "Data hasil ujian tidak tersedia.");
      } else {
        setStats(res.data.stats);
        const provider = getSelectedProvider();
        setCached(loadCached(cacheKey(currentSchoolId(), provider, selectedId, res.data.stats.result_hash)));
      }
      setIsLoadingStats(false);
    });

    return () => { active = false; };
  }, [selectedId]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setStats(null);
    setStatsError("");
    setAiError("");
    setNotEnoughData(false);
    setCached(null);
    setIsLoadingStats(id !== "");
  };

  const handleAnalyze = async () => {
    // Guard yang sama dengan tombol. Klik saat request masih berjalan tidak
    // menghasilkan request penyedia baru; generateAIJson juga men-dedupe request
    // identik (lihat aiProvider.ts). Analisis yang sudah ada di cache tampil tanpa
    // memanggil AI — hanya klik "Analisis Ulang" yang meminta request baru.
    if (!selectedId || !canRequestAiAnalysis(stats, { isRunning: isAnalyzing })) return;
    if (!stats) return;
    const provider = getSelectedProvider();
    if (!getProviderApiKey(provider)) {
      setAiError(`API key ${provider === "gemini" ? "Gemini" : "Groq"} belum diatur. Buka Pengaturan AI untuk menambahkannya.`);
      return;
    }
    setIsAnalyzing(true);
    setAiError("");
    setNotEnoughData(false);

    const res = await generateAIJson<unknown>({
      systemInstruction: STUDENT_SYSTEM_INSTRUCTION,
      prompt: JSON.stringify(buildStudentPayload(stats)),
      schema: STUDENT_SCHEMA,
    }, { provider });
    if (!res.ok) {
      setAiError(res.message);
      setIsAnalyzing(false);
      return;
    }
    const analysis = validateStudentAnalysis(res.data, stats);
    if (!analysis) {
      setAiError("Respons AI tidak dapat diproses.");
      setIsAnalyzing(false);
      return;
    }

    const entry: CachedAnalysis = {
      analysis,
      model: `${res.provider}/${res.model}`,
      analyzed_at: new Date().toISOString(),
    };
    saveCached(cacheKey(currentSchoolId(), provider, selectedId, stats.result_hash), entry);
    setCached(entry);
    setIsAnalyzing(false);
  };

  const perluTindakLanjut = stats ? stats.status === "PERLU_TINDAK_LANJUT" : false;

  return (
    <section className="space-y-6">
      {/* Pemilih siswa */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          Pilih Siswa
        </label>
        <select
          value={selectedId}
          onChange={(e) => handleSelect(e.target.value)}
          className="w-full md:max-w-md h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-semibold text-slate-700 focus:border-[#1E40AF] focus:ring-2 focus:ring-[#1E40AF]/10 outline-none transition-all"
        >
          <option value="">
            {isLoading ? "Memuat data siswa..." : "— Pilih siswa yang sudah selesai ujian —"}
          </option>
          {students.map((s) => (
            <option key={s.id_siswa} value={s.id_siswa}>
              {s.nama_lengkap} — {s.kelas} — Nilai {s.skor_akhir ?? 0}
            </option>
          ))}
        </select>
        {!isLoading && students.length === 0 && (
          <p className="text-xs text-slate-400 mt-2">
            Belum ada siswa yang menyelesaikan ujian.
          </p>
        )}
      </div>

      {isLoadingStats && (
        <div className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
      )}

      {statsError && !isLoadingStats && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
          {statsError}
        </div>
      )}

      {stats && !isLoadingStats && (
        <>
          {/* Nilai, KKM, status */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {selected?.nama_lengkap} • {stats.kelas}
              {stats.mapel_nama ? ` • ${stats.mapel_nama}` : ""}
            </p>
            <div className="flex flex-wrap items-end gap-8 mt-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nilai</p>
                <h3 className="font-black text-3xl text-slate-900">{stats.score}</h3>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">KKM</p>
                <h3 className="font-black text-3xl text-slate-500">{stats.kkm}</h3>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</p>
                <span className={`inline-flex mt-1.5 items-center px-3 py-1 rounded-full font-bold text-xs border ${
                  perluTindakLanjut
                    ? "bg-amber-50 text-amber-700 border-amber-100"
                    : "bg-emerald-50 text-emerald-700 border-emerald-100"
                }`}>
                  {perluTindakLanjut ? "Perlu Tindak Lanjut" : "Tuntas"}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Benar Penuh / Soal</p>
                <h3 className="font-black text-xl text-slate-700 mt-1">
                  {stats.correct} / {stats.total_questions}
                </h3>
                {stats.partial > 0 && (
                  <p className="text-xs text-slate-400">{stats.partial} mendapat kredit sebagian</p>
                )}
              </div>
            </div>
          </div>

          {/* Pola kesalahan per materi */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h4 className="font-black text-xs uppercase tracking-widest text-slate-500 mb-4">
              Pola Kesalahan
            </h4>
            {stats.categories.length === 0 ? (
              <p className="text-sm text-slate-500">
                Soal ujian ini belum memiliki kategori materi, sehingga pola per materi
                belum dapat ditampilkan.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.categories.map((c) => (
                  <div key={c.name} className="flex items-center gap-4">
                    <div className="w-40 shrink-0">
                      <p className="font-bold text-sm text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-400">
                        {c.earnedScore} / {c.maxScore} poin • {c.correct}/{c.total} benar penuh
                      </p>
                    </div>
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${c.accuracy < 50 ? "bg-red-400" : c.accuracy < 75 ? "bg-amber-400" : "bg-emerald-400"}`}
                        style={{ width: `${c.accuracy}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-bold text-xs text-slate-600">
                      {c.accuracy}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            {stats.categories.length > 0 && (
              <p className="text-sm text-slate-600 mt-5">
                <span className="font-bold uppercase text-[10px] tracking-widest text-slate-400 block mb-1">
                  Fokus Utama
                </span>
                {stats.categories[0].name}
              </p>
            )}
          </div>

          {/* Rekomendasi AI */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h4 className="font-black text-xs uppercase tracking-widest text-slate-500">
                Rekomendasi AI
              </h4>
              <button
                onClick={handleAnalyze}
                disabled={!canRequestAiAnalysis(stats, { isRunning: isAnalyzing })}
                title={
                  !perluTindakLanjut
                    ? "Nilai siswa sudah mencapai KKM"
                    : stats.categories.length === 0
                      ? "Soal belum memiliki kategori materi"
                      : ""
                }
                className={`flex items-center gap-2 px-5 h-10 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  isAnalyzing || !perluTindakLanjut || stats.categories.length === 0
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-[#2563EB] text-white hover:opacity-90 shadow-sm cursor-pointer"
                }`}
              >
                <span className={`material-symbols-outlined text-[18px] ${isAnalyzing ? "animate-spin" : ""}`}>
                  {isAnalyzing ? "progress_activity" : cached ? "refresh" : "auto_awesome"}
                </span>
                {isAnalyzing ? "Menganalisis..." : cached ? "Analisis Ulang" : "Analisis dengan AI"}
              </button>
            </div>

            {!perluTindakLanjut && (
              <p className="text-sm text-slate-500">
                Nilai siswa sudah mencapai KKM. Analisis tindak lanjut tidak diperlukan.
              </p>
            )}

            {aiError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
                {aiError}
                {aiError.includes("Pengaturan AI") && (
                  <Link href={tenantPath("/admin/management#ai-settings")} className="block mt-2 font-bold underline">
                    Buka Pengaturan AI
                  </Link>
                )}
              </div>
            )}

            {notEnoughData && (
              <p className="text-sm text-slate-600">
                Data belum cukup untuk mengidentifikasi pola tertentu.
              </p>
            )}

            {isAnalyzing && <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />}

            {cached && !isAnalyzing && (
              <div className="space-y-4">
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {cached.analysis.summary}
                </p>

                {cached.analysis.priorityAreas.map((area) => (
                  <div key={area.category} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="font-bold text-sm text-slate-800">
                      {area.category} — {area.earnedScore}/{area.maxScore} poin ({area.accuracy}%)
                    </p>
                    <p className="text-sm text-slate-600 mt-1">{area.observation}</p>
                  </div>
                ))}

                <ol className="space-y-2">
                  {cached.analysis.recommendations.map((rec, index) => (
                    <li key={index} className="flex gap-3">
                      <span className={`shrink-0 h-6 px-2 inline-flex items-center rounded-full border text-[10px] font-black uppercase tracking-wider ${PRIORITY_STYLE[rec.priority]}`}>
                        {rec.priority}
                      </span>
                      <span className="text-sm text-slate-700">
                        <span className="font-semibold">{rec.action}</span>{" "}
                        <span className="text-slate-500">{rec.reason}</span>
                      </span>
                    </li>
                  ))}
                </ol>

                <p className="text-[10px] text-slate-400 text-right font-bold uppercase">
                  Dianalisis {new Date(cached.analyzed_at).toLocaleString("id-ID")}
                  {cached.model ? ` • ${cached.model}` : ""}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
