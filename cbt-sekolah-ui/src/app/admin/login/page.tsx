"use client";

import { useState } from "react";
import { useTenantRouter } from "@/hooks/useTenantRouter";
import { adminLogin } from "@/lib/api";

export default function AdminLogin() {
  const router = useTenantRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!password.trim()) return;
    setIsLoading(true);
    setError(null);
    const res = await adminLogin(password);
    if (res.success) {
      sessionStorage.setItem("admin_auth", "true");
      router.replace("/admin");
    } else {
      setError(res.message ?? "Password salah. Silakan coba lagi.");
      setPassword("");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-lg relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary-fixed rounded-full blur-[120px] opacity-10"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-secondary-fixed rounded-full blur-[100px] opacity-10"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-xl">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-md shadow-lg">
            <span className="material-symbols-outlined text-on-primary text-[32px]">admin_panel_settings</span>
          </div>
          <h1 className="font-display-exam text-display-exam text-on-surface">Admin Login</h1>
          <p className="font-body-admin text-on-surface-variant mt-xs">CBT Sekolah — Panel Administrasi</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant p-xl">
          {error && (
            <div className="mb-lg flex items-center gap-md bg-error-container text-on-error-container px-md py-sm rounded-lg border border-error/20">
              <span className="material-symbols-outlined text-error text-[20px]">error</span>
              <span className="font-label-bold">{error}</span>
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
            className="space-y-lg"
          >
            <div>
              <label className="font-label-bold text-on-surface block mb-sm">Password Administrator</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password admin"
                  className="w-full h-12 border border-outline-variant rounded-lg px-md pr-12 font-body-admin bg-surface focus:border-primary focus:ring-2 focus:ring-primary-container outline-none transition-all"
                  autoFocus
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-md top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
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
              className="w-full h-12 bg-primary text-on-primary font-label-bold rounded-lg shadow-sm hover:opacity-90 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-sm"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                  Memverifikasi...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">login</span>
                  Masuk ke Panel Admin
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center font-caption text-on-surface-variant mt-lg">
          Hanya untuk administrator sekolah yang berwenang.
        </p>
      </div>
    </div>
  );
}
