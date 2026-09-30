import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE_NAME = 'nexuspin_token';
const PROTECTED_PREFIXES = ['/hesabim', '/panel'];

/**
 * Oturum gerektiren sayfalara cookie olmadan gelen istekleri giriş sayfasına
 * yönlendirir. Rol/yetki kontrolü ve token doğrulaması backend'de yapılır.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected || req.cookies.get(AUTH_COOKIE_NAME)?.value) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/auth/login';
  url.search = `?redirect=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/hesabim/:path*', '/panel/:path*'],
};
