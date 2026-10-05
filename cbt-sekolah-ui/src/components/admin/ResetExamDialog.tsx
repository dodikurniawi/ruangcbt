"use client";

import { useState } from "react";
import type { ResetMode } from "@/lib/api";
import type { User } from "@/types";

/**
 * Dua operasi reset, dua tombol, dua kalimat konsekuensi.
 *
 * Sebelumnya satu tombol "Reset" melakukan yang paling merusak dari keduanya
 * tanpa konfirmasi apa pun: guru yang hanya ingin membuka kunci sesi ikut
 * mengosongkan jawaban, skor, dan status ujian berjalan. Yang membuat pilihan
 * "Siapkan Ujian Berikutnya" aman bukan kalimat di dialog ini melainkan servernya
 * (hasil final hidup append-only di sheet Responses, dan jawaban yang belum
 * disubmit diarsipkan ke sana sebelum baris dikosongkan) — kalimat di sini hanya
 * mengatakan apa yang memang terjadi.
 */
export default function ResetExamDialog({
    student,
    busy,
    onCancel,
    onConfirm,
}: {
    student: User;
    busy: boolean;
    onCancel: () => void;
    onConfirm: (mode: ResetMode) => void;
}) {
    const finished = student.status_ujian === "SELESAI" || student.status_ujian === "DISKUALIFIKASI";
    // Siswa yang sudah selesai TIDAK bisa masuk lagi ke ujian yang sama, jadi
    // "buka akses" tidak akan menolongnya — pilihan yang benar untuknya adalah
    // ujian berikutnya. Yang sedang mengerjakan justru sebaliknya.
    const [mode, setMode] = useState<ResetMode>(finished ? "attempt" : "access");

    return (
        <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-900">Reset Ujian Siswa</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {student.nama_lengkap} · {student.kelas} ·{" "}
                        <span className="font-semibold">{student.status_ujian}</span>
                    </p>
                </div>

                <div className="p-4 space-y-3">
                    <label
                        className={`block rounded-xl border p-4 cursor-pointer transition-colors ${
                            mode === "access" ? "border-[#1D4ED8] bg-blue-50/60" : "border-slate-200 hover:bg-slate-50"
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <input
                                type="radio"
                                name="reset-mode"
                                className="mt-1 accent-[#1D4ED8]"
                                checked={mode === "access"}
                                onChange={() => setMode("access")}
                            />
                            <div>
                                <p className="font-bold text-sm text-slate-900">Buka Akses Ujian Ini</p>
                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                    Siswa dapat masuk kembali ke ujian yang <strong>sedang</strong> dikerjakannya.
                                    Jawaban yang sudah tersimpan, sisa waktu, dan skor <strong>tidak dihapus</strong>.
                                </p>
                                <p className="text-[11px] text-slate-500 mt-1.5">
                                    Dipakai saat siswa keluar/terputus, atau tertahan pesan “sudah login di perangkat lain”.
                                </p>
                                {finished ? (
                                    <p className="text-[11px] text-amber-700 mt-1.5 font-semibold">
                                        Siswa ini sudah menyelesaikan ujiannya, jadi pilihan ini tidak akan membuatnya bisa masuk lagi.
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    </label>

                    <label
                        className={`block rounded-xl border p-4 cursor-pointer transition-colors ${
                            mode === "attempt" ? "border-amber-500 bg-amber-50/60" : "border-slate-200 hover:bg-slate-50"
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <input
                                type="radio"
                                name="reset-mode"
                                className="mt-1 accent-amber-600"
                                checked={mode === "attempt"}
                                onChange={() => setMode("attempt")}
                            />
                            <div>
                                <p className="font-bold text-sm text-slate-900">Siapkan Ujian Berikutnya</p>
                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                    Mengosongkan ujian berjalan siswa ini supaya ia dapat memulai ujian mata pelajaran
                                    berikutnya: status, waktu mulai, skor sementara, dan hitungan pelanggaran kembali ke awal.
                                </p>
                                <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 mt-2 leading-relaxed">
                                    Hasil ujian yang sudah selesai tetap tersimpan dan ikut pada Ekspor Hasil. Jawaban yang
                                    belum disubmit disalin lebih dulu ke riwayat, bukan dibuang.
                                </p>
                                <p className="text-[11px] text-amber-700 mt-1.5 font-semibold">
                                    Jangan dipakai pada siswa yang sedang mengerjakan — ujiannya akan dimulai dari awal.
                                </p>
                            </div>
                        </div>
                    </label>
                </div>

                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        disabled={busy}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-40 cursor-pointer"
                    >
                        Batal
                    </button>
                    <button
                        onClick={() => onConfirm(mode)}
                        disabled={busy}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold text-white disabled:opacity-40 cursor-pointer ${
                            mode === "attempt" ? "bg-amber-600 hover:bg-amber-700" : "bg-[#1D4ED8] hover:bg-blue-700"
                        }`}
                    >
                        {busy
                            ? "Memproses..."
                            : mode === "attempt"
                              ? "Siapkan Ujian Berikutnya"
                              : "Buka Akses Ujian Ini"}
                    </button>
                </div>
            </div>
        </div>
    );
}
