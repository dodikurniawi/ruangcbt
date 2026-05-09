import { NextRequest, NextResponse } from 'next/server';

const GAS_URL = process.env.GAS_API_URL || process.env.NEXT_PUBLIC_API_URL || '';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (!action) {
        return NextResponse.json({ success: false, message: 'Action required' }, { status: 400 });
    }

    try {
        const response = await fetch(`${GAS_URL}?action=${action}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const text = await response.text();

        try {
            const data = JSON.parse(text);
            return NextResponse.json(data);
        } catch {
            console.error('GAS returned non-JSON:', text.substring(0, 200));
            return NextResponse.json({
                success: false,
                message: 'Invalid response from server'
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Proxy GET error:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to connect to server'
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const response = await fetch(GAS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(body),
        });

        const text = await response.text();

        try {
            const data = JSON.parse(text);
            return NextResponse.json(data);
        } catch {
            console.error('GAS returned non-JSON:', text.substring(0, 200));
            return NextResponse.json({
                success: false,
                message: 'Invalid response from server'
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Proxy POST error:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to connect to server'
        }, { status: 500 });
    }
}
