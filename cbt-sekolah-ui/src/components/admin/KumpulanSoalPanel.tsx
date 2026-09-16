"use client";

// Bank Soal → Kumpulan Soal. Satu kartu per kumpulan: nama yang guru tentukan
// sendiri, jumlah soal, mata pelajaran, dan satu saklar Aktif/Tidak aktif.
//
// "Tidak aktif" hanya berarti: kumpulan ini tidak ditawarkan saat membuat ujian.
// Soalnya tetap tersimpan dan dapat diaktifkan kembali kapan saja — itulah yang
// dijanjikan ke guru pada setiap dialog di bawah.

import { useState } from "react";
import useSWR from "swr";
import { getQuestionCollections, createQuestionCollection, updateQuestionCollection } from "@/lib/api";
import type { MataPelajaran, QuestionCollection } from "@/types";

interface Props {
  mapelList: MataPelajaran[];
  /** Kumpulan yang sedang dipakai memfilter daftar soal ("" = semua). */
  activeFilter: string;
  onFilter: (id_kumpulan: string) => void;
  onNotice: (message: string) => void;
}

type Pending =
  | { kind: "create" }
  | { kind: "rename"; item: QuestionCollection }
  | { kind: "status"; item: QuestionCollection; next: "AKTIF" | "NONAKTIF" };

export default function KumpulanSoalPanel({ mapelList, activeFilter, onFilter, onNotice }: Props) {
  const { data, mutate, isLoading } = useSWR("getQuestionCollections", getQuestionCollections);
  const list: QuestionCollection[] = data?.data ?? [];

  const [pending, setPending] = useState<Pending | null>(null);
  const [nama, setNama] = useState("");
  const [mapel, setMapel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "AKTIF" | "NONAKTIF">("");

  const term = search.trim().toLowerCase();
  const visible = list.filter((item) => {
    if (statusFilter && item.status !== statusFilter) return false;
    return term === "" || item.nama_kumpulan.toLowerCase().includes(term);
  });
  // Pencarian dan filter baru berguna saat kumpulannya sudah banyak.
  const showTools = list.length > 4;

  const mapelName = (id: string) => mapelList.find((m) => m.id_mapel === id)?.nama_mapel ?? "";

  const openCreate = () => {
    setNama("");
    setMapel("");
    setError("");
    setPending({ kind: "create" });
  };

  const openRename = (item: QuestionCollection) => {
    setNama(item.nama_kumpulan);
    setError("");
    setPending({ kind: "rename", item });
  };

  const close = () => {
    setPending(null);
    setError("");
  };

  const submit = async () => {
    if (!pending) return;
    setBusy(true);
    setError("");
    const res =
      pending.kind === "create"
        ? await createQuestionCollection({ nama_kumpulan: nama.trim(), id_mapel: mapel })
        : pending.kind === "rename"
          ? await updateQuestionCollection(pending.item.id_kumpulan, { nama_kumpulan: nama.trim() })
          : await updateQuestionCollection(pending.item.id_kumpulan, { status: pending.next });
    setBusy(false);
    if (!res.success) {
      setError(res.message || "Perubahan belum tersimpan. Silakan coba lagi.");
      return;
    }
    await mutate();
    close();
    onNotice(res.message || "Perubahan tersimpan.");
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm mb-5 overflow-hidden">
      <div className="p-4 flex flex-col md:flex-row md:items-center gap-3 border-b border-slate-100">
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-sm text-slate-900">Kumpulan Soal</h3>
          <p className="text-[11px] font-medium text-slate-500">
            Simpan soal dalam beberapa kumpulan. Pilih mana yang aktif untuk ujian; yang tidak aktif tetap tersimpan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showTools && (
            <>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kumpulan..."
                className="h-9 px-3 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-600 outline-none shadow-xs"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "" | "AKTIF" | "NONAKTIF")}
                className="h-9 px-3 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-white cursor-pointer outline-none focus:border-blue-600 shadow-xs"
              >
                <option value="">Semua status</option>
                <option value="AKTIF">Aktif</option>
                <option value="NONAKTIF">Tidak aktif</option>
              </select>
            </>
          )}
          {activeFilter !== "" && (
            <button
              onClick={() => onFilter("")}
              className="h-9 px-3 rounded-xl border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-700 font-black text-[11px] cursor-pointer"
            >
              Tampilkan semua soal
            </button>
          )}
          <button
            onClick={openCreate}
            className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] uppercase tracking-wider cursor-pointer"
          >
            Buat Kumpulan
          </button>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <p className="text-xs font-semibold text-slate-400">Memuat kumpulan soal...</p>
        ) : list.length === 0 ? (
          <p className="text-xs font-semibold text-slate-500">
            Belum ada kumpulan soal. Buat kumpulan seperti &ldquo;UH Bab 1&rdquo; supaya soal ujian berikutnya tidak
            tercampur dengan soal hari ini.
          </p>
        ) : visible.length === 0 ? (
          <p className="text-xs font-semibold text-slate-500">Tidak ada kumpulan yang cocok dengan pencarian.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((item) => {
              const aktif = item.status === "AKTIF";
              const dipilih = activeFilter === item.id_kumpulan;
              return (
                <div
                  key={item.id_kumpulan}
                  className={`rounded-2xl border p-4 flex flex-col gap-3 ${
                    dipilih ? "border-blue-400 bg-blue-50/40" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${aktif ? "bg-emerald-500" : "bg-slate-300"}`}
                      aria-hidden
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm text-slate-900 truncate">{item.nama_kumpulan}</h4>
                      <p className="text-[11px] font-bold text-slate-500">
                        {item.jumlah_soal} soal
                        {item.id_mapel && mapelName(item.id_mapel) ? ` • ${mapelName(item.id_mapel)}` : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        aktif ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {aktif ? "Aktif" : "Tidak aktif"}
                    </span>
                  </div>

                  {item.bawaan && (
                    <p className="text-[11px] font-medium text-slate-400">
                      Soal yang dibuat sebelum ada kumpulan soal.
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-auto">
                    <button
                      onClick={() => onFilter(dipilih ? "" : item.id_kumpulan)}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-700 font-black text-[11px] cursor-pointer"
                    >
                      {dipilih ? "Sedang dilihat" : "Lihat Soal"}
                    </button>
                    {!item.bawaan && (
                      <button
                        onClick={() => openRename(item)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-700 font-black text-[11px] cursor-pointer"
                      >
                        Ganti Nama
                      </button>
                    )}
                    <button
                      onClick={() => setPending({ kind: "status", item, next: aktif ? "NONAKTIF" : "AKTIF" })}
                      className={`px-3 py-2 rounded-xl font-black text-[11px] cursor-pointer text-white ${
                        aktif ? "bg-slate-600 hover:bg-slate-700" : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      {aktif ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {pending && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-xl">
            {pending.kind === "status" ? (
              <>
                <h4 className="font-black text-base text-slate-900">
                  {pending.next === "NONAKTIF" ? "Nonaktifkan kumpulan soal?" : "Aktifkan kumpulan soal?"}
                </h4>
                <p className="mt-2 text-xs font-semibold text-slate-600">
                  {pending.next === "NONAKTIF"
                    ? `${pending.item.jumlah_soal} soal tetap tersimpan dan dapat diaktifkan kembali kapan saja.`
                    : `${pending.item.jumlah_soal} soal akan tersedia untuk dipilih saat membuat ujian.`}
                </p>
              </>
            ) : (
              <>
                <h4 className="font-black text-base text-slate-900">
                  {pending.kind === "create" ? "Buat kumpulan soal" : "Ganti nama kumpulan soal"}
                </h4>
                <label htmlFor="nama-kumpulan" className="block mt-3 mb-1.5 font-extrabold text-[10px] text-slate-500 uppercase tracking-widest">
                  Nama kumpulan
                </label>
                <input
                  id="nama-kumpulan"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  maxLength={80}
                  placeholder="Misalnya: UH Bab 1"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-xs text-slate-700"
                />
                {pending.kind === "create" && (
                  <>
                    <label htmlFor="mapel-kumpulan" className="block mt-3 mb-1.5 font-extrabold text-[10px] text-slate-500 uppercase tracking-widest">
                      Mata pelajaran
                    </label>
                    <select
                      id="mapel-kumpulan"
                      value={mapel}
                      onChange={(e) => setMapel(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-xs text-slate-700 bg-white"
                    >
                      <option value="">— Belum ditentukan —</option>
                      {mapelList.map((m) => (
                        <option key={m.id_mapel} value={m.id_mapel}>{m.nama_mapel}</option>
                      ))}
                    </select>
                  </>
                )}
              </>
            )}

            {error && <p className="mt-3 text-xs font-bold text-rose-600">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={close}
                disabled={busy}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-black text-[11px] cursor-pointer disabled:opacity-60"
              >
                Batalkan
              </button>
              <button
                onClick={submit}
                disabled={busy || (pending.kind !== "status" && nama.trim() === "")}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] cursor-pointer disabled:opacity-60"
              >
                {pending.kind === "status"
                  ? pending.next === "NONAKTIF" ? "Nonaktifkan" : "Aktifkan"
                  : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
