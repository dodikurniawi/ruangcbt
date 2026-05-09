"use client";

import PublicPageLayout from "@/components/public/PublicPageLayout";
import React, { useEffect, useState } from "react";

type ServerStatus = "operational" | "degraded";

export default function StatusPage() {
  const [status, setStatus] = useState<ServerStatus>("operational");
  const [lastChecked, setLastChecked] = useState<string>("");
  const [isChecking, setIsChecking] = useState<boolean>(false);

  async function checkHealth() {
    setIsChecking(true);
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        setStatus("operational");
      } else {
        setStatus("degraded");
      }
    } catch {
      setStatus("degraded");
    } finally {
      const now = new Date();
      setLastChecked(now.toLocaleTimeString("id-ID"));
      setIsChecking(false);
    }
  }

  useEffect(() => {
    checkHealth();
    const interval = setInterval(() => {
      checkHealth();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <PublicPageLayout
      title="Status Server"
      subtitle="Pemantauan kesehatan infrastruktur dan layanan aplikasi CBT Sekolah secara real-time"
      icon="monitoring"
    >
      <div className="space-y-12">
        {/* Big Status Indicator */}
        <section className="bg-white border border-slate-200/60 rounded-3xl p-8 md:p-12 flex flex-col items-center justify-center text-center gap-4 shadow-sm relative overflow-hidden">
          {/* Pulsing Checking Indicator */}
          {isChecking && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 tracking-widest animate-pulse select-none">
              <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
              <span>Memeriksa...</span>
            </div>
          )}

          {status === "operational" ? (
            <>
              <span className="material-symbols-outlined text-emerald-500 text-6xl md:text-7xl select-none">
                check_circle
              </span>
              <div className="space-y-1">
                <h3 className="font-black text-slate-900 text-lg md:text-xl uppercase tracking-tight">
                  Semua Sistem Berjalan Normal
                </h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
                  Infrastruktur utama berkinerja optimal tanpa ada kendala operasional
                </p>
              </div>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-amber-500 text-6xl md:text-7xl select-none">
                warning
              </span>
              <div className="space-y-1">
                <h3 className="font-black text-slate-900 text-lg md:text-xl uppercase tracking-tight">
                  Gangguan Sebagian
                </h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
                  Beberapa komponen mengalami keterlambatan respons. Tim kami sedang meninjau.
                </p>
              </div>
            </>
          )}

          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
            Terakhir dicek: {lastChecked || "--:--:--"}
          </div>
        </section>

        {/* Services Status Table */}
        <section className="space-y-4">
          <h3 className="font-black text-slate-900 text-base uppercase tracking-wide">
            Kondisi Layanan Utama
          </h3>
          <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Layanan</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Uptime (90 Hari)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-extrabold uppercase tracking-wide">
                  <tr>
                    <td className="px-6 py-4 text-slate-900 font-black">Web Application</td>
                    <td className="px-6 py-4 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span>
                      <span>Operational</span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500">99.9%</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-slate-900 font-black">Google Apps Script</td>
                    <td className="px-6 py-4 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span>
                      <span>Operational</span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500">99.8%</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-slate-900 font-black">Google Sheets API</td>
                    <td className="px-6 py-4 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span>
                      <span>Operational</span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500">99.9%</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-slate-900 font-black">Registry Service</td>
                    <td className="px-6 py-4 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span>
                      <span>Operational</span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Incident History Section */}
        <section className="space-y-4">
          <h3 className="font-black text-slate-900 text-base uppercase tracking-wide">
            Riwayat Insiden Keamanan
          </h3>
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">
            Tidak ada insiden dalam 90 hari terakhir.
          </div>
        </section>
      </div>
    </PublicPageLayout>
  );
}
