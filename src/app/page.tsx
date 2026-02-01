import React from 'react';
import { HeroSection } from '@/components/HeroSection';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function Home() {
    // Fetch count from Supabase
    const { count } = await supabaseServer
        .from('stress_balls')
        .select('*', { count: 'exact', head: true });

    // Calculate initial count: 80 (base) + count (db), max 300
    const dbCount = count || 0;
    const initialCount = Math.min(80 + dbCount, 300);

    return (
        <main className="w-full min-h-screen bg-white">
            {/* Hero Section */}
            <HeroSection
                initialCount={initialCount}
                maxCount={300}
                colors={['#1A1A1B', '#3B82F6', '#94A3B8']}
            />

            {/* Section 1: Philosophy / Mission */}
            <section className="w-full py-24 bg-white">
                <div className="max-w-4xl mx-auto px-6 text-center space-y-12">
                    <div className="space-y-8">
                        <div>
                            <span className="text-blue-600 font-semibold tracking-widest uppercase text-sm block mb-6">Our Philosophy</span>
                            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                                重力を、<br className="md:hidden" />エネルギーに変える。
                            </h2>
                        </div>
                        <div className="space-y-8">
                            <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
                                日々感じるプレッシャーやストレス。それは目に見えない「重り」です。<br />
                                私たちはそれをただ耐えるのではなく、投げて、可視化し、<br />
                                新たな推進力（アンチグラビティ）へと変換する技術を探求しています。
                            </p>
                            <p className="text-xl font-medium text-gray-900">
                                投げられた「声」から、本質的なプロダクトを作る。
                            </p>
                        </div>
                    </div>

                    {/* Visual separator line */}
                    <div className="w-px h-24 bg-gradient-to-b from-blue-600/0 via-blue-600/50 to-blue-600/0 mx-auto" />
                </div>
            </section>

            {/* Section 2: Value / Mechanism */}
            <section className="w-full py-24 bg-gray-50">
                <div className="max-w-6xl mx-auto px-6 space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Card 1 */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">01</div>
                            <h3 className="text-xl font-bold text-gray-900">Visualize</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                見えないストレスをデジタルの球体として実体化。
                                客観視することで、心にかかる負荷の輪郭を捉えます。
                            </p>
                            <div className="h-32 bg-gray-100 rounded-lg w-full animate-pulse mt-4" />
                        </div>

                        {/* Card 2 */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">02</div>
                            <h3 className="text-xl font-bold text-gray-900">Release</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                物理演算を用いた「投げる」アクション。
                                溜め込んだ感情を指先から解き放つ、カタルシスある体験を提供します。
                            </p>
                            <div className="h-32 bg-gray-100 rounded-lg w-full animate-pulse mt-4" />
                        </div>

                        {/* Card 3 */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">03</div>
                            <h3 className="text-xl font-bold text-gray-900">Transform</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                集まったデータは集合知となり、組織や社会の課題解決へ。
                                個人の「重力」が、社会を動かす「エネルギー」に変わります。
                            </p>
                            <div className="h-32 bg-gray-100 rounded-lg w-full animate-pulse mt-4" />
                        </div>
                    </div>

                    {/* Privacy Note */}
                    <p className="text-center text-xs text-gray-400">
                        ※ 投稿された内容は統計的に処理され、個人が特定される形で公開されることはありません。安心してお使いください。
                    </p>
                </div>
            </section>

            {/* Section 3: Product / LP Hub */}
            <section className="w-full py-24 bg-white">
                <div className="max-w-6xl mx-auto px-6 space-y-12">
                    <div className="text-center space-y-4">
                        <span className="text-blue-600 font-semibold tracking-widest uppercase text-sm">Products</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Our Solutions</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            皆様の「声」から生まれたプロジェクトたち。
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Product 1: Idea Stocker */}
                        <div className="group relative bg-gray-50 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
                            <div className="h-48 bg-gray-200 w-full" />
                            <div className="p-8 space-y-4">
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Idea Stocker</h3>
                                <p className="text-gray-600 text-sm">
                                    その瞬間のひらめきを逃さない。<br />
                                    AIが壁打ち相手になる、次世代メモアプリ。
                                </p>
                                <div className="pt-4 flex items-center text-blue-600 font-medium text-sm">
                                    View Details →
                                </div>
                            </div>
                        </div>

                        {/* Product 2: Story Stocker */}
                        <div className="group relative bg-gray-50 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
                            <div className="h-48 bg-gray-200 w-full" />
                            <div className="p-8 space-y-4">
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Story Stocker</h3>
                                <p className="text-gray-600 text-sm">
                                    物語の種を育てよう。<br />
                                    クリエイターのための構成・執筆支援ツール。
                                </p>
                                <div className="pt-4 flex items-center text-blue-600 font-medium text-sm">
                                    View Details →
                                </div>
                            </div>
                        </div>

                        {/* Product 3: Coming Soon */}
                        <div className="group relative bg-gray-50 rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 hover:border-blue-200 transition-all duration-300 opacity-80">
                            <div className="h-48 bg-gray-100 w-full flex items-center justify-center text-gray-300 font-bold text-3xl">
                                ?
                            </div>
                            <div className="p-8 space-y-4">
                                <h3 className="text-xl font-bold text-gray-400">Next Product</h3>
                                <p className="text-gray-400 text-sm">
                                    現在、皆様のストレスデータから<br />
                                    新しいソリューションを開発中です。
                                </p>
                                <div className="pt-4 flex items-center text-gray-400 font-medium text-sm uppercase tracking-wider">
                                    Coming Soon
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 4: Company Profile */}
            <section className="w-full py-24 bg-white border-t border-gray-100">
                <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start gap-12">
                    <div className="space-y-4">
                        <h4 className="text-2xl font-bold text-gray-900">Antigravity Inc.</h4>
                        <p className="text-gray-500 text-sm">
                            〒100-0000<br />東京都渋谷区...
                        </p>
                    </div>
                    <div className="space-y-2 text-right md:text-left">
                        <div className="flex gap-4 text-sm font-medium text-gray-600">
                            <a href="#" className="hover:text-blue-600">About Us</a>
                            <a href="#" className="hover:text-blue-600">Services</a>
                            <a href="#" className="hover:text-blue-600">Contact</a>
                        </div>
                        <p className="text-xs text-gray-400 mt-8">
                            © 2026 Antigravity Inc. All rights reserved.
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}
