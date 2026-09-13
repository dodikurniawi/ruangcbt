import { NextRequest } from 'next/server';
import { getTenantRecord } from '@/lib/registry';
import { handleAiAnalysisRequest } from '@/lib/aiAnalysis';

async function resolveTarget(schoolId: string) {
  const tenant = await getTenantRecord(schoolId);
  return tenant ? { gasUrl: tenant.gas_url, sharedSecret: tenant.shared_secret } : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  return handleAiAnalysisRequest(request, schoolId, () => resolveTarget(schoolId));
}
