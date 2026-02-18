import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('token')
    const secret = process.env.DEV_BYPASS_TOKEN

    // 環境変数が設定されていない場合は 500 エラー
    if (!secret) {
        return new NextResponse('Dev Bypass Token is not configured.', { status: 500 })
    }

    // トークンが不一致または欠如している場合は 401 エラー
    if (!token || token !== secret) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    // 正しいトークンの場合、Cookie を設定してリダイレクト
    // 12時間有効
    const maxAge = 60 * 60 * 12
    const cookieName = process.env.DEV_BYPASS_COOKIE_NAME || 'dev_bypass'

    const response = NextResponse.redirect(new URL('/', request.url))

    response.cookies.set(cookieName, '1', {
        httpOnly: true,
        secure: true, // 本番前提
        sameSite: 'lax',
        path: '/',
        maxAge: maxAge,
    })

    return response
}
