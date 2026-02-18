import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

const MAINTENANCE_PATH = "/maintenance";
// true にするとメンテモードON（復旧時は false）
const MAINTENANCE_MODE = true;

function isBypassPath(pathname: string) {
    return (
        pathname === MAINTENANCE_PATH ||
        pathname.startsWith("/api") ||
        pathname.startsWith("/_next") ||
        pathname === "/favicon.ico" ||
        pathname === "/robots.txt" ||
        pathname === "/sitemap.xml"
    );
}

export async function middleware(request: NextRequest) {
    if (!MAINTENANCE_MODE) {
        return await updateSession(request)
    }

    const { pathname } = request.nextUrl;

    // callback系はエラー画面を出さないためクエリパラメータを消してリダイレクト
    if (pathname.startsWith("/auth")) {
        const url = request.nextUrl.clone();
        url.pathname = MAINTENANCE_PATH;
        url.search = "";
        return NextResponse.redirect(url);
    }

    if (isBypassPath(pathname)) {
        return NextResponse.next();
    }

    // それ以外はメンテページへ誘導
    const url = request.nextUrl.clone();
    url.pathname = MAINTENANCE_PATH;
    url.search = "";
    return NextResponse.redirect(url);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
