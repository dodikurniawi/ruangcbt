import { NextRequest } from 'next/server';
import { getTenantRecord } from '@/lib/registry';
import { handleProxyRequest } from '@/lib/proxy';

async function resolveTarget(schoolId: string) {
  const tenant = await getTenantRecord(schoolId);
  if (tenant) return { gasUrl: tenant.gas_url, sharedSecret: tenant.shared_secret };
  const fallbackUrl = process.env.GAS_API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (fallbackUrl) {
    return { gasUrl: fallbackUrl, sharedSecret: process.env.GAS_SHARED_SECRET || '' };
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  return handleProxyRequest(request, 'GET', schoolId, () => resolveTarget(schoolId));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  return handleProxyRequest(request, 'POST', schoolId, () => resolveTarget(schoolId));
}
