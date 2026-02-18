import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

const MAINTENANCE_PATH = "/maintenance";

// 環境変数で制御（デフォルトは 'true' = ON）
// 本番適用時は ENV: NEXT_PUBLIC_MAINTENANCE_MODE=false で解除可能にする
const MAINTENANCE_MODE = process.env.NEXT_PUBLIC_MAINTENANCE_MODE !== 'false';
const DEV_BYPASS_COOKIE_NAME = process.env.DEV_BYPASS_COOKIE_NAME || 'dev_bypass';

function isBypassPath(pathname: string) {
    return (
        pathname === MAINTENANCE_PATH ||
        pathname.startsWith("/api") ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/dev/unlock") ||
        pathname.startsWith("/dev/lock") ||
        pathname === "/favicon.ico" ||
        pathname === "/robots.txt" ||
        pathname === "/sitemap.xml"
    );
}

export async function middleware(request: NextRequest) {
    // メンテナンスモードOFFなら通常通りsupabase session更新
    if (!MAINTENANCE_MODE) {
        return await updateSession(request)
    }

    const { pathname } = request.nextUrl;
    const devBypassCookie = request.cookies.get(DEV_BYPASS_COOKIE_NAME);

    // Dev Bypass Cookieがあれば通常通りsupabase session更新（メンテ無視）
    if (devBypassCookie?.value === '1') {
        return await updateSession(request)
    }

    // callback系はエラー画面を出さないためクエリパラメータを消してリダイレクト
    // ただしBypass Cookieがない場合のみ
    if (pathname.startsWith("/auth")) {
        const url = request.nextUrl.clone();
        url.pathname = MAINTENANCE_PATH;
        url.search = "";
        return NextResponse.redirect(url);
    }

    // 静的ファイルやAPI、Bypass用URLは通す
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
