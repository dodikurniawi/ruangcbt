"use client";

import { useState } from "react";
import Link from "next/link";
import { useTenantPath } from "@/hooks/useTenantRouter";
import useSWR from "swr";
import { validateLiveScorePin, getLiveScore } from "@/lib/api";
import type { LiveScoreEntry } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  SELESAI: "Selesai",
  SEDANG: "Sedang Mengerjakan",
  DISKUALIFIKASI: "Diskualifikasi",
  BELUM: "Belum Mulai",
};

const STATUS_CLS: Record<string, string> = {
  SELESAI: "bg-emerald-100 text-emerald-800",
  SEDANG: "bg-amber-100 text-amber-800",
  DISKUALIFIKASI: "bg-error-container text-on-error-container",
  BELUM: "bg-surface-container text-on-surface-variant",
};

export default function LiveLeaderboard() {
  const tenantPath = useTenantPath();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const { data: scoreRes } = useSWR(
    isUnlocked ? "getLiveScore" : null,
    getLiveScore,
    { refreshInterval: 5000 }
  );

  const entries: LiveScoreEntry[] = scoreRes?.data ?? [];
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  const handleInputChange = (value: string, index: number) => {
    if (/[^0-9]/.test(value)) return;
    const next = [...pin];
    next[index] = value;
    setPin(next);
    if (value && index < 3) document.getElementById(`pin-${index + 1}`)?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) document.getElementById(`pin-${index - 1}`)?.focus();
  };

  const handleUnlock = async () => {
    const pinStr = pin.join("");
    if (pinStr.length < 4) return;
    setIsVerifying(true);
    const res = await validateLiveScorePin(pinStr);
    if (res.success) {
      setIsUnlocked(true);
    } else {
      setError(true);
      setPin(["", "", "", ""]);
      setTimeout(() => { setError(false); document.getElementById("pin-0")?.focus(); }, 3000);
    }
    setIsVerifying(false);
  };

  const podiumColors = ["border-slate-400", "border-yellow-400", "border-orange-400"];
  const podiumBg = ["bg-slate-100", "bg-yellow-50", "bg-orange-50"];
  const podiumText = ["text-slate-600", "text-yellow-600", "text-orange-700"];

  return (
    <div className="bg-background text-on-background font-body-admin min-h-screen">
      <header className="sticky top-0 z-40 flex justify-between items-center w-full px-lg py-sm bg-white border-b border-outline-variant shadow-sm">
        <Link href={tenantPath("/")} className="flex items-center gap-sm cursor-pointer">
          <span className="material-symbols-outlined text-primary text-3xl">school</span>
          <h1 className="font-headline-student font-extrabold text-primary">CBT Sekolah</h1>
        </Link>
        <div className="flex items-center gap-sm bg-surface-container-high px-md py-xs rounded-full">
          <span className="material-symbols-outlined text-tertiary">timer</span>
          <span className="font-label-bold text-on-surface">Live Leaderboard</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-lg py-12">
        {!isUnlocked ? (
          <section className="my-16 flex flex-col items-center justify-center">
            <div className="max-w-md w-full p-xl bg-white rounded-xl shadow-sm border border-outline-variant text-center">
              <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center mx-auto mb-lg">
                <span className="material-symbols-outlined text-on-primary-container text-[32px]">lock</span>
              </div>
              <h2 className="font-headline-admin mb-sm">Masukkan PIN Akses</h2>
              <p className="font-body-admin text-on-surface-variant mb-xl">Mode proyeksi memerlukan PIN dari administrator.</p>
              <div className="flex justify-center gap-md mb-xl">
                {pin.map((char, i) => (
                  <input key={i} id={`pin-${i}`}
                    className={`w-16 h-20 text-center text-display-exam font-bold border-2 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary-container outline-none transition-all bg-surface ${error ? "border-error" : "border-outline-variant"}`}
                    maxLength={1} inputMode="numeric" placeholder="•" value={char}
                    onChange={(e) => handleInputChange(e.target.value, i)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                  />
                ))}
              </div>
              <button
                onClick={handleUnlock}
                disabled={isVerifying || pin.join("").length < 4}
                className="w-full bg-primary text-on-primary font-label-bold py-md rounded-lg shadow-sm hover:opacity-90 cursor-pointer disabled:opacity-60 h-12 flex items-center justify-center gap-sm"
              >
                {isVerifying ? <><span className="material-symbols-outlined animate-spin">progress_activity</span>Memverifikasi...</> : "Buka Leaderboard"}
              </button>
            </div>
          </section>
        ) : (
          <section className="space-y-xl">
            <div className="flex justify-between items-end mb-lg">
              <div>
                <h2 className="font-display-exam text-display-exam text-on-surface">Top Performers</h2>
                <p className="text-on-surface-variant">Real-time hasil ujian.</p>
              </div>
              <div className="flex items-center gap-xs px-md py-sm bg-emerald-100 text-emerald-800 rounded-full font-label-bold">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>LIVE
              </div>
            </div>

            {/* Podium */}
            {top3.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-xl items-end mb-16 pt-8">
                {(top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3).map((entry, i) => {
                  const actualRank = top3.length === 3 ? [2, 1, 3][i] : entry.rank;
                  const colorIdx = [1, 0, 2][i] ?? i;
                  const isFirst = actualRank === 1;
                  return (
                    <div key={entry.rank} className={`bg-white border-t-4 ${podiumColors[colorIdx]} rounded-2xl ${isFirst ? "p-2xl md:scale-105 shadow-xl" : "p-xl shadow-sm"} flex flex-col items-center text-center relative overflow-hidden ${i === 1 ? "order-1 md:order-2" : i === 0 ? "order-2 md:order-1" : "order-3"}`}>
                      {isFirst && <span className="material-symbols-outlined text-yellow-500 text-5xl mb-sm" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>}
                      <div className={`w-20 h-20 rounded-full ${podiumBg[colorIdx]} flex items-center justify-center mb-md border-4 ${podiumColors[colorIdx]}`}>
                        <span className={`font-display-exam text-2xl font-black ${podiumText[colorIdx]}`}>{actualRank}</span>
                      </div>
                      <h3 className={`font-extrabold text-on-surface mb-xs ${isFirst ? "text-2xl" : "font-headline-student"}`}>{entry.nama}</h3>
                      <p className="font-body-admin text-on-surface-variant mb-md">{entry.kelas}</p>
                      <div className={`font-black text-primary ${isFirst ? "text-6xl" : "text-4xl"}`}>{entry.skor}</div>
                      <div className={`mt-md px-md py-xs rounded-full font-label-sm ${STATUS_CLS[entry.status] ?? ""}`}>{STATUS_LABEL[entry.status]}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Table */}
            {rest.length > 0 && (
              <div className="bg-white rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant">
                      <th className="px-xl py-lg font-headline-admin text-on-surface-variant w-24">Rank</th>
                      <th className="px-xl py-lg font-headline-admin text-on-surface-variant">Nama</th>
                      <th className="px-xl py-lg font-headline-admin text-on-surface-variant">Kelas</th>
                      <th className="px-xl py-lg font-headline-admin text-on-surface-variant">Status</th>
                      <th className="px-xl py-lg font-headline-admin text-on-surface text-right">Skor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {rest.map((e) => (
                      <tr key={e.rank} className="hover:bg-surface-container-low transition-colors">
                        <td className="px-xl py-lg font-display-exam text-2xl text-on-surface-variant">{e.rank}</td>
                        <td className="px-xl py-lg font-headline-student text-on-surface">{e.nama}</td>
                        <td className="px-xl py-lg font-body-student text-on-surface-variant">{e.kelas}</td>
                        <td className="px-xl py-lg">
                          <span className={`px-md py-sm rounded-full font-label-bold uppercase tracking-wider text-xs ${STATUS_CLS[e.status] ?? ""}`}>{STATUS_LABEL[e.status]}</span>
                        </td>
                        <td className="px-xl py-lg font-display-exam text-3xl text-primary text-right font-bold">{e.skor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {entries.length === 0 && (
              <div className="text-center py-16 text-on-surface-variant font-body-admin">Belum ada data skor.</div>
            )}
          </section>
        )}
      </main>

      {error && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-error-container text-on-error-container px-lg py-md rounded-xl shadow-lg flex items-center gap-md z-50">
          <span className="material-symbols-outlined text-error">error</span>
          <span className="font-label-bold">PIN salah. Silakan coba lagi.</span>
        </div>
      )}
    </div>
  );
}
