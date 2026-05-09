import { NextRequest, NextResponse } from 'next/server';
import { getTenantRecord } from '@/lib/registry';

async function resolveGasUrl(schoolId: string): Promise<string | null> {
  const tenant = await getTenantRecord(schoolId);
  return tenant?.gas_url ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const gasUrl = await resolveGasUrl(schoolId);

  if (!gasUrl) {
    return NextResponse.json(
      { success: false, message: 'Sekolah tidak ditemukan' },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (!action) {
    return NextResponse.json(
      { success: false, message: 'Action required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${gasUrl}?action=${action}`, {
      method: 'GET',
    });
    const text = await response.text();
    return NextResponse.json(JSON.parse(text));
  } catch (error) {
    console.error(`Proxy GET error [${schoolId}]:`, error);
    return NextResponse.json(
      { success: false, message: 'Failed to connect to server' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const gasUrl = await resolveGasUrl(schoolId);

  if (!gasUrl) {
    return NextResponse.json(
      { success: false, message: 'Sekolah tidak ditemukan' },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    return NextResponse.json(JSON.parse(text));
  } catch (error) {
    console.error(`Proxy POST error [${schoolId}]:`, error);
    return NextResponse.json(
      { success: false, message: 'Failed to connect to server' },
      { status: 500 }
    );
  }
}
