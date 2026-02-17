"use client";

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { forgotPassword } from '@/app/auth/actions';
import { BallpitBackground } from '@/components/BallpitBackground';
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

function ForgotPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const returnTo = searchParams.get('return_to') || '/';

    const handleResetRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('email', email);
        formData.append('return_to', returnTo);

        try {
            const result = await forgotPassword(formData);

            if (result?.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            if (result?.success) {
                setIsSuccess(true);
                setLoading(false);
            }
        } catch (err) {
            console.error('[ForgotPassword] Unexpected error:', err);
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
                                {email} 宛にパスワード再設定用のメールを送信しました。<br />
                                メールのリンクをクリックして新しいパスワードを設定してください。
                            </p>
                        </div>
                        <button
                            onClick={() => router.push('/login')}
                            className="w-full bg-gray-900 text-white rounded-2xl py-4 font-bold shadow-lg hover:bg-blue-600 transition-all"
                        >
                            ログイン画面へ戻る
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
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-8 text-sm font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        戻る
                    </button>

                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                            <Mail className="text-white w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight text-center">パスワードを再設定</h1>
                        <p className="text-gray-500 text-sm mt-1 text-center">登録済みのメールアドレスを入力してください</p>
                    </div>

                    <form onSubmit={handleResetRequest} className="space-y-5">
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
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "再設定メールを送信"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function ForgotPasswordPage() {
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
                <ForgotPasswordContent />
            </Suspense>
        </div>
    );
}
