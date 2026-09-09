import { NextRequest } from 'next/server';
import { getTenantRecord } from '@/lib/registry';
import { handleProxyRequest } from '@/lib/proxy';

async function resolveTarget(schoolId: string) {
  const tenant = await getTenantRecord(schoolId);
  return tenant ? { gasUrl: tenant.gas_url, sharedSecret: tenant.shared_secret } : null;
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
