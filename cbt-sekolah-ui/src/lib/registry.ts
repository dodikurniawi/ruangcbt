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
  try {
    const url = new URL(REGISTRY_URL);
    url.searchParams.set('school_id', schoolId);
    url.searchParams.set('registry_secret', REGISTRY_LOOKUP_SECRET);
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    return {
      school_id: data.school_id,
      school_name: data.school_name,
      gas_url: data.gas_url,
      shared_secret: data.shared_secret || '',
    };
  } catch {
    return null;
  }
}
