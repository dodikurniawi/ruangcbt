"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTenantRouter, useTenantPath } from "@/hooks/useTenantRouter";
import useSWR from "swr";
import { getUsers, getConfig, getPrintSettings, savePrintSettings, getMataPelajaran, type PrintSettings } from "@/lib/api";
import type { MataPelajaran } from "@/types";
import type { User } from "@/types";
import * as XLSX from "xlsx";


interface RekapAIResult {
  siswa_perlu_perhatian: string[];   // array of student names
  catatan_perhatian: string;         // narrative paragraph
  siswa_berprestasi: string[];       // array of student names
  catatan_prestasi: string;          // narrative paragraph
  catatan_mapel: string;             // subject-level notes
  rekomendasi_wali: string;          // homeroom teacher recommendations
  model_used: string;                // e.g. "llama-3.3-70b-versatile"
  analyzed_at: string;               // ISO timestamp
}

const LS_REKAP_CACHE = 'groq_rekap_cache';
const LS_API_KEY     = 'groq_api_key'; // same key as Analisis Butir Soal

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
] as const;

async function callGroqWithFallback(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{ success: boolean; content?: string; model?: string; error?: string }> {
  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 1200,
          response_format: { type: 'json_object' },
        }),
      });

      if (res.status === 401)
        return { success: false, error: 'API key tidak valid.' };
      if (res.status === 429 || res.status >= 500) continue;
      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          content: data.choices?.[0]?.message?.content ?? '',
          model,
        };
      }
      continue;
    } catch { continue; }
  }
  return { success: false, error: 'Semua model tidak tersedia. Coba lagi nanti.' };
}

// Format model name for display: "llama-3.3-70b-versatile" → "GROQ LLAMA 3.3"
function formatModelName(model: string): string {
  if (model.startsWith('llama-3.3')) return 'GROQ LLAMA 3.3';
  if (model.startsWith('llama-3.1')) return 'GROQ LLAMA 3.1';
  if (model.startsWith('mixtral'))   return 'GROQ MIXTRAL 8X7B';
  if (model.startsWith('gemma'))     return 'GROQ GEMMA 2';
  return 'GROQ AI';
}

// Cache helpers
function loadRekapCache(): Record<string, RekapAIResult> {
  try { return JSON.parse(localStorage.getItem(LS_REKAP_CACHE) ?? '{}'); }
  catch { return {}; }
}
function saveRekapCache(cache: Record<string, RekapAIResult>) {
  try { localStorage.setItem(LS_REKAP_CACHE, JSON.stringify(cache)); }
  catch { /* quota exceeded */ }
}

// Build a stable cache key from kelas + mapel
function buildCacheKey(kelas: string, mapel: string): string {
  return `${kelas}__${mapel}`.replace(/\s+/g, '_');
}

interface AIAnalysisPanelProps {
  users: User[];          // already filtered & sorted students for this class
  kelas: string;          // selected class name
  mapelNama: string;      // subject name (from settings or config)
  kkm: number;            // KKM value (75)
  rataRata: number;
  tuntas: number;
  totalPeserta: number;
}

function AIAnalysisPanel({
  users, kelas, mapelNama, kkm, rataRata, tuntas, totalPeserta
}: AIAnalysisPanelProps) {
  const [result, setResult] = useState<RekapAIResult | null>(() => {
    if (typeof window === 'undefined') return null;
    const cache = loadRekapCache();
    return cache[buildCacheKey(kelas, mapelNama)] ?? null;
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  // Re-initialize when kelas or mapel changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cache = loadRekapCache();
    setResult(cache[buildCacheKey(kelas, mapelNama)] ?? null);
    setError('');
  }, [kelas, mapelNama]);

  const selesaiUsersCount = users.filter(u => u.status_ujian === 'SELESAI').length;
  const isAnalyzeDisabled = users.length === 0 || selesaiUsersCount === 0;

  const handleAnalyze = async () => {
    const apiKey = typeof window !== 'undefined'
      ? localStorage.getItem(LS_API_KEY) ?? ''
      : '';

    if (!apiKey) {
      setError('API key Groq belum diatur. Silakan set di halaman Analisis Butir Soal.');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    // Build student data for prompt
    const selesai = users.filter(u => u.status_ujian === 'SELESAI' && u.skor_akhir != null);
    const studentLines = selesai
      .map(u => `- ${u.nama_lengkap} (Kelas: ${u.kelas}): ${u.skor_akhir}`)
      .join('\n');

    const tidakTuntas = selesai.filter(u => (u.skor_akhir ?? 0) < kkm);

    const systemPrompt = `Kamu adalah konsultan pendidikan Indonesia yang ahli dalam 
analisis data hasil ujian. Berikan analisis yang tepat, personal, dan actionable.
Gunakan Bahasa Indonesia formal. Selalu respons dalam format JSON valid.`;

    const userPrompt = `Analisis hasil ujian kelas berikut dan berikan insight untuk guru:

KONTEKS UJIAN:
- Kelas: ${kelas || 'Semua Kelas'}
- Mata Pelajaran: ${mapelNama}
- KKM: ${kkm}
- Total Peserta: ${totalPeserta}
- Sudah Mengerjakan: ${selesai.length}
- Rata-rata Nilai: ${rataRata.toFixed(2)}
- Tuntas: ${tuntas} siswa (${totalPeserta > 0 ? ((tuntas/totalPeserta)*100).toFixed(1) : 0}%)
- Tidak Tuntas: ${tidakTuntas.length} siswa

DATA NILAI SISWA (yang sudah mengerjakan):
${studentLines || 'Belum ada siswa yang mengerjakan.'}

Kembalikan JSON dengan schema PERSIS ini:
{
  "siswa_perlu_perhatian": ["nama siswa 1", "nama siswa 2"],
  "catatan_perhatian": "<paragraf 2-3 kalimat tentang kondisi siswa di bawah KKM dan apa yang perlu dilakukan>",
  "siswa_berprestasi": ["nama siswa 1", "nama siswa 2"],
  "catatan_prestasi": "<paragraf 2-3 kalimat tentang siswa berprestasi dan apresiasi yang disarankan>",
  "catatan_mapel": "<paragraf 2-3 kalimat tentang kondisi mata pelajaran ${mapelNama} berdasarkan data ini>",
  "rekomendasi_wali": "<paragraf 3-4 kalimat berisi rekomendasi tindak lanjut konkret untuk wali kelas>"
}

Aturan:
- siswa_perlu_perhatian: ambil maksimal 5 siswa dengan nilai terendah di bawah KKM
- siswa_berprestasi: ambil maksimal 5 siswa dengan nilai >= 85, urutkan tertinggi
- Jika tidak ada siswa di bawah KKM, set siswa_perlu_perhatian: [] dan catatan_perhatian menjelaskan hal positif ini
- Sebutkan nama siswa dengan bold HTML (<strong>Nama</strong>) di dalam catatan
- Jadikan analisis spesifik berdasarkan angka, bukan generik`;

    const res = await callGroqWithFallback(apiKey, systemPrompt, userPrompt);

    if (!res.success || !res.content) {
      setError(res.error ?? 'Analisis gagal. Coba lagi.');
      setIsAnalyzing(false);
      return;
    }

    try {
      const jsonStr = res.content.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
      const parsed = JSON.parse(jsonStr);
      const newResult: RekapAIResult = {
        siswa_perlu_perhatian: parsed.siswa_perlu_perhatian ?? [],
        catatan_perhatian:     parsed.catatan_perhatian ?? '',
        siswa_berprestasi:     parsed.siswa_berprestasi ?? [],
        catatan_prestasi:      parsed.catatan_prestasi ?? '',
        catatan_mapel:         parsed.catatan_mapel ?? '',
        rekomendasi_wali:      parsed.rekomendasi_wali ?? '',
        model_used:            res.model ?? '',
        analyzed_at:           new Date().toISOString(),
      };
      const cache = loadRekapCache();
      cache[buildCacheKey(kelas, mapelNama)] = newResult;
      saveRekapCache(cache);
      setResult(newResult);
    } catch {
      setError('Respons AI tidak dapat diproses. Coba analisis ulang.');
    }

    setIsAnalyzing(false);
  };

  return (
    <div className="mt-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Panel Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#2563EB] rounded-xl flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-white text-[20px]">
              auto_awesome
            </span>
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-base tracking-wide uppercase">
              ANALISIS AI PINTAR
            </h3>
            {result ? (
              <p className="text-[10px] font-bold text-[#2563EB] uppercase tracking-widest mt-0.5">
                POWERED BY {formatModelName(result.model_used)}
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
                Powered by Groq AI • Multi-model fallback
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || isAnalyzeDisabled}
          title={isAnalyzeDisabled ? "Belum ada siswa yang menyelesaikan ujian" : ""}
          className={`flex items-center gap-2 px-5 h-10 rounded-xl text-xs font-black uppercase tracking-wider
            transition-all cursor-pointer relative group
            ${isAnalyzing || isAnalyzeDisabled
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : result
                ? 'bg-slate-900 text-white hover:bg-slate-700'
                : 'bg-[#2563EB] text-white hover:opacity-90 shadow-sm'
            }`}
        >
          <span className={`material-symbols-outlined text-[18px] 
            ${isAnalyzing ? 'animate-spin' : ''}`}>
            {isAnalyzing ? 'progress_activity' : result ? 'refresh' : 'auto_awesome'}
          </span>
          {isAnalyzing ? 'Menganalisis...' : result ? 'ANALISIS ULANG' : 'MULAI ANALISIS'}

          {isAnalyzeDisabled && (
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-[11px] font-medium py-1.5 px-3 rounded-lg shadow-md whitespace-nowrap z-10 left-1/2 -translate-x-1/2 lowercase first-letter:uppercase normal-case">
              Belum ada siswa yang menyelesaikan ujian
            </div>
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="p-6">

        {/* Error state */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 
            rounded-xl p-4 mb-4">
            <span className="material-symbols-outlined text-red-500 text-[20px] shrink-0 mt-0.5">
              error
            </span>
            <div>
              <p className="font-bold text-red-700 text-sm">Analisis Gagal</p>
              <p className="text-red-600 text-sm mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isAnalyzing && (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
            <p className="text-center text-xs text-slate-400 mt-2 font-bold">
              AI sedang menganalisis {users.filter(u=>u.status_ujian==='SELESAI').length} data siswa...
            </p>
          </div>
        )}

        {/* Empty state — no result yet */}
        {!isAnalyzing && !result && !error && (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center 
              justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-slate-400 text-[32px]">
                auto_awesome
              </span>
            </div>
            <p className="font-bold text-slate-700 text-sm mb-1">
              Belum ada analisis
            </p>
            <p className="text-slate-400 text-xs max-w-xs mx-auto">
              Klik "Mulai Analisis" untuk mendapatkan insight AI tentang 
              performa kelas ini. Membutuhkan Groq API key.
            </p>
          </div>
        )}

        {/* Result cards */}
        {!isAnalyzing && result && (
          <div className="space-y-4">

            {/* Card 1: Siswa Perlu Perhatian */}
            <div className="bg-red-50/50 border border-red-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">⚠️</span>
                <h4 className="font-black text-red-700 text-xs uppercase tracking-widest">
                  Siswa Perlu Perhatian
                </h4>
              </div>
              <p
                className="text-slate-700 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: result.catatan_perhatian }}
              />
            </div>

            {/* Card 2: Siswa Berprestasi */}
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">⭐</span>
                <h4 className="font-black text-emerald-700 text-xs uppercase tracking-widest">
                  Siswa Berprestasi
                </h4>
              </div>
              <p
                className="text-slate-700 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: result.catatan_prestasi }}
              />
            </div>

            {/* Card 3: Catatan Mata Pelajaran */}
            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">📚</span>
                <h4 className="font-black text-amber-700 text-xs uppercase tracking-widest">
                  Catatan Mata Pelajaran
                </h4>
              </div>
              <p
                className="text-slate-700 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: result.catatan_mapel }}
              />
            </div>

            {/* Card 4: Rekomendasi Wali Kelas */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">💡</span>
                <h4 className="font-black text-blue-700 text-xs uppercase tracking-widest">
                  Rekomendasi Wali Kelas
                </h4>
              </div>
              <p
                className="text-slate-700 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: result.rekomendasi_wali }}
              />
            </div>

            {/* Footer timestamp */}
            <p className="text-[10px] text-slate-400 text-right pt-1 font-bold">
              DIANALISIS:{" "}
              {new Date(result.analyzed_at).toLocaleString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              }).toUpperCase()}{" "}
              • MODEL: {result.model_used.toUpperCase()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminCetak() {
  const router = useTenantRouter();
  const tenantPath = useTenantPath();
  const pathname = usePathname();

  const isLinkActive = (path: string) => {
    if (path === "/admin") {
      return pathname.endsWith("/admin") || pathname.endsWith("/admin/");
    }
    return pathname.includes(path);
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"settings" | "kartu" | "hasil">("settings");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Filter and sort states for print previews
  const [kartuClass, setKartuClass] = useState("All Classes");
  const [hasilClass, setHasilClass] = useState("All Classes");
  const [hasilMapel, setHasilMapel] = useState(""); // "" = tampilkan label dari print settings
  const [sortBy, setSortBy] = useState<"nama" | "skor">("skor");
  const [isExportingXlsx, setIsExportingXlsx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Local print settings fallback
  const [localSettings, setLocalSettings] = useState<PrintSettings | null>(null);

  // Custom Logo base64 states
  const [logoKiri, setLogoKiri] = useState<string>("");
  const [logoKanan, setLogoKanan] = useState<string>("");

  // Form reference for tab 1
  const formRef = useRef<HTMLFormElement>(null);

  // Auth Guard
  useEffect(() => {
    if (sessionStorage.getItem("admin_auth") !== "true") {
      router.replace("/admin/login");
    }
  }, [router]);

  // SWR queries
  const { data: usersRes } = useSWR("getUsers", getUsers);
  const { data: configRes } = useSWR("getConfig", getConfig);
  const { data: printRes, mutate: mutatePrint } = useSWR("getPrintSettings", getPrintSettings);
  const { data: mapelRes } = useSWR("getMataPelajaran", getMataPelajaran);

  const users: User[] = usersRes?.data ?? [];
  const config = configRes?.data;
  const mapelList: MataPelajaran[] = mapelRes?.data ?? [];

  // Initialize local print settings and custom logos on mount
  useEffect(() => {
    const saved = localStorage.getItem("print_settings");
    if (saved) {
      setLocalSettings(JSON.parse(saved));
    }
    const savedLogoKiri = localStorage.getItem("logo_kiri_base64");
    if (savedLogoKiri) setLogoKiri(savedLogoKiri);
    const savedLogoKanan = localStorage.getItem("logo_kanan_base64");
    if (savedLogoKanan) setLogoKanan(savedLogoKanan);
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, position: "kiri" | "kanan") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (position === "kiri") {
        setLogoKiri(base64String);
        localStorage.setItem("logo_kiri_base64", base64String);
      } else {
        setLogoKanan(base64String);
        localStorage.setItem("logo_kanan_base64", base64String);
      }
      setToast("✓ Logo berhasil diunggah!");
      setTimeout(() => setToast(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleClearLogo = (position: "kiri" | "kanan") => {
    if (position === "kiri") {
      setLogoKiri("");
      localStorage.removeItem("logo_kiri_base64");
    } else {
      setLogoKanan("");
      localStorage.removeItem("logo_kanan_base64");
    }
    setToast("✓ Logo berhasil dihapus!");
    setTimeout(() => setToast(null), 3000);
  };

  // Determine active print settings: use SWR if successful, else fallback to localSettings
  const hasRemoteSettings = printRes && printRes.success && printRes.data;
  const settings: PrintSettings | null = hasRemoteSettings
    ? printRes.data!
    : localSettings;

  // Extract distinct classes for filters
  const classes = Array.from(new Set(users.map((u) => u.kelas))).filter(Boolean);

  // Filtered lists for preview
  const filteredKartu = users.filter((u) => {
    return kartuClass === "All Classes" || u.kelas === kartuClass;
  });

  const selectedKelas = hasilClass === "All Classes" ? "" : hasilClass;

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchClass = hasilClass === "All Classes" || u.kelas === hasilClass;
      const matchStatus = u.status_ujian === "SELESAI" || u.status_ujian === "DISKUALIFIKASI";
      return matchClass && matchStatus;
    });
  }, [users, hasilClass]);

  const stats = useMemo(() => {
    const selesaiUsers = filteredUsers.filter(u => u.status_ujian === 'SELESAI' && u.skor_akhir != null);
    const KKM = 75;
    const totalPeserta = filteredUsers.length;

    const rataRata = selesaiUsers.length > 0
      ? selesaiUsers.reduce((sum, u) => sum + (u.skor_akhir ?? 0), 0) / selesaiUsers.length
      : 0;

    const nilaiTertinggi = selesaiUsers.length > 0
      ? Math.max(...selesaiUsers.map(u => u.skor_akhir ?? 0))
      : 0;

    const nilaiTerendah = selesaiUsers.length > 0
      ? Math.min(...selesaiUsers.map(u => u.skor_akhir ?? 0))
      : 0;

    const tuntas = selesaiUsers.filter(u => (u.skor_akhir ?? 0) >= KKM).length;

    return { rataRata, nilaiTertinggi, nilaiTerendah, tuntas, totalPeserta };
  }, [filteredUsers]);

  const { rataRata, nilaiTertinggi, nilaiTerendah, tuntas, totalPeserta } = stats;

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      if (sortBy === 'skor') {
        return (b.skor_akhir ?? -1) - (a.skor_akhir ?? -1);
      }
      return a.nama_lengkap.localeCompare(b.nama_lengkap, 'id');
    });
  }, [filteredUsers, sortBy]);

  // Save settings handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);

    const nextSettings: PrintSettings = {
      school_name: (fd.get("school_name") as string) || "",
      school_address: (fd.get("school_address") as string) || "",
      school_city: (fd.get("school_city") as string) || "",
      kepala_sekolah_nama: (fd.get("kepala_sekolah_nama") as string) || "",
      kepala_sekolah_nip: (fd.get("kepala_sekolah_nip") as string) || "",
      guru_mapel_nama: (fd.get("guru_mapel_nama") as string) || "",
      guru_mapel_nip: (fd.get("guru_mapel_nip") as string) || "",
      guru_mapel_mapel: (fd.get("guru_mapel_mapel") as string) || "",
      guru_wali_nama: (fd.get("guru_wali_nama") as string) || "",
      guru_wali_nip: (fd.get("guru_wali_nip") as string) || "",
      tahun_pelajaran: (fd.get("tahun_pelajaran") as string) || "",
      semester: (fd.get("semester") as "Ganjil" | "Genap") || "Ganjil",
    };

    setIsSaving(true);
    setToast(null);

    // Save locally
    localStorage.setItem("print_settings", JSON.stringify(nextSettings));
    setLocalSettings(nextSettings);

    try {
      const res = await savePrintSettings(nextSettings);
      if (res && res.success) {
        await mutatePrint();
        setToast("✓ Pengaturan berhasil disimpan!");
      } else {
        setToast("✓ Pengaturan disimpan secara lokal!");
      }
    } catch (err) {
      setToast("✓ Pengaturan disimpan secara lokal!");
    } finally {
      setIsSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Printing Functions
  const handlePrintCards = () => {
    if (filteredKartu.length === 0) return;
    const win = window.open("", "_blank");
    if (!win) return;

    const today = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const cardsHtml = filteredKartu
      .map(
        (student) => `
      <div class="card">
        <div class="card-header">
          <div class="logo-placeholder">
            ${logoKiri ? `<img src="${logoKiri}" style="max-width:44px; max-height:44px; object-fit:contain;" />` : `
              <svg viewBox="0 0 100 100" width="38" height="38">
                <polygon points="50,2 93,27 93,73 50,98 7,73 7,27" fill="#f8fafc" stroke="#2563EB" stroke-width="4"/>
                <path d="M50,15 L50,85 M15,50 L85,50" stroke="#2563EB" stroke-width="2"/>
              </svg>
            `}
          </div>
          <div class="header-text">
            <h3>KARTU PESERTA</h3>
            <h3 class="exam-title">TRY OUT UJIAN ${settings?.guru_mapel_mapel?.toUpperCase() || config?.exam_name?.toUpperCase() || "USBN SD/MI"}</h3>
            <p>TAHUN AJARAN ${settings?.tahun_pelajaran || "2025/2026"}</p>
          </div>
          <div class="logo-placeholder">
            ${logoKanan ? `<img src="${logoKanan}" style="max-width:44px; max-height:44px; object-fit:contain;" />` : `
              <svg viewBox="0 0 100 100" width="38" height="38">
                <polygon points="50,2 93,27 93,73 50,98 7,73 7,27" fill="#f8fafc" stroke="#2563EB" stroke-width="4"/>
                <circle cx="50" cy="46" r="24" fill="none" stroke="#2563EB" stroke-width="3"/>
                <path d="M50,12 L50,80 M20,46 L80,46" stroke="#2563EB" stroke-width="2"/>
                <polygon points="50,22 40,55 60,55" fill="#2563EB"/>
                <path d="M28,68 C35,85 65,85 72,68" fill="none" stroke="#2563EB" stroke-width="3"/>
              </svg>
            `}
          </div>
        </div>

        <table class="info-table">
          <tr>
            <td>Nomor Peserta</td>
            <td>:</td>
            <td class="highlight">${student.id_siswa}</td>
          </tr>
          <tr>
            <td>Nama</td>
            <td>:</td>
            <td class="highlight">${student.nama_lengkap.toUpperCase()}</td>
          </tr>
          <tr>
            <td>Tempat/Tanggal Lahir</td>
            <td>:</td>
            <td>${settings?.school_city || "Kota"}, 10 Januari 2011</td>
          </tr>
          <tr>
            <td>Sekolah Asal</td>
            <td>:</td>
            <td>${settings?.school_name || "NAMA SEKOLAH"}</td>
          </tr>
        </table>

        <div class="lower-section">
          <div class="photo-container">
            <div class="photo-box">
              <svg viewBox="0 0 100 120" width="100%" height="100%">
                <rect width="100" height="120" fill="#1d4ed8"/>
                <circle cx="50" cy="45" r="20" fill="#ffffff" opacity="0.95"/>
                <path d="M15 110 C 15 80, 30 75, 50 75 C 70 75, 85 80, 85 110 Z" fill="#ffffff" opacity="0.95"/>
                <polygon points="50,75 42,88 58,88" fill="#e2e8f0"/>
                <polygon points="50,88 46,115 54,115" fill="#1d4ed8"/>
              </svg>
            </div>
          </div>
          <div class="sig-block">
            <div>${settings?.school_city || "Kota"}, ${today}</div>
            <div class="sig-role">Kepala Sekolah</div>
            <div class="sig-line"></div>
            <div class="sig-name"><u>${settings?.kepala_sekolah_nama || "_________________"}</u></div>
            <div class="sig-nip">NIP. ${settings?.kepala_sekolah_nip || "-"}</div>
          </div>
        </div>
      </div>
    `
      )
      .join("");

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Kartu Peserta Ujian</title>
        <style>
          @page { size: A4; margin: 10mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, sans-serif; }
          body { padding: 5mm; background: #fff; color: #1e293b; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
          .card { border: 4px double #2563EB; padding: 16px; page-break-inside: avoid; border-radius: 6px; background: #fff; width: 100%; min-height: 290px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; }
          .card-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #2563EB; padding-bottom: 8px; margin-bottom: 12px; }
          .logo-placeholder { display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; }
          .header-text { text-align: center; flex: 1; margin: 0 8px; }
          .header-text h3 { font-size: 12px; font-weight: 900; text-transform: uppercase; line-height: 1.3; color: #000; }
          .header-text .exam-title { font-size: 11px; font-weight: 800; }
          .header-text p { font-size: 9px; font-weight: bold; color: #374151; margin-top: 1px; }
          
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          .info-table td { padding: 3px 2px; font-size: 11px; font-weight: 600; color: #000; }
          .info-table td:first-child { width: 130px; font-weight: bold; }
          .info-table td:nth-child(2) { width: 15px; text-align: center; }
          .info-table td.highlight { font-weight: 800; font-size: 11.5px; }
          
          .lower-section { display: flex; gap: 12px; align-items: flex-end; justify-content: space-between; margin-top: auto; }
          .photo-container { width: 75px; height: 95px; border: 1.5px solid #000; padding: 1px; background: #fff; display: flex; align-items: center; justify-content: center; shrink-0; }
          .photo-box { width: 100%; height: 100%; position: relative; overflow: hidden; background: #1d4ed8; display: flex; align-items: center; justify-content: center; }
          
          .sig-block { text-align: center; font-size: 10px; font-weight: bold; width: 55%; color: #000; }
          .sig-role { margin-top: 2px; }
          .sig-line { height: 35px; }
          .sig-name { font-weight: 900; font-size: 11px; }
          .sig-nip { font-weight: 800; font-size: 9.5px; margin-top: 2px; }
          
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="grid">${cardsHtml}</div>
        <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const handleExportXLSX = () => {
    setIsExportingXlsx(true);
    try {
      const KKM = 75;
      const today = new Date().toLocaleDateString('id-ID', { 
        day: 'numeric', month: 'long', year: 'numeric' 
      });

      // Build rows
      const rows = sortedUsers.map((u, idx) => {
        const skor = u.skor_akhir ?? null;
        const ket = u.status_ujian === 'DISKUALIFIKASI'
          ? 'Didiskualifikasi'
          : skor === null
            ? 'Belum Mengerjakan'
            : skor >= KKM ? 'Tuntas' : 'Tidak Tuntas';
        return {
          'No': idx + 1,
          'Nama Siswa': u.nama_lengkap,
          'Username': u.username,
          'Kelas': u.kelas,
          'Skor': skor ?? '-',
          'Status': u.status_ujian,
          'Keterangan': ket,
        };
      });

      // Summary rows
      const summaryRows = [
        {},
        { 'No': 'Jumlah Peserta', 'Nama Siswa': totalPeserta },
        { 'No': 'Rata-rata', 'Nama Siswa': rataRata.toFixed(2) },
        { 'No': 'Nilai Tertinggi', 'Nama Siswa': nilaiTertinggi },
        { 'No': 'Nilai Terendah', 'Nama Siswa': nilaiTerendah },
        { 'No': `Tuntas (KKM ${KKM})`, 'Nama Siswa': `${tuntas} dari ${totalPeserta}` },
      ];

      const ws = XLSX.utils.json_to_sheet([...rows, ...summaryRows]);

      // Column widths
      ws['!cols'] = [
        { wch: 5 },   // No
        { wch: 30 },  // Nama
        { wch: 15 },  // Username
        { wch: 10 },  // Kelas
        { wch: 8 },   // Skor
        { wch: 15 },  // Status
        { wch: 18 },  // Ket
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Nilai');

      const mapelLabel = hasilMapel
        ? (mapelList.find(m => m.id_mapel === hasilMapel)?.nama_mapel ?? 'Ujian')
        : (settings?.guru_mapel_mapel || 'Ujian');
      const filename = `Rekap_Nilai_${mapelLabel.replace(/\s/g, '_')}_${hasilClass === "All Classes" ? "Semua" : hasilClass}_${new Date().getFullYear()}.xlsx`;
      XLSX.writeFile(wb, filename);
    } finally {
      setIsExportingXlsx(false);
    }
  };

  const handleExportPDF = () => {
    const KKM = 75;
    const today = new Date().toLocaleDateString('id-ID', { 
      day: 'numeric', month: 'long', year: 'numeric' 
    });
    const mapel = hasilMapel
      ? (mapelList.find(m => m.id_mapel === hasilMapel)?.nama_mapel ?? 'Ujian')
      : (settings?.guru_mapel_mapel || config?.exam_name || 'Ujian');
    const schoolName = settings?.school_name || 'Nama Sekolah';
    const schoolAddress = settings?.school_address || '';
    const tahunPelajaran = settings?.tahun_pelajaran || '';
    const semester = settings?.semester || '';
    const city = settings?.school_city || '';

    const tableRows = sortedUsers.map((u, idx) => {
      const skor = u.skor_akhir;
      const ket = u.status_ujian === 'DISKUALIFIKASI'
        ? '<span style="color:#dc2626">Didiskualifikasi</span>'
        : skor == null
          ? '<span style="color:#94a3b8">Belum</span>'
          : skor >= KKM
            ? '<span style="color:#16a34a;font-weight:bold">Tuntas</span>'
            : '<span style="color:#dc2626">Tidak Tuntas</span>';
      return `
        <tr>
          <td style="text-align:center">${idx + 1}</td>
          <td>${u.nama_lengkap}</td>
          <td style="text-align:center">${u.kelas}</td>
          <td style="text-align:center;font-weight:bold">${skor ?? '-'}</td>
          <td style="text-align:center">${ket}</td>
        </tr>
      `;
    }).join('');

    const hasWali = !!(settings?.guru_wali_nama);

    const win = window.open('', '_blank');
    if (!win) { alert('Pop-up diblokir. Izinkan pop-up untuk halaman ini.'); return; }

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Rekap Nilai ${mapel}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm 15mm 20mm 15mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; }
          
          .header { text-align: center; border-bottom: 3px solid #1e293b; padding-bottom: 10px; margin-bottom: 14px; }
          .header .school-name { font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
          .header .school-sub { font-size: 10px; color: #475569; margin-top: 2px; }
          .header .doc-title { font-size: 13px; font-weight: 900; text-transform: uppercase; margin-top: 8px; letter-spacing: 1px; }
          .header .doc-sub { font-size: 10px; color: #475569; margin-top: 2px; }
          
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
          .stat-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; }
          .stat-label { font-size: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; }
          .stat-value { font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 3px; }
          
          table { width: 100%; border-collapse: collapse; }
          thead { background-color: #0f172a; color: white; }
          thead th { padding: 7px 10px; font-size: 10px; text-align: left; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
          thead th:first-child, thead th:nth-child(3), thead th:nth-child(4), thead th:last-child { text-align: center; }
          tbody tr { border-bottom: 1px solid #f1f5f9; }
          tbody tr:nth-child(even) { background-color: #f8fafc; }
          tbody td { padding: 6px 10px; }
          tbody td:first-child, tbody td:nth-child(3), tbody td:nth-child(4), tbody td:last-child { text-align: center; }
          
          .table-footer { background: #f1f5f9; border-top: 2px solid #e2e8f0; }
          .table-footer td { padding: 8px 10px; font-size: 10px; color: #475569; font-weight: bold; }
          
          .signatures { display: flex; justify-content: ${hasWali ? 'space-between' : 'flex-end'}; margin-top: 24px; gap: 20px; }
          .sig-block { text-align: center; min-width: 160px; }
          .sig-place { font-size: 10px; color: #475569; }
          .sig-role { font-weight: bold; font-size: 11px; margin: 6px 0 40px; }
          .sig-line { border-bottom: 1px solid #374151; width: 150px; margin: 0 auto 4px; }
          .sig-name { font-weight: bold; font-size: 11px; }
          .sig-nip { font-size: 9px; color: #6b7280; margin-top: 2px; }
          
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">${schoolName}</div>
          <div class="school-sub">${schoolAddress}</div>
          <div class="doc-title">Daftar Nilai Hasil Ujian</div>
          <div class="doc-sub">
            Mata Pelajaran: ${mapel} &nbsp;|&nbsp; 
            ${selectedKelas ? `Kelas: ${selectedKelas} &nbsp;|&nbsp;` : ''}
            Tahun Pelajaran: ${tahunPelajaran} Semester ${semester}
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Rata-rata Kelas</div>
            <div class="stat-value">${rataRata.toFixed(2)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Nilai Tertinggi</div>
            <div class="stat-value">${nilaiTertinggi.toFixed(2)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Nilai Terendah</div>
            <div class="stat-value">${nilaiTerendah}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Ketuntasan (KKM ${KKM})</div>
            <div class="stat-value">${tuntas}<span style="font-size:13px;font-weight:normal;color:#94a3b8">/${totalPeserta}</span></div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:40px">No</th>
              <th>Nama Siswa</th>
              <th style="width:70px">Kelas</th>
              <th style="width:60px">Skor</th>
              <th style="width:110px">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr class="table-footer">
              <td colspan="2">
                Jumlah Peserta: ${totalPeserta} &nbsp;|&nbsp; 
                Tuntas: ${tuntas} &nbsp;|&nbsp; 
                Tidak Tuntas: ${totalPeserta - tuntas} &nbsp;|&nbsp;
                Rata-rata: ${rataRata.toFixed(2)}
              </td>
              <td colspan="3" style="text-align:right">
                KKM: ${KKM}
              </td>
            </tr>
          </tbody>
        </table>

        <div class="signatures">
          ${hasWali ? `
          <div class="sig-block">
            <div class="sig-place">&nbsp;</div>
            <div class="sig-role">Guru Wali Kelas,</div>
            <div class="sig-line"></div>
            <div class="sig-name">${settings?.guru_wali_nama ?? ''}</div>
            <div class="sig-nip">NIP. ${settings?.guru_wali_nip ?? '-'}</div>
          </div>` : ''}
          <div class="sig-block">
            <div class="sig-place">${city}, ${today}</div>
            <div class="sig-role">Guru Mata Pelajaran,</div>
            <div class="sig-line"></div>
            <div class="sig-name">${settings?.guru_mapel_nama ?? '_________________'}</div>
            <div class="sig-nip">NIP. ${settings?.guru_mapel_nip ?? '-'}</div>
          </div>
          <div class="sig-block">
            <div class="sig-place">&nbsp;</div>
            <div class="sig-role">Kepala Sekolah,</div>
            <div class="sig-line"></div>
            <div class="sig-name">${settings?.kepala_sekolah_nama ?? '_________________'}</div>
            <div class="sig-nip">NIP. ${settings?.kepala_sekolah_nip ?? '-'}</div>
          </div>
        </div>

        <script>
          window.onload = () => {
            window.print();
            window.onafterprint = () => window.close();
          };
        <\/script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="bg-[#f8fafc] text-slate-800 font-body-student min-h-screen flex">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#0f172a] text-white px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sky-400 text-2xl">school</span>
          <span className="font-extrabold text-base tracking-wider text-white">CBT <span className="text-sky-400">ADMIN</span></span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 text-white cursor-pointer focus:outline-none">
          <span className="material-symbols-outlined text-2xl">{isSidebarOpen ? "close" : "menu"}</span>
        </button>
      </div>

      {/* Sidebar Panel */}
      <aside className={`fixed left-0 top-0 h-full w-64 flex flex-col bg-[#0F172A] shadow-xl border-r border-slate-800 z-50 transform md:transform-none md:translate-x-0 transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 flex justify-between items-center border-b border-slate-800">
          <div>
            <Link href={tenantPath("/")} className="flex items-center gap-2 text-white hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-sky-400 text-2xl">school</span>
              <h1 className="font-black text-lg tracking-wider text-white">CBT <span className="text-sky-400">ADMIN</span></h1>
            </Link>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1">Institutional Portal</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white p-1 cursor-pointer">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-grow px-4 space-y-1 mt-6">
          <Link 
            href={tenantPath("/admin")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
              isLinkActive("/admin") && !isLinkActive("/kelas") && !isLinkActive("/mata-pelajaran") && !isLinkActive("/management") && !isLinkActive("/questions") && !isLinkActive("/cetak") && !isLinkActive("/analisis")
                ? "bg-[#2563EB] text-white font-bold shadow-md shadow-blue-500/10" 
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span className="text-sm">Dashboard</span>
          </Link>

          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-4 mb-1 mt-4">Master Data</div>
          <Link 
            href={tenantPath("/admin/kelas")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
              isLinkActive("/kelas") 
                ? "bg-[#2563EB] text-white font-bold shadow-md shadow-blue-500/10" 
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">class</span>
            <span className="text-sm">Data Kelas</span>
          </Link>
          <Link 
            href={tenantPath("/admin/mata-pelajaran")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
              isLinkActive("/mata-pelajaran") 
                ? "bg-[#2563EB] text-white font-bold shadow-md shadow-blue-500/10" 
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">book_2</span>
            <span className="text-sm">Mata Pelajaran</span>
          </Link>

          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-4 mb-1 mt-4">Administrasi</div>
          <Link 
            href={tenantPath("/admin/management")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
              isLinkActive("/management") 
                ? "bg-[#2563EB] text-white font-bold shadow-md shadow-blue-500/10" 
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">group</span>
            <span className="text-sm">Data Siswa</span>
          </Link>
          <Link 
            href={tenantPath("/admin/questions")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
              isLinkActive("/questions") 
                ? "bg-[#2563EB] text-white font-bold shadow-md shadow-blue-500/10" 
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            <span className="text-sm">Bank Soal</span>
          </Link>
           <Link 
            href={tenantPath("/admin/cetak")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
              isLinkActive("/cetak") 
                ? "bg-[#2563EB] text-white font-bold shadow-md shadow-blue-500/10" 
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">print</span>
            <span className="text-sm">Cetak</span>
          </Link>
          <Link 
            href={tenantPath("/admin/analisis")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
              isLinkActive("/analisis") 
                ? "bg-[#2563EB] text-white font-bold shadow-md shadow-blue-500/10" 
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">analytics</span>
            <span className="text-sm font-medium">Analisis Soal</span>
          </Link>

          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-4 mb-1 mt-4">Ujian</div>
          <Link 
            href={tenantPath("/admin")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
              isLinkActive("/admin") && !isLinkActive("/kelas") && !isLinkActive("/mata-pelajaran") && !isLinkActive("/management") && !isLinkActive("/questions") && !isLinkActive("/cetak") && !isLinkActive("/analisis")
                ? "bg-[#2563EB] text-white font-bold shadow-md shadow-blue-500/10" 
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">quiz</span>
            <span className="text-sm">Ujian</span>
          </Link>
        </nav>

        {/* Footer Sidebar */}
        <div className="p-6 border-t border-slate-800">
          <button
            onClick={() => { sessionStorage.removeItem("admin_auth"); router.replace("/admin/login"); }}
            className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors cursor-pointer w-full text-left font-bold text-xs uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-red-400">logout</span>
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden"></div>}

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 min-h-screen p-6 md:p-10 w-full transition-all pt-24 md:pt-10">
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[#2563EB] text-3xl">print</span>
            <h2 className="font-black text-2xl md:text-3xl text-slate-900 tracking-tight">Administrasi Cetak</h2>
          </div>
          <p className="text-xs uppercase font-extrabold tracking-widest text-[#2563EB]">Cetak Kartu Peserta & Hasil Nilai Ujian</p>
        </header>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-8">
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-5 py-2 text-sm transition-all cursor-pointer ${
              activeTab === "settings"
                ? "bg-white shadow-sm text-slate-800 font-bold rounded-lg"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Pengaturan Cetak
          </button>
          <button
            onClick={() => setActiveTab("kartu")}
            className={`px-5 py-2 text-sm transition-all cursor-pointer ${
              activeTab === "kartu"
                ? "bg-white shadow-sm text-slate-800 font-bold rounded-lg"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Kartu Ujian
          </button>
          <button
            onClick={() => setActiveTab("hasil")}
            className={`px-5 py-2 text-sm transition-all cursor-pointer ${
              activeTab === "hasil"
                ? "bg-white shadow-sm text-slate-800 font-bold rounded-lg"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Hasil Ujian
          </button>
        </div>

        {/* GAS backend status warning */}
        {!hasRemoteSettings && activeTab === "settings" && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 mb-6 text-sm font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-lg">info</span>
            <span>Pengaturan disimpan secara lokal. Fitur penyimpanan cloud memerlukan pemutakhiran backend GAS.</span>
          </div>
        )}

        {/* Tab Content: Settings */}
        {activeTab === "settings" && (
          <form ref={formRef} onSubmit={handleSaveSettings} key={JSON.stringify(settings)}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Left Column Stack */}
              <div className="space-y-6">
                {/* Informasi Sekolah */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
                    <span className="material-symbols-outlined text-[#2563EB] text-2xl">school</span>
                    <h3 className="font-bold text-slate-800 text-base">Informasi Sekolah</h3>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 text-sm mb-1.5 block">Nama Sekolah*</label>
                    <input
                      name="school_name"
                      required
                      defaultValue={settings?.school_name || ""}
                      placeholder="Contoh: SMA Negeri 1 Kota"
                      className="w-full border border-slate-200 rounded-xl px-4 h-11 text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 outline-none bg-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 text-sm mb-1.5 block">Alamat Sekolah</label>
                    <textarea
                      name="school_address"
                      rows={2}
                      defaultValue={settings?.school_address || ""}
                      placeholder="Contoh: Jl. Merdeka No. 12"
                      className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 outline-none bg-white font-medium resize-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 text-sm mb-1.5 block">Kota</label>
                    <input
                      name="school_city"
                      defaultValue={settings?.school_city || ""}
                      placeholder="Contoh: Jakarta"
                      className="w-full border border-slate-200 rounded-xl px-4 h-11 text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 outline-none bg-white font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 text-sm mb-1.5 block">Tahun Pelajaran</label>
                      <input
                        name="tahun_pelajaran"
                        defaultValue={settings?.tahun_pelajaran || "2025/2026"}
                        placeholder="2025/2026"
                        className="w-full border border-slate-200 rounded-xl px-4 h-11 text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 outline-none bg-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 text-sm mb-1.5 block">Semester</label>
                      <select
                        name="semester"
                        defaultValue={settings?.semester || "Ganjil"}
                        className="w-full border border-slate-200 rounded-xl px-4 h-11 text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 outline-none bg-white font-bold"
                      >
                        <option value="Ganjil">Ganjil</option>
                        <option value="Genap">Genap</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Logo Kartu Ujian (Opsional) */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
                    <span className="material-symbols-outlined text-[#2563EB] text-2xl">image</span>
                    <h3 className="font-bold text-slate-800 text-base">Logo Kartu Ujian (Opsional)</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Logo Pemda (Kiri) */}
                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-3">
                      <div>
                        <label className="font-extrabold text-slate-700 text-xs uppercase tracking-wider block mb-1">Logo Pemda (Kiri)</label>
                        <p className="text-[11px] text-slate-400 font-bold">Sisi kiri header kartu</p>
                      </div>
                      
                      {logoKiri ? (
                        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-2">
                          <img src={logoKiri} className="w-10 h-10 object-contain rounded" />
                          <button
                            type="button"
                            onClick={() => handleClearLogo("kiri")}
                            className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline cursor-pointer ml-auto"
                          >
                            Hapus
                          </button>
                        </div>
                      ) : (
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e, "kiri")}
                          className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer"
                        />
                      )}
                    </div>

                    {/* Logo Sekolah (Kanan) */}
                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-3">
                      <div>
                        <label className="font-extrabold text-slate-700 text-xs uppercase tracking-wider block mb-1">Logo Sekolah (Kanan)</label>
                        <p className="text-[11px] text-slate-400 font-bold">Sisi kanan header kartu</p>
                      </div>

                      {logoKanan ? (
                        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-2">
                          <img src={logoKanan} className="w-10 h-10 object-contain rounded" />
                          <button
                            type="button"
                            onClick={() => handleClearLogo("kanan")}
                            className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline cursor-pointer ml-auto"
                          >
                            Hapus
                          </button>
                        </div>
                      ) : (
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e, "kanan")}
                          className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer"
                        />
                      )}
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-[11px] text-amber-700 font-bold flex items-start gap-1.5 leading-relaxed">
                    <span className="material-symbols-outlined text-amber-600 text-base shrink-0">info</span>
                    <span>masukan logo sekolah anda dan logopemda jika ada kalau ingin ada logo di kiri kanan kartuanda</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Stacked cards */}
              <div className="space-y-6">
                {/* Card Kepala Sekolah */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
                    <span className="material-symbols-outlined text-[#2563EB] text-2xl">manage_accounts</span>
                    <h3 className="font-bold text-slate-800 text-base">Kepala Sekolah</h3>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 text-sm mb-1.5 block">Nama Kepala Sekolah*</label>
                    <input
                      name="kepala_sekolah_nama"
                      required
                      defaultValue={settings?.kepala_sekolah_nama || ""}
                      placeholder="Nama Lengkap & Gelar"
                      className="w-full border border-slate-200 rounded-xl px-4 h-11 text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 outline-none bg-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 text-sm mb-1.5 block">NIP</label>
                    <input
                      name="kepala_sekolah_nip"
                      defaultValue={settings?.kepala_sekolah_nip || ""}
                      placeholder="19XXXXXXXXXX"
                      className="w-full border border-slate-200 rounded-xl px-4 h-11 text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 outline-none bg-white font-medium"
                    />
                  </div>
                </div>

                {/* Card Guru Pengampu */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
                    <span className="material-symbols-outlined text-[#2563EB] text-2xl">book</span>
                    <h3 className="font-bold text-slate-800 text-base">Guru Pengampu</h3>
                  </div>

                  {/* Sub section: Guru Mapel */}
                  <div className="space-y-4">
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Guru Mata Pelajaran</h4>

                    <div>
                      <label className="font-bold text-slate-700 text-sm mb-1.5 block">Nama Guru Mapel*</label>
                      <input
                        name="guru_mapel_nama"
                        required
                        defaultValue={settings?.guru_mapel_nama || ""}
                        placeholder="Nama Guru & Gelar"
                        className="w-full border border-slate-200 rounded-xl px-4 h-11 text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 outline-none bg-white font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="font-bold text-slate-700 text-sm mb-1.5 block">NIP Guru Mapel</label>
                        <input
                          name="guru_mapel_nip"
                          defaultValue={settings?.guru_mapel_nip || ""}
                          placeholder="NIP Guru Mapel"
                          className="w-full border border-slate-200 rounded-xl px-4 h-11 text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 outline-none bg-white font-medium"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 text-sm mb-1.5 block">Mata Pelajaran</label>
                        <input
                          name="guru_mapel_mapel"
                          defaultValue={settings?.guru_mapel_mapel || ""}
                          placeholder="Contoh: Matematika"
                          className="w-full border border-slate-200 rounded-xl px-4 h-11 text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 outline-none bg-white font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-100 my-4" />

                  {/* Sub section: Guru Wali */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Guru Wali Kelas</h4>
                      <span className="text-[10px] text-slate-400 font-bold">(opsional)</span>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 text-sm mb-1.5 block">Nama Guru Wali</label>
                      <input
                        name="guru_wali_nama"
                        defaultValue={settings?.guru_wali_nama || ""}
                        placeholder="Nama Wali Kelas & Gelar"
                        className="w-full border border-slate-200 rounded-xl px-4 h-11 text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 outline-none bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 text-sm mb-1.5 block">NIP Guru Wali</label>
                      <input
                        name="guru_wali_nip"
                        defaultValue={settings?.guru_wali_nip || ""}
                        placeholder="NIP Wali Kelas"
                        className="w-full border border-slate-200 rounded-xl px-4 h-11 text-sm focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 outline-none bg-white font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Row */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="submit"
                disabled={isSaving}
                className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl px-6 h-11 font-bold text-sm tracking-wide transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">save</span>
                    <span>Simpan Pengaturan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab Content: Kartu */}
        {activeTab === "kartu" && (
          <div>
            {/* Warning if print settings incomplete */}
            {(!settings?.school_name || !settings?.kepala_sekolah_nama) && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-4 mb-6 flex items-start gap-2.5 text-sm">
                <span className="material-symbols-outlined text-amber-600 text-lg shrink-0 mt-0.5">warning</span>
                <div>
                  <span className="font-bold block mb-0.5">Pengaturan Cetak Belum Lengkap!</span>
                  <span className="font-medium">Lengkapi Pengaturan Cetak terlebih dahulu agar data sekolah & nama pejabat/tanda tangan muncul di kartu peserta ujian.</span>
                </div>
              </div>
            )}

            {/* Screen View Toolbar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <h3 className="font-black text-slate-800 text-lg">Kartu Ujian Peserta</h3>
                <span className="bg-blue-100 text-[#2563EB] px-2.5 py-0.5 rounded-full font-black text-xs">
                  {filteredKartu.length} Siswa
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <select
                  value={kartuClass}
                  onChange={(e) => setKartuClass(e.target.value)}
                  className="px-4 h-10 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all w-full sm:w-auto"
                >
                  <option value="All Classes">Semua Kelas</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handlePrintCards}
                  disabled={filteredKartu.length === 0}
                  className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl px-5 h-10 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  <span className="material-symbols-outlined text-[18px]">print</span>
                  Cetak Semua ({filteredKartu.length})
                </button>
              </div>
            </div>

            {/* Preview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredKartu.map((student) => {
                const today = new Date().toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });
                return (
                  <div key={student.id_siswa} className="bg-white border-4 border-double border-blue-600 rounded-lg p-5 text-xs text-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[300px]">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b-2 border-double border-blue-600 pb-3 mb-4">
                      <div className="shrink-0 w-11 h-11 flex items-center justify-center">
                        {logoKiri ? (
                          <img src={logoKiri} className="max-w-full max-h-full object-contain" />
                        ) : (
                          <svg viewBox="0 0 100 100" className="w-9 h-9">
                            <polygon points="50,2 93,27 93,73 50,98 7,73 7,27" fill="#f8fafc" stroke="#2563EB" strokeWidth="4"/>
                            <path d="M50,15 L50,85 M15,50 L85,50" stroke="#2563EB" strokeWidth="2"/>
                          </svg>
                        )}
                      </div>
                      <div className="text-center px-2 flex-1">
                        <h4 className="font-black text-slate-900 text-[12px] leading-tight tracking-wide uppercase">KARTU PESERTA</h4>
                        <h4 className="font-extrabold text-blue-700 text-[11px] leading-tight mt-0.5 uppercase">TRY OUT UJIAN {settings?.guru_mapel_mapel?.toUpperCase() || config?.exam_name?.toUpperCase() || "USBN SD/MI"}</h4>
                        <p className="text-[9px] text-slate-600 font-bold mt-0.5">TAHUN AJARAN {settings?.tahun_pelajaran || "2025/2026"}</p>
                      </div>
                      <div className="shrink-0 w-11 h-11 flex items-center justify-center">
                        {logoKanan ? (
                          <img src={logoKanan} className="max-w-full max-h-full object-contain" />
                        ) : (
                          <svg viewBox="0 0 100 100" className="w-9 h-9">
                            <polygon points="50,2 93,27 93,73 50,98 7,73 7,27" fill="#f8fafc" stroke="#2563EB" strokeWidth="4"/>
                            <circle cx="50" cy="46" r="24" fill="none" stroke="#2563EB" strokeWidth="3"/>
                            <path d="M50,12 L50,80 M20,46 L80,46" stroke="#2563EB" strokeWidth="2"/>
                            <polygon points="50,22 40,55 60,55" fill="#2563EB"/>
                            <path d="M28,68 C35,85 65,85 72,68" fill="none" stroke="#2563EB" strokeWidth="3"/>
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Student Info Details */}
                    <div className="space-y-1.5 mb-4 flex-1">
                      <div className="flex gap-2 text-[11px]">
                        <span className="text-slate-900 w-36 shrink-0 font-bold">Nomor Peserta</span>
                        <span className="font-extrabold text-slate-900 uppercase">: {student.id_siswa}</span>
                      </div>
                      <div className="flex gap-2 text-[11px]">
                        <span className="text-slate-900 w-36 shrink-0 font-bold">Nama</span>
                        <span className="font-extrabold text-slate-900 uppercase">: {student.nama_lengkap}</span>
                      </div>
                      <div className="flex gap-2 text-[11px]">
                        <span className="text-slate-900 w-36 shrink-0 font-bold">Tempat/Tanggal Lahir</span>
                        <span className="font-extrabold text-slate-900 uppercase">: {settings?.school_city || "Kota"}, 10 Januari 2011</span>
                      </div>
                      <div className="flex gap-2 text-[11px]">
                        <span className="text-slate-900 w-36 shrink-0 font-bold">Sekolah Asal</span>
                        <span className="font-extrabold text-slate-900 uppercase">: {settings?.school_name || "NAMA SEKOLAH"}</span>
                      </div>
                    </div>

                    {/* Lower Area (Photo + Signatures) */}
                    <div className="flex gap-3 items-end justify-between mt-auto">
                      {/* Photo */}
                      <div className="w-16 h-20 border border-slate-900 p-0.5 bg-white shrink-0">
                        <div className="w-full h-full relative overflow-hidden bg-blue-700 flex items-center justify-center rounded-sm">
                          <svg viewBox="0 0 100 120" className="w-full h-full">
                            <circle cx="50" cy="45" r="20" fill="#ffffff" opacity="0.95"/>
                            <path d="M15 110 C 15 80, 30 75, 50 75 C 70 75, 85 80, 85 110 Z" fill="#ffffff" opacity="0.95"/>
                            <polygon points="50,75 42,88 58,88" fill="#e2e8f0"/>
                            <polygon points="50,88 46,115 54,115" fill="#1d4ed8"/>
                          </svg>
                        </div>
                      </div>

                      {/* Signature Block */}
                      <div className="text-center font-bold text-[10px] w-1/2 text-slate-900">
                        <div>{settings?.school_city || "Kota"}, {today}</div>
                        <div className="mt-0.5">Kepala Sekolah</div>
                        <div className="h-10"></div>
                        <div className="font-black text-[11px]"><u>{settings?.kepala_sekolah_nama || "Nama Kepala Sekolah"}</u></div>
                        <div className="text-[9.5px] mt-0.5 font-extrabold">NIP. {settings?.kepala_sekolah_nip || "-"}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab Content: Hasil */}
        {activeTab === "hasil" && (
          <div>
            {/* Header Bar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                {/* Breadcrumb */}
                <div className="text-xs text-slate-400 flex items-center gap-1 font-bold">
                  <span>Cetak</span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  <span>Hasil Ujian</span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  <span>{selectedKelas || 'Semua Kelas'}</span>
                </div>
                <h2 className="font-black text-2xl text-slate-900 mt-1">
                  REKAP NILAI: {(hasilMapel
                    ? (mapelList.find(m => m.id_mapel === hasilMapel)?.nama_mapel ?? hasilMapel)
                    : (settings?.guru_mapel_mapel || config?.exam_name || 'UJIAN')
                  ).toUpperCase()}
                </h2>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={handleExportXLSX}
                  disabled={isExportingXlsx || sortedUsers.length === 0}
                  className="border border-slate-300 bg-white text-slate-700 rounded-xl px-5 h-11 flex items-center gap-2 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50 w-full md:w-auto justify-center"
                >
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">description</span>
                  <span>{isExportingXlsx ? "Exporting..." : "EXPORT XLSX"}</span>
                </button>

                <button
                  onClick={handleExportPDF}
                  disabled={isExportingPdf || sortedUsers.length === 0}
                  className="bg-slate-900 text-white rounded-xl px-5 h-11 flex items-center gap-2 font-bold text-sm hover:bg-slate-700 transition-all cursor-pointer disabled:opacity-50 w-full md:w-auto justify-center shadow-md shadow-slate-900/10"
                >
                  <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                  <span>EXPORT PDF</span>
                </button>
              </div>
            </div>

            {/* Stat Cards UI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Card 1 — RATA-RATA KELAS */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 font-extrabold">Rata-Rata Kelas</span>
                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-500 text-[20px]">trending_up</span>
                  </div>
                </div>
                <div className="font-black text-3xl text-slate-900 mt-3">{rataRata.toFixed(2)}</div>
              </div>

              {/* Card 2 — NILAI TERTINGGI */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 font-extrabold">Nilai Tertinggi</span>
                  <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-500 text-[20px]">trending_up</span>
                  </div>
                </div>
                <div className="font-black text-3xl text-slate-900 mt-3">{nilaiTertinggi.toFixed(2)}</div>
              </div>

              {/* Card 3 — NILAI TERENDAH */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 font-extrabold">Nilai Terendah</span>
                  <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-red-500 text-[20px]">trending_down</span>
                  </div>
                </div>
                <div className="font-black text-3xl text-slate-900 mt-3">{nilaiTerendah.toFixed(0)}</div>
              </div>

              {/* Card 4 — KETUNTASAN (KKM 75) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 font-extrabold">Ketuntasan (KKM 75)</span>
                  <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-500 text-[20px]">check_circle</span>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="font-black text-3xl text-slate-900">{tuntas}</span>
                  <span className="text-slate-400 font-bold text-lg">/{totalPeserta}</span>
                </div>
              </div>
            </div>

            {/* Screen View Toolbar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <h3 className="font-black text-slate-800 text-base">Pratinjau Hasil Ujian</h3>
                <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-black text-xs">
                  {sortedUsers.length} Peserta
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {/* Mapel filter */}
                <select
                  value={hasilMapel}
                  onChange={(e) => setHasilMapel(e.target.value)}
                  className="px-4 h-10 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all w-full sm:w-auto"
                >
                  <option value="">Semua Mapel</option>
                  {mapelList.map((m) => (
                    <option key={m.id_mapel} value={m.id_mapel}>
                      {m.nama_mapel}
                    </option>
                  ))}
                </select>

                {/* Class filter */}
                <select
                  value={hasilClass}
                  onChange={(e) => setHasilClass(e.target.value)}
                  className="px-4 h-10 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all w-full sm:w-auto"
                >
                  <option value="All Classes">Semua Kelas</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {/* Sort selector */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "nama" | "skor")}
                  className="px-4 h-10 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all w-full sm:w-auto"
                >
                  <option value="nama">Urut: Nama (A-Z)</option>
                  <option value="skor">Urut: Skor Tertinggi</option>
                </select>
              </div>
            </div>

            {/* Screen preview table */}
            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-[#202E3B] text-white">
                    <tr>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-24 text-center">No</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Nama Siswa</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-28 text-center">Kelas</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-28 text-center">Skor</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-40 text-center">Status Ujian</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-36 text-center">Ket (KKM 75)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                          Tidak ada data.
                        </td>
                      </tr>
                    ) : (
                      sortedUsers.map((student, idx) => {
                        let ket = "Belum Mengerjakan";
                        let ketClass = "bg-slate-100 text-slate-500 border border-slate-200";

                        if (student.status_ujian === "SELESAI") {
                          const tuntasVal = (student.skor_akhir ?? 0) >= 75;
                          ket = tuntasVal ? "Tuntas" : "Tidak Tuntas";
                          ketClass = tuntasVal
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                            : "bg-rose-50 text-rose-700 border border-rose-200/50";
                        } else if (student.status_ujian === "DISKUALIFIKASI") {
                          ket = "Didiskualifikasi";
                          ketClass = "bg-rose-100 text-rose-800 border border-rose-300";
                        }

                        const scoreDisplay =
                          student.status_ujian === "SELESAI" && student.skor_akhir != null ? student.skor_akhir.toFixed(2) : "—";

                        return (
                          <tr key={student.id_siswa} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4 font-black text-xs text-slate-500 text-center">{idx + 1}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs shadow-inner">
                                  {student.nama_lengkap.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">
                                  {student.nama_lengkap}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-black text-xs text-slate-500 uppercase text-center">
                              {student.kelas}
                            </td>
                            <td className="px-6 py-4 font-black text-xs text-blue-600 text-center">{scoreDisplay}</td>
                            <td className="px-6 py-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs shadow-sm ${
                                  student.status_ujian === "SELESAI"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                                    : student.status_ujian === "SEDANG"
                                    ? "bg-blue-50 text-blue-700 border border-blue-200/50"
                                    : student.status_ujian === "DISKUALIFIKASI"
                                    ? "bg-rose-50 text-rose-700 border border-rose-200/50"
                                    : "bg-slate-100 text-slate-500 border border-slate-200"
                                }`}
                              >
                                {student.status_ujian === "SEDANG" && (
                                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span>
                                )}
                                {student.status_ujian === "SELESAI" && (
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                )}
                                {student.status_ujian === "DISKUALIFIKASI" && (
                                  <span className="material-symbols-outlined text-[14px]">warning</span>
                                )}
                                {student.status_ujian === "SELESAI"
                                  ? "Selesai"
                                  : student.status_ujian === "SEDANG"
                                  ? "Sedang Ujian"
                                  : student.status_ujian === "DISKUALIFIKASI"
                                  ? "Diskualifikasi"
                                  : "Belum Mulai"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full font-bold text-xs shadow-sm ${ketClass}`}>
                                {ket}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <AIAnalysisPanel
              users={sortedUsers}
              kelas={hasilClass === "All Classes" ? "" : hasilClass}
              mapelNama={hasilMapel ? (mapelList.find(m => m.id_mapel === hasilMapel)?.nama_mapel ?? 'Ujian') : (settings?.guru_mapel_mapel || config?.exam_name || 'Ujian')}
              kkm={75}
              rataRata={rataRata}
              tuntas={tuntas}
              totalPeserta={totalPeserta}
            />
          </div>
        )}

        {/* Floating Success Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg font-bold text-sm z-50 animate-bounce flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            <span>{toast}</span>
          </div>
        )}
      </main>
    </div>
  );
}
