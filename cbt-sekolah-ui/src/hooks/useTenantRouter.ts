'use client';

import { useRouter, usePathname } from 'next/navigation';
import type { NavigateOptions } from 'next/dist/shared/lib/app-router-context.shared-runtime';

function getTenantPrefix(pathname: string): string {
  const match = pathname.match(/^\/s\/([^/]+)/);
  return match ? `/s/${match[1]}` : '';
}

export function useTenantRouter() {
  const router = useRouter();
  const pathname = usePathname();
  const prefix = getTenantPrefix(pathname);

  return {
    back: () => router.back(),
    forward: () => router.forward(),
    refresh: () => router.refresh(),
    prefetch: (href: string) => router.prefetch(`${prefix}${href}`),
    push: (href: string, options?: NavigateOptions) =>
      router.push(`${prefix}${href}`, options),
    replace: (href: string, options?: NavigateOptions) =>
      router.replace(`${prefix}${href}`, options),
  };
}

// For use with <Link href={tenantPath("/login")}> — preserves schoolId prefix
export function useTenantPath(): (path: string) => string {
  const pathname = usePathname();
  const prefix = getTenantPrefix(pathname);
  return (path: string) => `${prefix}${path}`;
}
