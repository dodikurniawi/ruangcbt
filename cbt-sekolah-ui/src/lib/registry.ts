import { REGISTRY_TIMEOUT_MS, fetchWithTimeout } from './timeouts.ts';

export interface TenantRecord {
  school_id: string;
  school_name: string;
  gas_url: string;
  shared_secret: string;
}

const REGISTRY_URL = process.env.REGISTRY_GAS_URL || '';
const REGISTRY_LOOKUP_SECRET = process.env.REGISTRY_LOOKUP_SECRET || '';

export async function getTenantRecord(schoolId: string): Promise<TenantRecord | null> {
  if (!REGISTRY_URL || REGISTRY_LOOKUP_SECRET.length < 32) return null;

  // Jawaban definitif (tenant memang tidak ada / tidak aktif) dikembalikan sebagai
  // null dan TIDAK diulang. Hanya kegagalan transient — timeout, koneksi, atau
  // status non-2xx khas cold start GAS — yang dilempar supaya layak dicoba ulang.
  const fetchTenant = async () => {
    const url = new URL(REGISTRY_URL);
    url.searchParams.set('school_id', schoolId);
    url.searchParams.set('registry_secret', REGISTRY_LOOKUP_SECRET);
    const res = await fetchWithTimeout(url, { next: { revalidate: 300 } }, REGISTRY_TIMEOUT_MS);
    if (!res.ok) throw new Error('registry_unavailable');
    const data = await res.json();
    if (!data.success || String(data.school_id) !== schoolId || !data.gas_url) return null;
    return {
      school_id: String(data.school_id),
      school_name: String(data.school_name || ''),
      gas_url: String(data.gas_url),
      shared_secret: String(data.shared_secret || ''),
    };
  };

  try {
    return await fetchTenant();
  } catch {
    // ponytail: retry once on network/cold-start error before failing lookup
    try {
      await new Promise((r) => setTimeout(r, 500));
      return await fetchTenant();
    } catch {
      return null;
    }
  }
}
