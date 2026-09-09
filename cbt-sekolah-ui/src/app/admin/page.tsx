"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTenantRouter, useTenantPath } from "@/hooks/useTenantRouter";
import useSWR from "swr";
import { getUsers, getConfig, setExamStatus, resetUserLogin } from "@/lib/api";
import type { User, ExamConfig } from "@/types";

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

  // Admin auth guard
  useEffect(() => {
    if (sessionStorage.getItem("admin_auth") !== "true") {
      router.replace("/admin/login");
    }
  }, [router]);

  const { data: usersRes, mutate: mutateUsers, isLoading: usersLoading } = useSWR(
    "getUsers", getUsers, { refreshInterval: 5000 }
  );
  const { data: configRes, mutate: mutateConfig } = useSWR("getConfig", getConfig, { refreshInterval: 10000 });

  const users: User[] = usersRes?.data ?? [];
  const config: ExamConfig | undefined = configRes?.data;

  // Derive directly from SWR data
  const examName = config?.exam_name ?? "Dashboard Monitoring";
  const examOpen = config?.exam_status !== "CLOSED";

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

  const handleToggleExam = async () => {
    const next = examOpen ? "CLOSED" : "OPEN";
    setIsTogglingStatus(true);
    const res = await setExamStatus(next);
    if (res.success) mutateConfig();
    setIsTogglingStatus(false);
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
            <span className="text-sm">Monitoring Ujian</span>
          </Link>
        </nav>

        {/* Footer Sidebar */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={() => { sessionStorage.removeItem("admin_auth"); router.replace("/admin/login"); }}
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

        {/* Exam Control Banner */}
        <section className="mb-8">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex items-center justify-center shrink-0">
                {examOpen && <div className="absolute w-10 h-10 bg-emerald-500/20 rounded-full animate-ping"></div>}
                <div className={`relative w-5 h-5 rounded-full border-2 border-white shadow-sm ${examOpen ? "bg-emerald-600" : "bg-red-600"}`}></div>
              </div>
              <div className="space-y-0.5">
                <span className={`font-black text-[10px] uppercase tracking-widest block ${examOpen ? "text-emerald-700" : "text-red-600"}`}>
                  {examOpen ? "Status: Aktif Membuka Ujian" : "Status: Ujian Ditutup"}
                </span>
                <h3 className="font-black text-xl text-slate-900">
                  {examOpen ? "Ujian Sedang Berlangsung" : "Siswa Tidak Bisa Mengakses Ujian"}
                </h3>
              </div>
            </div>
            <button
              onClick={handleToggleExam}
              disabled={isTogglingStatus}
              className={`w-full md:w-auto px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-60 hover:scale-105 ${
                examOpen 
                  ? "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20" 
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
              }`}
            >
              <span className="material-symbols-outlined text-base">{examOpen ? "do_not_disturb_on" : "play_arrow"}</span>
              {isTogglingStatus ? "Memproses..." : examOpen ? "Tutup Ujian" : "Buka Akses Ujian"}
            </button>
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
    </div>
  );
}


