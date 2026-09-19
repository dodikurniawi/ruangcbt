"use client";

import { useState, useEffect } from "react";
import { useTenantRouter } from "@/hooks/useTenantRouter";
import { adminLogin, getExamSummary, getExamStatus, getMataPelajaran } from "@/lib/api";
import { ShieldCheck } from "lucide-react";
import { mutate } from "swr";

export default function AdminLogin() {
  const router = useTenantRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Warm the GAS cold-start while admin types their password.
    // getExamStatus is the cheapest unauthenticated read action.
    // Fire-and-forget: we don't care about the result.
    getExamStatus().catch(() => {});

    // Pre-download the /admin page JS bundle so navigation is instant.
    router.prefetch("/admin");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!password.trim()) return;
    setIsLoading(true);
    setError(null);
    const res = await adminLogin(password);
    if (res.success) {
      sessionStorage.setItem("admin_auth", "true");
      // Kick off the admin dashboard data fetches immediately after auth so
      // the dashboard mounts with data already arriving or cached.
      mutate("getExamSummary", getExamSummary(), { revalidate: false });
      mutate("getMataPelajaran", getMataPelajaran(), { revalidate: false });
      router.replace("/admin");
    } else {
      setError(res.message ?? "Password salah. Silakan coba lagi.");
      setPassword("");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 font-body-admin text-slate-900 bg-slate-50 pattern-bg relative overflow-hidden">
      {/* Decorative Accents & Glow Orbs */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 shadow-sm z-50"></div>
      <div className="fixed -top-24 -right-24 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none animate-glow"></div>
      <div className="fixed -bottom-24 -left-24 w-[30rem] h-[30rem] bg-indigo-500/15 rounded-full blur-3xl pointer-events-none animate-glow"></div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 bg-gradient-to-tr from-blue-400/5 to-indigo-400/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10 my-auto py-6 flex flex-col items-center">
        {/* Logo & Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/25 ring-4 ring-blue-100/60 animate-float mb-3">
            <ShieldCheck className="w-8 h-8 text-white stroke-[2.2]" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="text-[11px] font-semibold tracking-wide uppercase text-blue-700">Administrator Access</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            <span className="text-gradient-blue">Admin Login</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">CBT Sekolah — Panel Administrasi</p>
        </div>

        {/* Glassmorphic Card */}
        <div className="w-full glass-card rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-950/10 border border-slate-200/80 relative backdrop-blur-xl">
          {error && (
            <div className="mb-5 flex items-center gap-3 bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-200/80 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <span className="material-symbols-outlined text-red-500 text-[20px] shrink-0">error</span>
              <span className="text-xs font-semibold leading-snug">{error}</span>
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label className="block font-semibold text-xs tracking-wider uppercase text-slate-600 px-1">
                Password Administrator
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">lock</span>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password admin"
                  className="w-full h-12 sm:h-13 pl-11 pr-11 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/15 focus:border-blue-600 transition-all text-slate-900 placeholder:text-slate-400 font-medium text-sm outline-none"
                  autoFocus
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="w-full h-12 sm:h-13 mt-2 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/35 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">login</span>
                  <span>Masuk ke Panel Admin</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Info Pill */}
        <div className="mt-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-slate-200/80 shadow-sm backdrop-blur-md text-slate-500 text-xs font-medium">
          <span className="material-symbols-outlined text-amber-500 text-[16px]">security</span>
          <span>Hanya untuk administrator sekolah yang berwenang.</span>
        </div>
      </div>
    </div>
  );
}
