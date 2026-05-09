"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTenantRouter } from "@/hooks/useTenantRouter";
import { useExamStore } from "@/store/examStore";
import {
  getQuestions, getConfig, getExamStatus, getExamPinStatus,
  syncAnswers, submitExam, reportViolation,
} from "@/lib/api";
import { useExamSecurity } from "@/hooks/useExamSecurity";
import type { Question, ViolationType } from "@/types";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getOptionText(opt: string, q: Question): string {
  return (q as unknown as Record<string, string>)[`opsi_${opt}`] ?? "";
}

const OPTIONS = ["a", "b", "c", "d", "e"] as const;

export default function ExamPage() {
  const router = useTenantRouter();
  const {
    user, questions, currentQuestionIndex, answers,
    timeRemaining, isExamStarted, violations,
    setQuestions, setTimeRemaining, decrementTime,
    setAnswer, setCurrentQuestionIndex, nextQuestion, prevQuestion,
    setIsSubmitted, resetExam, setLastSync, setIsSyncing, setIsExamStarted,
  } = useExamStore();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [violationToast, setViolationToast] = useState("");
  const [maxViolations, setMaxViolations] = useState(3);
  const [examName, setExamName] = useState("RuangCBT");
  const [subjectName, setSubjectName] = useState("");

  const [raguraguSet, setRaguraguSet] = useState<Set<string>>(new Set());
  const [fontSize, setFontSize] = useState<'sm'|'base'|'lg'>('base');
  const fontSizeClass = { sm: 'text-sm', base: 'text-base', lg: 'text-lg' }[fontSize];

  const toggleRaguragu = (questionId: string) => {
    setRaguraguSet((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSubmittedRef = useRef(false);

  const doSubmit = useCallback(async (forced: boolean) => {
    if (!user || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setIsSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (syncRef.current) clearInterval(syncRef.current);
    try {
      const res = await submitExam(user.id_siswa, answers, forced);
      if (res.success) {
        sessionStorage.setItem("exam_score", res.score ?? "0");
        sessionStorage.setItem("exam_status", forced ? "DISKUALIFIKASI" : "SELESAI");
        setIsSubmitted(true);
        resetExam();
        router.replace("/student-status");
      } else {
        hasSubmittedRef.current = false;
        setIsSubmitting(false);
      }
    } catch {
      hasSubmittedRef.current = false;
      setIsSubmitting(false);
    }
  }, [user, answers, setIsSubmitted, resetExam, router]);

  const handleViolation = useCallback(async (type: ViolationType, count: number) => {
    if (!user) return;
    setViolationToast(`Peringatan: ${type.replace("_", " ")}. Pelanggaran ke-${count}`);
    setTimeout(() => setViolationToast(""), 4000);
    await reportViolation(user.id_siswa, type);
  }, [user]);

  const handleMaxViolations = useCallback(() => {
    doSubmit(true);
  }, [doSubmit]);

  useExamSecurity({
    maxViolations,
    onViolation: handleViolation,
    onMaxViolations: handleMaxViolations,
    enabled: !isLoading && !isSubmitting,
  });

  // Load exam data on mount
  useEffect(() => {
    const init = async () => {
      if (!user) {
        router.replace("/login");
        return;
      }

      const statusRes = await getExamStatus();
      if (statusRes.data?.exam_status === "CLOSED") {
        router.replace("/student-status");
        return;
      }

      const pinRes = await getExamPinStatus();
      if (pinRes.data?.isPinRequired && !sessionStorage.getItem("pin_verified")) {
        router.replace("/pin-verification");
        return;
      }

      const cfgRes = await getConfig();
      if (cfgRes.success && cfgRes.data) {
        const cfg = cfgRes.data;
        setExamName(cfg.exam_name || "RuangCBT");
        setMaxViolations(cfg.max_violations ?? 3);
        if (!isExamStarted) {
          setTimeRemaining((cfg.exam_duration || 90) * 60);
        }
      }

      if (questions.length === 0) {
        const qRes = await getQuestions();
        if (qRes.success && qRes.data) {
          setQuestions(qRes.data);
          setIsExamStarted(true);
          // Derive subject name from the first question that has nama_mapel
          const firstMapel = qRes.data.find((q: Question) => q.nama_mapel);
          if (firstMapel?.nama_mapel) {
            setSubjectName(firstMapel.nama_mapel);
          }
        } else {
          setLoadError("Gagal memuat soal. Coba refresh halaman.");
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(false);
    };

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown timer
  useEffect(() => {
    if (isLoading || isSubmitting) return;
    timerRef.current = setInterval(() => {
      decrementTime();
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isLoading, isSubmitting, decrementTime]);

  // Auto-submit at zero (deferred to avoid setState-in-render warning)
  useEffect(() => {
    if (isLoading || isSubmitting || questions.length === 0 || timeRemaining !== 0) return;
    const t = setTimeout(() => doSubmit(false), 0);
    return () => clearTimeout(t);
  }, [timeRemaining, isLoading, isSubmitting, questions.length, doSubmit]);

  // Auto-sync every 30s
  useEffect(() => {
    if (isLoading || !user) return;
    syncRef.current = setInterval(async () => {
      const currentAnswers = useExamStore.getState().answers;
      if (Object.keys(currentAnswers).length === 0) return;
      setIsSyncing(true);
      await syncAnswers(user.id_siswa, currentAnswers);
      setLastSync(new Date());
      setIsSyncing(false);
    }, 30000);
    return () => { if (syncRef.current) clearInterval(syncRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user?.id_siswa]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-body-student">
        <div className="flex flex-col items-center gap-lg">
          <span className="material-symbols-outlined text-primary text-[48px] animate-spin">progress_activity</span>
          <p className="font-headline-student text-on-surface">Memuat soal ujian...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-body-student p-lg">
        <div className="max-w-md text-center">
          <span className="material-symbols-outlined text-error text-[48px]">error</span>
          <p className="font-headline-student text-on-surface mt-md">{loadError}</p>
          <button onClick={() => window.location.reload()} className="mt-xl px-xl py-sm bg-primary text-on-primary rounded-lg font-label-bold cursor-pointer">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).filter((id) => {
    const a = answers[id];
    return Array.isArray(a) ? a.length > 0 : !!a;
  }).length;
  const totalQuestions = questions.length;
  const isTimeWarning = timeRemaining <= 300;

  const handleSelectAnswer = (questionId: string, opt: string, isComplex: boolean) => {
    const upper = opt.toUpperCase();
    if (isComplex) {
      const current = (answers[questionId] as string[]) || [];
      const updated = current.includes(upper)
        ? current.filter((o) => o !== upper)
        : [...current, upper];
      setAnswer(questionId, updated);
    } else {
      setAnswer(questionId, upper);
    }
  };

  const isOptionSelected = (questionId: string, opt: string): boolean => {
    const ans = answers[questionId];
    if (!ans) return false;
    const upper = opt.toUpperCase();
    return Array.isArray(ans) ? ans.includes(upper) : ans === upper;
  };

  return (
    <div className="bg-slate-100 font-body-student text-slate-800 min-h-screen flex flex-col">
      {/* HEADER SECTION - FIXED 2 ROWS */}
      <div className="sticky top-0 z-50 flex flex-col flex-shrink-0 shadow-md">
        {/* ROW 1: DARK bg-slate-900 */}
        <div className="bg-[#0f172a] h-[72px] px-6 flex justify-between items-center border-b border-slate-800">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sky-400 text-3xl">school</span>
            <span className="font-extrabold text-xl tracking-wider text-white">
              CBT<span className="text-sky-400">SEKOLAH</span>
            </span>
          </div>

          {/* Subject & Class */}
          <div className="flex flex-col text-center">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1">
              MATA PELAJARAN
            </span>
            <span className="text-white font-extrabold text-sm tracking-wide">
              {subjectName || examName} – KELAS {user?.kelas || "X"}
            </span>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-slate-800 bg-slate-900/60 shadow-inner">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-none mb-1">
                SISA WAKTU
              </span>
              <span className={`text-2xl font-black leading-none tracking-wider font-mono ${isTimeWarning ? "text-red-400 animate-pulse" : "text-white"}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            <span className="material-symbols-outlined text-sky-400 text-2xl">schedule</span>
          </div>
        </div>

        {/* ROW 2: bg-slate-800 */}
        <div className="bg-[#1e293b] h-[56px] px-6 flex justify-between items-center border-b border-slate-700">
          {/* Font Size controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="material-symbols-outlined text-sm">format_size</span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest">T FONT SIZE</span>
            </div>
            <div className="flex items-center gap-1.5">
              {(['sm', 'base', 'lg'] as const).map((sz) => (
                <button
                  key={sz}
                  onClick={() => setFontSize(sz)}
                  className={`w-8 h-8 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    fontSize === sz
                      ? "bg-[#2563EB] border-[#2563EB] text-white shadow-sm"
                      : "border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white"
                  }`}
                >
                  {sz === 'sm' ? "A" : sz === 'base' ? "A+" : "A++"}
                </button>
              ))}
            </div>
          </div>

          {/* Violation Banner */}
          {violations > 0 ? (
            <div className="bg-red-600 text-white rounded-lg px-4 py-1.5 flex items-center gap-3 shadow-md border border-red-500 max-w-md animate-pulse">
              <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              <div className="flex flex-col">
                <span className="text-xs font-extrabold uppercase tracking-wider leading-none">PELANGGARAN TERDETEKSI!! ({violations}/{maxViolations})</span>
                <span className="text-[10px] text-red-100 mt-0.5 font-medium">Sisa {maxViolations - violations} peringatan sebelum ujian ditangguhkan.</span>
              </div>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* Identitas Peserta */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-none mb-1">IDENTITAS PESERTA</span>
              <span className="text-sky-400 font-extrabold text-xs uppercase">{user?.nama_lengkap || user?.username}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-black text-sm shadow-sm border border-slate-700">
              {(user?.nama_lengkap || user?.username || "P").slice(0, 1).toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Violation Toast */}
      {violationToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-red-50 text-red-700 border border-red-200 px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-red-500">warning</span>
          <span className="font-bold text-xs uppercase tracking-wide">{violationToast}</span>
        </div>
      )}

      {/* BODY SECTION: TWO-COLUMN LAYOUT */}
      <div className="flex flex-1 relative min-h-0">
        {/* LEFT COLUMN: QUESTION AREA */}
        <div className="flex-1 overflow-y-auto p-8 pb-32 bg-white">
          {currentQuestion && (
            <div className="max-w-3xl mx-auto">
              {/* Question Header */}
              <div className="flex items-center gap-4 border-b border-slate-100 pb-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-[#2563EB] text-white font-extrabold text-sm flex items-center justify-center shadow-md shadow-blue-500/10">
                  {currentQuestion.nomor_urut}
                </div>
                <span className="text-slate-400 font-extrabold text-xs uppercase tracking-widest">
                  PERTANYAAN
                </span>
                {currentQuestion.tipe === "COMPLEX" && (
                  <span className="ml-auto font-extrabold text-[10px] uppercase tracking-wider bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-200">
                    PILIHAN GANDA KOMPLEKS (LEBIH DARI SATU)
                  </span>
                )}
              </div>

              {/* Question Text */}
              <div
                className={`font-body-student text-slate-800 leading-relaxed my-6 font-medium ${fontSizeClass}`}
                dangerouslySetInnerHTML={{ __html: currentQuestion.pertanyaan }}
              />

              {/* Image if any */}
              {currentQuestion.gambar_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={currentQuestion.gambar_url}
                  alt="Gambar soal"
                  className="max-h-60 rounded-lg object-contain border border-slate-200 bg-slate-50 mb-6"
                />
              )}

              {/* Options list */}
              <div className="flex flex-col gap-3">
                {OPTIONS.map((opt) => {
                  const label = getOptionText(opt, currentQuestion);
                  if (!label) return null;
                  const selected = isOptionSelected(currentQuestion.id_soal, opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelectAnswer(currentQuestion.id_soal, opt, currentQuestion.tipe === "COMPLEX")}
                      className={`flex items-start gap-4 border rounded-xl p-4 cursor-pointer text-left transition-all ${
                        selected
                          ? "border-[#2563EB] bg-blue-50/50 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                        selected
                          ? "bg-[#2563EB] border-[#2563EB] text-white shadow-sm"
                          : "bg-white border-slate-300 text-slate-500"
                      }`}>
                        {opt.toUpperCase()}
                      </div>
                      <div className={`text-slate-700 font-medium leading-relaxed self-center ${fontSizeClass}`}>
                        {label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: SIDEBAR */}
        <div className="w-[288px] shrink-0 bg-slate-50 border-l border-slate-200 flex flex-col h-[calc(100vh-128px)] sticky top-[128px] overflow-hidden">
          {/* Section 1: Header */}
          <div className="bg-slate-800 text-white px-4 py-3 flex justify-between items-center h-12 flex-shrink-0">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">NAVIGASI SOAL</span>
            <span className="bg-[#2563EB] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
              {questions.length} SOAL
            </span>
          </div>

          {/* Section 2: Grid */}
          <div className="p-4 overflow-y-auto flex-grow min-h-0">
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentQuestionIndex;
                const ans = answers[q.id_soal];
                const isAnswered = Array.isArray(ans) ? ans.length > 0 : !!ans;
                const isRaguragu = raguraguSet.has(q.id_soal);

                let btnClass = "";
                if (isCurrent) {
                  btnClass = "border-2 border-[#2563EB] text-[#2563EB] bg-white ring-2 ring-blue-500/10";
                } else if (isRaguragu) {
                  btnClass = "bg-orange-400 text-white shadow-sm shadow-orange-400/20";
                } else if (isAnswered) {
                  btnClass = "bg-blue-600 text-white shadow-sm shadow-blue-500/20";
                } else {
                  btnClass = "bg-white border border-slate-300 text-slate-500 hover:bg-slate-50";
                }

                return (
                  <button
                    key={q.id_soal}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-full aspect-square rounded-lg text-xs font-extrabold flex items-center justify-center cursor-pointer transition-all ${btnClass}`}
                  >
                    {q.nomor_urut}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Legend */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex-shrink-0">
            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-600 shrink-0" />
                <span>Terjawab</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-orange-400 shrink-0" />
                <span>Ragu-ragu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border border-slate-300 bg-white shrink-0" />
                <span>Kosong</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border-2 border-[#2563EB] bg-white shrink-0" />
                <span>Sekarang</span>
              </div>
            </div>
          </div>

          {/* Section 4: Progress */}
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-slate-400 font-extrabold tracking-wider">PROGRESS JAWABAN</span>
              <span className="font-bold text-slate-800 text-sm">{answeredCount}/{questions.length}</span>
            </div>
            {questions.length - answeredCount > 0 && (
              <div className="text-amber-600 text-[10px] font-bold mt-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">warning</span>
                <span>Sisa {questions.length - answeredCount} soal belum dijawab</span>
              </div>
            )}
          </div>

          {/* Section 5: Selesai Ujian Button */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
            <button
              onClick={() => setShowSubmitConfirm(true)}
              disabled={isSubmitting}
              className="w-full bg-[#10b981] hover:bg-emerald-600 disabled:opacity-60 text-white font-extrabold rounded-xl h-12 uppercase tracking-wider cursor-pointer transition-all text-xs"
            >
              SELESAI UJIAN
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM NAV BAR */}
      <div className="fixed bottom-0 left-0 right-[288px] h-20 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between z-40">
        {/* Sebelumnya */}
        <button
          onClick={prevQuestion}
          disabled={currentQuestionIndex === 0}
          className="border border-slate-300 text-slate-600 rounded-xl px-6 h-11 font-bold text-xs uppercase hover:bg-slate-50 transition-all disabled:opacity-40 flex items-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          <span>Sebelumnya</span>
        </button>

        {/* Ragu-Ragu Toggle */}
        {currentQuestion && (
          <button
            onClick={() => toggleRaguragu(currentQuestion.id_soal)}
            className={`rounded-xl px-6 h-11 font-extrabold text-xs uppercase transition-all flex items-center gap-2 cursor-pointer border ${
              raguraguSet.has(currentQuestion.id_soal)
                ? "bg-orange-100 border-orange-400 text-orange-600 shadow-sm"
                : "border-orange-300 text-orange-500 hover:bg-orange-50/50"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: raguraguSet.has(currentQuestion.id_soal) ? "'FILL' 1" : undefined }}>help_outline</span>
            <span>Ragu-Ragu</span>
          </button>
        )}

        {/* Berikutnya */}
        <button
          onClick={nextQuestion}
          disabled={currentQuestionIndex === totalQuestions - 1}
          className="bg-[#2563EB] text-white rounded-xl px-6 h-11 font-bold text-xs uppercase hover:opacity-95 transition-all disabled:opacity-40 flex items-center gap-2 cursor-pointer"
        >
          <span>Berikutnya</span>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </button>
      </div>

      {/* Submit Confirm Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-lg">
          <div className="bg-white rounded-2xl p-xl max-w-sm w-full shadow-2xl border border-slate-200">
            <h3 className="font-headline-student text-lg font-extrabold text-slate-800 mb-2">Kumpulkan Ujian?</h3>
            <p className="font-body-student text-xs text-slate-500 leading-relaxed mb-6">
              {questions.length - answeredCount > 0
                ? `Masih ada ${questions.length - answeredCount} soal belum dijawab. `
                : "Semua soal sudah dijawab dengan lengkap. "}
              Aksi ini bersifat final dan tidak bisa dibatalkan.
            </p>
            <div className="flex gap-md">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-grow h-12 border border-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => { setShowSubmitConfirm(false); doSubmit(false); }}
                disabled={isSubmitting}
                className="flex-grow h-12 bg-[#10b981] hover:bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-60"
              >
                Ya, Kumpulkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
