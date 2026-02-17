"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile, signOut } from '@/app/auth/actions';
import { Loader2, User, ChevronRight, LogOut } from 'lucide-react';
import { buildStoryRedirectUrl } from '@/lib/auth-utils';

interface ProfileCompletionModalProps {
    returnTo?: string;
}

export const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({ returnTo }) => {
    const [ageRange, setAgeRange] = useState('');
    const [gender, setGender] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSave = async () => {
        if (!ageRange || !gender) return;
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('age_range', ageRange);
        formData.append('gender', gender);

        try {
            const result = await updateProfile(formData);
            if (result.error) {
                setError(result.error);
                setLoading(false);
            } else {
                // Success - Cookie is deleted by server action updateProfile

                // Read from prop, fallback to document.cookie if missing
                let finalReturnTo = returnTo;
                if (!finalReturnTo) {
                    const match = document.cookie.match(/(^| )hub_return_to=([^;]+)/);
                    if (match) finalReturnTo = decodeURIComponent(match[2]);
                }

                if (finalReturnTo) {
                    // returnTo が存在する場合（'/' を含む）、Story(3001)への遷移を含めて構築
                    window.location.href = buildStoryRedirectUrl(finalReturnTo);
                } else {
                    // returnTo が全く無い場合は Hub のトップをリロード
                    router.refresh();
                }
            }
        } catch (err) {
            console.error('[ProfileModal] Save error:', err);
            setError('保存中にエラーが発生しました。');
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        setLoading(true);
        await signOut();
    };

    const ageOptions = [
        { label: '10代', value: '10s' },
        { label: '20代', value: '20s' },
        { label: '30代', value: '30s' },
        { label: '40代', value: '40s' },
        { label: '50代', value: '50s' },
        { label: '60代以上', value: '60s_plus' },
    ];

    const genderOptions = [
        { label: '男性', value: 'male' },
        { label: '女性', value: 'female' },
        { label: 'その他', value: 'other' },
        { label: '回答しない', value: 'no_answer' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
                <div className="p-8 md:p-10 space-y-8">
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600">
                            <User className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">プロフィールについて</h2>
                        <p className="text-gray-500 text-sm">
                            より良い体験を提供するため、<br />あなたのことを教えてください（必須）
                        </p>
                    </div>

                    <div className="space-y-6">
                        {/* Age Range */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">年齢層</label>
                            <div className="grid grid-cols-3 gap-2">
                                {ageOptions.map(option => (
                                    <button
                                        key={option.value}
                                        onClick={() => setAgeRange(option.value)}
                                        className={`py-2 px-1 text-xs font-medium rounded-xl border transition-all ${ageRange === option.value
                                            ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                                            : "bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-300"
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Gender */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">性別</label>
                            <div className="grid grid-cols-2 gap-2">
                                {genderOptions.map(option => (
                                    <button
                                        key={option.value}
                                        onClick={() => setGender(option.value)}
                                        className={`py-3 px-4 text-sm font-medium rounded-xl border transition-all ${gender === option.value
                                            ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                                            : "bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-300"
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 rounded-xl flex items-center justify-center gap-2">
                                <p className="text-xs text-red-500 font-medium">{error}</p>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                        <button
                            onClick={handleSave}
                            disabled={loading || !ageRange || !gender}
                            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-600 transition-all disabled:bg-gray-100 disabled:text-gray-400 flex items-center justify-center gap-2 group"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    回答してはじめる
                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleLogout}
                            disabled={loading}
                            className="w-full py-4 text-sm font-bold text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            ログアウトしてやり直す
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
