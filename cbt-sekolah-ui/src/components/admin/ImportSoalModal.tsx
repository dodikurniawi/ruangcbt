"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { extractDocxBlocks, docxErrorMessage, extractDocxImages } from "@/lib/docx";
import {
  OPTION_KEYS,
  buildImportPayload,
  isSingleOptionIssue,
  isReady,
  parseQuestions,
  resolveImages,
  statusReasons,
  validateSingleOptions,
  type ParsedQuestion,
} from "@/lib/wordImport";
import { downloadSoalTemplate, parseExcelQuestions } from "@/lib/excelImport";
import {
  buildGoogleImportPayload,
  isGoogleQuestionReady,
  markGoogleImageFailed,
  type GoogleFormListItem,
  type GoogleFormPreview,
  type GooglePreviewQuestion,
} from "@/lib/googleForms";
import { importQuestions, uploadImage, getQuestionCollections, createQuestionCollection } from "@/lib/api";
import type { MataPelajaran, QuestionCollection } from "@/types";
import useSWR from "swr";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

type Source = "word" | "excel" | "google";

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

interface GoogleApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

function parseStructuredKey(raw: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(raw);
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

const WORD_GUIDE = (
  <>
    <section>
      <h4 className="font-black text-xs text-slate-900 mb-1.5">Langkah 1 — Siapkan dokumen Word</h4>
      <ul className="text-[11px] font-medium text-slate-600 space-y-1 list-disc list-outside ml-4">
        <li>Setiap soal diberi nomor.</li>
        <li>Minimal pilihan A, B, C. Pilihan D dan E boleh dikosongkan.</li>
        <li>Gambar boleh berada di dalam dokumen — sistem akan mengambilnya.</li>
        <li>Untuk kunci jawaban, tebalkan pilihan yang benar. Sistem membaca pilihan tebal itu sebagai kunci.</li>
      </ul>
      <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-medium text-slate-700 leading-relaxed">
        <p>1. Ibu kota Indonesia adalah ...</p>
        <p>A. Bandung</p>
        <p><b>B. Jakarta</b></p>
        <p>C. Surabaya</p>
        <p>D. Medan</p>
        <p className="mt-1 text-emerald-700 font-bold">Kunci terbaca: B</p>
      </div>
    </section>
    <section>
      <h4 className="font-black text-xs text-slate-900 mb-1.5">Langkah 2 — Unggah lalu periksa</h4>
      <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
        Setelah unggah, periksa hasilnya di layar. Soal yang kunci atau gambarnya belum
        terbaca ditandai — lengkapi langsung dari pratinjau, tanpa mengubah dokumen
        Word. Baru klik <b>Import</b>.
      </p>
      <p className="text-[11px] font-medium text-slate-400 mt-1.5">
        Dokumen → soal → pilihan → gambar → kunci → pratinjau → Import
      </p>
    </section>
  </>
);

const EXCEL_GUIDE = (
  <>
    <section>
      <h4 className="font-black text-xs text-slate-900 mb-1.5">Langkah 1 — Download template Excel RuangCBT</h4>
      <p className="text-[11px] font-medium text-slate-600">Tombol download ada di bawah. Setiap kolom sudah diberi nama.</p>
    </section>
    <section>
      <h4 className="font-black text-xs text-slate-900 mb-1.5">Langkah 2 — Isi soal pada kolom yang tersedia</h4>
      <div className="overflow-x-auto">
        <table className="mt-1.5 w-full text-left text-[10px] border-collapse bg-slate-50 border border-slate-200 rounded-lg">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              {["No", "Soal", "A", "B", "C", "D", "E", "Jawaban", "Bobot"].map((h) => (
                <th key={h} className="px-2 py-1.5 font-black text-slate-600 border-r border-slate-200 last:border-r-0 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-2 py-1.5 border-r border-slate-200">1</td>
              <td className="px-2 py-1.5 border-r border-slate-200 min-w-[200px]">Ibu kota Indonesia adalah ...</td>
              <td className="px-2 py-1.5 border-r border-slate-200">Bandung</td>
              <td className="px-2 py-1.5 border-r border-slate-200">Jakarta</td>
              <td className="px-2 py-1.5 border-r border-slate-200">Surabaya</td>
              <td className="px-2 py-1.5 border-r border-slate-200">Medan</td>
              <td className="px-2 py-1.5 border-r border-slate-200">Makassar</td>
              <td className="px-2 py-1.5 border-r border-slate-200 font-black text-emerald-700">B</td>
              <td className="px-2 py-1.5">1</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[11px] font-medium text-slate-400 mt-1.5">Cukup isi kolomnya — tidak perlu menyiapkan format lain.</p>
    </section>
    <section>
      <h4 className="font-black text-xs text-slate-900 mb-1.5">Langkah 3 — Simpan file</h4>
      <p className="text-[11px] font-medium text-slate-600">Simpan sebagai .xlsx (format Excel biasa).</p>
    </section>
    <section>
      <h4 className="font-black text-xs text-slate-900 mb-1.5">Langkah 4 sampai 6 — Unggah, periksa, Import</h4>
      <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
        Unggah file, periksa hasilnya di pratinjau, lengkapi bagian yang belum
        ditemukan, lalu klik <b>Import</b>.
      </p>
    </section>
  </>
);

export default function ImportSoalModal({ mapelList, lastNomorFor, onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"hub" | Source>("hub");
  const [source, setSource] = useState<Source>("word");
  const [guideOpen, setGuideOpen] = useState<Source | null>(null);
  const [fileName, setFileName] = useState("");
  const [mapelId, setMapelId] = useState("");
  // Kumpulan tujuan: pilih yang sudah ada, atau ketik nama baru. Kosong = soal
  // masuk Bank Soal tanpa kumpulan (perilaku sebelum fitur kumpulan ada).
  const [kumpulanId, setKumpulanId] = useState("");
  const [kumpulanBaru, setKumpulanBaru] = useState("");
  const [rows, setRows] = useState<ParsedQuestion[] | null>(null);
  const [detectedMapel, setDetectedMapel] = useState("");
  const [skipped, setSkipped] = useState(0);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const googleListRequest = useRef<Promise<void> | null>(null);
  const [googleConfigured, setGoogleConfigured] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleForms, setGoogleForms] = useState<GoogleFormListItem[]>([]);
  const [googleNextPageToken, setGoogleNextPageToken] = useState("");
  const [googleSearch, setGoogleSearch] = useState("");
  const [selectedGoogleForm, setSelectedGoogleForm] = useState("");
  const [googlePreview, setGooglePreview] = useState<GoogleFormPreview | null>(null);

  const { data: collectionRes, mutate: mutateCollections } = useSWR("getQuestionCollections", getQuestionCollections);
  const collectionList: QuestionCollection[] = collectionRes?.data ?? [];

  const readyRows = useMemo(() => (rows ?? []).filter(isReady), [rows]);
  const pendingCount = (rows?.length ?? 0) - readyRows.length;
  const keyedCount = (rows ?? []).filter((row) => (OPTION_KEYS as readonly string[]).includes(row.kunci_jawaban)).length;
  const imageCount = (rows ?? []).filter((row) => row.image).length;
  const brokenImageCount = (rows ?? []).filter((row) => row.imageBroken).length;
  const visibleRows = showPendingOnly ? (rows ?? []).filter((row) => !isReady(row)) : (rows ?? []);
  const googleReadyRows = useMemo(
    () => (googlePreview?.questions ?? []).filter(isGoogleQuestionReady),
    [googlePreview],
  );
  const googlePendingCount = (googlePreview?.questions.length ?? 0) - googleReadyRows.length;
  const visibleGoogleForms = googleForms.filter((form) =>
    form.name.toLowerCase().includes(googleSearch.trim().toLowerCase()),
  );

  const openSource = (next: Source) => {
    setError("");
    setRows(null);
    setFileName("");
    setSkipped(0);
    setDetectedMapel("");
    setShowPendingOnly(false);
    setSource(next);
    setStage(next);
    if (next === "google") void loadGoogleStatus();
  };

  async function googleRequest<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, { ...options, cache: "no-store" });
    const result = await response.json() as GoogleApiResponse<T>;
    if (!response.ok || !result.success || result.data === undefined) {
      throw new Error(result.message || "Google Form tidak dapat diproses.");
    }
    return result.data;
  }

  async function loadGoogleStatus() {
    setIsBusy(true);
    setError("");
    try {
      const status = await googleRequest<{ configured: boolean; connected: boolean }>("/api/google-forms/status");
      setGoogleConfigured(status.configured);
      setGoogleConnected(status.connected);
      if (status.connected) await loadGoogleForms(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google Form tidak dapat diproses.");
    } finally {
      setIsBusy(false);
    }
  }

  async function loadGoogleForms(append: boolean, pageToken = "") {
    if (googleListRequest.current) return googleListRequest.current;
    const task = (async () => {
      setIsBusy(true);
      setError("");
      try {
        const query = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : "";
        const data = await googleRequest<{ forms: GoogleFormListItem[]; nextPageToken: string }>(
          `/api/google-forms/forms${query}`,
        );
        setGoogleForms((current) => append ? [...current, ...data.forms] : data.forms);
        setGoogleNextPageToken(data.nextPageToken);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Tidak ditemukan Google Form yang bisa diimport.");
      } finally {
        setIsBusy(false);
      }
    })();
    googleListRequest.current = task;
    try {
      await task;
    } finally {
      googleListRequest.current = null;
    }
  }

  function connectGoogle() {
    setError("");
    const popup = window.open(
      "/api/google-forms/oauth/start",
      "ruangcbt-google-forms",
      "popup=yes,width=560,height=720,resizable=yes,scrollbars=yes",
    );
    if (!popup) setError("Browser memblokir jendela Google. Izinkan pop-up, lalu coba lagi.");
  }

  async function disconnectGoogle() {
    setIsBusy(true);
    setError("");
    try {
      const response = await fetch("/api/google-forms/disconnect", { method: "POST" });
      const result = await response.json() as GoogleApiResponse<unknown>;
      if (!response.ok || !result.success) throw new Error(result.message || "Akun Google belum berhasil dilepas.");
      setGoogleConnected(false);
      setGoogleForms([]);
      setGooglePreview(null);
      setSelectedGoogleForm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Akun Google belum berhasil dilepas.");
    } finally {
      setIsBusy(false);
    }
  }

  async function loadGooglePreview() {
    if (!selectedGoogleForm) return;
    setIsBusy(true);
    setError("");
    try {
      setGooglePreview(await googleRequest<GoogleFormPreview>(
        `/api/google-forms/forms/${encodeURIComponent(selectedGoogleForm)}`,
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Form ini tidak dapat dibaca oleh RuangCBT.");
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    const receiveGoogleOAuth = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        !event.data ||
        event.data.type !== "ruangcbt-google-forms"
      ) return;
      if (!event.data.success) {
        setError(typeof event.data.message === "string" ? event.data.message : "Google belum memberikan izin untuk membaca Form.");
        return;
      }
      setGoogleConnected(true);
      void loadGoogleForms(false);
    };
    window.addEventListener("message", receiveGoogleOAuth);
    return () => window.removeEventListener("message", receiveGoogleOAuth);
    // Listener hanya dipasang sekali; request list memakai ref dan state setter fungsional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = async (file: File | undefined, kind: Source) => {
    setError("");
    setRows(null);
    if (!file) return;
    const isExcel = kind === "excel";
    const okExt = isExcel ? /\.xlsx$/i : /\.docx$/i;
    const label = isExcel ? "Excel (.xlsx)" : "Word (.docx)";
    if (!okExt.test(file.name)) {
      setError(`Format file tidak didukung. Gunakan file ${label}.`);
      return;
    }
    if (file.size === 0) {
      setError(`File kosong. Pilih file yang berisi soal.`);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Ukuran file terlalu besar. Maksimal 10 MB.");
      return;
    }

    setFileName(file.name);
    setIsBusy(true);
    try {
      const buffer = await file.arrayBuffer();
      if (isExcel) {
        const parsed = parseExcelQuestions(buffer);
        if (parsed.questions.length === 0) {
          setError("Tidak ada soal yang terbaca dari file ini. Periksa apakah kolom sudah terisi.");
        }
        setRows(parsed.questions);
        setSkipped(parsed.skippedBlocks);
      } else {
        const blocks = await extractDocxBlocks(buffer);
        const parsed = parseQuestions(blocks);
        if (parsed.questions.length === 0) {
          setError(
            "Tidak ada soal pilihan ganda yang terbaca dari dokumen ini. " +
            "Pastikan setiap soal bernomor dan punya minimal pilihan A sampai C."
          );
        }
        const relIds = new Set(parsed.questions.map((q) => q.imageRelId).filter(Boolean) as string[]);
        resolveImages(parsed.questions, await extractDocxImages(buffer, relIds));
        setRows(parsed.questions);
        setDetectedMapel(parsed.detectedMapel);
        setSkipped(parsed.skippedBlocks);
      }
    } catch (err) {
      if (kind === "excel") {
        setError(err instanceof Error ? err.message : "Gagal membaca file Excel. Coba simpan ulang lalu unggah lagi.");
      } else {
        setError(docxErrorMessage(err));
      }
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
      row.issues = row.issues.filter((issue) => !isSingleOptionIssue(issue) && !/Pertanyaan tidak terbaca/.test(issue));
      row.issues.push(...validateSingleOptions(row));
      if (!row.pertanyaan.trim()) row.issues.push("Pertanyaan tidak terbaca");
      next[index] = row;
      return next;
    });
  };

  const updateGoogleQuestion = (index: number, patch: Partial<GooglePreviewQuestion>) => {
    setGooglePreview((current) => {
      if (!current) return current;
      const questions = [...current.questions];
      const question = { ...questions[index], ...patch };
      if (question.tipe === "SINGLE") {
        question.issues = question.issues.filter((issue) => !isSingleOptionIssue(issue) && !(
          /Pertanyaan tidak terbaca|Kunci jawaban belum tersedia|Kunci jawaban tidak cocok|Kunci jawaban tidak dapat dipetakan/.test(issue)
        ));
        if (!question.pertanyaan.trim()) question.issues.push("Pertanyaan tidak terbaca.");
        question.issues.push(...validateSingleOptions(question));
        if (!(OPTION_KEYS as readonly string[]).includes(question.kunci_jawaban)) {
          question.issues.push("Kunci jawaban belum tersedia. Soal akan ditandai PERLU DICEK.");
        }
      }
      questions[index] = question;
      return { ...current, questions };
    });
  };

  /**
   * Kumpulan tujuan untuk batch ini. Nama baru dibuat lebih dulu supaya guru tidak
   * perlu keluar dari layar import hanya untuk membuat wadahnya.
   * Mengembalikan undefined bila guru memang tidak memilih kumpulan.
   */
  const resolveTargetCollection = async (): Promise<string | undefined | null> => {
    const nama = kumpulanBaru.trim();
    if (kumpulanId !== "__baru__") return kumpulanId || undefined;
    if (nama === "") {
      setError("Tulis nama kumpulan soal baru, atau pilih kumpulan yang sudah ada.");
      return null;
    }
    const created = await createQuestionCollection({ nama_kumpulan: nama, id_mapel: mapelId });
    if (!created.success || !created.data?.id_kumpulan) {
      setError(created.message || "Kumpulan soal baru belum dapat dibuat. Silakan coba lagi.");
      return null;
    }
    await mutateCollections();
    return created.data.id_kumpulan;
  };

  const handleImport = async () => {
    if (!mapelId || readyRows.length === 0) return;
    setIsBusy(true);
    setError("");
    const target = await resolveTargetCollection();
    if (target === null) {
      setIsBusy(false);
      return;
    }
    // Penomoran dilanjutkan dari soal yang sudah ada di mapel tujuan supaya tidak
    // bertabrakan dengan nomor soal yang sudah dipakai.
    const { payload, blockedByImages } = await buildImportPayload(
      readyRows,
      lastNomorFor(mapelId),
      mapelId,
      uploadImage,
    );
    if (payload.length === 0) {
      setIsBusy(false);
      setError(
        blockedByImages > 0
          ? "Gambar pada soal tidak berhasil dibaca/terunggah, jadi belum ada soal siap diimport."
          : "Tidak ada soal yang siap diimport. Periksa kembali soal yang ditandai."
      );
      return;
    }
    const res = await importQuestions(payload, target);
    setIsBusy(false);
    if (!res.success) {
      setError(res.message || "Gagal mengimport soal. Silakan coba lagi.");
      return;
    }
    const added = res.data?.added ?? 0;
    const rejected = res.data?.rejected?.length ?? 0;
    onImported(
      `${added} soal berhasil ditambahkan ke Bank Soal.` +
      (blockedByImages > 0 ? ` ${blockedByImages} soal dilewati karena gambarnya tidak berhasil diambil.` : "") +
      (pendingCount > 0 ? ` ${pendingCount} soal tidak diimport karena perlu diperiksa.` : "") +
      (rejected > 0 ? ` ${rejected} soal ditolak server karena isinya belum lengkap.` : "")
    );
  };

  const handleGoogleImport = async () => {
    if (!mapelId || googleReadyRows.length === 0) return;
    setIsBusy(true);
    setError("");
    const googleTarget = await resolveTargetCollection();
    if (googleTarget === null) {
      setIsBusy(false);
      return;
    }
    try {
      const { payload, blockedByImages } = await buildGoogleImportPayload(
        googleReadyRows,
        lastNomorFor(mapelId),
        mapelId,
        async (url, sourceId) => {
          try {
            const response = await fetch(url);
            if (!response.ok) return null;
            const blob = await response.blob();
            if (!blob.type.startsWith("image/") || blob.size === 0 || blob.size > 2 * 1024 * 1024) return null;
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(blob);
            });
            const uploaded = await uploadImage(
              dataUrl.split(",", 2)[1] ?? "",
              blob.type,
              `google-form-${sourceId}`,
            );
            return uploaded.success && uploaded.data?.url ? uploaded.data.url : null;
          } catch {
            return null;
          }
        },
      );
      if (payload.length === 0) {
        setError(
          blockedByImages > 0
            ? "Gambar pada soal tidak berhasil diambil, jadi belum ada soal siap diimport."
            : "Tidak ada soal yang siap diimport. Periksa kembali soal yang ditandai.",
        );
        return;
      }
      const result = await importQuestions(payload as Parameters<typeof importQuestions>[0], googleTarget);
      if (!result.success) {
        setError(result.message || "Gagal mengimport soal. Silakan coba lagi.");
        return;
      }
      const added = result.data?.added ?? 0;
      const rejected = result.data?.rejected?.length ?? 0;
      onImported(
        `${added} soal berhasil ditambahkan ke Bank Soal.` +
        (blockedByImages > 0 ? ` ${blockedByImages} soal dilewati karena gambarnya tidak berhasil diambil.` : "") +
        (googlePendingCount > 0 ? ` ${googlePendingCount} soal tidak diimport karena perlu diperiksa.` : "") +
        (rejected > 0 ? ` ${rejected} soal ditolak server karena isinya belum lengkap.` : ""),
      );
    } catch {
      setError("Google Form tidak dapat diimport. Silakan coba lagi.");
    } finally {
      setIsBusy(false);
    }
  };

  const renderGuide = (kind: Source, onStart?: () => void) => (
    <>
      {kind === "word" && (
        <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 space-y-4">
          {WORD_GUIDE}
          <button
            onClick={onStart}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
          >
            Import dari Word
          </button>
        </div>
      )}
      {kind === "excel" && (
        <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 space-y-4">
          {EXCEL_GUIDE}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => downloadSoalTemplate()}
              className="flex-1 py-3 rounded-xl border-2 border-blue-600 text-blue-700 hover:bg-blue-50 font-black text-xs uppercase tracking-wider cursor-pointer"
            >
              Download Template Excel
            </button>
            {onStart && (
              <button
                onClick={onStart}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Import dari Excel
              </button>
            )}
          </div>
          <p className="text-[11px] font-medium text-slate-400">
            Kolom gambar memang tidak disediakan — unggah gambar satu per satu lewat menu Bank Soal setelah import.
          </p>
        </div>
      )}
      {kind === "google" && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-[11px] font-medium text-slate-600 space-y-2">
          <h4 className="font-black text-xs text-slate-900">Cara Import Google Form</h4>
          <ol className="list-decimal list-outside ml-4 space-y-1">
            <li>Klik Hubungkan Akun Google.</li>
            <li>Login dengan akun Google yang berisi Form Anda.</li>
            <li>Izinkan RuangCBT membaca Form yang diperlukan.</li>
            <li>Pilih Form yang ingin diimport.</li>
            <li>Periksa pratinjau dan soal bertanda Perlu Dicek.</li>
            <li>Pilih mata pelajaran, lalu klik Import.</li>
          </ol>
          <p className="font-bold text-blue-800">RuangCBT tidak membuat atau mengubah Google Form Anda.</p>
          {onStart && (
            <button
              onClick={onStart}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
            >
              Import dari Google Form
            </button>
          )}
        </div>
      )}
    </>
  );

  const renderMapelSelect = () => (
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
      {source === "word" && detectedMapel && (
        <p className="mt-1.5 text-[11px] font-bold text-slate-400">
          Tertulis di dokumen: {detectedMapel}. Mapel tujuan tetap mengikuti pilihan di atas.
        </p>
      )}

      <label htmlFor="import-kumpulan" className="font-extrabold text-[10px] text-slate-500 uppercase tracking-widest block mt-4 mb-2">
        Masukkan ke Kumpulan Soal
      </label>
      <select
        id="import-kumpulan"
        value={kumpulanId}
        onChange={(e) => setKumpulanId(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none font-bold text-xs text-slate-700 bg-white"
      >
        <option value="">— Tanpa kumpulan —</option>
        {collectionList
          .filter((c) => !c.bawaan && (!c.id_mapel || !mapelId || c.id_mapel === mapelId))
          .map((c) => (
            <option key={c.id_kumpulan} value={c.id_kumpulan}>
              {c.nama_kumpulan}{c.status === "NONAKTIF" ? " (tidak aktif)" : ""}
            </option>
          ))}
        <option value="__baru__">+ Buat kumpulan baru</option>
      </select>
      {kumpulanId === "__baru__" && (
        <input
          value={kumpulanBaru}
          onChange={(e) => setKumpulanBaru(e.target.value)}
          maxLength={80}
          placeholder="Nama kumpulan baru, misalnya: UH Bab 2"
          className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-xs text-slate-700"
        />
      )}
      <p className="mt-1.5 text-[11px] font-medium text-slate-400">
        Soal yang sudah ada di kumpulan lain tidak akan tertimpa.
      </p>
    </div>
  );

  const renderSourceCard = (kind: Source, icon: string, title: string, subtitle: string) => {
    const guideKey = kind;
    const isOpen = guideOpen === guideKey;
    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="p-4 flex items-center gap-4">
          <div className="text-3xl shrink-0">{icon}</div>
          <div className="flex-1 min-w-0">
            <h4 className="font-black text-sm text-slate-900">{title}</h4>
            <p className="text-[11px] font-medium text-slate-500">{subtitle}</p>
          </div>
          <button
            onClick={() => setGuideOpen(isOpen ? null : guideKey)}
            className="shrink-0 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-700 font-black text-[11px] cursor-pointer"
          >
            Pelajari Cara Import
          </button>
          <button
            onClick={() => openSource(kind)}
            className="shrink-0 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] cursor-pointer"
          >
            Mulai Import
          </button>
        </div>
        {isOpen && <div className="px-4 pb-4">{renderGuide(kind, () => openSource(kind))}</div>}
      </div>
    );
  };

  const renderPreview = () => (
    <>
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-5 py-4 flex flex-wrap gap-x-6 gap-y-2">
        <span className="font-black text-sm text-slate-900">{rows!.length} soal ditemukan</span>
        <span className="font-bold text-xs text-blue-700">
          <span className="material-symbols-outlined text-[14px] align-sub">check_circle</span> {keyedCount} kunci ditemukan
        </span>
        {imageCount > 0 && (
          <span className="font-bold text-xs text-emerald-700">
            <span className="material-symbols-outlined text-[14px] align-sub">image</span> {imageCount} gambar ditemukan
          </span>
        )}
        {brokenImageCount > 0 && (
          <span className="font-bold text-xs text-amber-700">
            <span className="material-symbols-outlined text-[14px] align-sub">warning</span> {brokenImageCount} gambar perlu diperiksa
          </span>
        )}
        <span className={`font-bold text-xs ${pendingCount > 0 ? "text-amber-700" : "text-emerald-700"}`}>
          {pendingCount > 0 ? `${pendingCount} perlu diperiksa` : "Semua siap diimport"}
        </span>
        {skipped > 0 && (
          <span className="font-bold text-xs text-slate-400">
            {skipped} bagian dilewati (bukan soal pilihan ganda)
          </span>
        )}
      </div>

      {pendingCount > 0 && (
        <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={showPendingOnly}
            onChange={(e) => setShowPendingOnly(e.target.checked)}
            className="rounded text-blue-600 cursor-pointer"
          />
          Hanya tampilkan yang perlu diperiksa ({pendingCount})
        </label>
      )}

      <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
        {visibleRows.map((row) => {
          // Index asli di rows — kunci perbaikan harus menyentuh soal yang benar
          // walau filter "perlu diperiksa" sedang aktif.
          const realIndex = rows!.indexOf(row);
          const reasons = statusReasons(row);
          const ready = reasons.length === 0;
          return (
            <div
              key={realIndex}
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

              {row.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.image.dataUrl}
                  alt={`Gambar soal nomor ${row.nomor_urut}`}
                  className="mb-3 max-h-40 rounded-xl border border-slate-200 bg-white object-contain"
                />
              )}

              <textarea
                value={row.pertanyaan}
                onChange={(e) => updateRow(realIndex, { pertanyaan: e.target.value })}
                rows={3}
                aria-label={`Pertanyaan soal nomor ${row.nomor_urut}`}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-xs text-slate-700 font-medium mb-2"
              />
              <div className="space-y-1.5">
                {OPTION_FIELDS.map((option) => (
                  <div key={option.key} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateRow(realIndex, { kunci_jawaban: option.key })}
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
                      onChange={(e) => updateRow(realIndex, { [option.field]: e.target.value })}
                      aria-label={`Opsi ${option.key} soal nomor ${row.nomor_urut}`}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs text-slate-700 font-medium"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] font-bold text-slate-400">
                Kunci jawaban: {row.kunci_jawaban || "belum ditemukan — klik huruf di sebelah kiri"}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );

  const renderGooglePreview = () => {
    const shown = showPendingOnly
      ? googlePreview!.questions.filter((question) => !isGoogleQuestionReady(question))
      : googlePreview!.questions;
    return (
      <>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Google Form</p>
          <h4 className="font-black text-base text-slate-900">{googlePreview!.title}</h4>
          {googlePreview!.description && <p className="text-xs font-medium text-slate-600">{googlePreview!.description}</p>}
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-bold">
            <span>{googlePreview!.questions.length} soal ditemukan</span>
            <span className="text-emerald-700">{googleReadyRows.length} siap diimport</span>
            <span className={googlePendingCount ? "text-amber-700" : "text-slate-400"}>
              {googlePendingCount} perlu dicek
            </span>
            {googlePreview!.skippedItems > 0 && (
              <span className="text-slate-400">{googlePreview!.skippedItems} bagian bukan soal dilewati</span>
            )}
          </div>
        </div>

        {renderMapelSelect()}

        {googlePendingCount > 0 && (
          <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={showPendingOnly}
              onChange={(event) => setShowPendingOnly(event.target.checked)}
              className="rounded text-blue-600 cursor-pointer"
            />
            Hanya tampilkan yang perlu diperiksa ({googlePendingCount})
          </label>
        )}

        <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
          {shown.map((question) => {
            const realIndex = googlePreview!.questions.indexOf(question);
            const ready = isGoogleQuestionReady(question);
            const key = parseStructuredKey(question.kunci_jawaban);
            const statements = question.tipe === "TRUE_FALSE" && Array.isArray(question.data_soal?.pernyataan)
              ? question.data_soal.pernyataan as { id: string; teks: string }[]
              : [];
            const acceptedAnswers = question.tipe === "FILL_IN" && Array.isArray(key.accepted_answers)
              ? key.accepted_answers.filter((value): value is string => typeof value === "string")
              : [];
            return (
              <div
                key={`${question.sourceId}-${realIndex}`}
                className={`rounded-2xl border p-4 ${ready ? "border-slate-200 bg-white" : "border-amber-300 bg-amber-50/50"}`}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="font-black text-xs text-slate-500">Soal nomor {question.nomor_urut}</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">
                      {question.tipe ?? "Tidak didukung"}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${ready ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                      {ready ? "Siap" : "Perlu dicek"}
                    </span>
                  </div>
                </div>

                {!ready && (
                  <ul className="mb-3 space-y-1">
                    {question.issues.map((issue) => (
                      <li key={issue} className="flex items-start gap-1.5 text-[11px] font-bold text-amber-900">
                        <span className="material-symbols-outlined text-[14px] shrink-0">warning</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                )}

                {question.imageUrl && !question.issues.includes("Gambar tidak berhasil diambil.") && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={question.imageUrl}
                    alt={question.imageAlt || `Gambar soal nomor ${question.nomor_urut}`}
                    onError={() => updateGoogleQuestion(realIndex, markGoogleImageFailed(question))}
                    className="mb-3 max-h-48 rounded-xl border border-slate-200 bg-white object-contain"
                  />
                )}

                {question.tipe ? (
                  <textarea
                    value={question.pertanyaan}
                    onChange={(event) => updateGoogleQuestion(realIndex, { pertanyaan: event.target.value })}
                    rows={3}
                    aria-label={`Pertanyaan soal nomor ${question.nomor_urut}`}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-xs text-slate-700 font-medium mb-2"
                  />
                ) : (
                  <p className="text-sm font-semibold text-slate-800">{question.pertanyaan || "Soal tanpa judul"}</p>
                )}

                {question.tipe === "SINGLE" && (
                  <div className="space-y-1.5">
                    {OPTION_FIELDS.map((option) => (
                      <div key={option.key} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateGoogleQuestion(realIndex, { kunci_jawaban: option.key })}
                          title={`Tandai ${option.key} sebagai kunci jawaban`}
                          className={`w-8 h-8 shrink-0 rounded-lg font-black text-xs cursor-pointer ${
                            question.kunci_jawaban === option.key
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {option.key}
                        </button>
                        <input
                          value={question[option.field]}
                          onChange={(event) => updateGoogleQuestion(realIndex, { [option.field]: event.target.value })}
                          aria-label={`Opsi ${option.key} soal nomor ${question.nomor_urut}`}
                          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs text-slate-700 font-medium"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {question.tipe === "TRUE_FALSE" && (
                  <div className="space-y-1.5">
                    {statements.map((statement) => (
                      <div key={statement.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                        <span>{statement.teks}</span>
                        <span className="font-black text-blue-700">{String(key[statement.id] ?? "-")}</span>
                      </div>
                    ))}
                  </div>
                )}

                {question.tipe === "FILL_IN" && (
                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs space-y-1">
                    <p className="font-bold text-slate-500">Jawaban yang diterima:</p>
                    <p className="font-black text-slate-800">{acceptedAnswers.length ? acceptedAnswers.join(" / ") : "Belum tersedia"}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-start justify-center p-4 md:p-8 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200/80 my-4">
        <div className="p-6 border-b border-slate-100 flex items-center gap-4 sticky top-0 bg-white rounded-t-3xl z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
            <span className="material-symbols-outlined text-2xl">upload_file</span>
          </div>
          <div className="flex-1">
            <h3 className="font-black text-lg text-slate-900">
              {stage === "hub" ? "Import Soal" : `Import Soal dari ${source === "word" ? "Word" : source === "excel" ? "Excel" : "Google Form"}`}
            </h3>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">
              {stage === "hub"
                ? "Pilih sumber soal Anda"
                : stage === "google"
                  ? "Periksa sebelum masuk Bank Soal"
                  : "Soal pilihan ganda minimal A–C"}
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

          {stage === "hub" && (
            <>
              <p className="text-xs font-medium text-slate-500">
                Guru cukup memilih sumber, ikuti panduan singkat, lalu periksa hasilnya sebelum masuk ke Bank Soal.
              </p>
              <div className="space-y-3">
                {renderSourceCard("word", "📄", "Word", "Soal dari Microsoft Word")}
                {renderSourceCard("excel", "📊", "Excel", "Soal dari Excel")}
                {renderSourceCard("google", "📝", "Google Form", "Ambil soal dari Google Form")}
              </div>
            </>
          )}

          {stage !== "hub" && (
            <button
              onClick={() => setStage("hub")}
              className="text-[11px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-wider cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">arrow_back</span> Pilih sumber lain
            </button>
          )}

          {stage === "google" && (
            <>
              <details open className="group">
                <summary className="font-black text-[11px] text-blue-700 cursor-pointer list-none flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] group-open:rotate-90 transition-transform">chevron_right</span>
                  Cara Import Google Form
                </summary>
                <div className="mt-2">{renderGuide("google")}</div>
              </details>

              {!googleConfigured ? (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-xs font-bold text-amber-900">
                  Integrasi Google Form belum dikonfigurasi admin sistem.
                </div>
              ) : !googleConnected ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                  <h4 className="font-black text-sm text-slate-900">Hubungkan Akun Google</h4>
                  <p className="text-xs font-medium text-slate-600">
                    Gunakan akun Google yang berisi Form Anda. RuangCBT hanya membaca Form untuk proses import ini.
                  </p>
                  <button
                    onClick={connectGoogle}
                    disabled={isBusy}
                    className="w-full rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    Hubungkan Akun Google
                  </button>
                </div>
              ) : !googlePreview ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-black text-sm text-slate-900">Google Form Anda</h4>
                      <p className="text-[11px] font-medium text-slate-500">Pilih satu Form untuk dibaca.</p>
                    </div>
                    <button
                      onClick={() => void disconnectGoogle()}
                      disabled={isBusy}
                      className="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-red-600 cursor-pointer"
                    >
                      Lepas akun
                    </button>
                  </div>
                  <input
                    value={googleSearch}
                    onChange={(event) => setGoogleSearch(event.target.value)}
                    placeholder="Cari Form..."
                    aria-label="Cari Google Form"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-semibold outline-none focus:border-blue-500"
                  />
                  {isBusy && googleForms.length === 0 ? (
                    <p className="text-xs font-bold text-slate-500">Memuat Google Form...</p>
                  ) : visibleGoogleForms.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 p-4 text-xs font-bold text-slate-500">
                      Belum ada Google Form yang bisa diimport.
                    </p>
                  ) : (
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                      {visibleGoogleForms.map((form) => (
                        <label key={form.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:border-blue-400">
                          <input
                            type="radio"
                            name="google-form"
                            value={form.id}
                            checked={selectedGoogleForm === form.id}
                            onChange={() => setSelectedGoogleForm(form.id)}
                            className="mt-0.5"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-black text-slate-800">{form.name}</span>
                            {form.modifiedTime && (
                              <span className="text-[10px] font-medium text-slate-400">
                                Diubah {new Date(form.modifiedTime).toLocaleDateString("id-ID")}
                              </span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  {googleNextPageToken && (
                    <button
                      onClick={() => void loadGoogleForms(true, googleNextPageToken)}
                      disabled={isBusy}
                      className="w-full rounded-xl border border-blue-200 px-4 py-2.5 text-xs font-black text-blue-700 hover:bg-blue-50 disabled:opacity-50 cursor-pointer"
                    >
                      Muat Form lainnya
                    </button>
                  )}
                  <button
                    onClick={() => void loadGooglePreview()}
                    disabled={isBusy || !selectedGoogleForm}
                    className="w-full rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isBusy ? "Memuat Form..." : "Pilih Form"}
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => { setGooglePreview(null); setShowPendingOnly(false); }}
                    className="text-[11px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-wider cursor-pointer"
                  >
                    Pilih Google Form lain
                  </button>
                  {renderGooglePreview()}
                </>
              )}
            </>
          )}

          {stage === "word" && (
            <>
              <details open className="group">
                <summary className="font-black text-[11px] text-blue-700 cursor-pointer list-none flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] group-open:rotate-90 transition-transform">chevron_right</span>
                  Cara Import dari Word (langkah singkat)
                </summary>
                <div className="mt-2">{renderGuide("word")}</div>
              </details>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-extrabold text-[10px] text-slate-500 uppercase tracking-widest block mb-2">
                    File Word (.docx)
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".docx"
                    onChange={(e) => handleFile(e.target.files?.[0], "word")}
                    className="w-full text-xs font-bold text-slate-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-700 file:font-bold file:text-xs file:cursor-pointer cursor-pointer"
                  />
                  {fileName && <p className="mt-1.5 text-[11px] font-bold text-slate-500 truncate">{fileName}</p>}
                </div>
                {renderMapelSelect()}
              </div>
            </>
          )}

          {stage === "excel" && (
            <>
              <details open className="group">
                <summary className="font-black text-[11px] text-blue-700 cursor-pointer list-none flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] group-open:rotate-90 transition-transform">chevron_right</span>
                  Cara Import dari Excel (langkah singkat)
                </summary>
                <div className="mt-2">{renderGuide("excel")}</div>
              </details>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-extrabold text-[10px] text-slate-500 uppercase tracking-widest block mb-2">
                    File Excel (.xlsx)
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => handleFile(e.target.files?.[0], "excel")}
                    className="w-full text-xs font-bold text-slate-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-700 file:font-bold file:text-xs file:cursor-pointer cursor-pointer"
                  />
                  {fileName && <p className="mt-1.5 text-[11px] font-bold text-slate-500 truncate">{fileName}</p>}
                </div>
                {renderMapelSelect()}
              </div>
              <button
                onClick={() => downloadSoalTemplate()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-blue-600 text-blue-700 hover:bg-blue-50 font-black text-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">download</span>
                Download Template Excel
              </button>
            </>
          )}

          {isBusy && !rows && stage !== "google" && (
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Membaca file...</p>
          )}

          {rows && rows.length > 0 && renderPreview()}
        </div>

        <div className="p-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-white rounded-b-3xl">
          <button
            onClick={onClose}
            disabled={isBusy}
            className="flex-1 py-3.5 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-xs uppercase tracking-wider hover:bg-slate-50 cursor-pointer disabled:opacity-60"
          >
            Batal
          </button>
          {stage !== "hub" && (stage !== "google" || googlePreview) && (
            <button
              onClick={stage === "google" ? handleGoogleImport : handleImport}
              disabled={isBusy || !mapelId || (stage === "google" ? googleReadyRows.length === 0 : readyRows.length === 0)}
              className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBusy
                ? "Memproses..."
                : `Import ${stage === "google" ? googleReadyRows.length : readyRows.length} Soal`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
