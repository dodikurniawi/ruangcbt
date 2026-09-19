// Nomor urut autosave: harus selalu naik, dalam satu tab maupun antar tab.
// Jalankan: node --experimental-strip-types src/lib/syncRevision.test.ts
import assert from "node:assert/strict";
import {
  computeRevision,
  nextSyncRevision,
  resetSyncRevisionForTest,
  type RevisionStore,
} from "./syncRevision.ts";

function memoryStore(initial?: Record<string, string>): RevisionStore & { data: Record<string, string> } {
  const data: Record<string, string> = { ...(initial || {}) };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; },
  };
}

// ===== Aturan murni =====

assert.equal(computeRevision(1000, 0), 1000, "tanpa riwayat, jam yang dipakai");
assert.equal(computeRevision(1000, 500), 1000, "jam lebih besar dari riwayat");
assert.equal(computeRevision(1000, 1000), 1001, "jam sama dengan riwayat -> tetap naik");
assert.equal(computeRevision(900, 1000), 1001, "jam MUNDUR tidak boleh menurunkan nomor");
assert.equal(computeRevision(1000, Number.NaN), 1000, "riwayat rusak diabaikan");
assert.equal(computeRevision(1000, -50), 1000, "riwayat negatif diabaikan");

// Jam yang mundur beberapa kali tetap menghasilkan urutan naik.
{
  let previous = 5_000;
  for (const clock of [4_000, 3_000, 4_500, 1]) {
    const next = computeRevision(clock, previous);
    assert.ok(next > previous, `nomor wajib naik (${previous} -> ${next})`);
    previous = next;
  }
}

// ===== Satu tab =====

{
  resetSyncRevisionForTest();
  const store = memoryStore();
  const a = nextSyncRevision(1_000, store);
  const b = nextSyncRevision(1_000, store);
  const c = nextSyncRevision(999, store);
  assert.ok(b > a && c > b, `urutan wajib naik: ${a}, ${b}, ${c}`);
  assert.equal(store.data["ruangcbt_sync_rev"], String(c), "nomor terakhir tersimpan");
}

// ===== Dua tab pada browser yang sama (localStorage dibagi) =====

{
  resetSyncRevisionForTest();
  const shared = memoryStore();          // satu penyimpanan, dua "tab"
  const tabA1 = nextSyncRevision(2_000, shared);
  const tabB1 = nextSyncRevision(2_000, shared);
  const tabA2 = nextSyncRevision(2_000, shared);
  assert.ok(tabB1 > tabA1, "tab kedua mendapat nomor lebih besar");
  assert.ok(tabA2 > tabB1, "tab pertama melanjutkan dari nomor bersama, bukan dari nomornya sendiri");
}

// ===== Refresh: penyimpanan bertahan, penghitung memori hilang =====

{
  const store = memoryStore();
  const beforeRefresh = nextSyncRevision(3_000, store);
  resetSyncRevisionForTest();            // seperti halaman dimuat ulang
  const afterRefresh = nextSyncRevision(3_000, store);
  assert.ok(afterRefresh > beforeRefresh, "setelah refresh nomor tetap melanjutkan, bukan mengulang");
}

// ===== Storage diblokir: tidak boleh melempar, nomor tetap naik =====

{
  resetSyncRevisionForTest();
  const broken: RevisionStore = {
    getItem() { throw new Error("storage diblokir"); },
    setItem() { throw new Error("storage diblokir"); },
  };
  const a = nextSyncRevision(4_000, broken);
  const b = nextSyncRevision(4_000, broken);
  assert.ok(b > a, "penghitung memori menjaga urutan saat storage tidak tersedia");
}

{
  resetSyncRevisionForTest();
  const a = nextSyncRevision(5_000, null);   // tanpa storage sama sekali
  const b = nextSyncRevision(5_000, null);
  assert.ok(b > a, "tanpa storage pun nomor tetap naik dalam satu tab");
}

// ===== Nilai tersimpan yang rusak tidak boleh mengunci autosave =====

{
  resetSyncRevisionForTest();
  for (const junk of ["abc", "", "-1", "NaN", "Infinity"]) {
    const store = memoryStore({ ruangcbt_sync_rev: junk });
    const rev = nextSyncRevision(6_000, store);
    assert.ok(Number.isFinite(rev) && rev > 0, `nilai tersimpan rusak (${junk}) harus diabaikan, dapat ${rev}`);
  }
}

console.log("syncRevision: monoton, lintas tab, tahan refresh, tahan jam mundur, tahan storage rusak PASS");
