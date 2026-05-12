"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTenantRouter, useTenantPath } from "@/hooks/useTenantRouter";
import useSWR from "swr";
import { getAdminQuestions, createQuestion, updateQuestion, deleteQuestion, getMataPelajaran, uploadImage } from "@/lib/api";
import type { Question, MataPelajaran } from "@/types";

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
      className="px-2 py-1 rounded hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface font-bold text-sm cursor-pointer"
    >
      {icon}
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
    <div className="border border-outline-variant rounded-lg overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-xs px-sm py-xs border-b border-outline-variant bg-surface-container-low">
        <select
          className="text-xs border border-outline-variant rounded px-1 py-0.5 font-body-admin bg-surface cursor-pointer outline-none"
          onChange={(e) => exec("fontSize", e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>Normal</option>
          <option value="3">Normal</option>
          <option value="4">Large</option>
          <option value="5">X-Large</option>
        </select>
        <div className="w-px h-5 bg-outline-variant mx-xs"></div>
        <ToolbarBtn icon="B" label="Bold" onClick={() => exec("bold")} />
        <ToolbarBtn icon="I" label="Italic" onClick={() => exec("italic")} />
        <ToolbarBtn icon="U" label="Underline" onClick={() => exec("underline")} />
        <ToolbarBtn icon="S" label="Strikethrough" onClick={() => exec("strikeThrough")} />
        <div className="w-px h-5 bg-outline-variant mx-xs"></div>
        <ToolbarBtn icon="≡" label="Ordered list" onClick={() => exec("insertOrderedList")} />
        <ToolbarBtn icon="•" label="Unordered list" onClick={() => exec("insertUnorderedList")} />
        <div className="w-px h-5 bg-outline-variant mx-xs"></div>
        <ToolbarBtn icon="⌫" label="Clear format" onClick={() => exec("removeFormat")} />
      </div>
      {/* Editable area */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
        className="min-h-[180px] p-md font-body-admin text-on-surface outline-none"
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

  useEffect(() => {
    if (sessionStorage.getItem("admin_auth") !== "true") router.replace("/admin/login");
  }, [router]);

  const { data: questionsRes, mutate, isLoading } = useSWR("getAdminQuestions", getAdminQuestions);
  const questions: Question[] = questionsRes?.data ?? [];

  const { data: mapelRes } = useSWR("getMataPelajaran", getMataPelajaran);
  const mapelList: MataPelajaran[] = mapelRes?.data ?? [];

  const filtered = questions.filter((q) =>
    (filterMapel === "" || q.id_mapel === filterMapel) &&
    (q.pertanyaan.toLowerCase().includes(search.toLowerCase()) ||
    (q.kategori ?? "").toLowerCase().includes(search.toLowerCase()))
  );

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

  const openEdit = (q: Question) => {
    setEditingId(q.id_soal);
    setForm({
      tipe: q.tipe,
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
      setShowModal(false);
    } else {
      setSaveError(res.message || "Gagal menyimpan soal.");
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    await deleteQuestion(id);
    await mutate();
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
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/40 z-40 md:hidden" />}

      {/* Main */}
      <main className="flex-grow md:ml-64 p-md md:p-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md mb-xl">
          <div>
            <h2 className="font-headline-student text-[28px] font-bold text-[#1E3A8A] flex items-center gap-xs">
              <span className="material-symbols-outlined text-[#1E3A8A] text-3xl">inventory_2</span>
              <span>Paket Soal</span>
            </h2>
            <p className="font-body-admin text-xs text-slate-500 font-semibold tracking-wider mt-0.5">SOAL UJIAN</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-sm px-6 py-3 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white font-label-bold rounded-lg shadow-sm hover:opacity-90 transition-all cursor-pointer text-xs uppercase tracking-wider font-bold">
            <span className="material-symbols-outlined text-[18px]">add</span>Tambah Paket Baru
          </button>
        </div>

        {/* Filter & Search Bar Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md mb-lg bg-white p-md rounded-t-xl border border-outline-variant border-b-0">
          <div className="flex items-center gap-xs font-body-admin text-sm text-slate-600">
            <span>Tampilkan</span>
            <select
              value={entriesCount}
              onChange={(e) => setEntriesCount(Number(e.target.value))}
              className="border border-outline-variant rounded px-2 py-1 bg-white cursor-pointer outline-none text-xs font-semibold focus:border-[#1E40AF]"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>

          <div className="flex flex-wrap items-center gap-md font-body-admin text-sm text-slate-600">
            <select
              value={filterMapel}
              onChange={(e) => setFilterMapel(e.target.value)}
              className="h-10 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-700 
                         bg-white focus:border-[#1E40AF] outline-none cursor-pointer shrink-0
                         min-w-[160px]"
            >
              <option value="">Semua Mapel</option>
              {mapelList.map(m => (
                <option key={m.id_mapel} value={m.id_mapel}>
                  {m.kode_mapel} — {m.nama_mapel}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-xs">
              <span>search :</span>
              <div className="border border-outline-variant rounded-lg px-3 py-1 bg-white flex items-center gap-xs focus-within:border-[#1E40AF] focus-within:ring-1 focus-within:ring-[#1E40AF]/20 transition-all">
                <input
                  className="bg-transparent border-none outline-none text-xs text-on-surface w-48 font-semibold placeholder:text-slate-400 placeholder:font-normal"
                  placeholder="Cari kode/mapel..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-slate-400 hover:text-error cursor-pointer">
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Table Container Card */}
        <div className="bg-white rounded-b-xl border border-outline-variant overflow-hidden shadow-sm mb-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-body-admin">
              <thead>
                <tr className="bg-[#202E3B] text-white text-[11px] font-bold uppercase tracking-wider border-b border-outline-variant">
                  <th className="px-md py-4 text-center w-12">No</th>
                  <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-white w-32">
                    Mapel
                  </th>
                  <th className="px-lg py-4 w-52">Kode Soal</th>
                  <th className="px-lg py-4">Nama Mapel</th>
                  <th className="px-lg py-4 w-44 text-center">Jumlah Soal</th>
                  <th className="px-lg py-4 w-44 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-on-surface-variant text-sm">
                      <div className="flex flex-col items-center gap-sm">
                        <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                        <span>Memuat soal...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-on-surface-variant text-sm">
                      <div className="flex flex-col items-center gap-sm">
                        <span className="material-symbols-outlined text-[48px] text-outline">inventory_2</span>
                        <p className="mt-md font-semibold text-slate-500">Belum ada soal.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.slice(0, entriesCount).map((q, idx) => {
                    const cleanPertanyaan = q.pertanyaan.replace(/<[^>]*>/g, "");
                    const isE = !!q.opsi_e;
                    const idCode = `SOAL_${q.nomor_urut}_${q.tipe}_${q.id_soal.slice(0, 4).toUpperCase()}`;

                    return (
                      <tr key={q.id_soal} className="hover:bg-slate-50 transition-colors text-slate-700 text-xs">
                        <td className="px-md py-5 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-5">
                          {q.id_mapel ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs 
                                             font-bold bg-primary/10 text-primary border border-primary/20">
                              {mapelList.find(m => m.id_mapel === q.id_mapel)?.kode_mapel ?? q.id_mapel}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-lg py-5 font-bold text-[#1E3A8A] tracking-wide uppercase font-mono">{idCode}</td>
                        <td className="px-lg py-5">
                          <div className="font-bold text-slate-800 text-sm max-w-lg truncate" title={cleanPertanyaan}>
                            {cleanPertanyaan || "Tanpa Redaksi"}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">
                            Kategori: {q.kategori ?? "—"} • Bobot: {q.bobot}
                          </div>
                        </td>
                        <td className="px-lg py-5 text-center">
                          <div className="font-bold text-[#202E3B] text-xs">PG:{isE ? "5/5" : "4/4"}</div>
                          <div className="inline-flex items-center gap-xxs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase tracking-wider mt-1.5 border border-emerald-200">
                            <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            <span>Sudah Siap</span>
                          </div>
                          <div className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest mt-1 block">AKTIF</div>
                        </td>
                        <td className="px-lg py-5">
                          <div className="flex items-center justify-center gap-xs">
                            {/* Blue Upload/Attachment Button */}
                            <button
                              onClick={() => {
                                if (q.gambar_url) {
                                  window.open(q.gambar_url, "_blank");
                                } else {
                                  alert("Tidak ada lampiran gambar pada soal ini.");
                                }
                              }}
                              className="w-8 h-8 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center justify-center shadow-sm hover:shadow transition-all cursor-pointer"
                              title="Lihat Lampiran Gambar"
                            >
                              <span className="material-symbols-outlined text-[16px]">cloud_download</span>
                            </button>

                            {/* Yellow Edit Button */}
                            <button
                              onClick={() => openEdit(q)}
                              className="w-8 h-8 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-white flex items-center justify-center shadow-sm hover:shadow transition-all cursor-pointer"
                              title="Edit Soal"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>

                            {/* Cyan Preview Button */}
                            <button
                              onClick={() => {
                                alert(`Pratinjau Soal:\n\n${cleanPertanyaan}\n\nOpsi A: ${q.opsi_a}\nOpsi B: ${q.opsi_b}\nOpsi C: ${q.opsi_c}\nOpsi D: ${q.opsi_d}\n${q.opsi_e ? `Opsi E: ${q.opsi_e}\n` : ''}\nKunci: ${(q as Question & { kunci_jawaban?: string }).kunci_jawaban || 'Belum diatur'}`);
                              }}
                              className="w-8 h-8 rounded-lg bg-[#06B6D4] hover:bg-[#0891B2] text-white flex items-center justify-center shadow-sm hover:shadow transition-all cursor-pointer"
                              title="Pratinjau Soal"
                            >
                              <span className="material-symbols-outlined text-[16px]">visibility</span>
                            </button>

                            {/* Red Delete Button */}
                            <button
                              onClick={() => setDeleteConfirmId(q.id_soal)}
                              className="w-8 h-8 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white flex items-center justify-center shadow-sm hover:shadow transition-all cursor-pointer"
                              title="Hapus Soal"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
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
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-outline-variant my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-xl py-lg border-b border-outline-variant">
              <h3 className="font-headline-admin text-on-surface text-lg font-bold uppercase tracking-wide">
                {editingId ? "Edit Soal" : "Properti Soal"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-on-surface-variant hover:text-error transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            <div className="p-xl space-y-xl">
              {/* Mata Pelajaran Dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Mata Pelajaran <span className="text-red-500">*</span>
                </label>
                {mapelList.length === 0 ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs">
                    <span className="material-symbols-outlined text-[16px]">warning</span>
                    Belum ada mata pelajaran.{" "}
                    <Link href={tenantPath("/admin/mata-pelajaran")} className="font-bold underline">
                      Tambah di sini
                    </Link>
                  </div>
                ) : (
                  <select
                    value={form.id_mapel}
                    onChange={(e) => {
                      setForm(p => ({ 
                        ...p, 
                        id_mapel: e.target.value,
                      }));
                    }}
                    className="w-full h-11 border border-slate-200 rounded-xl px-3 text-sm 
                               text-slate-800 bg-white focus:border-primary focus:ring-2 
                               focus:ring-primary/10 outline-none transition-all cursor-pointer"
                  >
                    <option value="">-- Pilih Mata Pelajaran --</option>
                    {mapelList.map(m => (
                      <option key={m.id_mapel} value={m.id_mapel}>
                        {m.kode_mapel} — {m.nama_mapel}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* AI Generate Panel */}
              <div className="border border-purple-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAiPanel(p => !p)}
                  className="w-full flex items-center justify-between px-md py-sm bg-gradient-to-r from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-sm">
                    <span className="text-purple-600 text-base">✨</span>
                    <span className="font-bold text-sm text-purple-800">Generate dengan AI</span>
                    <span className="text-[10px] text-purple-500 font-semibold bg-purple-100 px-2 py-0.5 rounded-full">BETA</span>
                  </div>
                  <span className="material-symbols-outlined text-purple-400 text-sm">
                    {showAiPanel ? "expand_less" : "expand_more"}
                  </span>
                </button>

                {showAiPanel && (
                  <div className="px-md py-md bg-purple-50/40 space-y-sm border-t border-purple-100">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block mb-1">Topik / Materi</label>
                        <input
                          type="text"
                          placeholder="contoh: Fotosintesis, Pecahan, Proklamasi 1945..."
                          value={aiTopic}
                          onChange={e => setAiTopic(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleAiGenerate(); }}
                          className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm text-slate-800 bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-200 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block mb-1">Kelas</label>
                        <select
                          value={aiKelas}
                          onChange={e => setAiKelas(e.target.value)}
                          className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm text-slate-800 bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-200 outline-none cursor-pointer"
                        >
                          {["1","2","3","4","5","6","7","8","9","10","11","12"].map(k => (
                            <option key={k} value={k}>Kelas {k}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block mb-1">
                        Groq API Key{" "}
                        <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="ml-1 text-purple-500 normal-case font-normal hover:underline">
                          (dapatkan gratis di console.groq.com)
                        </a>
                      </label>
                      <input
                        type="password"
                        placeholder="gsk_..."
                        defaultValue={typeof window !== "undefined" ? (localStorage.getItem("groq_api_key") ?? "") : ""}
                        onChange={e => localStorage.setItem("groq_api_key", e.target.value)}
                        className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm text-slate-800 bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-200 outline-none font-mono"
                      />
                    </div>

                    {aiError && (
                      <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-semibold">
                        {aiError}
                      </div>
                    )}

                    <div className="flex items-center gap-sm">
                      <button
                        type="button"
                        onClick={handleAiGenerate}
                        disabled={aiGenerating || !form.id_mapel}
                        className="flex items-center gap-sm px-md py-sm bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {aiGenerating ? (
                          <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span>Sedang generate...</>
                        ) : (
                          <><span className="text-sm">✨</span>Generate Soal</>
                        )}
                      </button>
                      {!form.id_mapel && (
                        <p className="text-[10px] text-amber-600 font-semibold">Pilih mata pelajaran dulu.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Row 1: Jenis, Kategori, Bobot */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-md">
                <div className="lg:col-span-2">
                  <label className="font-label-bold text-xs text-on-surface-variant uppercase tracking-wider block mb-xs">Jenis Soal</label>
                  <select
                    value={form.tipe}
                    onChange={(e) => setForm((p) => ({ ...p, tipe: e.target.value as "SINGLE" | "COMPLEX", kunci_jawaban: "" }))}
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-admin text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer bg-white"
                  >
                    <option value="SINGLE">1. Pilihan Ganda</option>
                    <option value="COMPLEX">2. Pilihan Kompleks</option>
                  </select>
                </div>
                <div className="lg:col-span-1">
                  <label className="font-label-bold text-xs text-on-surface-variant uppercase tracking-wider block mb-xs">Kategori Soal</label>
                  <select
                    value={form.kategori}
                    onChange={(e) => setForm((p) => ({ ...p, kategori: e.target.value }))}
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-admin text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer bg-white"
                  >
                    {KATEGORI_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-label-bold text-xs text-on-surface-variant uppercase tracking-wider block mb-xs">Bobot Soal</label>
                  <input
                    type="number" min={1} max={10}
                    value={form.bobot}
                    onChange={(e) => setForm((p) => ({ ...p, bobot: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-admin text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div>
                  <label className="font-label-bold text-xs text-on-surface-variant uppercase tracking-wider block mb-xs">Tipe Jawaban</label>
                  <div className="px-3 py-2 border border-outline-variant rounded-lg font-body-admin text-on-surface-variant bg-surface-container">
                    {form.tipe === "SINGLE" ? "1 Pilihan" : "Multi Pilihan"}
                  </div>
                </div>
              </div>

              {/* Redaksi Soal */}
              <div>
                <div className="flex items-center gap-sm mb-xs">
                  <div className="w-1 h-5 bg-primary rounded-full"></div>
                  <label className="font-label-bold text-sm text-on-surface uppercase tracking-wider">Redaksi Soal Utama</label>
                </div>
                <RichEditor
                  value={form.pertanyaan}
                  onChange={(v) => setForm((p) => ({ ...p, pertanyaan: v }))}
                />
              </div>

               {/* Gambar (opsional) */}
              <div>
                <label className="font-label-bold text-xs text-on-surface-variant uppercase tracking-wider block mb-sm">Gambar Soal (opsional)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                  {/* Dropzone / Upload Local File */}
                  <div className={`border-2 border-dashed rounded-xl p-md flex flex-col items-center justify-center bg-surface-container-low transition-all relative group text-center ${isUploading ? "border-primary/50 bg-primary/5 cursor-wait" : "hover:border-primary hover:bg-primary/5 border-outline-variant cursor-pointer"}`}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={isUploading}
                      className="absolute inset-0 opacity-0 z-10 disabled:cursor-wait cursor-pointer"
                    />
                    {isUploading ? (
                      <>
                        <span className="material-symbols-outlined text-primary text-[32px] mb-xs animate-spin">sync</span>
                        <p className="font-label-bold text-xs text-primary">Mengupload ke Drive...</p>
                        <p className="font-caption text-[10px] text-on-surface-variant mt-xxs">Mohon tunggu sebentar</p>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-outline group-hover:text-primary text-[32px] mb-xs transition-colors">cloud_upload</span>
                        <p className="font-label-bold text-xs text-on-surface group-hover:text-primary transition-colors">Pilih File Gambar</p>
                        <p className="font-caption text-[10px] text-on-surface-variant mt-xxs">PNG, JPG, WEBP (Maks 2MB)</p>
                      </>
                    )}
                  </div>

                  {/* External URL Input */}
                  <div className="flex flex-col justify-center p-md border border-outline-variant rounded-xl bg-white space-y-xs">
                    <label className="font-label-bold text-[11px] text-on-surface-variant uppercase tracking-wider block">Atau Gunakan URL Gambar</label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={form.gambar_url.startsWith("data:") ? "" : form.gambar_url}
                      onChange={(e) => setForm((p) => ({ ...p, gambar_url: e.target.value }))}
                      className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-admin text-xs text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                    <p className="font-caption text-[10px] text-on-surface-variant">Masukkan link eksternal jika gambar sudah di-host di web.</p>
                  </div>
                </div>

                {/* Preview Card */}
                {form.gambar_url && !isUploading && (
                  <div className="mt-md bg-surface-container-low border border-outline-variant rounded-xl p-sm flex items-center justify-between gap-md max-w-md">
                    <div className="flex items-center gap-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.gambar_url} alt="preview" className="h-16 w-16 rounded-lg object-cover border border-outline-variant bg-white flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-label-bold text-xs text-on-surface flex items-center gap-1">
                          {form.gambar_url.includes("drive.google.com") ? (
                            <><span className="material-symbols-outlined text-[14px] text-green-600">cloud_done</span>Tersimpan di Google Drive</>
                          ) : (
                            <><span className="material-symbols-outlined text-[14px] text-primary">link</span>Gambar Web</>
                          )}
                        </p>
                        <p className="font-caption text-[10px] text-on-surface-variant truncate max-w-[200px]">
                          {form.gambar_url}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, gambar_url: "" }))}
                      className="p-1.5 rounded-full hover:bg-error-container text-outline hover:text-error transition-colors cursor-pointer"
                      title="Hapus Gambar"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                )}

                {/* Wikimedia Image Picker */}
                {showWikiPicker && wikiImages.length > 0 && (
                  <div className="mt-md">
                    <div className="flex items-center justify-between mb-sm">
                      <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-xs">
                        <span className="text-purple-500">✨</span> Gambar dari Wikimedia Commons
                      </p>
                      <button type="button" onClick={() => setShowWikiPicker(false)} className="text-slate-400 hover:text-error cursor-pointer">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                    <div className="flex gap-sm overflow-x-auto pb-sm">
                      {wikiImages.map((img) => (
                        <button
                          key={img.url}
                          type="button"
                          onClick={() => { setForm(p => ({ ...p, gambar_url: img.url })); setShowWikiPicker(false); }}
                          className="flex-shrink-0 group relative rounded-lg overflow-hidden border-2 border-outline-variant hover:border-purple-400 transition-all"
                          title={img.title}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.thumb} alt={img.title} className="h-20 w-28 object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-xs">Klik gambar untuk menggunakannya. Sumber: Wikimedia Commons (lisensi bebas).</p>
                  </div>
                )}
              </div>

              {/* Opsi Jawaban */}
              <div>
                <div className="flex items-center justify-between mb-xs">
                  <label className="font-label-bold text-sm text-on-surface uppercase tracking-wider">
                    Opsi Jawaban
                    <span className="ml-sm text-xs text-on-surface-variant normal-case font-normal">
                      {form.tipe === "SINGLE" ? "— pilih 1 kunci jawaban" : "— pilih beberapa kunci jawaban"}
                    </span>
                  </label>
                </div>
                <div className="space-y-sm">
                  {OPTION_KEYS.map((opt) => {
                    const key = `opsi_${opt}` as keyof QuestionForm;
                    const letter = opt.toUpperCase();
                    const isKey = isKeySelected(letter);
                    const isOptional = opt === "e";
                    return (
                      <div key={opt} className={`flex items-center gap-md rounded-xl border-2 px-md py-sm transition-all ${isKey ? "border-primary bg-primary/5" : "border-outline-variant bg-white"}`}>
                        {/* Key toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleKey(letter)}
                          title={`Jadikan opsi ${letter} sebagai kunci jawaban`}
                          className={`flex-shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold transition-all cursor-pointer ${
                            isKey
                              ? "bg-primary border-primary text-on-primary"
                              : "border-outline-variant text-on-surface-variant hover:border-primary"
                          }`}
                        >
                          {letter}
                        </button>
                        <input
                          type="text"
                          placeholder={`Opsi ${letter}${isOptional ? " (opsional)" : ""}`}
                          value={String(form[key] ?? "")}
                          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                          className="flex-grow bg-transparent border-none focus:ring-0 outline-none font-body-admin text-on-surface placeholder:text-outline"
                        />
                        {isKey && (
                          <span className="material-symbols-outlined text-primary text-[18px] flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {form.kunci_jawaban && (
                  <p className="mt-sm text-xs text-primary font-bold">
                    Kunci Jawaban: {form.kunci_jawaban}
                  </p>
                )}
              </div>

              {/* Error */}
              {saveError && (
                <div className="bg-error-container text-on-error-container px-md py-sm rounded-lg font-label-bold flex items-center gap-sm">
                  <span className="material-symbols-outlined text-error text-[18px]">error</span>{saveError}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-md px-xl py-lg border-t border-outline-variant bg-surface-container-low rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className="px-xl py-sm border border-outline-variant rounded-xl font-label-bold text-on-surface hover:bg-surface-container transition-colors cursor-pointer">
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-xl py-sm bg-primary text-white rounded-xl font-label-bold shadow-sm hover:opacity-90 transition-all cursor-pointer disabled:opacity-60 flex items-center gap-sm"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                {isSaving ? "Menyimpan..." : "Simpan Soal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-lg">
          <div className="bg-white rounded-2xl p-xl max-w-sm w-full shadow-2xl border border-outline-variant">
            <h3 className="font-headline-admin text-on-surface mb-sm">Hapus Soal?</h3>
            <p className="font-body-admin text-on-surface-variant mb-xl">Soal akan dihapus permanen dari bank soal.</p>
            <div className="flex gap-md">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 h-12 border border-outline-variant rounded-xl font-label-bold text-on-surface cursor-pointer">Batal</button>
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
