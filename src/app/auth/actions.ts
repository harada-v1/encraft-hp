'use server'

import { createClient } from '@/utils/supabase/server'
import { validateReturnTo, buildStoryRedirectUrl } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { headers, cookies } from 'next/headers'


export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}

export async function signIn(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const returnTo = formData.get('return_to') as string

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    if (data.session && data.user) {
        // プロフィール完了チェック
        const { data: profile } = await supabase
            .from('profiles')
            .select('age_range, gender')
            .eq('user_id', data.user.id)
            .single();

        const validatedPath = validateReturnTo(returnTo)
        const cookieStore = await cookies()

        if (returnTo !== null) {
            cookieStore.set('hub_return_to', validatedPath, {
                path: '/',
                maxAge: 3600, // 1 hour
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production'
            })
        }

        if (!profile?.age_range || !profile?.gender) {
            // 未完了ならHubのセットアップ画面へ
            const hubOrigin = process.env.NEXT_PUBLIC_HUB_ORIGIN || 'http://localhost:3002'
            const setupUrl = new URL('/', hubOrigin)
            setupUrl.searchParams.set('profile_setup', '1')
            setupUrl.searchParams.set('return_to', validatedPath)
            redirect(setupUrl.toString())
        }

        const redirectUrl = buildStoryRedirectUrl(validatedPath)
        redirect(redirectUrl)
    }

    return { error: 'セッションの作成に失敗しました。' }
}

export async function signUp(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const returnTo = formData.get('return_to') as string

    const supabase = await createClient()
    const headerList = await headers()

    const host = headerList.get('host')
    const protocol = headerList.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
    const hubOrigin = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_HUB_ORIGIN || 'http://localhost:3002')

    const validatedPath = validateReturnTo(returnTo)
    const emailRedirectTo = `${hubOrigin}/auth/callback?return_to=${encodeURIComponent(validatedPath)}`

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo,
        },
    })

    console.log('[Signup] signUp call result:', {
        email,
        redirectTo: emailRedirectTo,
        userId: data?.user?.id,
        hasSession: !!data?.session,
        error: error?.message
    })

    if (error) {
        return { error: error.message }
    }

    if (data.user) {
        if (data.session) {
            // プロフィール完了チェック (signUp直後でもセッションがある場合)
            const { data: profile } = await supabase
                .from('profiles')
                .select('age_range, gender')
                .eq('user_id', data.user.id)
                .single();

            const validatedPath = validateReturnTo(returnTo)
            const cookieStore = await cookies()

            if (returnTo !== null) {
                cookieStore.set('hub_return_to', validatedPath, {
                    path: '/',
                    maxAge: 3600, // 1 hour
                    sameSite: 'lax',
                    secure: process.env.NODE_ENV === 'production'
                })
            }

            if (!profile?.age_range || !profile?.gender) {
                const hubOrigin = process.env.NEXT_PUBLIC_HUB_ORIGIN || 'http://localhost:3002'
                const setupUrl = new URL('/', hubOrigin)
                setupUrl.searchParams.set('profile_setup', '1')
                setupUrl.searchParams.set('return_to', validatedPath)
                redirect(setupUrl.toString())
            }

            const redirectUrl = buildStoryRedirectUrl(validatedPath)
            redirect(redirectUrl)
        } else {
            return { success: true, message: '確認メールを送信しました。' }
        }
    }

    return { error: 'ユーザーの作成に失敗しました。' }
}

export async function forgotPassword(formData: FormData) {
    const email = formData.get('email') as string
    const returnTo = formData.get('return_to') as string

    const supabase = await createClient()
    const headerList = await headers()

    // Robust origin detection
    const host = headerList.get('host')
    const protocol = headerList.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
    const origin = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_HUB_ORIGIN || 'http://localhost:3002')

    const redirectTo = `${origin}/auth/reset-password?return_to=${encodeURIComponent(returnTo || '/')}`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
    })

    console.log('[ForgotPassword] resetPasswordForEmail result:', {
        email,
        redirectTo,
        error: error?.message
    })

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

export async function updatePassword(formData: FormData) {
    const password = formData.get('password') as string

    const supabase = await createClient()

    const { error } = await supabase.auth.updateUser({
        password,
    })

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}
export async function updateProfile(formData: FormData) {
    const ageRange = formData.get('age_range') as string
    const gender = formData.get('gender') as string

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'ユーザーが見つかりません。' }
    }

    const { error } = await supabase
        .from('profiles')
        .upsert({
            user_id: user.id,
            age_range: ageRange,
            gender: gender,
        }, { onConflict: 'user_id' })

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}
