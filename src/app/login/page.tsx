'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { BallpitBackground } from '@/components/BallpitBackground';
import { Loader2 } from 'lucide-react';

import { signIn } from '@/app/auth/actions';
import { Mail, Lock, UserPlus, ArrowRight } from 'lucide-react';

function LoginContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // return_to の取得と検証
    const rawReturnTo = searchParams.get('return_to');
    const validatedReturnTo = (rawReturnTo?.startsWith('/') && !rawReturnTo.startsWith('//'))
        ? rawReturnTo
        : '/';

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setErrorMessage(null);

        const supabase = createClient();
        const hubOrigin = window.location.origin;
        const redirectTo = `${hubOrigin}/auth/callback?return_to=${encodeURIComponent(validatedReturnTo)}`;

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });

        if (error) {
            setErrorMessage(error.message);
            setIsLoading(false);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage(null);

        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);
        formData.append('return_to', validatedReturnTo);

        try {
            const result = await signIn(formData);
            if (result?.error) {
                setErrorMessage(result.error);
                setIsLoading(false);
            }
        } catch (err) {
            console.error(err);
            setErrorMessage('ログイン中に予期せぬエラーが発生しました。');
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 relative z-10 text-center space-y-6">
            <div className="bg-white/70 backdrop-blur-2xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white/50 flex flex-col items-center space-y-6 min-w-[320px] max-w-md w-full">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Login to Hub</h1>
                    <p className="text-sm text-gray-500 font-medium">Antigravity 共通アカウントでログイン</p>
                </div>

                <form onSubmit={handleEmailLogin} className="w-full space-y-4 text-left">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/50 border border-gray-200 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                                placeholder="name@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Password</label>
                            <button
                                type="button"
                                onClick={() => router.push(`/forgot-password?return_to=${encodeURIComponent(validatedReturnTo)}`)}
                                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
                            >
                                Forgot?
                            </button>
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/50 border border-gray-200 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gray-900 text-white rounded-2xl py-4 font-bold shadow-lg hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <>
                                <span>ログイン</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                <div className="w-full relative py-2">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-100"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase">
                        <span className="bg-white/70 px-4 text-gray-400 font-bold tracking-widest backdrop-blur-xl rounded-full">Or continue with</span>
                    </div>
                </div>

                <div className="w-full">
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3.5 px-6 rounded-2xl border border-gray-200 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 group mt-2"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        ) : (
                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                        )}
                        <span>Googleでログイン</span>
                    </button>

                    {errorMessage && (
                        <p className="text-xs text-red-500 font-bold mt-4 animate-in fade-in slide-in-from-top-1 px-2">
                            {errorMessage}
                        </p>
                    )}
                </div>

                <div className="pt-2">
                    <p className="text-sm text-gray-500 font-medium">
                        アカウントをお持ちでないですか？{' '}
                        <button
                            type="button"
                            onClick={() => router.push(`/signup?return_to=${encodeURIComponent(validatedReturnTo)}`)}
                            className="text-blue-600 font-bold hover:underline underline-offset-4"
                        >
                            新規登録
                        </button>
                    </p>
                </div>

                <div className="pt-4">
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                        ログインすることで、利用規約およびプライバシーポリシーに<br />
                        同意したものとみなされます。
                    </p>
                </div>
            </div>

            <button
                onClick={() => window.location.href = '/'}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold transition-colors flex items-center gap-2 group"
            >
                <span className="group-hover:-translate-x-1 transition-transform">←</span>
                <span>トップページに戻る</span>
            </button>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 z-0">
                <BallpitBackground />
            </div>
            <Suspense fallback={
                <div className="relative z-10 flex flex-col items-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                    <p className="text-gray-400 text-sm">Loading...</p>
                </div>
            }>
                <LoginContent />
            </Suspense>
        </div>
    );
}
