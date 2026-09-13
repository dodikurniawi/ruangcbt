"use client";

import { useEffect, useState } from "react";
import {
  deleteProviderApiKey,
  getProviderApiKey,
  getSelectedProvider,
  isNonEmptyApiKey,
  maskApiKey,
  migrateLegacyGroqKey,
  saveProviderApiKey,
  saveSelectedProvider,
  type AIProvider,
} from "@/lib/aiSettings";

const PROVIDERS: Array<{
  id: AIProvider;
  label: string;
  placeholder: string;
  url: string;
}> = [
  { id: "gemini", label: "Gemini", placeholder: "Masukkan Gemini API Key Anda", url: "https://aistudio.google.com/app/apikey" },
  { id: "groq", label: "Groq", placeholder: "Masukkan Groq API Key Anda", url: "https://console.groq.com/keys" },
];

export default function AISettingsPanel() {
  const [selected, setSelected] = useState<AIProvider>("gemini");
  const [configured, setConfigured] = useState<Record<AIProvider, boolean>>({ gemini: false, groq: false });
  const [masked, setMasked] = useState<Record<AIProvider, string>>({ gemini: "", groq: "" });
  const [inputs, setInputs] = useState<Record<AIProvider, string>>({ gemini: "", groq: "" });
  const [visible, setVisible] = useState<Record<AIProvider, boolean>>({ gemini: false, groq: false });
  const [messages, setMessages] = useState<Record<AIProvider, string>>({ gemini: "", groq: "" });

  const refresh = () => {
    migrateLegacyGroqKey();
    const gemini = getProviderApiKey("gemini");
    const groq = getProviderApiKey("groq");
    setConfigured({ gemini: Boolean(gemini), groq: Boolean(groq) });
    setMasked({ gemini: maskApiKey(gemini), groq: maskApiKey(groq) });
    setSelected(getSelectedProvider());
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate browser-only settings after SSR.
    refresh();
  }, []);

  const save = (provider: AIProvider) => {
    const key = inputs[provider].trim();
    // Hanya kosong yang ditolak di sini. Bentuk key tidak pernah divalidasi:
    // penyedia yang menentukan sah atau tidak saat key dipakai.
    if (!isNonEmptyApiKey(key)) {
      setMessages((p) => ({ ...p, [provider]: "Masukkan API key terlebih dahulu." }));
      return;
    }
    if (!saveProviderApiKey(provider, key)) {
      setMessages((p) => ({ ...p, [provider]: "Key gagal disimpan oleh browser." }));
      return;
    }
    setInputs((p) => ({ ...p, [provider]: "" }));
    setVisible((p) => ({ ...p, [provider]: false }));
    setMessages((p) => ({ ...p, [provider]: "API key tersimpan." }));
    refresh();
  };

  const remove = (provider: AIProvider) => {
    deleteProviderApiKey(provider);
    setInputs((p) => ({ ...p, [provider]: "" }));
    setMessages((p) => ({ ...p, [provider]: "API key dihapus dari browser ini." }));
    refresh();
  };

  const choose = (provider: AIProvider) => {
    saveSelectedProvider(provider);
    setSelected(provider);
  };

  return (
    <section id="ai-settings" className="scroll-mt-8 mb-12">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 md:p-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-800">Pengaturan AI</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Satu pengaturan untuk seluruh fitur AI
            </p>
          </div>
        </div>

        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-slate-600 leading-relaxed mb-6 space-y-1">
          <p>API key adalah kode akses dari penyedia AI untuk menjalankan fitur AI memakai akun Anda sendiri.</p>
          <p className="font-bold">API key disimpan hanya di browser/perangkat ini, bukan di server RuangCBT.</p>
          <p>Penggunaan AI memakai kuota atau billing akun API key Anda.</p>
        </div>

        <div className="space-y-6">
          {PROVIDERS.map((provider) => {
            const saved = configured[provider.id];
            return (
              <div key={provider.id} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h4 className="font-black text-sm text-slate-800">{provider.label}</h4>
                    <p className={`text-[11px] font-bold mt-0.5 ${saved ? "text-emerald-600" : "text-slate-400"}`}>
                      {saved ? `✓ Siap digunakan • ${masked[provider.id]}` : "Belum dikonfigurasi"}
                    </p>
                  </div>
                  <a href={provider.url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-[#2563EB] hover:underline">
                    Dapatkan key resmi ↗
                  </a>
                </div>

                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  {saved ? "Ganti API key" : "API key"}
                </label>
                <div className="relative">
                  <input
                    type={visible[provider.id] ? "text" : "password"}
                    value={inputs[provider.id]}
                    placeholder={provider.placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(event) => {
                      setInputs((p) => ({ ...p, [provider.id]: event.target.value }));
                      setMessages((p) => ({ ...p, [provider.id]: "" }));
                    }}
                    className="w-full h-11 border border-slate-200 rounded-xl pl-4 pr-12 font-mono text-xs text-slate-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 outline-none"
                  />
                  <button
                    type="button"
                    aria-label={visible[provider.id] ? "Sembunyikan API key" : "Tampilkan API key"}
                    onClick={() => setVisible((p) => ({ ...p, [provider.id]: !p[provider.id] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {visible[provider.id] ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                {messages[provider.id] && (
                  <p className={`mt-2 text-[11px] font-bold ${messages[provider.id].includes("gagal") || messages[provider.id].includes("harus") ? "text-red-600" : "text-emerald-600"}`}>
                    {messages[provider.id]}
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={() => save(provider.id)} disabled={!inputs[provider.id].trim()} className="h-9 px-4 bg-purple-600 text-white rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer">
                    Simpan
                  </button>
                  <button type="button" onClick={() => remove(provider.id)} disabled={!saved} className="h-9 px-4 border border-red-200 text-red-600 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer">
                    Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <fieldset className="mt-6 border border-slate-200 rounded-xl p-4">
          <legend className="px-2 text-xs font-black uppercase tracking-wider text-slate-600">Provider AI</legend>
          <div className="flex flex-wrap gap-5">
            {PROVIDERS.map((provider) => (
              <label key={provider.id} className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                <input type="radio" name="ai_provider" checked={selected === provider.id} onChange={() => choose(provider.id)} />
                {provider.label}
              </label>
            ))}
          </div>
          {!configured[selected] && (
            <p className="mt-3 text-xs font-bold text-amber-700">
              API key {selected === "gemini" ? "Gemini" : "Groq"} belum diatur. Tambahkan key agar fitur AI dapat digunakan.
            </p>
          )}
        </fieldset>
      </div>
    </section>
  );
}
