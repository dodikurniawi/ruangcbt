export interface TenantRecord {
  school_id: string;
  school_name: string;
  gas_url: string;
}

const REGISTRY_URL = process.env.REGISTRY_GAS_URL || '';

export async function getTenantRecord(schoolId: string): Promise<TenantRecord | null> {
  if (!REGISTRY_URL) return null;
  try {
    const res = await fetch(
      `${REGISTRY_URL}?school_id=${encodeURIComponent(schoolId)}`,
      { next: { revalidate: 300 } } // cache 5 menit di server
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    return {
      school_id: data.school_id,
      school_name: data.school_name,
      gas_url: data.gas_url,
    };
  } catch {
    return null;
  }
}
