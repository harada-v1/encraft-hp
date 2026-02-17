import React from 'react';
import { HeroSection } from '@/components/HeroSection';
import { createClient } from '@/utils/supabase/server';
import { ProfileCompletionModal } from '@/components/ProfileCompletionModal';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { buildStoryRedirectUrl } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

interface HomeProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Home({ searchParams }: HomeProps) {
    const params = await searchParams;
    let showProfileSetup = params.profile_setup === '1';
    const queryReturnTo = params.return_to as string | undefined;

    const cookieStore = await cookies();
    const cookieReturnTo = cookieStore.get('hub_return_to')?.value;

    const returnTo = queryReturnTo || cookieReturnTo;

    const supabaseServerClient = await createClient();
    const { data: { user } } = await supabaseServerClient.auth.getUser();

    if (user) {
        // 地雷対策①: profiles行の存在保証 (upsert)
        // 既存行があっても user_id が一致するので競合せず、なければ作成される
        await supabaseServerClient
            .from('profiles')
            .upsert({ user_id: user.id }, { onConflict: 'user_id' });

        // 年齢/性別の未入力チェック
        const { data: profile } = await supabaseServerClient
            .from('profiles')
            .select('age_range, gender')
            .eq('user_id', user.id)
            .single();

        if (!profile?.age_range || !profile?.gender) {
            showProfileSetup = true;
        } else if (profile.age_range && profile.gender) {
            // 入力済みの場合のみ、return_to または profile_setup=1 に応じた処理を行う
            if (showProfileSetup || queryReturnTo) {
                if (queryReturnTo) {
                    // Story 側への復帰（buildStoryRedirectUrl は絶対URLを返す）
                    redirect(buildStoryRedirectUrl(returnTo || '/'));
                } else {
                    // Hub 自体で完結させる場合や return_to がない場合
                    redirect('/');
                }
            }
            showProfileSetup = false;
        }
    }

    // Fetch count from Supabase via RPC
    const { data: count, error } = await supabaseServerClient
        .rpc('get_stress_ball_count');

    if (error) {
        console.error('Error fetching stress ball count:', error);
    }

    // Calculate initial count: 80 (base) + count (db), max 300
    const dbCount = Number(count) || 0;
    const initialCount = Math.min(80 + dbCount, 300);

    return (
        <main className="w-full min-h-screen bg-white">
            {showProfileSetup && <ProfileCompletionModal returnTo={returnTo} />}
            {/* Hero Section */}
            <HeroSection
                initialCount={initialCount}
                maxCount={300}
                colors={['#1A1A1B', '#3B82F6', '#94A3B8']}
            />

            {/* Section 1: Quick Guide */}
            <section id="guide" className="w-full py-20 bg-white">
                <div className="max-w-4xl mx-auto px-6 text-center space-y-12">
                    <div className="space-y-4">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">あなたの中の「重力」を、手放す。</h2>
                        <p className="text-gray-500">わずか3ステップで、心に実体と軽さを取り戻す体験。</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="space-y-3">
                            <div className="text-blue-600 font-bold text-xl">01. Write</div>
                            <p className="text-sm text-gray-600 leading-relaxed">今この瞬間の思考、迷い、希望。心にあるものを書き出します。</p>
                        </div>
                        <div className="space-y-3">
                            <div className="text-blue-600 font-bold text-xl">02. Throw</div>
                            <p className="text-sm text-gray-600 leading-relaxed">ボタンを押し、それらを「重力を持つボール」として放ちます。</p>
                        </div>
                        <div className="space-y-3">
                            <div className="text-blue-600 font-bold text-xl">03. Release</div>
                            <p className="text-sm text-gray-600 leading-relaxed">指先を離れた瞬間、それはあなたを前へ進めるエネルギーに変わります。</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 2: Products */}
            <section id="products" className="w-full py-24 bg-gray-50 scroll-mt-20">
                <div className="max-w-6xl mx-auto px-6 space-y-12">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">浮き上がった「声」から、形にする。</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">放たれた思考は、AIと共に具体的な価値へと昇華されます。</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Product 1: Idea Stocker */}
                        <div className="group bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-500">
                            <div className="space-y-6">
                                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[10px] text-blue-600/60 font-bold tracking-widest uppercase block ml-1">Behavior / 判断</span>
                                    <h3 className="text-2xl font-bold text-gray-900">Idea Stocker</h3>
                                </div>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    重力をアイデアへ変換し、AIがあなたの思考の壁打ち相手になる。未整理の断片から、次のアクションを導き出します。
                                </p>
                                <div className="pt-4 flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                                    使ってみる →
                                </div>
                            </div>
                        </div>

                        {/* Product 2: Story Stocker */}
                        <div className="group bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-500">
                            <div className="space-y-6">
                                <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[10px] text-purple-600/60 font-bold tracking-widest uppercase block ml-1">Review / 振り返り</span>
                                    <h3 className="text-2xl font-bold text-gray-900">Story Stocker</h3>
                                </div>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    膨大な思考の断片から、一つの「物語」を紡ぎ出す。クリエイターのための次世代プロット・執筆支援ツール。
                                </p>
                                <div className="pt-4 flex items-center text-purple-600 font-semibold group-hover:translate-x-2 transition-transform">
                                    使ってみる →
                                </div>
                            </div>
                        </div>

                        {/* Coming Soon */}
                        <div className="bg-gray-100/50 p-8 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col justify-center items-center text-center space-y-4">
                            <div className="text-gray-400 font-bold text-xl">Next Solution</div>
                            <p className="text-gray-400 text-xs">皆様の思考の種から、<br />新しい道具を開発中です。</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 3: Use Case */}
            <section id="use-case" className="w-full py-24 bg-white">
                <div className="max-w-4xl mx-auto px-6 space-y-16">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">こんな「瞬間」に、触れてみる。</h2>
                        <p className="text-gray-500">思考が止まったとき、Antigravityはあなたの味方になります。</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex gap-4 p-6 rounded-2xl hover:bg-gray-50 transition-colors">
                            <span className="text-2xl">🧩</span>
                            <div>
                                <h4 className="font-bold text-gray-900">迷いを整理したい時</h4>
                                <p className="text-sm text-gray-600">答えの出ない問いを一度手放し、客観的に眺めることで視点が変わります。</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-6 rounded-2xl hover:bg-gray-50 transition-colors">
                            <span className="text-2xl">✨</span>
                            <div>
                                <h4 className="font-bold text-gray-900">壮大な夢を描く時</h4>
                                <p className="text-sm text-gray-600">まだ形にならない希望をボールに乗せ、未来への期待を膨らませます。</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-6 rounded-2xl hover:bg-gray-50 transition-colors">
                            <span className="text-2xl">🛑</span>
                            <div>
                                <h4 className="font-bold text-gray-900">足が止まった時</h4>
                                <p className="text-sm text-gray-600">タスクや不安に押し潰されそうな時、物理的に「投げる」ことでリセットします。</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-6 rounded-2xl hover:bg-gray-50 transition-colors">
                            <span className="text-2xl">🧠</span>
                            <div>
                                <h4 className="font-bold text-gray-900">アイデアが煮詰まった夜に</h4>
                                <p className="text-sm text-gray-600">既存の枠組みを一度壊し、空っぽになった心に新しい風を吹き込みます。</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 4: Philosophy */}
            <section id="philosophy" className="w-full py-32 bg-gray-900 text-white overflow-hidden relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-600/10 blur-[120px] rounded-full -z-0" />
                <div className="max-w-4xl mx-auto px-6 relative z-10 text-center space-y-12">
                    <div className="space-y-6">
                        <h2 className="text-4xl md:text-5xl font-bold leading-tight">重力を、推進力へ。</h2>
                        <div className="h-1 w-20 bg-blue-500 mx-auto" />
                    </div>
                    <div className="space-y-8 text-gray-300 text-lg leading-relaxed text-left md:text-center">
                        <p>
                            私たちは、心にかかる負荷や迷いを「重力」と呼んでいます。ストレスはその一例に過ぎません。
                        </p>
                        <p>
                            頭の中にあるだけでは、重力はあなたを停滞させます。しかし、それを実体化し、自分から切り離して眺めることで、それはあなたを前へ進める「推進力」へと変換可能です。
                        </p>
                        <p className="text-white font-medium italic">
                            「内面の重化を、軽やかな進化へ。」
                        </p>
                    </div>
                </div>
            </section >

            {/* Section 5: FAQ */}
            < section id="faq" className="w-full py-24 bg-white" >
                <div className="max-w-3xl mx-auto px-6 space-y-12">
                    <h2 className="text-3xl font-bold text-center text-gray-900">よくあるご質問</h2>
                    <div className="space-y-8">
                        <div className="space-y-2">
                            <h4 className="font-bold text-gray-900">Q: どのような内容を書き込めばいいですか？</h4>
                            <p className="text-gray-600 text-sm">A: ストレスはもちろん、アイデア、悩み、希望など、あなたの中にある未整理な思考を何でも受け止めます。</p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-bold text-gray-900">Q: 私が投げた「思考」はどうなりますか？</h4>
                            <p className="text-gray-600 text-sm">A: 投げられた瞬間、それは匿名データに変換されます。画面上で誰かに見られることはなく、Antigravityが新しいツールを作るためのエネルギーとして活用されます。</p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-bold text-gray-900">Q: なぜ「投げる」必要があるのですか？</h4>
                            <p className="text-gray-600 text-sm">A: 頭の中にある「重り」を外に出して、物理的に動く様子を眺めることで、自分を客観視し、心の軽さを取り戻す体験を大切にしているからです。</p>
                        </div>
                    </div>
                </div>
            </section >

            {/* Footer */}
            < footer className="w-full py-20 bg-gray-50 border-t border-gray-100" >
                <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="space-y-2 text-center md:text-left">
                        <h4 className="text-xl font-bold text-gray-900 tracking-tight">Antigravity Inc.</h4>
                        <p className="text-gray-400 text-xs">重力をエネルギーに。未整理な思考を力に変える。</p>
                    </div>
                    <div className="flex gap-8 text-sm text-gray-500">
                        <a href="#" className="hover:text-blue-600 transition-colors">Philosophy</a>
                        <a href="#" className="hover:text-blue-600 transition-colors">Products</a>
                        <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
                    </div>
                    <p className="text-xs text-gray-400">© 2026 Antigravity Inc. All rights reserved.</p>
                </div>
            </footer >
        </main >
    );
}
