import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
    const cookieName = process.env.DEV_BYPASS_COOKIE_NAME || 'dev_bypass'

    // Cookieを削除してメンテナンスページへリダイレクト
    const response = NextResponse.redirect(new URL('/maintenance', request.url))

    response.cookies.set(cookieName, '', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 0, // 即時削除
    })

    return response
}
