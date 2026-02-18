export default function MaintenancePage() {
    return (
        <main className="min-h-screen flex items-center justify-center px-6">
            <div className="w-full max-w-xl text-center space-y-4">
                <div className="text-5xl">🛠️</div>
                <h1 className="text-2xl font-semibold">現在メンテナンス中です</h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    認証基盤の調整のため、一時的に新規登録・ログインを停止しています。復旧次第、順次再開します。
                </p>
                <div className="pt-2 text-xs text-muted-foreground">
                    ご不便をおかけしますが、しばらくお待ちください。
                </div>
            </div>
        </main>
    );
}
