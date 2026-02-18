import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const returnTo = searchParams.get('return_to') ?? '/'
    const next = searchParams.get('next')

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // パスワードリセット等の特定フローの場合は指定ページへ遷移
            if (next) {
                return NextResponse.redirect(`${origin}${next}?return_to=${encodeURIComponent(returnTo)}`)
            }

            // プロフィール完了チェック
            const { data: profile } = await supabase
                .from('profiles')
                .select('age_range, gender')
                .single();

            const isLocalEnv = process.env.NODE_ENV === 'development'
            const hubOrigin = process.env.NEXT_PUBLIC_HUB_ORIGIN || origin

            if (!profile?.age_range || !profile?.gender) {
                // 未完了ならHubのセットアップ画面へ
                const setupUrl = new URL('/', hubOrigin)
                setupUrl.searchParams.set('profile_setup', '1')
                setupUrl.searchParams.set('return_to', returnTo)
                return NextResponse.redirect(setupUrl.toString())
            }

            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${returnTo}`)
            } else {
                return NextResponse.redirect(`https://story.ma-encraft.com${returnTo}`)
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
