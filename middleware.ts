import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /docs uses Swagger UI (unpkg.com CDN + eval) — keep permissive CSP, no nonce needed
  if (pathname.startsWith('/docs')) {
    const connectSrc = buildConnectSrc();
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://unpkg.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://unpkg.com",
      `connect-src ${connectSrc}`,
      "frame-ancestors 'none'",
    ].join('; ');

    const response = NextResponse.next();
    response.headers.set('Content-Security-Policy', csp);
    return response;
  }

  // All other paths: strict CSP with per-request nonce
  const nonce = btoa(crypto.randomUUID());
  const connectSrc = buildConnectSrc();
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'",
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

function buildConnectSrc(): string {
  return [
    "'self'",
    process.env.TURSO_DATABASE_URL?.startsWith('libsql://') ? 'https://*.turso.io' : '',
    process.env.STORAGE_PROVIDER !== 'local' ? 'https://*.vercel-storage.com' : '',
  ].filter(Boolean).join(' ');
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
