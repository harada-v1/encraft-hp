"use client";

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signUp } from '@/app/auth/actions';
import { supabase } from '@/lib/supabase';
import { validateReturnTo } from '@/lib/auth-utils';
import { BallpitBackground } from '@/components/BallpitBackground';
import { UserPlus, Mail, Lock, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

function SignupContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const returnTo = searchParams.get('return_to');

    const handleOAuthLogin = async (provider: 'google' | 'github') => {
        const validatedPath = validateReturnTo(returnTo);
        // redirectTo に Hub 側のコールバックを明示的に指定
        const redirectTo = `${window.location.origin}/auth/callback?return_to=${encodeURIComponent(validatedPath)}`;

        await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo,
            },
        });
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);
        if (returnTo) {
            formData.append('return_to', returnTo);
        }

        try {
            const result = await signUp(formData);

            if (result?.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            if (result?.success) {
                setIsSuccess(true);
                setLoading(false);
            }
            // 成功時にセッションが確立された場合は Server Action 内で redirect される
        } catch (err) {
            if (err instanceof Error && err.message === 'NEXT_REDIRECT') {
                return;
            }
            console.error('[Signup] Unexpected error:', err);
            setError('予期せぬエラーが発生しました。');
            setLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <BallpitBackground />
                </div>
                <div className="w-full max-w-md z-10">
                    <div className="bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/50 p-10 text-center space-y-6">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto shadow-sm">
                            <CheckCircle2 className="text-green-500 w-10 h-10" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-gray-900">メールを送信しました</h1>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                {email} 宛に確認メールを送信しました。<br />
                                メール内のリンクをクリックして登録を完了してください。
                            </p>
                        </div>
                        <button
                            onClick={() => router.push('/login')}
                            className="w-full bg-gray-900 text-white rounded-2xl py-4 font-bold shadow-lg hover:bg-blue-600 transition-all"
                        >
                            ログイン画面へ
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex items-center justify-center p-4 relative overflow-hidden">

            <div className="w-full max-w-md z-10">
                <div className="bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/50 p-8 md:p-10">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                            <UserPlus className="text-white w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">アカウント作成</h1>
                        <p className="text-gray-500 text-sm mt-1">Antigravity Account Hub</p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/50 border border-gray-200 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/50 border border-gray-200 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="6文字以上"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                                <p className="text-sm text-red-600 font-medium">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white rounded-2xl py-4 font-bold shadow-lg shadow-blue-500/10 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:scale-100 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "アカウントを作成"}
                        </button>

                        {/* Divider */}
                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-100"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white/70 px-4 text-gray-400 font-bold tracking-widest backdrop-blur-xl rounded-full">Or</span>
                            </div>
                        </div>

                        {/* Google Login Button */}
                        <button
                            type="button"
                            onClick={() => handleOAuthLogin('google')}
                            className="w-full bg-white border border-gray-200 text-gray-700 rounded-2xl py-4 font-bold shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Googleで継続
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-gray-100 text-center">
                        <p className="text-gray-500 text-sm">
                            すでにアカウントをお持ちですか？{" "}
                            <button
                                onClick={() => router.push(`/login?return_to=${encodeURIComponent(returnTo || '/')}`)}
                                className="text-blue-600 font-bold hover:underline"
                            >
                                ログイン
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <div className="min-h-screen w-full relative overflow-hidden">
            <div className="absolute inset-0 z-0">
                <BallpitBackground />
            </div>
            <Suspense fallback={
                <div className="min-h-screen w-full flex items-center justify-center bg-gray-50/50 backdrop-blur-sm z-10 relative">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            }>
                <SignupContent />
            </Suspense>
        </div>
    );
}
