# Dev Bypass Specification

メンテナンスモード中であっても、開発者や関係者が動作確認を行うための「抜け道（Bypass）」機能の仕様。

## 概要

特定のトークン付きURLにアクセスすることで、ブラウザにHttpOnly Cookieを付与し、ミドルウェアでのメンテナンス画面リダイレクトを回避する。

## エンドポイント

### 1. Unlock (Cookie発行)
- **URL**: `/dev/unlock?token={DEV_BYPASS_TOKEN}`
- **Method**: `GET`
- **Logic**:
    - クエリパラメータ `token` を環境変数 `DEV_BYPASS_TOKEN` と照合。
    - 一致時: `dev_bypass=1` Cookie を発行し、トップページ `/` へリダイレクト。
    - 不一致またはトークン未設定時: 401 Unauthorized または 500 Internal Server Error を返す。

### 2. Lock (Cookie削除)
- **URL**: `/dev/lock`
- **Method**: `GET`
- **Logic**:
    - `dev_bypass` Cookie を削除（期限切れ設定）し、`/maintenance` へリダイレクト。

## Cookie 仕様

- **Name**: `dev_bypass`
- **Value**: `1`
- **HttpOnly**: `true` (XSS対策)
- **Secure**: `true` (Production時)
- **SameSite**: `lax`
- **Path**: `/`
- **MaxAge**: 12時間 (43200秒)

## Middleware 挙動

メンテナンスモード (`MAINTENANCE_MODE = true`) の場合：

1. **パスチェック**: `/api/*`, `/_next/*`, `/favicon.ico`, `/dev/*`, `/maintenance` は常に許可（スルー）。
2. **Cookieチェック**: `dev_bypass` Cookie が存在すれば許可（スルー）。
3. **リダイレクト**: 上記以外は `/maintenance` へリダイレクト。
