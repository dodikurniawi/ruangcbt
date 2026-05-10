"use client";

import { useState, useEffect } from "react";
import { useTenantRouter } from "@/hooks/useTenantRouter";
import { login, getConfig } from "@/lib/api";
import { useExamStore } from "@/store/examStore";

function buildWaUrl(raw: string): string {
  const digits = raw.replace(/\D/g, "");
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
    <div className="min-h-screen flex items-center justify-center p-lg font-body-student text-on-surface bg-slate-50 relative overflow-hidden">
      <main className="w-full max-w-[440px] flex flex-col items-center relative z-10">
        {/* Logo Section */}
        <div className="mb-xl flex flex-col items-center gap-sm">
          <div className="w-16 h-16 bg-surface-container-high rounded-xl flex items-center justify-center shadow-sm overflow-hidden border border-outline-variant">
            <span className="material-symbols-outlined text-primary text-[40px]" data-icon="school">
              school
            </span>
          </div>
          <h2 className="font-headline-student text-headline-student text-primary">
            CBT Mandiri
          </h2>
        </div>

        {/* Login Card */}
        <div className="w-full bg-surface-container-lowest rounded-xl p-xl shadow-sm border border-outline-variant">
          <div className="mb-xl">
            <h1 className="font-display-exam text-display-exam text-on-surface mb-xs">
              Selamat Datang
            </h1>
            <p className="font-body-student text-on-surface-variant text-[16px]">
              Silakan masuk ke akun siswa Kamu untuk memulai ujian.
            </p>
          </div>
          <form className="flex flex-col gap-lg" onSubmit={handleSubmit}>
            {/* Error Banner */}
            {error && (
              <div className="bg-error-container text-on-error-container px-md py-sm rounded-lg flex items-center gap-sm border border-error/20">
                <span className="material-symbols-outlined text-error text-[18px]" data-icon="error">error</span>
                <span className="font-label-bold text-label-bold">{error}</span>
              </div>
            )}

            {/* Username Field */}
            <div className="flex flex-col gap-xs">
              <label
                className="font-label-bold text-label-bold text-on-surface-variant px-1"
                htmlFor="username"
              >
                Username
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-md flex items-center pointer-events-none text-outline">
                  <span className="material-symbols-outlined" data-icon="person">person</span>
                </div>
                <input
                  className="w-full h-14 pl-[52px] pr-md bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-student placeholder:text-outline outline-none"
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
            <div className="flex flex-col gap-xs">
              <div className="flex justify-between items-center px-1">
                <label
                  className="font-label-bold text-label-bold text-on-surface-variant"
                  htmlFor="password"
                >
                  Password
                </label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-md flex items-center pointer-events-none text-outline">
                  <span className="material-symbols-outlined" data-icon="lock">lock</span>
                </div>
                <input
                  className="w-full h-14 pl-[52px] pr-[52px] bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-student placeholder:text-outline outline-none"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className="absolute inset-y-0 right-0 pr-md flex items-center text-outline hover:text-on-surface transition-colors"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined" data-icon={showPassword ? "visibility_off" : "visibility"}>
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-primary text-on-primary font-label-bold text-headline-admin rounded-lg shadow-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-sm mt-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin" data-icon="progress_activity">progress_activity</span>
                  Memverifikasi...
                </>
              ) : (
                <>
                  Masuk Sekarang
                  <span className="material-symbols-outlined" data-icon="login">login</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Help */}
          <div className="mt-xl pt-xl border-t border-outline-variant text-center">
            <p className="font-caption text-caption text-on-surface-variant">
              Butuh bantuan? Hubungi{" "}
              {adminWaUrl ? (
                <a href={adminWaUrl} target="_blank" rel="noopener noreferrer"
                   className="text-primary font-medium underline hover:opacity-80 transition-opacity">
                  Administrator Sekolah
                </a>
              ) : (
                <span className="text-primary font-medium">Administrator Sekolah</span>
              )}
            </p>
          </div>
        </div>

        {/* Branding */}
        <div className="mt-lg flex flex-col items-center gap-xs opacity-60">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-[16px]" data-icon="verified_user">verified_user</span>
            <span className="font-caption text-caption">Sistem Ujian Terverifikasi</span>
          </div>
        </div>
      </main>

      {/* Decorative */}
      <div className="fixed top-0 left-0 w-full h-1 bg-primary"></div>
      <div className="fixed -z-10 bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mb-32 -ml-32"></div>
      <div className="fixed -z-10 top-0 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -mt-48 -mr-48"></div>
    </div>
  );
}
