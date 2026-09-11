"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTenantRouter, useTenantPath } from "@/hooks/useTenantRouter";
import useSWR from "swr";
import { getUsers, getExamSummary, getMataPelajaran, saveExamConfig, setExamStatus, resetUserLogin, logout } from "@/lib/api";
import type { User, ExamSummary, MataPelajaran } from "@/types";

function StatusBadge({ status }: { status: User["status_ujian"] }) {
  const map = {
    SELESAI: "bg-emerald-50 text-emerald-800 border border-emerald-300/60 font-bold",
    SEDANG: "bg-blue-50 text-blue-800 border border-blue-300/60 font-bold",
    DISKUALIFIKASI: "bg-rose-50 text-rose-800 border border-rose-300/60 font-bold",
    BELUM: "bg-slate-100 text-slate-700 border border-slate-300/60 font-semibold",
  };
  const label = {
    SELESAI: "Selesai",
    SEDANG: "Sedang Ujian",
    DISKUALIFIKASI: "Diskualifikasi",
    BELUM: "Belum Mulai",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs shadow-2xs ${map[status]}`}>
      {status === "SEDANG" && <span className="w-2 h-2 bg-blue-700 rounded-full animate-ping"></span>}
      {status === "SELESAI" && <span className="w-2 h-2 bg-emerald-600 rounded-full"></span>}
      {status === "DISKUALIFIKASI" && <span className="material-symbols-outlined text-[14px]">warning</span>}
      {label[status]}
    </span>
  );
}

export default function AdminDashboard() {
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
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("All Classes");
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  // Draft "Adakan Ujian". null = belum disentuh guru, jadi ikut nilai tersimpan.
  const [draft, setDraft] = useState<{ exam_name: string; exam_mapel: string; exam_duration: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [examError, setExamError] = useState("");
  const [notice, setNotice] = useState("");

  // Admin auth guard
  useEffect(() => {
    if (sessionStorage.getItem("admin_auth") !== "true") {
      router.replace("/admin/login");
    }
  }, [router]);

  const { data: usersRes, mutate: mutateUsers, isLoading: usersLoading } = useSWR(
    "getUsers", getUsers, { refreshInterval: 5000 }
  );
  const { data: summaryRes, mutate: mutateSummary } = useSWR("getExamSummary", getExamSummary, { refreshInterval: 10000 });
  const { data: mapelRes } = useSWR("getMataPelajaran", getMataPelajaran);

  const users: User[] = usersRes?.data ?? [];
  const summary: ExamSummary | undefined = summaryRes?.data;
  const mapelList: MataPelajaran[] = mapelRes?.data ?? [];

  // Derive directly from SWR data
  const examName = summary?.exam_name || "Dashboard Monitoring";
  const examOpen = summary?.exam_status === "OPEN";
  const form = draft ?? {
    exam_name: summary?.exam_name ?? "",
    exam_mapel: summary?.exam_mapel ?? "",
    exam_duration: String(summary?.exam_duration ?? 90),
  };
  const mapelName = (id: string) => mapelList.find((m) => m.id_mapel === id)?.nama_mapel ?? id;
  // Jumlah soal aktif untuk mapel yang sedang dipilih di form, bukan yang tersimpan.
  const draftQuestionCount = form.exam_mapel
    ? (summary?.question_counts?.[form.exam_mapel] ?? 0)
    : 0;
  const durationNumber = Number(form.exam_duration);

  const setField = (field: "exam_name" | "exam_mapel" | "exam_duration", value: string) => {
    setExamError("");
    setDraft({ ...form, [field]: value });
  };

  // Penjaga yang sama juga berlaku di server; ini hanya supaya guru tahu lebih awal.
  const blockingReason = (): string => {
    if (!form.exam_name.trim()) return "Nama ujian wajib diisi.";
    if (!form.exam_mapel) return "Pilih mata pelajaran yang akan diujikan.";
    if (!Number.isInteger(durationNumber) || durationNumber < 1 || durationNumber > 600) {
      return "Durasi ujian harus berupa angka antara 1 dan 600 menit.";
    }
    if (draftQuestionCount === 0) {
      return `Belum ada soal aktif untuk mata pelajaran ${mapelName(form.exam_mapel)}. Tambahkan soal di Bank Soal terlebih dahulu.`;
    }
    return "";
  };

  const handleReviewOpen = () => {
    const reason = blockingReason();
    if (reason) { setExamError(reason); return; }
    setExamError("");
    setShowConfirm(true);
  };

  const handleOpenExam = async () => {
    setIsTogglingStatus(true);
    setExamError("");
    const res = await saveExamConfig({
      exam_name: form.exam_name.trim(),
      exam_mapel: form.exam_mapel,
      exam_duration: durationNumber,
      exam_status: "OPEN",
    });
    if (res.success) {
      setShowConfirm(false);
      setDraft(null);
      setNotice("Ujian berhasil dibuka. Siswa sekarang dapat mulai mengerjakan.");
      await mutateSummary();
    } else {
      setExamError(res.message || "Gagal membuka ujian. Silakan coba lagi.");
    }
    setIsTogglingStatus(false);
  };

  const handleCloseExam = async () => {
    setIsTogglingStatus(true);
    setExamError("");
    const res = await setExamStatus("CLOSED");
    if (res.success) {
      setNotice("Ujian telah ditutup. Siswa baru tidak dapat memulai ujian. Data siswa yang sudah selesai tetap tersimpan.");
      await mutateSummary();
    } else {
      setExamError("Gagal menutup ujian. Silakan coba lagi.");
    }
    setIsTogglingStatus(false);
  };

  const classes = Array.from(new Set(users.map((u) => u.kelas))).filter(Boolean);

  const filtered = users.filter((u) => {
    const matchSearch =
      u.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
      u.id_siswa.toLowerCase().includes(search.toLowerCase());
    const matchClass = filterClass === "All Classes" || u.kelas === filterClass;
    return matchSearch && matchClass;
  });

  const stats = {
    total: users.length,
    sedang: users.filter((u) => u.status_ujian === "SEDANG").length,
    selesai: users.filter((u) => u.status_ujian === "SELESAI").length,
    diskualifikasi: users.filter((u) => u.status_ujian === "DISKUALIFIKASI").length,
  };

  const handleResetLogin = async (id_siswa: string) => {
    setResettingId(id_siswa);
    await resetUserLogin(id_siswa);
    await mutateUsers();
    setResettingId(null);
  };

  return (
    <div className="bg-[#F7F9FC] text-slate-800 font-body-student min-h-screen flex">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#1D4ED8] text-white flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">school</span>
          </div>
          <span className="font-extrabold text-base tracking-wider text-slate-900">CBT <span className="text-[#1D4ED8]">ADMIN</span></span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 text-slate-700 cursor-pointer focus:outline-none">
          <span className="material-symbols-outlined text-2xl">{isSidebarOpen ? "close" : "menu"}</span>
        </button>
      </div>

      {/* Sidebar Panel - #FFFFFF Sidebar on #F7F9FC Content Background */}
      <aside className={`fixed left-0 top-0 h-full w-64 flex flex-col bg-[#FFFFFF] shadow-sm border-r border-slate-200/80 z-50 transform md:transform-none md:translate-x-0 transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 flex justify-between items-center border-b border-slate-100">
          <div>
            <Link href={tenantPath("/")} className="flex items-center gap-2.5 text-slate-900 hover:opacity-95 transition-opacity">
              <div className="w-9 h-9 rounded-xl bg-[#1D4ED8] text-white flex items-center justify-center shadow-md shadow-blue-700/20">
                <span className="material-symbols-outlined text-xl">school</span>
              </div>
              <h1 className="font-black text-lg tracking-wider text-slate-900">CBT <span className="text-[#1D4ED8]">ADMIN</span></h1>
            </Link>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1">Portal Pengawas Ujian</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-500 p-1 cursor-pointer">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-grow px-4 space-y-1 mt-6 overflow-y-auto">
          <Link 
            href={tenantPath("/admin")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              isLinkActive("/admin") && !isLinkActive("/kelas") && !isLinkActive("/mata-pelajaran") && !isLinkActive("/management") && !isLinkActive("/questions") && !isLinkActive("/cetak") && !isLinkActive("/analisis")
                ? "bg-[#1D4ED8] text-white font-bold shadow-md shadow-blue-700/20" 
                : "text-slate-600 hover:text-[#1D4ED8] hover:bg-blue-50/60 font-semibold"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span className="text-sm">Dashboard</span>
          </Link>

          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold px-4 mb-1 mt-5">Master Data</div>
          <Link 
            href={tenantPath("/admin/kelas")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              isLinkActive("/kelas") 
                ? "bg-[#1D4ED8] text-white font-bold shadow-md shadow-blue-700/20" 
                : "text-slate-600 hover:text-[#1D4ED8] hover:bg-blue-50/60 font-semibold"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">class</span>
            <span className="text-sm">Data Kelas</span>
          </Link>
          <Link 
            href={tenantPath("/admin/mata-pelajaran")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              isLinkActive("/mata-pelajaran") 
                ? "bg-[#1D4ED8] text-white font-bold shadow-md shadow-blue-700/20" 
                : "text-slate-600 hover:text-[#1D4ED8] hover:bg-blue-50/60 font-semibold"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">book_2</span>
            <span className="text-sm">Mata Pelajaran</span>
          </Link>

          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold px-4 mb-1 mt-5">Administrasi</div>
          <Link 
            href={tenantPath("/admin/management")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              isLinkActive("/management") 
                ? "bg-[#1D4ED8] text-white font-bold shadow-md shadow-blue-700/20" 
                : "text-slate-600 hover:text-[#1D4ED8] hover:bg-blue-50/60 font-semibold"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">group</span>
            <span className="text-sm">Data Siswa</span>
          </Link>
          <Link 
            href={tenantPath("/admin/questions")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              isLinkActive("/questions") 
                ? "bg-[#1D4ED8] text-white font-bold shadow-md shadow-blue-700/20" 
                : "text-slate-600 hover:text-[#1D4ED8] hover:bg-blue-50/60 font-semibold"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            <span className="text-sm">Bank Soal</span>
          </Link>
           <Link 
            href={tenantPath("/admin/cetak")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              isLinkActive("/cetak") 
                ? "bg-[#1D4ED8] text-white font-bold shadow-md shadow-blue-700/20" 
                : "text-slate-600 hover:text-[#1D4ED8] hover:bg-blue-50/60 font-semibold"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">print</span>
            <span className="text-sm">Cetak</span>
          </Link>
          <Link 
            href={tenantPath("/admin/analisis")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              isLinkActive("/analisis") 
                ? "bg-[#1D4ED8] text-white font-bold shadow-md shadow-blue-700/20" 
                : "text-slate-600 hover:text-[#1D4ED8] hover:bg-blue-50/60 font-semibold"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">analytics</span>
            <span className="text-sm">Analisis Soal</span>
          </Link>

          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold px-4 mb-1 mt-5">Ujian</div>
          <Link 
            href={tenantPath("/admin")} 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              isLinkActive("/admin") && !isLinkActive("/kelas") && !isLinkActive("/mata-pelajaran") && !isLinkActive("/management") && !isLinkActive("/questions") && !isLinkActive("/cetak") && !isLinkActive("/analisis")
                ? "bg-[#1D4ED8] text-white font-bold shadow-md shadow-blue-700/20" 
                : "text-slate-600 hover:text-[#1D4ED8] hover:bg-blue-50/60 font-semibold"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">quiz</span>
            <span className="text-sm">Adakan Ujian &amp; Monitoring</span>
          </Link>
        </nav>

        {/* Footer Sidebar */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={async () => { await logout(); sessionStorage.removeItem("admin_auth"); router.replace("/admin/login"); }}
            className="flex items-center gap-3 text-red-600 hover:text-red-700 hover:bg-red-50 p-2.5 rounded-xl transition-colors cursor-pointer w-full text-left font-bold text-xs uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-red-600 text-[20px]">logout</span>
            <span>Keluar Admin</span>
          </button>
        </div>
      </aside>

      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"></div>}

      {/* Main Content Area (#F7F9FC) */}
      <main className="flex-1 md:ml-64 min-h-screen p-6 md:p-10 w-full transition-all pt-24 md:pt-10">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="font-black text-2xl md:text-3xl text-slate-900 tracking-tight">Dashboard Monitoring Ujian</h2>
            <p className="text-xs uppercase font-black tracking-wider text-[#1D4ED8] mt-1">{examName}</p>
          </div>
          <button onClick={() => mutateUsers()} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-extrabold text-xs uppercase tracking-wider hover:bg-slate-50 transition-all shadow-xs cursor-pointer hover:border-blue-300">
            <span className="material-symbols-outlined text-[18px] text-[#1D4ED8]">refresh</span>
            Refresh Data
          </button>
        </header>

        {/* Adakan Ujian — satu-satunya tempat mengatur & membuka ujian aktif */}
        <section id="adakan-ujian" className="mb-8">
          <div className={`border rounded-3xl shadow-xs transition-all ${
            examOpen ? "bg-white border-emerald-200 shadow-emerald-500/5" : "bg-white border-slate-200/90"
          }`}>
            <div className="p-6 border-b border-slate-100 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 ${
                examOpen ? "bg-gradient-to-br from-emerald-600 to-teal-600" : "bg-gradient-to-br from-[#1D4ED8] to-blue-700"
              }`}>
                <span className="material-symbols-outlined text-2xl">{examOpen ? "lock_open" : "edit_calendar"}</span>
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900">Adakan Ujian</h3>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">
                  Atur ujian, buka untuk siswa, lalu pantau
                </p>
              </div>
            </div>

            {notice && (
              <div className="mx-6 mt-6 bg-emerald-50 text-emerald-800 px-4 py-3 rounded-xl border border-emerald-200 font-bold text-xs flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0">check_circle</span>
                <span className="leading-relaxed">{notice}</span>
                <button onClick={() => setNotice("")} className="ml-auto text-emerald-700 cursor-pointer shrink-0" aria-label="Tutup pesan">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            )}
            {examError && (
              <div className="mx-6 mt-6 bg-red-50 text-red-800 px-4 py-3 rounded-xl border border-red-200 font-bold text-xs flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                <span className="leading-relaxed">{examError}</span>
              </div>
            )}

            {!summary ? (
              <div className="p-6 text-xs font-bold uppercase tracking-wider text-slate-400">Memuat pengaturan ujian...</div>
            ) : examOpen ? (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full font-black text-xs uppercase tracking-wide bg-emerald-600 text-white shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                    Ujian sedang berlangsung
                  </span>
                </div>
                <dl className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    { label: "Nama Ujian", value: summary.exam_name || "—" },
                    { label: "Mata Pelajaran", value: mapelName(summary.exam_mapel) || "—" },
                    { label: "Durasi", value: `${summary.exam_duration} menit` },
                    { label: "Jumlah Soal", value: `${summary.question_count} soal` },
                  ].map((item) => (
                    <div key={item.label}>
                      <dt className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest mb-1">{item.label}</dt>
                      <dd className="font-black text-sm text-slate-900">{item.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-xs font-bold text-slate-500 leading-relaxed">
                  Siswa yang sudah mulai mengerjakan tetap memakai soal dan durasi seperti saat mereka mulai,
                  walaupun Bank Soal atau pengaturan ini diubah setelahnya.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleCloseExam}
                    disabled={isTogglingStatus}
                    className="px-7 py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer disabled:opacity-60 bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
                  >
                    <span className="material-symbols-outlined text-lg">do_not_disturb_on</span>
                    {isTogglingStatus ? "Memproses..." : "Tutup Ujian"}
                  </button>
                  <Link
                    href={tenantPath("/monitoring")}
                    target="_blank"
                    className="px-7 py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-[#1D4ED8] transition-all"
                  >
                    <span className="material-symbols-outlined text-lg">monitoring</span>
                    Buka Live Monitoring
                  </Link>
                </div>
                <p className="text-[11px] font-bold text-slate-400 leading-relaxed">
                  Halaman Live Monitoring dapat dibuka langsung lewat tautannya, tanpa login.
                  Bagikan ke guru lain, kepala sekolah, atau orang tua bila perlu.
                </p>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full font-black text-xs uppercase tracking-wide bg-red-600 text-white shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-white"></span>
                    Ujian belum dibuka
                  </span>
                  <span className="text-xs font-black uppercase px-2.5 py-1 rounded-lg bg-red-100 text-red-800">
                    Siswa belum bisa login
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="lg:col-span-2">
                    <label htmlFor="exam_name" className="font-extrabold text-[10px] text-slate-500 uppercase tracking-widest block mb-2">Nama Ujian</label>
                    <input
                      id="exam_name"
                      value={form.exam_name}
                      onChange={(e) => setField("exam_name", e.target.value)}
                      maxLength={120}
                      placeholder="Contoh: Sumatif Akhir Semester Genap"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 outline-none font-bold text-xs text-slate-700 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="exam_mapel" className="font-extrabold text-[10px] text-slate-500 uppercase tracking-widest block mb-2">Mata Pelajaran</label>
                    <select
                      id="exam_mapel"
                      value={form.exam_mapel}
                      onChange={(e) => setField("exam_mapel", e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 outline-none font-bold text-xs text-slate-700 transition-all bg-white"
                    >
                      <option value="">— Pilih mata pelajaran —</option>
                      {mapelList.map((m) => (
                        <option key={m.id_mapel} value={m.id_mapel}>{m.nama_mapel}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="exam_duration" className="font-extrabold text-[10px] text-slate-500 uppercase tracking-widest block mb-2">Durasi (menit)</label>
                    <input
                      id="exam_duration"
                      type="number"
                      min={1}
                      max={600}
                      value={form.exam_duration}
                      onChange={(e) => setField("exam_duration", e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 outline-none font-bold text-xs text-slate-700 transition-all"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-5 py-4 flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#1D4ED8]">inventory_2</span>
                  <div>
                    <p className="font-black text-sm text-slate-900">
                      {form.exam_mapel ? `${draftQuestionCount} soal` : "Pilih mata pelajaran dulu"}
                    </p>
                    <p className="font-bold text-[11px] text-slate-500">
                      {form.exam_mapel
                        ? `Semua soal aktif ${mapelName(form.exam_mapel)} akan dipakai pada ujian ini.`
                        : "Jumlah soal muncul setelah mata pelajaran dipilih."}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleReviewOpen}
                  disabled={isTogglingStatus}
                  className="w-full lg:w-auto px-7 py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer disabled:opacity-60 bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                >
                  <span className="material-symbols-outlined text-lg">play_circle</span>
                  Buka Ujian
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Stats Grid - Large Readable Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: "Total Siswa", value: stats.total, icon: "groups", sub: "Peserta Terdaftar", border: "border-l-4 border-[#1D4ED8]", color: "bg-blue-50 text-[#1D4ED8] border border-blue-200/60" },
            { label: "Sedang Ujian", value: stats.sedang, icon: "play_circle", sub: `${stats.total ? Math.round((stats.sedang / stats.total) * 100) : 0}% Progres Ujian`, border: "border-l-4 border-amber-500", color: "bg-amber-50 text-amber-600 border border-amber-200/60" },
            { label: "Selesai", value: stats.selesai, icon: "check_circle", sub: "Sudah Mengumpulkan", border: "border-l-4 border-emerald-500", color: "bg-emerald-50 text-emerald-600 border border-emerald-200/60" },
            { label: "Diskualifikasi", value: stats.diskualifikasi, icon: "report", sub: "Melanggar Aturan", border: "border-l-4 border-red-600", color: "bg-red-50 text-red-600 border border-red-200/60", valueColor: "text-red-600" },
          ].map((s) => (
            <div key={s.label} className={`bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs hover:-translate-y-1 transition-all duration-300 ${s.border}`}>
              <div className="flex justify-between items-start mb-3">
                <p className="font-extrabold text-xs text-slate-500 uppercase tracking-wider">{s.label}</p>
                <div className={`p-2.5 rounded-2xl ${s.color}`}>
                  <span className="material-symbols-outlined text-[24px]">{s.icon}</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2.5 mt-1">
                <h4 className={`font-black text-4xl text-slate-900 tracking-tight ${s.valueColor ?? ""}`}>
                  {usersLoading ? "—" : s.value}
                </h4>
                <span className="font-bold text-[11px] text-slate-500 uppercase tracking-wide">{s.sub}</span>
              </div>
            </div>
          ))}
        </section>

        {/* Live Student Table */}
        <section className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h3 className="font-black text-lg text-slate-900">Live Student Monitoring</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Pemantauan Aktivitas Real-time Siswa</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                <input
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8] outline-none transition-all"
                  placeholder="Cari nama siswa..."
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {/* Filter */}
              <select
                className="w-full sm:w-auto px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 focus:ring-2 focus:ring-[#1D4ED8]/20 outline-none transition-all"
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
              >
                <option value="All Classes">Semua Kelas</option>
                {classes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-100/90 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-black text-xs uppercase tracking-wider w-16">No</th>
                  <th className="px-6 py-4 font-black text-xs uppercase tracking-wider">Nama Siswa</th>
                  <th className="px-6 py-4 font-black text-xs uppercase tracking-wider w-32">Kelas</th>
                  <th className="px-6 py-4 font-black text-xs uppercase tracking-wider w-40">Status</th>
                  <th className="px-6 py-4 font-black text-xs uppercase tracking-wider w-32">Skor</th>
                  <th className="px-6 py-4 font-black text-xs uppercase tracking-wider w-40">Pelanggaran</th>
                  <th className="px-6 py-4 font-black text-xs uppercase tracking-wider text-right w-36">Aksi Reset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersLoading ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">Memuat data siswa...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">Tidak ada data siswa.</td></tr>
                ) : (
                  filtered.map((u, idx) => (
                    <tr key={u.id_siswa} className={`hover:bg-blue-50/40 transition-colors ${u.status_ujian === "DISKUALIFIKASI" ? "bg-red-50/40" : ""}`}>
                      <td className="px-6 py-4 font-bold text-xs text-slate-500">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1D4ED8] flex items-center justify-center font-black text-xs shadow-2xs">
                            {u.nama_lengkap.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wide">{u.nama_lengkap}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-xs text-slate-600 uppercase">{u.kelas}</td>
                      <td className="px-6 py-4"><StatusBadge status={u.status_ujian} /></td>
                      <td className="px-6 py-4 font-black text-sm text-[#1D4ED8]">
                        {u.skor_akhir != null ? `${u.skor_akhir}` : "—"}
                      </td>
                      <td className={`px-6 py-4 font-bold text-xs ${(u.violation_count ?? 0) > 0 ? "text-red-600 font-black" : "text-slate-400"}`}>
                        {(u.violation_count ?? 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full font-black text-xs">
                            <span className="material-symbols-outlined text-[14px]">warning</span>
                            {u.violation_count}x
                          </span>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleResetLogin(u.id_siswa)}
                          disabled={resettingId === u.id_siswa}
                          title="Reset status & sesi login siswa"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#1D4ED8] text-slate-700 hover:text-white font-extrabold text-xs transition-all cursor-pointer disabled:opacity-40 shadow-2xs"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {resettingId === u.id_siswa ? "progress_activity" : "restart_alt"}
                          </span>
                          <span>Reset</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
            <p className="font-bold text-[11px] text-slate-500 uppercase tracking-wider">
              Menampilkan {filtered.length} dari {users.length} siswa terdaftar
            </p>
          </div>
        </section>
      </main>

      {/* Konfirmasi sebelum ujian benar-benar dibuka */}
      {showConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-200/80">
            <h3 className="font-black text-lg text-slate-900 mb-1">Buka Ujian?</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Periksa dulu sebelum siswa masuk</p>

            <dl className="space-y-4 mb-6">
              {[
                { label: "Nama", value: form.exam_name.trim() },
                { label: "Mapel", value: mapelName(form.exam_mapel) },
                { label: "Durasi", value: `${durationNumber} menit` },
                { label: "Jumlah soal", value: `${draftQuestionCount} soal` },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">{item.label}</dt>
                  <dd className="font-black text-sm text-slate-900 mt-0.5">{item.value}</dd>
                </div>
              ))}
            </dl>

            <p className="text-xs font-bold text-slate-500 leading-relaxed bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 mb-6">
              Setelah siswa mulai mengerjakan, soal dan durasi yang mereka dapatkan tidak berubah,
              walaupun Bank Soal atau pengaturan ujian diubah setelahnya.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isTogglingStatus}
                className="flex-1 py-3.5 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-xs uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-60"
              >
                Batal
              </button>
              <button
                onClick={handleOpenExam}
                disabled={isTogglingStatus}
                className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-60"
              >
                {isTogglingStatus ? "Memproses..." : "Buka Ujian"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
