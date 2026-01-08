import { NextRequest, NextResponse } from 'next/server';


export const config = {
  matcher: ['/dashboard/:path*', '/sign-in', '/sign-up', '/', '/verify/:path*'],
};

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  const url = request.nextUrl;

  // Redirect to dashboard if the user is already authenticated
  // and trying to access sign-in, sign-up, or home page
  if (
    token &&
    (url.pathname.startsWith('/sign-in') ||
      url.pathname.startsWith('/sign-up') )
  ) {
    const url=new URL('/dashboard/info', request.url);
    // url.searchParams.set("reason", "authorized");
    return NextResponse.redirect(url);
  }

  if (!token && url.pathname.startsWith('/dashboard')) {
    const url=new URL('/sign-in', request.url);
    // url.searchParams.set("reason", "unauthorized");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
