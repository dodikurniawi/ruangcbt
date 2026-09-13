import { NextRequest } from 'next/server';
import { handleAiAnalysisRequest } from '@/lib/aiAnalysis';

const GAS_URL = process.env.GAS_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
const GAS_SHARED_SECRET = process.env.GAS_SHARED_SECRET || '';
const SCHOOL_ID = process.env.SINGLE_TENANT_SCHOOL_ID || 'default';

async function resolveTarget() {
    return GAS_URL ? { gasUrl: GAS_URL, sharedSecret: GAS_SHARED_SECRET } : null;
}

export async function POST(request: NextRequest) {
    return handleAiAnalysisRequest(request, SCHOOL_ID, resolveTarget);
}
