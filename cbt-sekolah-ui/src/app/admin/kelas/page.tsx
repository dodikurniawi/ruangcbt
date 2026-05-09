"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTenantRouter, useTenantPath } from "@/hooks/useTenantRouter";
import useSWR from "swr";
import { getKelas, createKelas, updateKelas, deleteKelas, deleteAllKelas } from "@/lib/api";
import type { Kelas } from "@/types";

export default function DataKelasPage() {
  const router = useTenantRouter();
  const tenantPath = useTenantPath();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingKelas, setEditingKelas] = useState<Kelas | null>(null);
  const [form, setForm] = useState({ nama_kelas: "", tingkat: "X" });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Active link helper
  const isLinkActive = (path: string) => {
    if (path === "/admin") {
      return pathname.endsWith("/admin") || pathname.endsWith("/admin/");
    }
    return pathname.includes(path);
  };

  // Auth Guard
  useEffect(() => {
    if (sessionStorage.getItem("admin_auth") !== "true") {
      router.replace("/admin/login");
    }
  }, [router]);

  // SWR for data kelas
  const { data: apiData, mutate, isLoading } = useSWR("getKelas", getKelas);
  const [kelas, setKelas] = useState<Kelas[]>([]);

  // Load initial data from LocalStorage or use defaults on mount
  useEffect(() => {
    const saved = localStorage.getItem("data_kelas");
    if (saved) {
      const parsed = JSON.parse(saved);
      Promise.resolve().then(() => setKelas(parsed));
    } else {
      const initial: Kelas[] = [
        { id_kelas: "K-001", nama_kelas: "X-1", tingkat: "X" },
        { id_kelas: "K-002", nama_kelas: "XI IPA 2", tingkat: "XI" },
        { id_kelas: "K-003", nama_kelas: "XII IPS 3", tingkat: "XII" },
      ];
      localStorage.setItem("data_kelas", JSON.stringify(initial));
      Promise.resolve().then(() => setKelas(initial));
    }
  }, []);

  // Synchronize local state when SWR returns successful remote data
  useEffect(() => {
  if (apiData?.success && apiData?.data) {
    setKelas(apiData.data);
    localStorage.setItem("data_kelas", JSON.stringify(apiData.data));
  }
  }, [apiData]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = kelas.filter((k) => {
    const q = search.toLowerCase();
    return (
      k.nama_kelas.toLowerCase().includes(q) ||
      k.tingkat.toLowerCase().includes(q)
    );
  });

  const handleOpenAdd = () => {
    setEditingKelas(null);
    setForm({ nama_kelas: "", tingkat: "X" });
    setFormError("");
    setShowModal(true);
  };

  const handleOpenEdit = (k: Kelas) => {
    setEditingKelas(k);
    setForm({ nama_kelas: k.nama_kelas, tingkat: k.tingkat });
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nama_kelas.trim() || !form.tingkat.trim()) {
      setFormError("Semua field harus diisi.");
      return;
    }
    setIsSaving(true);
    setFormError("");

    try {
      if (editingKelas) {
        const res = await updateKelas(editingKelas.id_kelas, form);
        if (res && res.success === false) {
          setFormError(res.message || "Gagal memperbarui data kelas.");
          setIsSaving(false);
          return;
        }
        const updated = kelas.map((k) =>
          k.id_kelas === editingKelas.id_kelas ? { ...k, ...form } : k
        );
        localStorage.setItem("data_kelas", JSON.stringify(updated));
        setKelas(updated);
      } else {
        const newId = `K-${Date.now()}`;
        const res = await createKelas(form);
        if (res && res.success === false) {
          setFormError(res.message || "Gagal membuat data kelas.");
          setIsSaving(false);
          return;
        }
        const updated = [...kelas, { id_kelas: newId, ...form }];
        localStorage.setItem("data_kelas", JSON.stringify(updated));
        setKelas(updated);
      }
      mutate();
      setShowModal(false);
    } catch (err) {
      setFormError("Gagal menyimpan data.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await deleteKelas(id);
      if (res && res.success === false) {
        alert(res.message || "Gagal menghapus data kelas.");
        setIsDeleting(false);
        return;
      }
      const updated = kelas.filter((k) => k.id_kelas !== id);
      localStorage.setItem("data_kelas", JSON.stringify(updated));
      setKelas(updated);
      mutate();
      setDeleteConfirmId(null);
    } catch (err) {
      alert("Gagal menghapus data.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleHapusSemua = async () => {
    if (confirm("Apakah Anda yakin ingin menghapus seluruh data kelas? Tindakan ini tidak dapat dibatalkan.")) {
      try {
        await deleteAllKelas();
        localStorage.setItem("data_kelas", JSON.stringify([]));
        setKelas([]);
        mutate();
        showToast("Seluruh data kelas berhasil dihapus!");
      } catch (err) {
        alert("Gagal menghapus seluruh data kelas.");
      }
    }
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
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#2563EB] text-3xl">class</span>
            <div>
              <h1 className="font-bold text-2xl text-slate-800">Data Kelas</h1>
              <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mt-0.5">SISTEM ADMINISTRASI</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {kelas.length > 0 && (
              <button
                onClick={handleHapusSemua}
                className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 h-9 text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Hapus Semua
              </button>
            )}
            <button
              onClick={() => showToast("Segera hadir")}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 h-9 text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Template
            </button>
            <button
              onClick={() => showToast("Segera hadir")}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 h-9 text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">upload</span>
              Import
            </button>
            <button
              onClick={handleOpenAdd}
              className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg px-4 h-9 text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Tambah Data
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full max-w-sm mb-6">
          <span className="material-symbols-outlined text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px]">search</span>
          <input
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs font-bold text-slate-600 placeholder-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 outline-none transition-all bg-white"
            placeholder="Cari kode atau nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-[11px] uppercase tracking-widest text-slate-400 font-bold px-6 py-4 w-16 text-center">No</th>
                  <th className="text-[11px] uppercase tracking-widest text-slate-400 font-bold px-6 py-4 w-48">Tingkat</th>
                  <th className="text-[11px] uppercase tracking-widest text-slate-400 font-bold px-6 py-4">Nama Kelas</th>
                  <th className="text-[11px] uppercase tracking-widest text-slate-400 font-bold px-6 py-4 text-right w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-100 rounded w-8 mx-auto"></div></td>
                      <td className="px-6 py-4"><div className="h-6 bg-slate-100 rounded-full w-24"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-48"></div></td>
                      <td className="px-6 py-4 text-right"><div className="h-8 bg-slate-100 rounded w-16 ml-auto"></div></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <span className="material-symbols-outlined text-6xl text-slate-300 mb-2">inbox</span>
                        <p className="text-slate-400 text-sm font-medium">Belum ada data. Klik Tambah Data untuk mulai.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((k, idx) => (
                    <tr key={k.id_kelas} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-center text-slate-400 text-sm font-bold">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 font-mono tracking-wide">
                          {k.tingkat}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-sm text-slate-700">{k.nama_kelas}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(k)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Edit Kelas"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(k.id_kelas)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Hapus Kelas"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
            <p className="text-xs text-slate-400">
              Ditampilkan: {filtered.length} dari {kelas.length} data
            </p>
          </div>
        </div>
      </main>

      {/* CRUD Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <header className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-[#2563EB] text-2xl">
                {editingKelas ? "edit_note" : "add_box"}
              </span>
              <h2 className="font-bold text-slate-800 text-xl">
                {editingKelas ? "Edit Data Kelas" : "Tambah Data Kelas"}
              </h2>
            </header>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span className="font-semibold">{formError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="font-bold text-slate-700 text-sm mb-1.5 block">Nama Kelas*</label>
                <input
                  type="text"
                  placeholder="Contoh: X-1, XI IPA 2"
                  className="w-full border border-slate-200 rounded-xl px-4 h-11 text-sm text-slate-800 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 outline-none transition-all bg-white font-bold"
                  value={form.nama_kelas}
                  onChange={(e) => setForm({ ...form, nama_kelas: e.target.value })}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 text-sm mb-1.5 block">Tingkat*</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-4 h-11 text-sm text-slate-800 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 outline-none transition-all bg-white font-bold cursor-pointer"
                  value={form.tingkat}
                  onChange={(e) => setForm({ ...form, tingkat: e.target.value })}
                >
                  <option value="X">X</option>
                  <option value="XI">XI</option>
                  <option value="XII">XII</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="border border-slate-200 text-slate-600 px-6 h-10 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#2563EB] hover:bg-blue-700 text-white px-6 h-10 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto shadow-inner">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Hapus Data Kelas</h3>
                <p className="text-slate-500 text-xs font-medium mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus data kelas ini? Tindakan ini akan menghapus data tersebut secara permanen.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="border border-slate-200 text-slate-600 px-4 h-9 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600 text-white px-4 h-9 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? "Hapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold transition-all transform animate-bounce">
          <span className="material-symbols-outlined text-amber-400">info</span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
