"use client";

import { useState, useEffect } from "react";
import { useTenantRouter } from "@/hooks/useTenantRouter";
import { login, getConfig } from "@/lib/api";
import { useExamStore } from "@/store/examStore";
import { shouldRecover, deserializeAnswers } from "@/lib/answerRecovery";

// Nilai Config bisa datang sebagai number (nomor WA tersimpan sebagai angka).
function buildWaUrl(raw: unknown): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return `https://wa.me/${digits}`;
  if (digits.startsWith("0")) return `https://wa.me/62${digits.slice(1)}`;
  return `https://wa.me/62${digits}`;
}

export default function LoginPage() {
  const router = useTenantRouter();
  const setUser = useExamStore((s) => s.setUser);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [adminWaUrl, setAdminWaUrl] = useState("");

  useEffect(() => {
    getConfig().then((res) => {
      if (res.success && res.data?.admin_wa) {
        setAdminWaUrl(buildWaUrl(res.data.admin_wa));
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await login(username, password);
      if (res.success && res.data) {
        setUser(res.data);
        // ponytail: recover server-saved answers on re-entry if local store is empty
        const saved = res.data.saved_answers;
        const local = useExamStore.getState().answers;
        if (shouldRecover(local, saved)) {
          useExamStore.getState().setAllAnswers(deserializeAnswers(saved)!);
        }
        router.push("/pin-verification");
      } else {
        setError(res.message || "Username atau password salah.");
      }
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 font-body-student text-slate-900 bg-slate-50 pattern-bg relative overflow-hidden">
      {/* Decorative Orbs & Accents */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 shadow-sm z-50"></div>
      <div className="fixed -top-24 -left-24 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none animate-glow"></div>
      <div className="fixed -bottom-24 -right-24 w-[30rem] h-[30rem] bg-indigo-500/15 rounded-full blur-3xl pointer-events-none animate-glow"></div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 bg-gradient-to-tr from-blue-400/5 to-indigo-400/5 rounded-full blur-3xl pointer-events-none"></div>

      <main className="w-full max-w-[440px] flex flex-col items-center relative z-10 my-auto py-6">
        {/* Logo & Header Section */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/25 ring-4 ring-blue-100/60 animate-float mb-3">
            <span className="material-symbols-outlined text-white text-[36px]" data-icon="school">
              school
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="text-[11px] font-semibold tracking-wide uppercase text-blue-700">RuangCBT System</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800">
            <span className="text-gradient-blue">CBT Mandiri</span>
          </h2>
        </div>

        {/* Login Glass Card */}
        <div className="w-full glass-card rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-950/10 border border-slate-200/80 relative backdrop-blur-xl">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-1.5">
              Selamat Datang
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Silakan masuk ke akun siswa Kamu untuk memulai ujian.
            </p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {/* Error Banner */}
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 border border-red-200/80 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                <span className="material-symbols-outlined text-red-500 text-[20px] shrink-0" data-icon="error">
                  error
                </span>
                <span className="text-xs font-semibold leading-snug">{error}</span>
              </div>
            )}

            {/* Username Field */}
            <div className="flex flex-col gap-1.5">
              <label
                className="block font-semibold text-xs tracking-wider uppercase text-slate-600 px-1"
                htmlFor="username"
              >
                Username
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <span className="material-symbols-outlined text-[20px]" data-icon="person">
                    person
                  </span>
                </div>
                <input
                  className="w-full h-12 sm:h-13 pl-11 pr-4 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/15 focus:border-blue-600 transition-all text-slate-900 placeholder:text-slate-400 font-medium text-sm outline-none"
                  id="username"
                  name="username"
                  placeholder="Masukkan nomor induk siswa"
                  required
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center px-1">
                <label
                  className="block font-semibold text-xs tracking-wider uppercase text-slate-600"
                  htmlFor="password"
                >
                  Password
                </label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <span className="material-symbols-outlined text-[20px]" data-icon="lock">
                    lock
                  </span>
                </div>
                <input
                  className="w-full h-12 sm:h-13 pl-11 pr-11 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/15 focus:border-blue-600 transition-all text-slate-900 placeholder:text-slate-400 font-medium text-sm outline-none"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined text-[20px]" data-icon={showPassword ? "visibility_off" : "visibility"}>
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 sm:h-13 mt-2 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/35 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]" data-icon="progress_activity">
                    progress_activity
                  </span>
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span>Masuk Sekarang</span>
                  <span className="material-symbols-outlined text-[20px]" data-icon="login">
                    login
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Footer Help */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Butuh bantuan? Hubungi{" "}
              {adminWaUrl ? (
                <a
                  href={adminWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1 transition-all"
                >
                  <span>Administrator Sekolah</span>
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </a>
              ) : (
                <span className="text-blue-600 font-semibold">Administrator Sekolah</span>
              )}
            </p>
          </div>
        </div>

        {/* Security Badge Branding */}
        <div className="mt-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-slate-200/80 shadow-sm backdrop-blur-md text-slate-500 text-xs font-medium">
          <span className="material-symbols-outlined text-emerald-500 text-[16px]" data-icon="verified_user">
            verified_user
          </span>
          <span>Sistem Ujian Terverifikasi</span>
        </div>
      </main>
    </div>
  );
}
