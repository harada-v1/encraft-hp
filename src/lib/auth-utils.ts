/**
 * return_to パスのバリデーション
 * - 相対パスのみ許可
 * - 認証系パスを拒否（無限ループ防止）
 */
export function validateReturnTo(returnTo: string | null): string {
    if (!returnTo) return '/';

    // 外部ドメインへの遷移を防止（相対パスのみ許可）
    // ※ // で始まる場合も外部オリジンの可能性があるため除外
    if (returnTo.startsWith('http') || returnTo.startsWith('//')) {
        console.warn(`[AuthUtils] External return_to blocked: ${returnTo}`);
        return '/';
    }

    // 認証関連パスへの遷移を防止（無限ループ対策）
    const forbiddenPaths = ['/login', '/signup', '/auth/callback'];
    if (forbiddenPaths.some(path => returnTo.startsWith(path))) {
        console.warn(`[AuthUtils] Forbidden return_to blocked: ${returnTo}`);
        return '/';
    }

    return returnTo;
}

/**
 * StoryプロジェクトへのリダイレクトURLを構築
 * - from_hub=1 を必ず付与
 */
export function buildStoryRedirectUrl(path: string): string {
    const origin = process.env.NEXT_PUBLIC_STORY_APP_ORIGIN;
    if (!origin) {
        console.error('[AuthUtils] NEXT_PUBLIC_STORY_APP_ORIGIN is not defined');
        return path;
    }

    try {
        const url = new URL(path, origin);
        url.searchParams.set('from_hub', '1');
        return url.toString();
    } catch (e) {
        console.error(`[AuthUtils] Failed to build redirect URL for path: ${path}`, e);
        return path;
    }
}
