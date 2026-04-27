/**
 * Edge middleware: pass-through only. Auth is enforced server-side in
 * the (authenticated) layout via verifySessionCookie, which checks the
 * Firebase signature — a stronger guarantee than a presence check.
 *
 * Headers x-mw-saw and x-mw-cookie-len are diagnostic; readable from
 * any response in DevTools so we can confirm middleware actually ran
 * without depending on Vercel log streaming.
 */
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const cookieValue = req.cookies.get('session')?.value ?? '';
  const response = NextResponse.next();
  response.headers.set('x-mw-saw', pathname);
  response.headers.set('x-mw-cookie-len', String(cookieValue.length));
  return response;
}

export const config = {
  matcher: ['/((?!_next/|favicon\\.ico$|robots\\.txt$).*)'],
};
