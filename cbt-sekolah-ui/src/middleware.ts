import { NextRequest, NextResponse } from 'next/server';

// Rewrite /s/[schoolId]/... → /... so existing pages serve correctly.
// Browser URL is preserved (NextResponse.rewrite is server-side only),
// so getApiUrl() and useTenantRouter still see /s/[schoolId]/ in window.location.pathname.
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const match = pathname.match(/^\/s\/([^/]+)(\/.*)?$/);
    if (!match) return NextResponse.next();

    const restPath = match[2] || '/';

    // API calls to /api/[schoolId]/proxy are not under /s/ so they pass through untouched.
    // Guard anyway in case someone calls /s/school/api/...
    if (restPath.startsWith('/api/')) return NextResponse.next();

    const url = request.nextUrl.clone();
    url.pathname = restPath;
    return NextResponse.rewrite(url);
}

export const config = {
    matcher: ['/s/:path*'],
};
