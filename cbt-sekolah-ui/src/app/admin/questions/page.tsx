"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTenantRouter, useTenantPath } from "@/hooks/useTenantRouter";
import useSWR from "swr";
import { getAdminQuestions, createQuestion, updateQuestion, deleteQuestion, getMataPelajaran, uploadImage, logout } from "@/lib/api";
import { sanitizeQuestionHtml } from "@/lib/questionSanitize";
import type { ImplementedAdminQuestion, MataPelajaran } from "@/types";

// ─── Types ─────────────────────────────────────────────────────────────────
interface QuestionForm {
  tipe: "SINGLE" | "COMPLEX";
  kategori: string;
  bobot: number;
  pertanyaan: string;
  gambar_url: string;
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  opsi_e: string;
  kunci_jawaban: string; // "A" for SINGLE, "A,C" for COMPLEX
  id_mapel: string;
}

const EMPTY_FORM: QuestionForm = {
  tipe: "SINGLE",
  kategori: "Mudah",
  bobot: 1,
  pertanyaan: "",
  gambar_url: "",
  opsi_a: "",
  opsi_b: "",
  opsi_c: "",
  opsi_d: "",
  opsi_e: "",
  kunci_jawaban: "",
  id_mapel: "",
};

const KATEGORI_OPTIONS = ["Mudah", "Sedang", "Sulit", "Sangat Sulit"];
const OPTION_KEYS = ["a", "b", "c", "d", "e"] as const;

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
];

async function callGroq(apiKey: string, prompt: string): Promise<string> {
  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "";
    } catch { continue; }
  }
  throw new Error("Semua model Groq gagal. Periksa API key Anda.");
}

// ─── Toolbar Button ─────────────────────────────────────────────────────────
function ToolbarBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="w-8 h-8 rounded-lg hover:bg-slate-200/70 text-slate-700 hover:text-blue-700 font-bold text-sm flex items-center justify-center transition-all cursor-pointer active:scale-95"
    >
      <span className="material-symbols-outlined text-lg">{icon}</span>
    </button>
  );
}

// ─── Rich-text editor (contenteditable) ─────────────────────────────────────
function RichEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    ref.current?.focus();
    onChange(ref.current?.innerHTML ?? "");
  };

  return (
    <div className="border border-slate-300 rounded-2xl overflow-hidden focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all bg-white shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-200 bg-slate-50/80">
        <select
          className="text-xs font-semibold border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-700 cursor-pointer outline-none hover:border-slate-400 focus:border-blue-600 transition-colors shadow-xs"
          onChange={(e) => exec("fontSize", e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>Ukuran Teks</option>
          <option value="3">Normal (14px)</option>
          <option value="4">Sedang (16px)</option>
          <option value="5">Besar (18px)</option>
        </select>
        <div className="w-px h-5 bg-slate-300 mx-1"></div>
        <ToolbarBtn icon="format_bold" label="Bold (Cetak Tebal)" onClick={() => exec("bold")} />
        <ToolbarBtn icon="format_italic" label="Italic (Cetak Miring)" onClick={() => exec("italic")} />
        <ToolbarBtn icon="format_underlined" label="Underline (Garis Bawah)" onClick={() => exec("underline")} />
        <ToolbarBtn icon="strikethrough_s" label="Strikethrough" onClick={() => exec("strikeThrough")} />
        <div className="w-px h-5 bg-slate-300 mx-1"></div>
        <ToolbarBtn icon="format_list_numbered" label="Daftar Angka" onClick={() => exec("insertOrderedList")} />
        <ToolbarBtn icon="format_list_bulleted" label="Daftar Simbol" onClick={() => exec("insertUnorderedList")} />
        <div className="w-px h-5 bg-slate-300 mx-1"></div>
        <ToolbarBtn icon="format_clear" label="Hapus Format" onClick={() => exec("removeFormat")} />
      </div>
      {/* Editable area */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
        className="min-h-[180px] p-4 text-base leading-relaxed text-slate-800 outline-none focus:outline-none"
        style={{ direction: "ltr" }}
      />
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function QuestionBankPage() {
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
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMapel, setFilterMapel] = useState("");
  const [entriesCount, setEntriesCount] = useState(20);

  // ── AI Generate state ──────────────────────────────────────────────────────
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiKelas, setAiKelas] = useState("5");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [wikiImages, setWikiImages] = useState<{ title: string; url: string; thumb: string }[]>([]);
  const [showWikiPicker, setShowWikiPicker] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<ImplementedAdminQuestion | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem("admin_auth") !== "true") router.replace("/admin/login");
  }, [router]);

  const { data: questionsRes, mutate, isLoading } = useSWR("getAdminQuestions", getAdminQuestions);
  const questions: ImplementedAdminQuestion[] = questionsRes?.data ?? [];

  const { data: mapelRes } = useSWR("getMataPelajaran", getMataPelajaran);
  const mapelList: MataPelajaran[] = mapelRes?.data ?? [];

  // Search mencocokkan teks soal tanpa tag, kategori, serta kode/nama mapel —
  // sesuai yang dijanjikan placeholder. Kode mapel diambil dari daftar mapel.
  const term = search.trim().toLowerCase();
  const archivedCount = questions.filter((q) => q.status_soal === "ARSIP").length;
  const filtered = questions.filter((q) => {
    // Versi historis disembunyikan secara default supaya daftar kerja guru tetap
    // berisi soal yang aktif saja; arsipnya tetap dapat dibuka lewat toggle.
    if (!showArchived && q.status_soal === "ARSIP") return false;
    if (filterMapel !== "" && q.id_mapel !== filterMapel) return false;
    if (term === "") return true;
    const kodeMapel = mapelList.find((m) => m.id_mapel === q.id_mapel)?.kode_mapel ?? "";
    return [
      q.pertanyaan.replace(/<[^>]*>/g, " "),
      q.kategori ?? "",
      q.nama_mapel ?? "",
      kodeMapel,
    ].some((field) => field.toLowerCase().includes(term));
  });

  // entriesCount 0 = tampilkan semua. Seluruh data sudah ada di client, jadi ini
  // murni pemotongan tampilan, bukan pagination server.
  const visible = entriesCount > 0 ? filtered.slice(0, entriesCount) : filtered;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSaveError("Ukuran gambar terlalu besar. Maksimal 2MB.");
      return;
    }

    setSaveError("");
    setIsUploading(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      // Strip the "data:<mime>;base64," prefix — GAS hanya butuh data base64 murni
      const [header, base64Data] = dataUrl.split(",");
      const mimeType = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";

      const res = await uploadImage(base64Data, mimeType, file.name);
      if (res.success && res.data?.url) {
        setForm((p) => ({ ...p, gambar_url: res.data!.url }));
      } else {
        setSaveError(res.message ?? "Gagal mengupload gambar ke Google Drive.");
      }
      setIsUploading(false);
    };
    reader.onerror = () => {
      setSaveError("Gagal membaca file.");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSaveError("");
    setFilterMapel("");
    setShowModal(true);
  };

  const openEdit = (q: ImplementedAdminQuestion) => {
    setEditingId(q.id_soal);
    setForm({
      // Form ini baru mendukung dua tipe berbasis pilihan; tipe canonical lain
      // belum punya field di sini (pekerjaan task tipe soal berikutnya).
      tipe: q.tipe === "COMPLEX" ? "COMPLEX" : "SINGLE",
      kategori: q.kategori ?? "Mudah",
      bobot: q.bobot,
      pertanyaan: q.pertanyaan,
      gambar_url: q.gambar_url ?? "",
      opsi_a: q.opsi_a,
      opsi_b: q.opsi_b,
      opsi_c: q.opsi_c,
      opsi_d: q.opsi_d,
      opsi_e: q.opsi_e ?? "",
      kunci_jawaban: q.kunci_jawaban ?? "",
      id_mapel: q.id_mapel ?? "",
    });
    setSaveError("");
    setFilterMapel("");
    setShowModal(true);
  };

  const handleToggleKey = (letter: string) => {
    if (form.tipe === "SINGLE") {
      setForm((p) => ({ ...p, kunci_jawaban: letter }));
    } else {
      const keys = form.kunci_jawaban ? form.kunci_jawaban.split(",") : [];
      const updated = keys.includes(letter)
        ? keys.filter((k) => k !== letter)
        : [...keys, letter];
      setForm((p) => ({ ...p, kunci_jawaban: updated.sort().join(",") }));
    }
  };

  const isKeySelected = (letter: string) =>
    form.kunci_jawaban.split(",").includes(letter);

  const handleSave = async () => {
    if (editingId === null && !form.id_mapel) {
      setSaveError("Pilih mata pelajaran untuk soal ini.");
      return;
    }
    if (!form.pertanyaan.trim()) { setSaveError("Redaksi soal harus diisi."); return; }
    if (!form.opsi_a || !form.opsi_b || !form.opsi_c || !form.opsi_d) { setSaveError("Opsi A–D harus diisi."); return; }
    if (!form.kunci_jawaban) { setSaveError("Pilih kunci jawaban."); return; }

    setIsSaving(true); setSaveError("");
    const payload = {
      tipe: form.tipe,
      kategori: form.kategori || null,
      bobot: form.bobot,
      pertanyaan: form.pertanyaan,
      gambar_url: form.gambar_url || null,
      opsi_a: form.opsi_a,
      opsi_b: form.opsi_b,
      opsi_c: form.opsi_c,
      opsi_d: form.opsi_d,
      opsi_e: form.opsi_e || null,
      kunci_jawaban: form.kunci_jawaban,
      id_mapel: form.id_mapel || null,
      nomor_urut: editingId ? (questions.find((q) => q.id_soal === editingId)?.nomor_urut ?? questions.length + 1) : questions.length + 1,
    };

    const res = editingId
      ? await updateQuestion(editingId, payload)
      : await createQuestion(payload);

    if (res.success) {
      await mutate();
      // GAS menyimpan perubahan soal yang sudah pernah dijawab sebagai versi baru.
      setNotice(res.versioned ? (res.message ?? "") : "");
      setShowModal(false);
    } else {
      setSaveError(res.message || "Gagal menyimpan soal.");
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    setDeleteError("");
    const res = await deleteQuestion(id);
    if (!res.success) {
      // Jangan pernah menutup dialog seolah berhasil ketika GAS menolak.
      setDeleteError(res.message || "Gagal menghapus soal.");
      setIsDeleting(false);
      return;
    }
    await mutate();
    setNotice(res.message && res.archived ? res.message : "");
    setDeleteConfirmId(null);
    setIsDeleting(false);
  };

  const searchWikimedia = async (term: string) => {
    try {
      const searchRes = await fetch(
        `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&srnamespace=6&format=json&srlimit=6&origin=*`
      );
      const searchData = await searchRes.json();
      const titles: string[] = searchData?.query?.search?.map((s: { title: string }) => s.title) ?? [];
      if (titles.length === 0) return;

      const infoRes = await fetch(
        `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles.join("|"))}&prop=imageinfo&iiprop=url&iiurlwidth=200&format=json&origin=*`
      );
      const infoData = await infoRes.json();
      type WikiPage = { title: string; imageinfo?: Array<{ url: string; thumburl: string }> };
      const pages = Object.values(infoData?.query?.pages ?? {}) as WikiPage[];
      const images = pages
        .filter((p) => p.imageinfo?.[0])
        .map((p) => ({ title: p.title.replace("File:", ""), url: p.imageinfo![0].url, thumb: p.imageinfo![0].thumburl }));

      setWikiImages(images);
      if (images.length > 0) setShowWikiPicker(true);
    } catch { /* silently skip if Wikimedia is unreachable */ }
  };

  const handleAiGenerate = async () => {
    const apiKey = localStorage.getItem("groq_api_key") ?? "";
    if (!apiKey) { setAiError("API key Groq belum diatur. Masukkan di kotak di bawah."); return; }
    if (!aiTopic.trim()) { setAiError("Isi topik soal terlebih dahulu."); return; }

    setAiGenerating(true);
    setAiError("");
    setWikiImages([]);
    setShowWikiPicker(false);

    const mapelName = mapelList.find(m => m.id_mapel === form.id_mapel)?.nama_mapel ?? "umum";
    const prompt = `Buat 1 soal pilihan ganda untuk siswa kelas ${aiKelas} Indonesia tentang topik "${aiTopic}" pada mata pelajaran ${mapelName}. Kembalikan HANYA JSON valid tanpa komentar atau teks lain:
{
  "pertanyaan": "teks pertanyaan",
  "opsi_a": "teks opsi A",
  "opsi_b": "teks opsi B",
  "opsi_c": "teks opsi C",
  "opsi_d": "teks opsi D",
  "kunci_jawaban": "A",
  "wikipedia_search_term": "english keyword for Wikimedia Commons image search"
}`;

    try {
      const raw = await callGroq(apiKey, prompt);
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI tidak menghasilkan JSON yang valid.");
      const parsed = JSON.parse(match[0]);
      setForm(p => ({
        ...p,
        pertanyaan: parsed.pertanyaan ?? p.pertanyaan,
        opsi_a: parsed.opsi_a ?? "",
        opsi_b: parsed.opsi_b ?? "",
        opsi_c: parsed.opsi_c ?? "",
        opsi_d: parsed.opsi_d ?? "",
        opsi_e: "",
        kunci_jawaban: parsed.kunci_jawaban ?? "",
      }));
      if (parsed.wikipedia_search_term) await searchWikimedia(parsed.wikipedia_search_term);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Terjadi kesalahan saat generate soal.");
    } finally {
      setAiGenerating(false);
    }
  };


  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col md:flex-row font-body-admin">
      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-40 bg-[#0f172a] text-white px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sky-400 text-2xl">school</span>
          <span className="font-extrabold text-base tracking-wider text-white">CBT <span className="text-sky-400">ADMIN</span></span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 cursor-pointer">
          <span className="material-symbols-outlined text-2xl">{isSidebarOpen ? "close" : "menu"}</span>
        </button>
      </div>

      {/* Sidebar Panel */}
      <aside className={`fixed left-0 top-0 h-full w-64 flex flex-col bg-slate-900 border-r border-slate-800/80 shadow-2xl z-50 transform md:transform-none md:translate-x-0 transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Header Branding */}
        <div className="p-5 flex justify-between items-center border-b border-slate-800/80 bg-slate-950/40">
          <Link href={tenantPath("/")} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-2xl">school</span>
            </div>
            <div>
              <h1 className="font-black text-base tracking-wider text-white flex items-center gap-1.5">
                CBT <span className="text-blue-400">SEKOLAH</span>
              </h1>
              <span className="inline-block text-[10px] uppercase font-bold tracking-widest text-blue-300 bg-blue-900/50 px-2 py-0.5 rounded border border-blue-700/40 mt-0.5">
                Portal Guru
              </span>
            </div>
          </Link>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white p-1 cursor-pointer">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-grow px-3.5 space-y-1.5 mt-5 overflow-y-auto">
          {/* Dashboard */}
          <Link 
            href={tenantPath("/admin")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 group ${
              isLinkActive("/admin") && !isLinkActive("/kelas") && !isLinkActive("/mata-pelajaran") && !isLinkActive("/management") && !isLinkActive("/questions") && !isLinkActive("/cetak") && !isLinkActive("/analisis")
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-600/25 ring-1 ring-blue-400/30" 
                : "text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">dashboard</span>
            <span className="text-sm tracking-wide">Dashboard</span>
          </Link>

          {/* Group 1: Kelola Kelas & Mapel */}
          <div className="pt-4 pb-1 px-3 flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400 font-bold border-t border-slate-800/60 mt-3">
            <span>Data Pembelajaran</span>
          </div>

          <Link 
            href={tenantPath("/admin/kelas")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 group ${
              isLinkActive("/kelas") 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-600/25 ring-1 ring-blue-400/30" 
                : "text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">meeting_room</span>
            <span className="text-sm tracking-wide">Data Kelas</span>
          </Link>

          <Link 
            href={tenantPath("/admin/mata-pelajaran")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 group ${
              isLinkActive("/mata-pelajaran") 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-600/25 ring-1 ring-blue-400/30" 
                : "text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">menu_book</span>
            <span className="text-sm tracking-wide">Mata Pelajaran</span>
          </Link>

          {/* Group 2: Bank Soal & Administrasi */}
          <div className="pt-4 pb-1 px-3 flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400 font-bold border-t border-slate-800/60 mt-3">
            <span>Soal & Administrasi</span>
          </div>

          <Link 
            href={tenantPath("/admin/management")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 group ${
              isLinkActive("/management") 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-600/25 ring-1 ring-blue-400/30" 
                : "text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">groups</span>
            <span className="text-sm tracking-wide">Data Siswa</span>
          </Link>

          <Link 
            href={tenantPath("/admin/questions")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 group ${
              isLinkActive("/questions") 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-600/25 ring-1 ring-blue-400/30" 
                : "text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">quiz</span>
            <span className="text-sm tracking-wide">Bank Soal</span>
          </Link>

          <Link 
            href={tenantPath("/admin/cetak")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 group ${
              isLinkActive("/cetak") 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-600/25 ring-1 ring-blue-400/30" 
                : "text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">print</span>
            <span className="text-sm tracking-wide">Cetak Dokumen</span>
          </Link>

          <Link 
            href={tenantPath("/admin/analisis")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 group ${
              isLinkActive("/analisis") 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-600/25 ring-1 ring-blue-400/30" 
                : "text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">analytics</span>
            <span className="text-sm tracking-wide">Analisis Soal</span>
          </Link>

          {/* Group 3: Pelaksanaan Ujian */}
          <div className="pt-4 pb-1 px-3 flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400 font-bold border-t border-slate-800/60 mt-3">
            <span>Pelaksanaan Ujian</span>
          </div>

          <Link 
            href={tenantPath("/admin")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 group ${
              isLinkActive("/admin") && !isLinkActive("/kelas") && !isLinkActive("/mata-pelajaran") && !isLinkActive("/management") && !isLinkActive("/questions") && !isLinkActive("/cetak") && !isLinkActive("/analisis")
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-600/25 ring-1 ring-blue-400/30" 
                : "text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">assignment_turned_in</span>
            <span className="text-sm tracking-wide">Ujian & Jadwal</span>
          </Link>
        </nav>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <button
            onClick={async () => { await logout(); sessionStorage.removeItem("admin_auth"); router.replace("/admin/login"); }}
            className="flex items-center justify-between px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-xl transition-all cursor-pointer w-full text-left font-bold text-xs uppercase tracking-wider group"
          >
            <span className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-red-400 text-lg group-hover:scale-110 transition-transform">logout</span>
              <span>Keluar Akun</span>
            </span>
            <span className="material-symbols-outlined text-red-400/60 text-sm">chevron_right</span>
          </button>
        </div>
      </aside>
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/40 z-40 md:hidden" />}

      {/* Main */}
      <main className="flex-grow md:ml-64 p-4 md:p-8">
        {/* Header Title Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <span className="material-symbols-outlined text-2xl">inventory_2</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-wide flex items-center gap-2">
                Bank Paket Soal
                <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                  {questions.length} Soal
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Kelola bank soal ujian, kategori, dan opsi kunci jawaban</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 hover:shadow-blue-600/35 transition-all cursor-pointer text-xs uppercase tracking-wider active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            <span>Tambah Soal Baru</span>
          </button>
        </div>

        {notice && (
          <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-xs font-semibold shadow-xs">
            <span className="material-symbols-outlined text-amber-600 text-lg">info</span>
            <span className="flex-1">{notice}</span>
            <button onClick={() => setNotice("")} className="cursor-pointer text-amber-500 hover:text-amber-800">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}

        {/* Filter & Search Bar Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm mb-5 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
            <span>Tampilkan</span>
            <select
              value={entriesCount}
              onChange={(e) => setEntriesCount(Number(e.target.value))}
              className="border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white cursor-pointer outline-none text-xs font-bold text-slate-800 focus:border-blue-600 shadow-xs"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={0}>Semua</option>
            </select>
            <span>data per halaman</span>
            <span className="text-slate-400 font-normal ml-1">
              ({visible.length} dari {filtered.length} {filtered.length !== questions.length ? `• total ${questions.length}` : ""})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {archivedCount > 0 && (
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="rounded text-blue-600 cursor-pointer focus:ring-blue-500"
                />
                <span>Tampilkan arsip ({archivedCount})</span>
              </label>
            )}

            <div className="relative">
              <select
                value={filterMapel}
                onChange={(e) => setFilterMapel(e.target.value)}
                className="h-10 border border-slate-300 rounded-xl pl-3.5 pr-8 text-xs font-bold text-slate-700 bg-white focus:border-blue-600 outline-none cursor-pointer shadow-xs appearance-none min-w-[170px]"
              >
                <option value="">Semua Mata Pelajaran</option>
                {mapelList.map(m => (
                  <option key={m.id_mapel} value={m.id_mapel}>
                    {m.kode_mapel} — {m.nama_mapel}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">unfold_more</span>
            </div>

            <div className="relative flex-grow sm:flex-grow-0">
              <input
                className="w-full sm:w-64 h-10 pl-9 pr-8 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-xs"
                placeholder="Cari soal, mapel, kategori..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 cursor-pointer">
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table Container Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-4 py-3.5 text-center w-12">No</th>
                  <th className="px-4 py-3.5 text-left w-32">Mapel</th>
                  <th className="px-4 py-3.5 w-44">Kode Soal</th>
                  <th className="px-5 py-3.5">Redaksi Pertanyaan</th>
                  <th className="px-4 py-3.5 w-40 text-center">Status & PG</th>
                  <th className="px-4 py-3.5 w-44 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-500 text-xs">
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined animate-spin text-blue-600 text-2xl">sync</span>
                        <span className="font-semibold text-slate-600">Memuat data soal...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-400 text-xs">
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-4xl text-slate-300">inventory_2</span>
                        <p className="font-bold text-slate-600 text-sm">Belum ada soal tersedia.</p>
                        <p className="text-slate-400">Klik tombol &quot;Tambah Soal Baru&quot; di atas untuk membuat soal pertama Anda.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  visible.map((q, idx) => {
                    const cleanPertanyaan = q.pertanyaan.replace(/<[^>]*>/g, "");
                    const isE = !!q.opsi_e;
                    const idCode = `#SOAL-${q.nomor_urut < 10 ? '0' : ''}${q.nomor_urut}`;
                    const mapelObj = mapelList.find(m => m.id_mapel === q.id_mapel);

                    return (
                      <tr key={q.id_soal} className="hover:bg-blue-50/30 transition-colors text-slate-700 text-xs">
                        <td className="px-4 py-4 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-4">
                          {q.id_mapel ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold bg-blue-100/80 text-blue-800 border border-blue-200/60 shadow-2xs">
                              {mapelObj?.kode_mapel ?? q.id_mapel}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs font-mono">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-[11px] font-bold border border-slate-200">
                            {idCode}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-800 text-sm max-w-md sm:max-w-lg truncate flex items-center gap-2" title={cleanPertanyaan}>
                            {q.status_soal === "ARSIP" && (
                              <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-600 uppercase tracking-wider">
                                Arsip
                              </span>
                            )}
                            <span className="truncate">{cleanPertanyaan || "Tanpa Redaksi Teks"}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {q.kategori ?? "Mudah"}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                              Bobot: {q.bobot}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="font-bold text-slate-800 text-xs mb-1">PG ({isE ? "5 Opsi" : "4 Opsi"})</div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase border border-emerald-200">
                            <span className="material-symbols-outlined text-[12px]">check_circle</span>
                            <span>Siap Ujian</span>
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Blue Attachment Button */}
                            <button
                              onClick={() => {
                                if (q.gambar_url) {
                                  window.open(q.gambar_url, "_blank");
                                } else {
                                  alert("Tidak ada lampiran gambar pada soal ini.");
                                }
                              }}
                              className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                              title="Lihat Lampiran Gambar"
                            >
                              <span className="material-symbols-outlined text-base">image</span>
                            </button>

                            {/* Yellow Edit Button */}
                            <button
                              onClick={() => openEdit(q)}
                              className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-500 text-amber-600 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                              title="Edit Soal"
                            >
                              <span className="material-symbols-outlined text-base">edit</span>
                            </button>

                            {/* Cyan Preview Button */}
                            <button
                              onClick={() => setPreviewQuestion(q)}
                              className="w-8 h-8 rounded-xl bg-purple-50 hover:bg-purple-600 text-purple-600 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                              title="Pratinjau Soal"
                            >
                              <span className="material-symbols-outlined text-base">visibility</span>
                            </button>

                            {/* Red Delete Button */}
                            <button
                              onClick={() => { setDeleteError(""); setDeleteConfirmId(q.id_soal); }}
                              className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                              title="Hapus Soal"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ── BUAT / EDIT SOAL MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200/80 my-4 sm:my-8 overflow-hidden transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner">
                  <span className="material-symbols-outlined text-2xl">{editingId ? "edit_note" : "quiz"}</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white tracking-wide flex items-center gap-2">
                    {editingId ? "Edit Soal Ujian" : "Properti Soal Baru"}
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 font-medium tracking-normal">
                      {form.tipe === "SINGLE" ? "Pilihan Ganda" : "Pilihan Kompleks"}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 font-normal mt-0.5">
                    Lengkapi detail pertanyaan, media pendukung, serta opsi kunci jawaban.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                title="Tutup Modal"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Mata Pelajaran Dropdown */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <span className="material-symbols-outlined text-blue-600 text-base">menu_book</span>
                    Mata Pelajaran <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">Pilih mata pelajaran yang sesuai</span>
                </div>
                {mapelList.length === 0 ? (
                  <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium">
                    <span className="material-symbols-outlined text-amber-600 text-lg">warning</span>
                    <span>Belum ada mata pelajaran. <Link href={tenantPath("/admin/mata-pelajaran")} className="font-bold underline text-amber-900">Tambah Mata Pelajaran</Link></span>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={form.id_mapel}
                      onChange={(e) => {
                        setForm(p => ({ 
                          ...p, 
                          id_mapel: e.target.value,
                        }));
                      }}
                      className="w-full h-12 border border-slate-300 rounded-xl px-4 text-sm font-semibold text-slate-800 bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer shadow-sm appearance-none pr-10"
                    >
                      <option value="">-- Pilih Mata Pelajaran --</option>
                      {mapelList.map(m => (
                        <option key={m.id_mapel} value={m.id_mapel}>
                          {m.kode_mapel} — {m.nama_mapel}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">unfold_more</span>
                  </div>
                )}
              </div>

              {/* AI Generate Panel */}
              <div className="border border-purple-200/80 rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
                <button
                  type="button"
                  onClick={() => setShowAiPanel(p => !p)}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white hover:opacity-95 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 text-sm font-bold">
                      ✨
                    </div>
                    <span className="font-bold text-sm text-purple-100">Buat Soal Otomatis dengan AI</span>
                    <span className="text-[10px] text-purple-200 font-bold bg-purple-500/30 border border-purple-400/30 px-2.5 py-0.5 rounded-full tracking-wider uppercase">BETA</span>
                  </div>
                  <div className="flex items-center gap-1 text-purple-200 text-xs font-medium">
                    <span>{showAiPanel ? "Sembunyikan Panel" : "Buka Panel AI"}</span>
                    <span className="material-symbols-outlined text-lg">
                      {showAiPanel ? "expand_less" : "expand_more"}
                    </span>
                  </div>
                </button>

                {showAiPanel && (
                  <div className="p-4 sm:p-5 bg-gradient-to-b from-purple-50/60 to-white space-y-4 border-t border-purple-100">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-purple-900 block mb-1.5 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-purple-600 text-sm">topic</span>
                          Topik / Materi Pembelajaran
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: Fotosintesis Tumbuhan, Operasi Pecahan, Proklamasi 1945..."
                          value={aiTopic}
                          onChange={e => setAiTopic(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleAiGenerate(); }}
                          className="w-full h-11 px-3.5 border border-purple-200 rounded-xl text-sm font-medium text-slate-800 bg-white focus:border-purple-600 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all shadow-sm placeholder:text-slate-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-purple-900 block mb-1.5 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-purple-600 text-sm">school</span>
                          Tingkat Kelas
                        </label>
                        <div className="relative">
                          <select
                            value={aiKelas}
                            onChange={e => setAiKelas(e.target.value)}
                            className="w-full h-11 px-3.5 border border-purple-200 rounded-xl text-sm font-medium text-slate-800 bg-white focus:border-purple-600 focus:ring-4 focus:ring-purple-500/10 outline-none cursor-pointer shadow-sm appearance-none pr-8"
                          >
                            {["1","2","3","4","5","6","7","8","9","10","11","12"].map(k => (
                              <option key={k} value={k}>Kelas {k}</option>
                            ))}
                          </select>
                          <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400 text-lg">unfold_more</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-purple-900 block mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-purple-600 text-sm">key</span>
                          Groq API Key
                        </span>
                        <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-purple-600 text-[11px] normal-case font-semibold hover:underline flex items-center gap-0.5">
                          <span>Dapatkan API Key Gratis</span>
                          <span className="material-symbols-outlined text-xs">open_in_new</span>
                        </a>
                      </label>
                      <input
                        type="password"
                        placeholder="gsk_..."
                        defaultValue={typeof window !== "undefined" ? (localStorage.getItem("groq_api_key") ?? "") : ""}
                        onChange={e => localStorage.setItem("groq_api_key", e.target.value)}
                        className="w-full h-10 px-3.5 border border-purple-200 rounded-xl text-xs font-mono text-slate-800 bg-white focus:border-purple-600 focus:ring-4 focus:ring-purple-500/10 outline-none shadow-sm"
                      />
                    </div>

                    {aiError && (
                      <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 font-semibold flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-500 text-base">error</span>
                        <span>{aiError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={handleAiGenerate}
                        disabled={aiGenerating || !form.id_mapel}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                      >
                        {aiGenerating ? (
                          <><span className="material-symbols-outlined text-base animate-spin">sync</span>Membuat Soal AI...</>
                        ) : (
                          <><span className="text-base">✨</span>Generate Soal Sekarang</>
                        )}
                      </button>
                      {!form.id_mapel && (
                        <p className="text-xs text-amber-700 font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm text-amber-500">info</span>
                          Pilih mata pelajaran terlebih dahulu
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Konfigurasi & Attributes Soal */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <span className="material-symbols-outlined text-indigo-600 text-base">tune</span>
                  Konfigurasi Soal
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">Jenis Soal</label>
                    <div className="relative">
                      <select
                        value={form.tipe}
                        onChange={(e) => setForm((p) => ({ ...p, tipe: e.target.value as "SINGLE" | "COMPLEX", kunci_jawaban: "" }))}
                        className="w-full h-11 border border-slate-300 rounded-xl px-3 text-xs font-semibold text-slate-800 bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none cursor-pointer shadow-sm appearance-none pr-8"
                      >
                        <option value="SINGLE">1. Pilihan Ganda</option>
                        <option value="COMPLEX">2. Pilihan Kompleks</option>
                      </select>
                      <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">unfold_more</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">Tingkat Kesulitan</label>
                    <div className="relative">
                      <select
                        value={form.kategori}
                        onChange={(e) => setForm((p) => ({ ...p, kategori: e.target.value }))}
                        className="w-full h-11 border border-slate-300 rounded-xl px-3 text-xs font-semibold text-slate-800 bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none cursor-pointer shadow-sm appearance-none pr-8"
                      >
                        {KATEGORI_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                      <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">unfold_more</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">Bobot Soal (1-10)</label>
                    <input
                      type="number" min={1} max={10}
                      value={form.bobot}
                      onChange={(e) => setForm((p) => ({ ...p, bobot: Number(e.target.value) }))}
                      className="w-full h-11 border border-slate-300 rounded-xl px-3.5 text-xs font-bold text-slate-800 bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">Tipe Jawaban</label>
                    <div className="h-11 border border-slate-200 rounded-xl px-3.5 bg-slate-100/80 flex items-center gap-2 text-xs font-bold text-slate-700">
                      <span className={`w-2.5 h-2.5 rounded-full ${form.tipe === "SINGLE" ? "bg-blue-600" : "bg-purple-600"}`}></span>
                      <span>{form.tipe === "SINGLE" ? "1 Pilihan Kunci" : "Multi Pilihan Kunci"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Redaksi Soal Utama */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <span className="material-symbols-outlined text-blue-600 text-base">edit_document</span>
                    Redaksi Soal Utama <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">Tulis teks pertanyaan atau instruksi soal</span>
                </div>
                <RichEditor
                  value={form.pertanyaan}
                  onChange={(v) => setForm((p) => ({ ...p, pertanyaan: v }))}
                />
              </div>

              {/* Gambar Lampiran Soal (Opsional) */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <span className="material-symbols-outlined text-amber-600 text-base">image</span>
                    Gambar Lampiran Soal <span className="text-slate-400 font-normal normal-case text-xs">(Opsional)</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">Unggah dari komputer atau gunakan link URL</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Dropzone / Upload Local File */}
                  <div className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center transition-all relative group text-center ${isUploading ? "border-blue-400 bg-blue-50/50 cursor-wait" : "border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50/20 cursor-pointer shadow-sm"}`}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={isUploading}
                      className="absolute inset-0 opacity-0 z-10 disabled:cursor-wait cursor-pointer"
                    />
                    {isUploading ? (
                      <>
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                          <span className="material-symbols-outlined text-blue-600 text-xl animate-spin">sync</span>
                        </div>
                        <p className="text-xs font-bold text-blue-700">Mengunggah Gambar...</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Mohon tunggu sebentar</p>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-blue-50 group-hover:bg-blue-100 text-blue-600 flex items-center justify-center mb-2 transition-colors">
                          <span className="material-symbols-outlined text-xl">cloud_upload</span>
                        </div>
                        <p className="text-xs font-bold text-slate-700 group-hover:text-blue-700 transition-colors">Pilih File Gambar</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">PNG, JPG, WEBP (Maksimal 2MB)</p>
                      </>
                    )}
                  </div>

                  {/* External URL Input */}
                  <div className="p-4 border border-slate-200 rounded-2xl bg-white space-y-2 flex flex-col justify-center shadow-sm">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Atau Gunakan Link URL Gambar</label>
                    <div className="relative">
                      <input
                        type="url"
                        placeholder="https://domain.com/gambar.jpg"
                        value={form.gambar_url.startsWith("data:") ? "" : form.gambar_url}
                        onChange={(e) => setForm((p) => ({ ...p, gambar_url: e.target.value }))}
                        className="w-full h-10 pl-9 pr-3 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      />
                      <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">link</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">Tempel tautan eksternal jika gambar sudah di-host di internet.</p>
                  </div>
                </div>

                {/* Preview Card */}
                {form.gambar_url && !isUploading && (
                  <div className="mt-3 bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.gambar_url} alt="preview" className="h-14 w-14 rounded-xl object-cover border border-slate-200 bg-slate-50 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          {form.gambar_url.includes("drive.google.com") ? (
                            <><span className="material-symbols-outlined text-emerald-600 text-sm">cloud_done</span>Tersimpan di Google Drive</>
                          ) : (
                            <><span className="material-symbols-outlined text-blue-600 text-sm">link</span>Gambar Eksternal</>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[280px] font-mono mt-0.5">
                          {form.gambar_url}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, gambar_url: "" }))}
                      className="w-8 h-8 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                      title="Hapus Gambar"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                )}

                {/* Wikimedia Image Picker */}
                {showWikiPicker && wikiImages.length > 0 && (
                  <div className="mt-3 p-3.5 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                        <span>✨</span> Rekomendasi Gambar Wikimedia Commons
                      </p>
                      <button type="button" onClick={() => setShowWikiPicker(false)} className="text-slate-400 hover:text-red-500 cursor-pointer">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                    <div className="flex gap-2.5 overflow-x-auto pb-2">
                      {wikiImages.map((img) => (
                        <button
                          key={img.url}
                          type="button"
                          onClick={() => { setForm(p => ({ ...p, gambar_url: img.url })); setShowWikiPicker(false); }}
                          className="flex-shrink-0 group relative rounded-xl overflow-hidden border-2 border-purple-200 hover:border-purple-600 transition-all shadow-sm"
                          title={img.title}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.thumb} alt={img.title} className="h-20 w-28 object-cover" />
                          <div className="absolute inset-0 bg-purple-900/0 group-hover:bg-purple-900/30 transition-all" />
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-purple-700 font-medium">Klik salah satu gambar untuk memakainya langsung.</p>
                  </div>
                )}
              </div>

              {/* Opsi Jawaban & Kunci Jawaban */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <span className="material-symbols-outlined text-emerald-600 text-base">task_alt</span>
                    Opsi Jawaban & Kunci Jawaban <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full border border-emerald-200/60">
                    {form.tipe === "SINGLE" ? "Klik 1 lingkaran huruf sebagai Kunci Jawaban" : "Klik lingkaran huruf untuk pilih beberapa Kunci Jawaban"}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {OPTION_KEYS.map((opt) => {
                    const key = `opsi_${opt}` as keyof QuestionForm;
                    const letter = opt.toUpperCase();
                    const isKey = isKeySelected(letter);
                    const isOptional = opt === "e";
                    return (
                      <div
                        key={opt}
                        className={`flex items-center gap-3 rounded-2xl border-2 px-3.5 py-2.5 transition-all shadow-sm ${
                          isKey
                            ? "border-emerald-500 bg-emerald-50/70 shadow-emerald-500/10 ring-2 ring-emerald-500/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        {/* Key Toggle Circle */}
                        <button
                          type="button"
                          onClick={() => handleToggleKey(letter)}
                          title={`Klik untuk menetapkan Pilihan ${letter} sebagai Kunci Jawaban`}
                          className={`flex-shrink-0 w-10 h-10 rounded-xl border-2 flex items-center justify-center font-bold text-sm transition-all cursor-pointer ${
                            isKey
                              ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105"
                              : "border-slate-300 text-slate-700 bg-slate-100 hover:bg-slate-200 hover:border-slate-400"
                          }`}
                        >
                          {letter}
                        </button>

                        {/* Text Input */}
                        <input
                          type="text"
                          placeholder={`Tulis Pilihan ${letter}${isOptional ? " (opsional)" : ""}`}
                          value={String(form[key] ?? "")}
                          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                          className="flex-grow bg-transparent border-none focus:ring-0 outline-none text-sm font-medium text-slate-800 placeholder:text-slate-400"
                        />

                        {/* Key Badge Indicator */}
                        {isKey && (
                          <div className="flex items-center gap-1 bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-sm flex-shrink-0">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            <span>KUNCI</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {form.kunci_jawaban && (
                  <div className="pt-1 flex items-center gap-2 text-xs text-emerald-800 font-bold bg-emerald-100/50 px-3.5 py-2 rounded-xl border border-emerald-200">
                    <span className="material-symbols-outlined text-emerald-600 text-base">verified</span>
                    <span>Kunci Jawaban terpilih: <span className="underline font-black text-emerald-900 tracking-wide text-sm">{form.kunci_jawaban}</span></span>
                  </div>
                )}
              </div>

              {/* Error */}
              {saveError && (
                <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-xl font-semibold text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-500 text-lg">error</span>
                  <span>{saveError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/80 bg-slate-50/90 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 border border-slate-300 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-200/60 transition-all cursor-pointer shadow-sm"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-7 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all cursor-pointer disabled:opacity-60 flex items-center gap-2 active:scale-95 tracking-wide uppercase"
              >
                <span className="material-symbols-outlined text-lg">save</span>
                <span>{isSaving ? "Menyimpan Soal..." : "Simpan Soal"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewQuestion && (() => {
        const pq = previewQuestion;
        const kunci = pq.kunci_jawaban ?? "";
        const kunciArr = pq.tipe === "COMPLEX"
          ? kunci.split(",").map((k) => k.trim().toUpperCase())
          : [kunci.toUpperCase()];
        const opts: [string, string][] = [
          ["A", pq.opsi_a],
          ["B", pq.opsi_b],
          ["C", pq.opsi_c],
          ["D", pq.opsi_d],
          ...(pq.opsi_e ? [["E", pq.opsi_e] as [string, string]] : []),
        ];
        return (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-start justify-center p-4 overflow-y-auto"
            onClick={() => setPreviewQuestion(null)}
          >
            <div
              className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200/80 my-8 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-300 text-2xl">visibility</span>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Pratinjau Soal #{pq.nomor_urut}
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${pq.tipe === "COMPLEX" ? "bg-purple-500/30 text-purple-200 border border-purple-400/30" : "bg-blue-500/30 text-blue-200 border border-blue-400/30"}`}>
                        {pq.tipe === "SINGLE" ? "Pilihan Ganda" : "Pilihan Kompleks"}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300">Tampilan pertanyaan yang akan dilihat oleh siswa</p>
                  </div>
                </div>
                <button onClick={() => setPreviewQuestion(null)} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer">
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* Question text */}
                <div
                  className="text-base leading-relaxed text-slate-800 font-medium bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80"
                  dangerouslySetInnerHTML={{ __html: sanitizeQuestionHtml(pq.pertanyaan) }}
                />

                {/* Image */}
                {pq.gambar_url && (
                  <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pq.gambar_url}
                      alt="Gambar soal"
                      className="max-w-full max-h-72 object-contain rounded-xl"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          `https://drive.google.com/thumbnail?id=${pq.gambar_url?.match(/[-\w]{25,}/)?.[0]}&sz=w600`;
                      }}
                    />
                  </div>
                )}

                {/* Options */}
                <div className="space-y-2.5">
                  {opts.map(([key, text]) => {
                    const isKunci = kunciArr.includes(key);
                    return (
                      <div
                        key={key}
                        className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
                          isKunci
                            ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-sm"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                          isKunci ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}>
                          {key}
                        </span>
                        <span
                          className={`text-sm leading-relaxed shrink min-w-0 font-medium ${isKunci ? "text-emerald-900 font-semibold" : "text-slate-800"}`}
                          dangerouslySetInnerHTML={{ __html: sanitizeQuestionHtml(text) }}
                        />
                        {isKunci && (
                          <span className="ml-auto shrink-0 material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {pq.kunci_jawaban && (
                  <div className="p-3 bg-emerald-100/60 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-base">verified</span>
                    <span>Kunci Jawaban: {pq.kunci_jawaban}</span>
                  </div>
                )}

                {/* Meta */}
                <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600 pt-3 border-t border-slate-200">
                  {pq.kategori && <span className="px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200">{pq.kategori}</span>}
                  <span className="px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200">Bobot: {pq.bobot}</span>
                  {pq.nama_mapel && <span className="px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200">{pq.nama_mapel}</span>}
                  {!kunci && <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-semibold rounded-lg">Kunci belum diatur</span>}
                </div>
              </div>
              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setPreviewQuestion(null)}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Tutup Pratinjau
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-lg">
          <div className="bg-white rounded-2xl p-xl max-w-sm w-full shadow-2xl border border-outline-variant">
            <h3 className="font-headline-admin text-on-surface mb-sm">Hapus Soal?</h3>
            <p className="font-body-admin text-on-surface-variant mb-md">
              Soal yang belum pernah dijawab siswa akan dihapus permanen. Soal yang sudah
              pernah dijawab hanya diarsipkan agar histori ujian tetap utuh.
            </p>
            {deleteError && (
              <p className="font-body-admin text-sm text-error bg-error/10 border border-error/30 rounded-xl px-md py-sm mb-md">
                {deleteError}
              </p>
            )}
            <div className="flex gap-md">
              <button onClick={() => { setDeleteConfirmId(null); setDeleteError(""); }} className="flex-1 h-12 border border-outline-variant rounded-xl font-label-bold text-on-surface cursor-pointer">Batal</button>
              <button onClick={() => handleDelete(deleteConfirmId)} disabled={isDeleting} className="flex-1 h-12 bg-error text-on-error rounded-xl font-label-bold cursor-pointer disabled:opacity-60">
                {isDeleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
