This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

\`\`\`bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying \`app/page.tsx\`. The page auto-updates as you edit the file.

This project uses [\`next/font\`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Maintenance Mode & Dev Bypass

### Maintenance Mode
本番環境では、`middleware.ts` 内の `MAINTENANCE_MODE` が `true` (または環境変数 `NEXT_PUBLIC_MAINTENANCE_MODE` が `true` / 未設定) の場合、全アクセスがメンテナンス画面へリダイレクトされます。
解除するには、環境変数 `NEXT_PUBLIC_MAINTENANCE_MODE=false` を設定します。

### Dev Bypass (開発者用抜け道)
メンテナンスモード中でも、特定のURLからToken付きでアクセスすることで、HttpOnly Cookie (`dev_bypass=1`) を発行し、通常通りサイトを閲覧・操作できます。

#### 1. 有効化 (Unlock)
ブラウザで以下のURLにアクセスしてください。
\`\`\`
https://hub.ma-encraft.com/dev/unlock?token={DEV_BYPASS_TOKEN}
\`\`\`
- `DEV_BYPASS_TOKEN`: Vercel等の環境変数に設定したシークレットトークン。
- 成功するとトップページへリダイレクトされ、以降12時間はメンテ画面を回避できます。

#### 2. 無効化 (Lock)
作業完了後、以下のURLにアクセスするとCookieが削除され、メンテ画面に戻ります。
\`\`\`
https://hub.ma-encraft.com/dev/lock
\`\`\`

### 運用上の注意
- **Tokenの管理**: `DEV_BYPASS_TOKEN` は外部に漏れないよう厳重に管理してください。漏洩した場合は直ちに環境変数を変更し、再デプロイしてください。
- **Cookie設定**: Cookieは `HttpOnly`, `Secure` 属性が付与されるため、JavaScriptからはアクセスできません。また、HTTPS環境（localhost含む）でのみ有効です。
