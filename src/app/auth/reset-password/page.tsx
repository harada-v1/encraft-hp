"use client";

import React, { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { updatePassword } from '@/app/auth/actions';
import { BallpitBackground } from '@/components/BallpitBackground';
import { Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const returnTo = searchParams.get('return_to') || '/';

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('パスワードが一致しません。');
            return;
        }

        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('password', password);
        formData.append('return_to', returnTo);

        try {
            const result = await updatePassword(formData);

            if (result?.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            if (result?.success) {
                setIsSuccess(true);
                setLoading(false);

                // 成功後、少し待ってからログイン画面へ遷移（reset=1を付与）
                setTimeout(() => {
                    router.push(`/login?reset=1&return_to=${encodeURIComponent(returnTo)}`);
                }, 2000);
            }
        } catch (err) {
            console.error('[ResetPassword] Unexpected error:', err);
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
                            <h1 className="text-2xl font-bold text-gray-900">更新完了</h1>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                パスワードを正常に更新しました。<br />
                                自動的にログイン画面へ戻ります...
                            </p>
                        </div>
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
                            <Lock className="text-white w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight text-center">新しいパスワードを設定</h1>
                        <p className="text-gray-500 text-sm mt-1 text-center">新しいパスワードを入力してください</p>
                    </div>

                    <form onSubmit={handleUpdatePassword} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">New Password</label>
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

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Confirm Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-white/50 border border-gray-200 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="もう一度入力"
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
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "パスワードを更新"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
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
                <ResetPasswordContent />
            </Suspense>
        </div>
    );
}
