"use client";

import { useMemo, useRef, useState } from "react";
import { extractDocxBlocks, docxErrorMessage } from "@/lib/docx";
import {
  OPTION_KEYS,
  isReady,
  parseQuestions,
  statusReasons,
  type ParsedQuestion,
} from "@/lib/wordImport";
import { importQuestions } from "@/lib/api";
import type { MataPelajaran } from "@/types";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

interface Props {
  mapelList: MataPelajaran[];
  /** Nomor urut terakhir yang sudah dipakai pada mapel tujuan. */
  lastNomorFor: (id_mapel: string) => number;
  onClose: () => void;
  onImported: (message: string) => void;
}

type Field = "pertanyaan" | "opsi_a" | "opsi_b" | "opsi_c" | "opsi_d" | "opsi_e";

const OPTION_FIELDS: { key: string; field: Field }[] = OPTION_KEYS.map((key) => ({
  key,
  field: `opsi_${key.toLowerCase()}` as Field,
}));

export default function ImportWordModal({ mapelList, lastNomorFor, onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [mapelId, setMapelId] = useState("");
  const [rows, setRows] = useState<ParsedQuestion[] | null>(null);
  const [detectedMapel, setDetectedMapel] = useState("");
  const [skipped, setSkipped] = useState(0);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const readyRows = useMemo(() => (rows ?? []).filter(isReady), [rows]);
  const pendingCount = (rows?.length ?? 0) - readyRows.length;

  const handleFile = async (file: File | undefined) => {
    setError("");
    setRows(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setError("Format file tidak didukung. Gunakan file Word (.docx).");
      return;
    }
    if (file.size === 0) {
      setError("File Word kosong. Pilih file yang berisi soal.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Ukuran file terlalu besar. Maksimal 10 MB.");
      return;
    }

    setFileName(file.name);
    setIsBusy(true);
    try {
      const parsed = parseQuestions(await extractDocxBlocks(await file.arrayBuffer()));
      if (parsed.questions.length === 0) {
        setError(
          "Tidak ada soal pilihan ganda yang terbaca dari dokumen ini. " +
          "Pastikan setiap soal bernomor dan punya pilihan A sampai E."
        );
      }
      setRows(parsed.questions);
      setDetectedMapel(parsed.detectedMapel);
      setSkipped(parsed.skippedBlocks);
    } catch (err) {
      setError(docxErrorMessage(err));
    } finally {
      setIsBusy(false);
    }
  };

  const updateRow = (index: number, patch: Partial<ParsedQuestion>) => {
    setRows((current) => {
      if (!current) return current;
      const next = [...current];
      const row = { ...next[index], ...patch };
      // Perbaikan guru menghapus keluhan struktur yang sudah tidak berlaku lagi:
      // isian kosong dinilai ulang dari isi terbaru, bukan dari hasil parsing awal.
      row.issues = row.issues.filter((issue) => !/Opsi .* tidak ditemukan|Pertanyaan tidak terbaca|Urutan opsi/.test(issue));
      const empty = OPTION_FIELDS.filter((option) => !row[option.field].trim()).map((option) => option.key);
      if (empty.length > 0) row.issues.push(`Opsi ${empty.join(", ")} tidak ditemukan`);
      if (!row.pertanyaan.trim()) row.issues.push("Pertanyaan tidak terbaca");
      next[index] = row;
      return next;
    });
  };

  const handleImport = async () => {
    if (!mapelId || readyRows.length === 0) return;
    setIsBusy(true);
    setError("");
    // Penomoran dilanjutkan dari soal yang sudah ada di mapel tujuan supaya tidak
    // bertabrakan dengan nomor soal yang sudah dipakai.
    const start = lastNomorFor(mapelId);
    const payload = readyRows.map((row, index) => ({
      nomor_urut: start + index + 1,
      tipe: "SINGLE" as const,
      pertanyaan: row.pertanyaan.trim(),
      gambar_url: "",
      opsi_a: row.opsi_a.trim(),
      opsi_b: row.opsi_b.trim(),
      opsi_c: row.opsi_c.trim(),
      opsi_d: row.opsi_d.trim(),
      opsi_e: row.opsi_e.trim(),
      kunci_jawaban: row.kunci_jawaban,
      bobot: 1,
      kategori: "",
      id_mapel: mapelId,
    }));

    const res = await importQuestions(payload);
    setIsBusy(false);
    if (!res.success) {
      setError(res.message || "Gagal mengimport soal. Silakan coba lagi.");
      return;
    }
    const added = res.data?.added ?? 0;
    const rejected = res.data?.rejected?.length ?? 0;
    onImported(
      `${added} soal berhasil ditambahkan ke Bank Soal.` +
      (pendingCount > 0 ? ` ${pendingCount} soal tidak diimport karena perlu diperiksa.` : "") +
      (rejected > 0 ? ` ${rejected} soal ditolak server karena isinya belum lengkap.` : "")
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-start justify-center p-4 md:p-8 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200/80 my-4">
        <div className="p-6 border-b border-slate-100 flex items-center gap-4 sticky top-0 bg-white rounded-t-3xl z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
            <span className="material-symbols-outlined text-2xl">description</span>
          </div>
          <div className="flex-1">
            <h3 className="font-black text-lg text-slate-900">Import Soal dari Word</h3>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">
              Soal pilihan ganda A–E
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 cursor-pointer" aria-label="Tutup">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-800 px-4 py-3 rounded-xl border border-red-200 font-bold text-xs flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-extrabold text-[10px] text-slate-500 uppercase tracking-widest block mb-2">
                File Word (.docx)
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".docx"
                onChange={(e) => handleFile(e.target.files?.[0])}
                className="w-full text-xs font-bold text-slate-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-700 file:font-bold file:text-xs file:cursor-pointer cursor-pointer"
              />
              {fileName && <p className="mt-1.5 text-[11px] font-bold text-slate-500 truncate">{fileName}</p>}
            </div>
            <div>
              <label htmlFor="import-mapel" className="font-extrabold text-[10px] text-slate-500 uppercase tracking-widest block mb-2">
                Masukkan ke Mata Pelajaran
              </label>
              <select
                id="import-mapel"
                value={mapelId}
                onChange={(e) => setMapelId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none font-bold text-xs text-slate-700 bg-white"
              >
                <option value="">— Pilih mata pelajaran —</option>
                {mapelList.map((m) => (
                  <option key={m.id_mapel} value={m.id_mapel}>{m.nama_mapel}</option>
                ))}
              </select>
              {detectedMapel && (
                <p className="mt-1.5 text-[11px] font-bold text-slate-400">
                  Tertulis di dokumen: {detectedMapel}. Mapel tujuan tetap mengikuti pilihan di atas.
                </p>
              )}
            </div>
          </div>

          {isBusy && !rows && (
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Membaca dokumen...</p>
          )}

          {rows && rows.length > 0 && (
            <>
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-5 py-4 flex flex-wrap gap-x-6 gap-y-2">
                <span className="font-black text-sm text-slate-900">{rows.length} soal ditemukan</span>
                <span className="font-bold text-xs text-emerald-700">{readyRows.length} siap diimport</span>
                {pendingCount > 0 && (
                  <span className="font-bold text-xs text-amber-700">{pendingCount} perlu dicek</span>
                )}
                {skipped > 0 && (
                  <span className="font-bold text-xs text-slate-400">
                    {skipped} bagian dilewati (bukan soal pilihan ganda)
                  </span>
                )}
              </div>

              <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
                {rows.map((row, index) => {
                  const reasons = statusReasons(row);
                  const ready = reasons.length === 0;
                  return (
                    <div
                      key={index}
                      className={`rounded-2xl border p-4 ${ready ? "border-slate-200 bg-white" : "border-amber-300 bg-amber-50/50"}`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <span className="font-black text-xs text-slate-500">Soal nomor {row.nomor_urut}</span>
                        <span className={`font-black text-[11px] px-2.5 py-1 rounded-full ${
                          ready ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                        }`}>
                          {ready ? "Siap" : "Perlu dicek"}
                        </span>
                      </div>

                      {!ready && (
                        <ul className="mb-3 space-y-1">
                          {reasons.map((reason) => (
                            <li key={reason} className="text-[11px] font-bold text-amber-900 flex items-start gap-1.5">
                              <span className="material-symbols-outlined text-[14px] shrink-0">warning</span>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      )}

                      <textarea
                        value={row.pertanyaan}
                        onChange={(e) => updateRow(index, { pertanyaan: e.target.value })}
                        rows={3}
                        aria-label={`Pertanyaan soal nomor ${row.nomor_urut}`}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-xs text-slate-700 font-medium mb-2"
                      />
                      <div className="space-y-1.5">
                        {OPTION_FIELDS.map((option) => (
                          <div key={option.key} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateRow(index, { kunci_jawaban: option.key })}
                              title={`Tandai ${option.key} sebagai kunci jawaban`}
                              className={`w-8 h-8 shrink-0 rounded-lg font-black text-xs cursor-pointer transition-all ${
                                row.kunci_jawaban === option.key
                                  ? "bg-emerald-600 text-white shadow-sm"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              {option.key}
                            </button>
                            <input
                              value={row[option.field]}
                              onChange={(e) => updateRow(index, { [option.field]: e.target.value })}
                              aria-label={`Opsi ${option.key} soal nomor ${row.nomor_urut}`}
                              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs text-slate-700 font-medium"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] font-bold text-slate-400">
                        Kunci jawaban: {row.kunci_jawaban || "belum dipilih — klik huruf di sebelah kiri"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-white rounded-b-3xl">
          <button
            onClick={onClose}
            disabled={isBusy}
            className="flex-1 py-3.5 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-xs uppercase tracking-wider hover:bg-slate-50 cursor-pointer disabled:opacity-60"
          >
            Batal
          </button>
          <button
            onClick={handleImport}
            disabled={isBusy || !mapelId || readyRows.length === 0}
            className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBusy ? "Memproses..." : `Import ${readyRows.length} Soal`}
          </button>
        </div>
      </div>
    </div>
  );
}
