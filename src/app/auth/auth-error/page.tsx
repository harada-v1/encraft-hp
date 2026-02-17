'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BallpitBackground } from '@/components/BallpitBackground';
import { AlertCircle, ArrowLeft } from 'lucide-react';

function AuthErrorContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const errorCode = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const errorMsg = searchParams.get('message');

    return (
        <div className="w-full h-full flex items-center justify-center p-4 relative z-10">
            <div className="w-full max-w-md">
                <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/50 p-8 md:p-10 text-center space-y-6">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <AlertCircle className="text-red-500 w-10 h-10" />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-gray-900">認証エラー</h1>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            サインイン中に問題が発生しました。
                        </p>
                    </div>

                    {(errorCode || errorDescription || errorMsg) && (
                        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 text-left space-y-1">
                            {errorCode && <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Error Code: {errorCode}</p>}
                            <p className="text-xs text-red-600 font-medium">
                                {errorDescription || errorMsg || '予期せぬエラーが発生しました。'}
                            </p>
                        </div>
                    )}

                    <div className="pt-4">
                        <button
                            onClick={() => router.push('/login')}
                            className="w-full bg-gray-900 text-white rounded-2xl py-4 font-bold shadow-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            ログイン画面に戻る
                        </button>
                    </div>

                    <p className="text-[10px] text-gray-400">
                        問題が解決しない場合は、管理者にお問い合わせください。
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function AuthErrorPage() {
    return (
        <div className="min-h-screen w-full relative overflow-hidden">
            <div className="absolute inset-0 z-0 text-white">
                <BallpitBackground />
            </div>
            <Suspense fallback={null}>
                <AuthErrorContent />
            </Suspense>
        </div>
    );
}
