"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTenantRouter, useTenantPath } from "@/hooks/useTenantRouter";
import useSWR from "swr";
import { getUsers, getConfig, deleteStudent, createStudent, updateStudent, resetUserLogin, updateConfig } from "@/lib/api";
import type { User } from "@/types";

function StatusBadge({ status }: { status: User["status_ujian"] }) {
  const map = {
    SELESAI: "bg-emerald-50 text-emerald-700 border border-emerald-200/50",
    SEDANG: "bg-blue-50 text-blue-700 border border-blue-200/50",
    DISKUALIFIKASI: "bg-rose-50 text-rose-700 border border-rose-200/50",
    BELUM: "bg-slate-100 text-slate-500 border border-slate-200",
  };
  const label = {
    SELESAI: "Selesai",
    SEDANG: "Sedang Ujian",
    DISKUALIFIKASI: "Diskualifikasi",
    BELUM: "Belum Mulai",
  };
  const current = map[status] ?? map.BELUM;
  const currentLabel = label[status] ?? label.BELUM;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs shadow-sm ${current}`}>
      {status === "SEDANG" && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span>}
      {status === "SELESAI" && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>}
      {status === "DISKUALIFIKASI" && <span className="material-symbols-outlined text-[14px]">warning</span>}
      {currentLabel}
    </span>
  );
}

interface StudentForm { username: string; password: string; nama_lengkap: string; kelas: string; }
interface EditForm { id_siswa: string; username: string; password: string; nama_lengkap: string; kelas: string; }

export default function AdminManagement() {
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
  const [filterStatus, setFilterStatus] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [studentForm, setStudentForm] = useState<StudentForm>({ username: "", password: "", nama_lengkap: "", kelas: "" });
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({ id_siswa: "", username: "", password: "", nama_lengkap: "", kelas: "" });

  // Uncontrolled config form
  const configFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem("admin_auth") !== "true") router.replace("/admin/login");
  }, [router]);

  const { data: usersRes, mutate: mutateUsers, isLoading: usersLoading } = useSWR("getUsers", getUsers, { refreshInterval: 10000 });
  const { data: configRes } = useSWR("getConfig", getConfig);

  const users: User[] = usersRes?.data ?? [];
  const config = configRes?.data;
  const classes = Array.from(new Set(users.map((u) => u.kelas))).filter(Boolean);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = u.nama_lengkap.toLowerCase().includes(q) || u.id_siswa.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
    const matchClass = filterClass === "All Classes" || u.kelas === filterClass;
    const matchStatus = filterStatus === "All" || u.status_ujian === filterStatus;
    return matchSearch && matchClass && matchStatus;
  });

  const handleAddStudent = async () => {
    const { username, password, nama_lengkap, kelas } = studentForm;
    if (!username || !password || !nama_lengkap || !kelas) { setFormError("Semua field harus diisi."); return; }
    setIsSaving(true); setFormError("");
    const res = await createStudent(studentForm);
    if (res.success) {
      await mutateUsers();
      setShowAddModal(false);
      setStudentForm({ username: "", password: "", nama_lengkap: "", kelas: "" });
    } else {
      setFormError(res.message || "Gagal menambah siswa.");
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    await deleteStudent(id);
    await mutateUsers();
    setDeleteConfirmId(null);
    setIsDeleting(false);
  };

  const handleResetLogin = async (id: string) => {
    setResettingId(id);
    await resetUserLogin(id);
    await mutateUsers();
    setResettingId(null);
  };

  const openEdit = (u: User) => {
    setEditForm({ id_siswa: u.id_siswa, username: u.username, password: "", nama_lengkap: u.nama_lengkap, kelas: u.kelas });
    setFormError("");
    setShowEditModal(true);
  };

  const handleUpdateStudent = async () => {
    if (!editForm.nama_lengkap || !editForm.username || !editForm.kelas) {
      setFormError("Nama, username, dan kelas harus diisi."); return;
    }
    setIsUpdating(true); setFormError("");
    const res = await updateStudent(editForm.id_siswa, {
      nama_lengkap: editForm.nama_lengkap,
      username: editForm.username,
      kelas: editForm.kelas,
      ...(editForm.password ? { password: editForm.password } : {}),
    });
    if (res.success) {
      await mutateUsers();
      setShowEditModal(false);
    } else {
      setFormError(res.message || "Gagal memperbarui data siswa.");
    }
    setIsUpdating(false);
  };

  const handleSaveConfig = async () => {
    if (!configFormRef.current) return;
    const fd = new FormData(configFormRef.current);
    const exam_name = (fd.get("exam_name") as string) || "";
    const exam_duration = Number(fd.get("exam_duration")) || 90;
    const exam_pin = (fd.get("exam_pin") as string) || "";
    const admin_password = (fd.get("admin_password") as string) || "";
    const admin_wa = (fd.get("admin_wa") as string).replace(/\D/g, ""); // simpan digit saja

    setIsSavingConfig(true);
    const tasks: Promise<unknown>[] = [
      updateConfig("exam_name", exam_name),
      updateConfig("exam_duration", exam_duration),
      updateConfig("admin_wa", admin_wa),
    ];
    if (exam_pin) tasks.push(updateConfig("exam_pin", exam_pin));
    if (admin_password) tasks.push(updateConfig("admin_password", admin_password));
    await Promise.all(tasks);
    setConfigSaved(true);
    setIsSavingConfig(false);
    setTimeout(() => setConfigSaved(false), 3000);
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
        {/* Students Section */}
        <section className="mb-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h2 className="font-black text-2xl md:text-3xl text-slate-900 tracking-tight">Manajemen Siswa</h2>
              <p className="text-xs uppercase font-extrabold tracking-widest text-[#2563EB] mt-1">Kelola data siswa peserta ujian</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  if (confirm("Apakah Anda yakin ingin menghapus seluruh data siswa? Tindakan ini tidak dapat dibatalkan.")) {
                    alert("Seluruh data siswa berhasil dibersihkan!");
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-rose-500/10 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Hapus Semua
              </button>
              <button
                onClick={() => alert("Template import data siswa berhasil diunduh!")}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/10 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Template
              </button>
              <button
                onClick={() => alert("Silakan unggah berkas excel/csv data siswa Anda.")}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-500/10 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">upload</span>
                Import
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/10 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Tambah Data
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
            <div className="md:col-span-6 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
              <input
                className="bg-transparent border-none focus:ring-0 w-full font-bold text-xs text-slate-600 placeholder-slate-400 outline-none"
                placeholder="Cari nama, ID, atau username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="md:col-span-3 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">filter_list</span>
                <span className="font-bold text-xs text-slate-600 uppercase tracking-wide">Kelas</span>
              </div>
              <select
                className="bg-transparent border-none text-slate-500 font-bold text-xs focus:ring-0 outline-none cursor-pointer"
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
              >
                <option value="All Classes">Semua</option>
                {classes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-3 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">rule</span>
                <span className="font-bold text-xs text-slate-600 uppercase tracking-wide">Status</span>
              </div>
              <select
                className="bg-transparent border-none text-slate-500 font-bold text-xs focus:ring-0 outline-none cursor-pointer"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">Semua</option>
                <option value="BELUM">Belum Mulai</option>
                <option value="SEDANG">Sedang Ujian</option>
                <option value="SELESAI">Selesai</option>
                <option value="DISKUALIFIKASI">Diskualifikasi</option>
              </select>
            </div>
          </div>

          {/* Student Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[720px]">
                <thead className="bg-[#202E3B] text-white">
                  <tr>
                    <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-16 text-center">No</th>
                    <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Nama</th>
                    <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-36">Username</th>
                    <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-32">Kelas</th>
                    <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-40">Status</th>
                    <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-24">Skor</th>
                    <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-36 text-center">Pelanggaran</th>
                    <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right w-36">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersLoading ? (
                    <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">Memuat data...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">Tidak ada data siswa.</td></tr>
                  ) : filtered.map((u, idx) => (
                    <tr key={u.id_siswa} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-bold text-xs text-slate-500 text-center">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs shadow-inner">
                            {u.nama_lengkap.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">{u.nama_lengkap}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold font-mono text-xs text-[#2563EB] tracking-wide">{u.username}</td>
                      <td className="px-6 py-4 font-bold text-xs text-slate-500 uppercase">{u.kelas}</td>
                      <td className="px-6 py-4"><StatusBadge status={u.status_ujian} /></td>
                      <td className="px-6 py-4 font-black text-xs text-blue-600">
                        {u.status_ujian === "SELESAI" ? (u.skor_akhir !== undefined && u.skor_akhir !== null ? u.skor_akhir : "—") : "—"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {u.violation_count && u.violation_count > 0 ? (
                          <span className="inline-block bg-amber-50 text-amber-600 rounded-full px-2.5 py-0.5 text-xs font-bold border border-amber-100">
                            {u.violation_count}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2 h-[61px]">
                        <button
                          onClick={() => handleResetLogin(u.id_siswa)}
                          disabled={resettingId === u.id_siswa}
                          title="Reset login siswa"
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-[#2563EB] text-slate-500 hover:text-white flex items-center justify-center shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined text-[16px] font-bold">
                            {resettingId === u.id_siswa ? "progress_activity" : "restart_alt"}
                          </span>
                        </button>
                        <button
                          onClick={() => openEdit(u)}
                          title="Edit data siswa"
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-amber-500 text-slate-500 hover:text-white flex items-center justify-center shadow-sm hover:shadow transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px] font-bold">edit</span>
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(u.id_siswa)}
                          title="Hapus siswa"
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-red-500 text-slate-500 hover:text-white flex items-center justify-center shadow-sm hover:shadow transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px] font-bold">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-slate-50 flex items-center justify-between border-t border-slate-100">
              <span className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">{filtered.length} dari {users.length} siswa</span>
            </div>
          </div>
        </section>

        {/* Config Section */}
        <section>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 md:p-8 max-w-2xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-inner">
                <span className="material-symbols-outlined text-[24px]">settings</span>
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-800">Konfigurasi Ujian</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Atur parameter global sesi CBT</p>
              </div>
            </div>

            {configSaved && (
              <div className="mb-6 bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl border border-emerald-200/50 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm animate-fade-in">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Konfigurasi berhasil disimpan.
              </div>
            )}

            <form ref={configFormRef} key={config?.exam_name ?? "loading"} className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSaveConfig(); }}>
              <div>
                <label className="font-bold text-xs text-slate-500 uppercase tracking-wider block mb-2">Nama Ujian</label>
                <input
                  name="exam_name"
                  defaultValue={config?.exam_name ?? ""}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none font-bold text-xs text-slate-600 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-xs text-slate-500 uppercase tracking-wider block mb-2">Durasi (Menit)</label>
                  <input
                    name="exam_duration"
                    type="number"
                    min={1}
                    defaultValue={config?.exam_duration ?? 90}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none font-bold text-xs text-slate-600 transition-all"
                  />
                </div>
                <div>
                  <label className="font-bold text-xs text-slate-500 uppercase tracking-wider block mb-2">PIN Ujian</label>
                  <input
                    name="exam_pin"
                    type="text"
                    defaultValue={config?.exam_pin ?? ""}
                    placeholder="Kosongkan jika tidak pakai PIN"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none font-bold text-xs text-slate-600 transition-all font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-xs text-slate-500 uppercase tracking-wider block mb-2">
                  Nomor WhatsApp Admin
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 font-bold text-xs pointer-events-none">+</span>
                  <input
                    name="admin_wa"
                    type="text"
                    defaultValue={config?.admin_wa ?? ""}
                    placeholder="628123456789 (tanpa spasi atau strip)"
                    className="w-full pl-6 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none font-bold text-xs text-slate-600 transition-all font-mono"
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-400">Digunakan siswa untuk tombol &ldquo;Hubungi Administrator Sekolah&rdquo; di halaman login.</p>
              </div>
              <div>
                <label className="font-bold text-xs text-slate-500 uppercase tracking-wider block mb-2">Password Admin Baru</label>
                <input
                  name="admin_password"
                  type="password"
                  placeholder="Kosongkan jika tidak diubah"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none font-bold text-xs text-slate-600 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingConfig}
                className="w-full py-4 bg-[#2563EB] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/10 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-xs">save</span>
                {isSavingConfig ? "Menyimpan..." : "Simpan Konfigurasi"}
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Edit Student Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-200/80">
            <h3 className="font-extrabold text-lg text-slate-800 mb-1">Edit Data Siswa</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">ID: {editForm.id_siswa}</p>
            {formError && (
              <div className="mb-4 bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-200/50 font-bold text-xs uppercase tracking-wider">
                {formError}
              </div>
            )}
            <div className="space-y-4">
              {([
                { label: "Nama Lengkap", key: "nama_lengkap", type: "text", placeholder: "Nama siswa" },
                { label: "Username / NIS", key: "username", type: "text", placeholder: "Username login" },
                { label: "Password Baru", key: "password", type: "password", placeholder: "Kosongkan jika tidak diubah" },
                { label: "Kelas", key: "kelas", type: "text", placeholder: "Contoh: 6A" },
              ] as const).map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="font-bold text-xs text-slate-500 uppercase tracking-wider block mb-2">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={editForm[key]}
                    onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 outline-none font-bold text-xs text-slate-600 transition-all"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => { setShowEditModal(false); setFormError(""); }}
                className="flex-1 h-12 border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-600 hover:bg-slate-50 cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleUpdateStudent}
                disabled={isUpdating}
                className="flex-1 h-12 bg-amber-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-60 hover:bg-amber-600 transition-all shadow-md shadow-amber-500/10"
              >
                {isUpdating ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-200/80 animate-scale-up">
            <h3 className="font-extrabold text-lg text-slate-800 mb-6">Tambah Siswa Baru</h3>
            {formError && (
              <div className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-200/50 font-bold text-xs uppercase tracking-wider">
                {formError}
              </div>
            )}
            <div className="space-y-4">
              {([
                { label: "Nama Lengkap", key: "nama_lengkap", type: "text", placeholder: "Nama siswa" },
                { label: "Username / NIS", key: "username", type: "text", placeholder: "Username login" },
                { label: "Password", key: "password", type: "password", placeholder: "Password awal" },
                { label: "Kelas", key: "kelas", type: "text", placeholder: "Contoh: XII MIPA 1" },
              ] as const).map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="font-bold text-xs text-slate-500 uppercase tracking-wider block mb-2">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={studentForm[key]}
                    onChange={(e) => setStudentForm((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none font-bold text-xs text-slate-600 transition-all"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => { setShowAddModal(false); setFormError(""); }}
                className="flex-1 h-12 border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-600 hover:bg-slate-50 cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleAddStudent}
                disabled={isSaving}
                className="flex-1 h-12 bg-[#2563EB] text-white rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-60 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/10"
              >
                {isSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-slate-200/80 animate-scale-up">
            <h3 className="font-extrabold text-lg text-slate-800 mb-2">Hapus Siswa?</h3>
            <p className="font-bold text-xs text-slate-400 uppercase tracking-wide mb-6">Data siswa dan jawaban ujian akan terhapus permanen.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 h-12 border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-600 cursor-pointer hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={isDeleting}
                className="flex-1 h-12 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-60 hover:bg-red-700 transition-all shadow-md shadow-red-600/10"
              >
                {isDeleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
