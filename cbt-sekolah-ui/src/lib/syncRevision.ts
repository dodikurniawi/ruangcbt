// Penomoran autosave: satu angka yang selalu naik, dipakai server HANYA untuk
// menentukan mana autosave yang lebih baru saat dua request saling mendahului.
//
// Kenapa localStorage: dua tab pada browser yang sama berbagi penyimpanan itu,
// jadi nomornya tetap naik lintas tab. sessionStorage per-tab tidak bisa, dan
// penghitung di memori hilang saat refresh.
//
// Kenapa berbasis jam, bukan 1,2,3: setelah refresh atau tab baru, penghitung
// harus lanjut dari titik yang lebih tinggi tanpa perlu membaca server dulu.
// Jam yang mundur (penyesuaian NTP) ditutup oleh `previous + 1`.

const STORAGE_KEY = "ruangcbt_sync_rev";

/** Bagian murni yang menentukan aturannya: selalu naik, tidak pernah mundur. */
export function computeRevision(now: number, previous: number): number {
  const base = Number.isFinite(previous) && previous > 0 ? previous : 0;
  return Math.max(now, base + 1);
}

export interface RevisionStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// Penghitung memori adalah jaring pengaman ketika localStorage diblokir
// (mode privat, kebijakan situs). Nomor tetap naik di dalam satu tab.
let memoryRevision = 0;

function defaultStore(): RevisionStore | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function nextSyncRevision(now: number = Date.now(), store: RevisionStore | null = defaultStore()): number {
  let previous = memoryRevision;
  if (store) {
    try {
      const stored = Number(store.getItem(STORAGE_KEY));
      if (Number.isFinite(stored) && stored > previous) previous = stored;
    } catch {
      // Storage tidak terbaca: penghitung memori yang dipakai.
    }
  }
  const revision = computeRevision(now, previous);
  memoryRevision = revision;
  if (store) {
    try {
      store.setItem(STORAGE_KEY, String(revision));
    } catch {
      // Storage tidak bisa ditulisi: nomor tetap naik di dalam tab ini.
    }
  }
  return revision;
}

/** Hanya untuk test: kembalikan penghitung memori ke titik awal. */
export function resetSyncRevisionForTest(): void {
  memoryRevision = 0;
}
