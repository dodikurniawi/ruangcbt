"use client";

import { SWRConfig } from "swr";

/**
 * Kebijakan pengambilan data seluruh aplikasi.
 *
 * `revalidateOnFocus` dimatikan: guru yang berpindah tab lalu kembali memicu
 * refetch SELURUH key halaman itu sekaligus (dashboard 3 key, layar cetak 4 key),
 * padahal layar yang memang butuh realtime sudah punya `refreshInterval` sendiri.
 * Polling eksplisit itu tetap berjalan apa adanya — yang dihapus hanya ledakan
 * request yang tidak diminta siapa pun.
 *
 * Retry dibatasi: `fetchApi` tidak pernah melempar (kegagalan dikembalikan sebagai
 * `{ success: false }`), jadi retry SWR hanya berlaku untuk error tak terduga.
 * Batasnya tetap dipasang supaya saat backend sedang sakit, tab yang terbuka tidak
 * ikut menambah beban tanpa batas.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        shouldRetryOnError: true,
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        dedupingInterval: 3000,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
