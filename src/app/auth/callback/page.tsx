'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { BallpitBackground } from '@/components/BallpitBackground';
import { Loader2 } from 'lucide-react';

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState('シグナルを処理中...');

    useEffect(() => {
        const handleCallback = async () => {
            const supabase = createClient();
            const code = searchParams.get('code');
            const returnTo = searchParams.get('return_to') || '/';

            // 1. Hash Fragment の処理 (#access_token=...)
            // implicit flow や招待リンクなどで返ってくる場合がある
            const hash = window.location.hash;
            if (hash && hash.includes('access_token')) {
                setStatus('セッションを確立中...');
                const params = new URLSearchParams(hash.substring(1));
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken && refreshToken) {
                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                    if (error) {
                        router.push(`/auth/auth-error?message=${encodeURIComponent(error.message)}`);
                        return;
                    }
                }
            }

            // 2. PKCE Code の処理 (?code=...)
            if (code) {
                setStatus('コードを認証中...');
                const { error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) {
                    router.push(`/auth/auth-error?message=${encodeURIComponent(error.message)}`);
                    return;
                }
            }

            // 3. セッション確認とリダイレクト
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setStatus('プロフィールを確認中...');
                // ここで本来は route.ts にあった「プロフィール完了チェック」を行うのが理想
                // page.tsx (Home) がその役割を持っているので、そのまま Home へ飛ばす

                // return_to を付けて Home へ（Home がプロフィール未完了ならモーダルを出す）
                const finalRedir = new URL('/', window.location.origin);
                finalRedir.searchParams.set('return_to', returnTo);

                // もし return_to が外部 (Story) の場合は直接飛ばしても良いが、
                // Hub の Home を通ることで Cookie 同期やプロフィールチェックが走るため、一度 Home へ
                router.push(finalRedir.pathname + '?' + finalRedir.searchParams.toString());
            } else {
                // セッションがない場合はエラーページへ
                router.push('/auth/auth-error?message=Session not established');
            }
        };

        handleCallback();
    }, [router, searchParams]);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 relative z-10 text-center space-y-4">
            <div className="bg-white/70 backdrop-blur-2xl rounded-3xl p-8 shadow-xl border border-white/50 flex flex-col items-center space-y-4 min-w-[300px]">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="text-gray-600 font-medium">{status}</p>
                <p className="text-[10px] text-gray-400">そのままお待ちください</p>
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <div className="min-h-screen w-full relative overflow-hidden">
            <div className="absolute inset-0 z-0 text-white">
                <BallpitBackground />
            </div>
            <Suspense fallback={null}>
                <CallbackContent />
            </Suspense>
        </div>
    );
}
