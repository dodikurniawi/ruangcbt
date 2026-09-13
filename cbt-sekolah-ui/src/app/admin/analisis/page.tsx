"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTenantRouter, useTenantPath } from "@/hooks/useTenantRouter";
import useSWR from "swr";
import { getAdminQuestions, getMataPelajaran, logout } from "@/lib/api";
import type { ImplementedAdminQuestion, MataPelajaran } from "@/types";
import HasilBelajarPanel from "@/components/admin/HasilBelajarPanel";
import { generateAIText, type AIFailure } from "@/lib/aiProvider";
import {
  AI_SETTINGS_CHANGED_EVENT,
  getProviderApiKey,
  getSelectedProvider,
  missingProviderKeyMessage,
  type AIProvider,
} from "@/lib/aiSettings";

// ─── AI ANALYSIS CACHE ──────────────────────────────────────────────────────

const LS_CACHE = "ruangcbt_ai_item_analysis_cache";
const LEGACY_CACHE = "groq_analysis_cache";

interface AnalysisResult {
  id_soal: string;
  source_hash: string;
  model_used: string;
  rating: "Baik" | "Cukup" | "Perlu Revisi";
  skor_kejelasan: number;      // 0–100
  skor_distraktor: number;     // 0–100
  catatan: string;             // narrative paragraph
  saran: string[];             // array of specific suggestions
  analyzed_at: string;         // ISO timestamp
}

function cacheStorageKey(provider: AIProvider): string {
  const schoolId = typeof window === "undefined"
    ? "default"
    : window.location.pathname.match(/^\/s\/([^/]+)/)?.[1] ?? "default";
  return `${LS_CACHE}:${schoolId}:${provider}`;
}

function questionSourceHash(question: ImplementedAdminQuestion): string {
  const text = JSON.stringify(question);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function loadCache(provider: AIProvider): Record<string, AnalysisResult> {
  try {
    if (typeof window !== "undefined") {
      const current = localStorage.getItem(cacheStorageKey(provider));
      if (current) return JSON.parse(current);
      if (provider === "groq") {
        const legacy = localStorage.getItem(LEGACY_CACHE);
        if (legacy) {
          localStorage.setItem(cacheStorageKey(provider), legacy);
          if (localStorage.getItem(cacheStorageKey(provider)) === legacy) {
            localStorage.removeItem(LEGACY_CACHE);
          }
          return JSON.parse(legacy);
        }
      }
    }
    return {};
  } catch { return {}; }
}

function saveCache(provider: AIProvider, cache: Record<string, AnalysisResult>) {
  try {
    if (Object.keys(cache).length > 200) {
      // Remove oldest 50 entries
      const sorted = Object.entries(cache)
        .sort((a, b) => a[1].analyzed_at.localeCompare(b[1].analyzed_at));
      sorted.slice(0, 50).forEach(([k]) => delete cache[k]);
    }
    localStorage.setItem(cacheStorageKey(provider), JSON.stringify(cache));
  } catch { /* quota exceeded — ignore */ }
}

// Label per tipe. Sebelumnya semua tipe selain SINGLE disebut "Pilihan Kompleks",
// sehingga prompt analisis salah mendeskripsikan TRUE_FALSE/MATCHING/FILL_IN.
const JENIS_SOAL_LABEL: Record<string, string> = {
  SINGLE: "Pilihan Ganda (1 jawaban)",
  COMPLEX: "Pilihan Kompleks (multi jawaban)",
  TRUE_FALSE: "Benar/Salah per pernyataan",
  MATCHING: "Menjodohkan",
  FILL_IN: "Isian singkat",
};

function buildPrompts(q: ImplementedAdminQuestion, mapelNama: string): { system: string; user: string } {
  const system = `Kamu adalah ahli evaluasi pendidikan Indonesia yang menganalisis 
kualitas butir soal CBT (Computer Based Test). 
Selalu respons dalam format JSON valid sesuai schema yang diminta.
Gunakan Bahasa Indonesia yang formal dan akademis.`;

  const opsiText = ["a", "b", "c", "d", "e"]
    .map(k => {
      const val = (q as unknown as Record<string, string>)[`opsi_${k}`];
      return val ? `Opsi ${k.toUpperCase()}: ${val}` : null;
    })
    .filter(Boolean)
    .join("\n");

  const user = `Analisis kualitas butir soal CBT berikut:

Mata Pelajaran : ${mapelNama || "Tidak diketahui"}
Jenis Soal     : ${JENIS_SOAL_LABEL[q.tipe] ?? q.tipe}
Kategori       : ${q.kategori ?? "Tidak diketahui"}
Bobot          : ${q.bobot}

PERTANYAAN:
${q.pertanyaan.replace(/<[^>]+>/g, "").trim()}

PILIHAN JAWABAN:
${opsiText}

Kembalikan JSON dengan schema PERSIS ini (tidak ada field tambahan):
{
  "rating": "Baik" | "Cukup" | "Perlu Revisi",
  "skor_kejelasan": <integer 0-100>,
  "skor_distraktor": <integer 0-100>,
  "catatan": "<paragraf analisis keseluruhan, maks 3 kalimat>",
  "saran": ["<saran spesifik 1>", "<saran spesifik 2>"]
}

Panduan rating:
- "Baik": redaksi jelas, distraktor logis, tingkat kesukaran sesuai kategori
- "Cukup": ada minor issues tapi soal masih layak digunakan
- "Perlu Revisi": ada masalah signifikan yang harus diperbaiki sebelum digunakan`;

  return { system, user };
}

function parseAnalysisResponse(
  raw: string, 
  id_soal: string, 
  source_hash: string,
  model: string
): AnalysisResult | null {
  try {
    // Extract JSON if wrapped in markdown code block
    const jsonStr = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    
    // Validate required fields
    if (!parsed.rating || typeof parsed.skor_kejelasan !== "number") return null;
    
    return {
      id_soal,
      source_hash,
      model_used: model,
      rating: parsed.rating,
      skor_kejelasan: Math.min(100, Math.max(0, parsed.skor_kejelasan)),
      skor_distraktor: Math.min(100, Math.max(0, parsed.skor_distraktor)),
      catatan: parsed.catatan ?? "",
      saran: Array.isArray(parsed.saran) ? parsed.saran : [],
      analyzed_at: new Date().toISOString(),
    };
  } catch { return null; }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AnalisisButirSoalPage() {
  const router = useTenantRouter();
  const tenantPath = useTenantPath();
  const pathname = usePathname();

  const isLinkActive = (path: string) => {
    if (path === "/admin") {
      return pathname.endsWith("/admin") || pathname.endsWith("/admin/");
    }
    return pathname.includes(path);
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"butir" | "hasil">("butir");

  const [provider, setProvider] = useState<AIProvider>("gemini");
  const [providerConfigured, setProviderConfigured] = useState(false);

  const [filterMapel, setFilterMapel] = useState("");
  const [filterRating, setFilterRating] = useState("");
  const [search, setSearch] = useState("");

  // Lazy cache loading on mount for SSR safety
  const [results, setResults] = useState<Record<string, AnalysisResult>>({});
  const [analyzing, setAnalyzing] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    const refreshAISettings = () => {
      const selected = getSelectedProvider();
      setProvider(selected);
      setProviderConfigured(Boolean(getProviderApiKey(selected)));
      setResults(loadCache(selected));
    };
    refreshAISettings();
    window.addEventListener(AI_SETTINGS_CHANGED_EVENT, refreshAISettings);
    return () => window.removeEventListener(AI_SETTINGS_CHANGED_EVENT, refreshAISettings);
  }, []);

  // Auth guard
  useEffect(() => {
    if (sessionStorage.getItem("admin_auth") !== "true") router.replace("/admin/login");
  }, [router]);

  const { data: questionsRes, isLoading: questionsLoading } = useSWR("getAdminQuestions", getAdminQuestions);
  const { data: mapelRes }     = useSWR("getMataPelajaran", getMataPelajaran);
  const questions: ImplementedAdminQuestion[] = questionsRes?.data ?? [];
  const mapelList: MataPelajaran[]  = mapelRes?.data ?? [];

  const getMapelNama = (q: ImplementedAdminQuestion) =>
    mapelList.find(m => m.id_mapel === q.id_mapel)?.nama_mapel ?? "Umum";

  const getAnalysisResult = (question: ImplementedAdminQuestion) => {
    const result = results[question.id_soal];
    return result?.source_hash === questionSourceHash(question) ? result : undefined;
  };

  const filtered = questions.filter(q => {
    const matchMapel   = !filterMapel  || q.id_mapel === filterMapel;
    const matchRating  = !filterRating || getAnalysisResult(q)?.rating === filterRating;
    const matchSearch  = !search       || 
      q.pertanyaan.toLowerCase().includes(search.toLowerCase());
    return matchMapel && matchRating && matchSearch;
  });

  // Mengembalikan "rate_limited" supaya batch berhenti di 429, bukan lanjut
  // menembaki endpoint yang justru sedang membatasi kuota.
  const handleAnalyze = async (q: ImplementedAdminQuestion): Promise<AIFailure | null> => {
    if (!getProviderApiKey(provider)) {
      setErrors(prev => ({ ...prev, [q.id_soal]: missingProviderKeyMessage(provider) }));
      return "missing_key";
    }
    if (analyzing.has(q.id_soal)) return null;

    setAnalyzing(prev => {
      const n = new Set(prev);
      n.add(q.id_soal);
      return n;
    });
    setErrors(prev => { const n = {...prev}; delete n[q.id_soal]; return n; });

    const { system, user } = buildPrompts(q, getMapelNama(q));
    const res = await generateAIText({
      systemInstruction: system,
      prompt: user,
      schema: { type: "object" },
      temperature: 0.2,
    }, { provider });

    let failureKind: AIFailure | null = null;
    if (!res.ok) {
      failureKind = res.failure;
      setErrors(prev => ({ ...prev, [q.id_soal]: res.message }));
    } else {
      const parsed = parseAnalysisResponse(res.data, q.id_soal, questionSourceHash(q), `${res.provider}/${res.model}`);
      if (parsed) {
        setResults(prev => {
          const newResults = { ...prev, [q.id_soal]: parsed };
          saveCache(provider, newResults);
          return newResults;
        });
      } else {
        setErrors(prev => ({ ...prev, [q.id_soal]: "Respons AI tidak dapat diproses." }));
      }
    }

    setAnalyzing(prev => {
      const n = new Set(prev);
      n.delete(q.id_soal);
      return n;
    });
    return failureKind;
  };

  const handleBatchAnalyze = async () => {
    if (isBatchAnalyzing) return;
    if (!getProviderApiKey(provider)) {
      setErrors(prev => ({ ...prev, __settings: missingProviderKeyMessage(provider) }));
      return;
    }
    const toAnalyze = filtered.filter(q => !getAnalysisResult(q));
    if (toAnalyze.length === 0) return;

    setIsBatchAnalyzing(true);
    setBatchProgress({ done: 0, total: toAnalyze.length });

    for (let i = 0; i < toAnalyze.length; i++) {
      const failureKind = await handleAnalyze(toAnalyze[i]);
      setBatchProgress({ done: i + 1, total: toAnalyze.length });
      // 429 = batas penggunaan penyedia. Batch berhenti; guru melanjutkan manual
      // beberapa saat kemudian. Tidak ada retry otomatis.
      if (failureKind === "rate_limited" || failureKind === "missing_key") {
        setErrors(prev => ({
          ...prev,
          __settings: "Analisis massal dihentikan karena batas penggunaan penyedia AI tercapai. Coba lagi beberapa saat.",
        }));
        break;
      }
      // Delay between requests to avoid rate limiting (Mandatory 800ms)
      if (i < toAnalyze.length - 1) {
        await new Promise(r => setTimeout(r, 800));
      }
    }

    setIsBatchAnalyzing(false);
  };

  const handleClearCache = () => {
    if (confirm("Apakah Anda yakin ingin menghapus seluruh riwayat analisis AI?")) {
      localStorage.removeItem(cacheStorageKey(provider));
      setResults({});
    }
  };

  // Stats computation
  const currentResults = questions.map(getAnalysisResult).filter((result): result is AnalysisResult => Boolean(result));
  const analyzed     = currentResults.length;
  const ratingBaik   = currentResults.filter(r => r.rating === "Baik").length;
  const ratingRevisi = currentResults.filter(r => r.rating === "Perlu Revisi").length;

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
      <aside className={`fixed left-0 top-0 h-full w-64 flex flex-col bg-[#0F172A] shadow-xl border-r border-slate-800 z-50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 flex justify-between items-center border-b border-slate-800">
          <div>
            <Link href={tenantPath("/")} className="flex items-center gap-2 text-white hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-sky-400 text-2xl">school</span>
              <h1 className="font-black text-lg tracking-wider text-white">CBT <span className="text-sky-400">ADMIN</span></h1>
            </Link>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1">Institutional Portal</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer" title="Sembunyikan Sidebar">
            <span className="material-symbols-outlined text-2xl">menu_open</span>
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-grow px-4 space-y-1 mt-6 overflow-y-auto">
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
            <span className="text-sm font-medium">Analisis Butir Soal</span>
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
            onClick={async () => { await logout(); sessionStorage.removeItem("admin_auth"); router.replace("/admin/login"); }}
            className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors cursor-pointer w-full text-left font-bold text-xs uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-red-400">logout</span>
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden"></div>}

      {/* Main Content Area */}
      <main className={`flex-1 min-h-screen p-6 md:p-10 w-full transition-all pt-24 md:pt-10 ${isSidebarOpen ? "md:ml-64" : "ml-0"}`}>
        {/* SECTION 1: Page header */}
        <header className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-[#1D4ED8] transition-all shadow-xs cursor-pointer flex items-center justify-center shrink-0"
                title="Tampilkan Sidebar"
              >
                <span className="material-symbols-outlined text-2xl">menu</span>
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1E40AF] text-3xl">analytics</span>
                <h1 className="font-black text-2xl md:text-3xl text-slate-900 tracking-tight">Analisis</h1>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                {activeTab === "butir"
                  ? "Analisis kualitas butir soal"
                  : "Pola kesalahan dan rekomendasi tindak lanjut per siswa"}
              </p>
            </div>
          </div>

          <div className={`flex flex-wrap items-center gap-2 ${activeTab === "butir" ? "" : "hidden"}`}>
            <Link
              href={tenantPath("/admin/management#ai-settings")}
              className={`rounded-xl px-4 h-11 flex items-center gap-2 text-xs font-bold shadow-sm transition-all ${providerConfigured ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" : "bg-amber-500 hover:bg-amber-600 text-white"}`}
            >
              <span className="material-symbols-outlined text-[18px]">vpn_key</span>
              <span>{provider === "gemini" ? "Gemini" : "Groq"}: {providerConfigured ? "Siap" : "Atur API Key"}</span>
            </Link>

            {Object.keys(results).length > 0 && (
              <button 
                onClick={handleClearCache}
                className="border border-red-200 text-red-500 text-xs font-bold rounded-xl px-3 h-11 flex items-center gap-1.5 hover:bg-red-50 cursor-pointer shadow-sm transition-all uppercase tracking-wider"
              >
                <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                <span>Hapus Cache</span>
              </button>
            )}
          </div>
        </header>

        {errors.__settings && activeTab === "butir" && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            {errors.__settings}{" "}
            <Link href={tenantPath("/admin/management#ai-settings")} className="font-bold underline">
              Buka Pengaturan AI
            </Link>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex gap-2 mb-6">
          {([["butir", "Butir Soal"], ["hasil", "Hasil Belajar Siswa"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 h-10 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === key
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "hasil" && <HasilBelajarPanel />}

        {activeTab === "butir" && (
        <>
        {/* SECTION 2: Stats summary */}
        {questions.length > 0 && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {/* Total Soal */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3 transition-all hover:shadow">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-blue-600 text-[20px]">quiz</span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Soal</p>
                <h3 className="font-black text-2xl text-slate-800 mt-0.5">{questions.length}</h3>
              </div>
            </div>

            {/* Sudah Dianalisis */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3 transition-all hover:shadow">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sudah Dianalisis</p>
                <h3 className="font-black text-2xl text-slate-800 mt-0.5">{analyzed}</h3>
              </div>
            </div>

            {/* Perlu Revisi */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3 transition-all hover:shadow">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-red-600 text-[20px]">edit_note</span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Perlu Revisi</p>
                <h3 className="font-black text-2xl text-slate-800 mt-0.5">{ratingRevisi}</h3>
              </div>
            </div>

            {/* Soal Baik */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3 transition-all hover:shadow">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-amber-600 text-[20px]">star</span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Soal Baik</p>
                <h3 className="font-black text-2xl text-slate-800 mt-0.5">{ratingBaik}</h3>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 3: Toolbar */}
        <section className="flex flex-wrap items-center gap-3 mb-6 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm justify-between">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative min-w-[240px] flex-1 max-w-sm">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input 
                type="text"
                placeholder="Cari pertanyaan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 text-xs font-semibold text-slate-700 focus:border-[#1E40AF] focus:ring-2 focus:ring-[#1E40AF]/10 outline-none transition-all"
              />
            </div>

            {/* Filter Mapel */}
            <select
              value={filterMapel}
              onChange={(e) => setFilterMapel(e.target.value)}
              className="h-11 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-700 bg-white focus:border-[#1E40AF] outline-none cursor-pointer shrink-0 min-w-[160px]"
            >
              <option value="">Semua Mapel</option>
              {mapelList.map(m => (
                <option key={m.id_mapel} value={m.id_mapel}>
                  {m.kode_mapel} — {m.nama_mapel}
                </option>
              ))}
            </select>

            {/* Filter Rating */}
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="h-11 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-700 bg-white focus:border-[#1E40AF] outline-none cursor-pointer shrink-0 min-w-[160px]"
            >
              <option value="">Semua Rating</option>
              <option value="Baik">Baik</option>
              <option value="Cukup">Cukup</option>
              <option value="Perlu Revisi">Perlu Revisi</option>
            </select>
          </div>

          <div className="shrink-0 mt-2 sm:mt-0">
            {isBatchAnalyzing ? (
              <button 
                disabled
                className="bg-slate-100 text-slate-500 rounded-xl px-5 h-11 text-xs font-bold flex items-center gap-2 cursor-not-allowed border border-slate-200"
              >
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                <span>{batchProgress.done}/{batchProgress.total} Dianalisis...</span>
              </button>
            ) : (
              <button 
                onClick={handleBatchAnalyze}
                disabled={isBatchAnalyzing || filtered.filter(q => !getAnalysisResult(q)).length === 0}
                className="bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-xl px-5 h-11 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wider"
              >
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                <span>Analisis Semua ({filtered.filter(q => !getAnalysisResult(q)).length} soal)</span>
              </button>
            )}
          </div>
        </section>

        {/* SECTION 4: Question list table */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-body-student">
              <thead>
                <tr className="bg-[#0F172A] text-white text-[11px] font-bold uppercase tracking-wider border-b border-outline-variant">
                  <th className="px-6 py-4 text-center w-12">No</th>
                  <th className="px-6 py-4">Pertanyaan</th>
                  <th className="px-6 py-4 w-28">Mapel</th>
                  <th className="px-6 py-4 w-28">Kategori</th>
                  <th className="px-6 py-4 w-40">Rating</th>
                  <th className="px-6 py-4 w-44 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {questionsLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500 text-sm font-semibold">
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined animate-spin text-[#1E40AF]">sync</span>
                        <span>Memuat soal...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 text-sm font-semibold">
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-[48px] text-slate-300">inventory_2</span>
                        <span>Belum ada soal atau hasil saringan kosong.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((q, idx) => {
                    const cleanPertanyaan = q.pertanyaan.replace(/<[^>]+>/g, "").trim();
                    const isExpanded = expandedId === q.id_soal;
                    const res = getAnalysisResult(q);
                    const isAnalyzing = analyzing.has(q.id_soal);
                    const errorMsg = errors[q.id_soal];

                    return (
                      <React.Fragment key={q.id_soal}>
                        <tr className="hover:bg-slate-50/50 transition-colors text-slate-700 text-xs">
                          {/* No */}
                          <td className="px-6 py-4 text-center font-bold text-slate-400">{idx + 1}</td>

                          {/* Pertanyaan */}
                          <td className="px-6 py-4 max-w-sm">
                            <p className="font-semibold text-slate-800 text-xs leading-relaxed" title={cleanPertanyaan}>
                              {cleanPertanyaan.length > 90 ? cleanPertanyaan.slice(0, 90) + "..." : cleanPertanyaan || "Tanpa Redaksi"}
                            </p>
                          </td>

                          {/* Mapel */}
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20 uppercase">
                              {mapelList.find(m => m.id_mapel === q.id_mapel)?.kode_mapel ?? "—"}
                            </span>
                          </td>

                          {/* Kategori */}
                          <td className="px-6 py-4">
                            {q.kategori === "Mudah" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100">Mudah</span>
                            )}
                            {q.kategori === "Sedang" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px] font-bold border border-amber-100">Sedang</span>
                            )}
                            {q.kategori === "Sulit" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-orange-50 text-orange-600 text-[10px] font-bold border border-orange-100">Sulit</span>
                            )}
                            {q.kategori === "Sangat Sulit" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-bold border border-red-100">Sangat Sulit</span>
                            )}
                            {!q.kategori && (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* Rating */}
                          <td className="px-6 py-4">
                            {isAnalyzing ? (
                              <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px]">
                                <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                                <span>Menganalisis...</span>
                              </div>
                            ) : errorMsg ? (
                              <div className="flex items-center gap-1 text-red-500 font-bold text-[11px]" title={errorMsg}>
                                <span className="material-symbols-outlined text-[14px]">error</span>
                                <span>Gagal</span>
                              </div>
                            ) : res ? (
                              <div>
                                {res.rating === "Baik" && (
                                  <span className="inline-flex px-2.5 py-0.5 text-[10px] font-black rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">BAIK</span>
                                )}
                                {res.rating === "Cukup" && (
                                  <span className="inline-flex px-2.5 py-0.5 text-[10px] font-black rounded-full bg-amber-100 text-amber-700 border border-amber-200">CUKUP</span>
                                )}
                                {res.rating === "Perlu Revisi" && (
                                  <span className="inline-flex px-2.5 py-0.5 text-[10px] font-black rounded-full bg-red-100 text-red-700 border border-red-200">PERLU REVISI</span>
                                )}
                                <div className="text-[9px] text-slate-400 mt-1 font-semibold">
                                  Redaksi: {res.skor_kejelasan}% · Distraktor: {res.skor_distraktor}%
                                </div>
                                <div className="text-[8px] text-slate-300 mt-0.5 font-bold uppercase tracking-wider">
                                  via {res.model_used.split("-")[0]}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* Aksi */}
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              {res ? (
                                <>
                                  <button
                                    onClick={() => handleAnalyze(q)}
                                    disabled={isAnalyzing}
                                    className="border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg px-3 h-8 text-[11px] font-semibold cursor-pointer transition-all shrink-0"
                                  >
                                    Analisis Ulang
                                  </button>
                                  <button
                                    onClick={() => setExpandedId(isExpanded ? null : q.id_soal)}
                                    className="bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-lg px-3 h-8 text-[11px] font-semibold cursor-pointer transition-all shrink-0 shadow-sm"
                                  >
                                    {isExpanded ? "Tutup" : "Lihat Detail"}
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleAnalyze(q)}
                                  disabled={isAnalyzing}
                                  className="w-full bg-[#1E40AF]/10 hover:bg-[#1E40AF] text-[#1E40AF] hover:text-white border border-[#1E40AF]/20 rounded-lg px-3 h-8 text-[11px] font-bold transition-all cursor-pointer"
                                >
                                  {isAnalyzing ? "..." : "Analisis"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Detail Row */}
                        {isExpanded && res && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={6} className="px-6 py-0">
                              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 my-3 shadow-inner grid grid-cols-1 md:grid-cols-2 gap-6 transition-all">
                                {/* Left Column: Catatan */}
                                <div>
                                  <h4 className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Catatan Analisis</h4>
                                  <p className="text-xs text-slate-700 leading-relaxed font-semibold bg-white p-3.5 rounded-xl border border-slate-200/50 shadow-sm">
                                    {res.catatan || "Tidak ada catatan analisis khusus."}
                                  </p>
                                </div>

                                {/* Right Column: Saran */}
                                <div>
                                  <h4 className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Saran Perbaikan</h4>
                                  {res.saran.length === 0 ? (
                                    <p className="text-xs text-slate-500 font-semibold bg-white p-3.5 rounded-xl border border-slate-200/50 shadow-sm">
                                      Tidak ada saran perbaikan khusus. Butir soal sudah sangat baik!
                                    </p>
                                  ) : (
                                    <ul className="space-y-1.5 bg-white p-3.5 rounded-xl border border-slate-200/50 shadow-sm">
                                      {res.saran.map((s, i) => (
                                        <li key={i} className="flex items-start gap-2 text-xs text-slate-700 font-semibold">
                                          <span className="material-symbols-outlined text-[#1E40AF] text-[16px] shrink-0 mt-0.5">chevron_right</span>
                                          <span>{s}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>

                                {/* Bottom Info */}
                                <div className="md:col-span-2 text-[9px] text-slate-400 font-bold text-right">
                                  Dianalisis: {new Date(res.analyzed_at).toLocaleString("id-ID")} menggunakan {res.model_used}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
        </>
        )}
      </main>

    </div>
  );
}
