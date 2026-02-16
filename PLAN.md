# asqio-sdk-web 実装計画

## Context

asqio 問い合わせシステムの Web SDK を新規実装する。バックエンドの Rails API（`/api/v1`）は実装済みで、OpenAPI 仕様が `/Users/yugo/asqio-backend/contracts/openapi/openapi.yaml` に定義されている。現在 `asqio-sdk-web` リポジトリは空（`.git` のみ）のため、プロジェクトの雛形から全機能を実装する。

**技術選定（ユーザー確認済み）:**
- スタイリング: CSS Modules
- 提供形態: プリビルト UI コンポーネント + React Hooks
- パッケージマネージャー: npm

---

## プロジェクト構成

```
asqio-sdk-web/
├── .gitignore
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── vitest.setup.ts
├── src/
│   ├── index.ts                        # 全 public exports
│   ├── types/
│   │   ├── index.ts
│   │   ├── models.ts                   # Ticket, Message, Device, PaginationMeta
│   │   ├── api.ts                      # リクエスト/レスポンス型、エラーコード
│   │   └── config.ts                   # AsqioConfig
│   ├── client/
│   │   ├── index.ts
│   │   ├── AsqioClient.ts             # fetch ベース HTTP クライアント
│   │   ├── errors.ts                   # AsqioError, AsqioNetworkError
│   │   └── device-info.ts             # ブラウザ情報自動検出
│   ├── context/
│   │   ├── index.ts
│   │   └── AsqioContext.tsx            # AsqioProvider + useAsqioClient
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── useTickets.ts              # スレッド一覧
│   │   ├── useTicket.ts               # スレッド詳細
│   │   ├── useCreateTicket.ts         # スレッド作成
│   │   ├── useMessages.ts             # メッセージ一覧
│   │   ├── useSendMessage.ts          # メッセージ送信
│   │   ├── useMarkAsRead.ts           # 既読更新
│   │   └── useUnreadCount.ts          # 未読スレッド数（ポーリング対応）
│   └── components/
│       ├── index.ts
│       ├── ThreadList/
│       │   ├── ThreadList.tsx
│       │   └── ThreadList.module.css
│       ├── ThreadDetail/
│       │   ├── ThreadDetail.tsx
│       │   └── ThreadDetail.module.css
│       ├── MessageBubble/
│       │   ├── MessageBubble.tsx
│       │   └── MessageBubble.module.css
│       ├── MessageInput/
│       │   ├── MessageInput.tsx
│       │   └── MessageInput.module.css
│       ├── NewThreadForm/
│       │   ├── NewThreadForm.tsx
│       │   └── NewThreadForm.module.css
│       └── AsqioSupport/
│           ├── AsqioSupport.tsx
│           └── AsqioSupport.module.css
└── __tests__/
    ├── client/
    │   ├── AsqioClient.test.ts
    │   └── device-info.test.ts
    ├── hooks/
    │   ├── useTickets.test.tsx
    │   ├── useTicket.test.tsx
    │   ├── useCreateTicket.test.tsx
    │   ├── useSendMessage.test.tsx
    │   └── useUnreadCount.test.tsx
    └── components/
        ├── ThreadList.test.tsx
        ├── ThreadDetail.test.tsx
        └── AsqioSupport.test.tsx
```

---

## 実装ステップ

### Step 1: プロジェクト雛形

- `package.json` — `@asqio/web-sdk` v0.1.0、ESM/CJS dual export、React 18+ を peerDependency
- `tsconfig.json` — strict、`react-jsx`、`moduleResolution: bundler`
- `tsup.config.ts` — ESM + CJS 出力、dts 生成、CSS 外部ファイル出力、React を external
- `vitest.config.ts` + `vitest.setup.ts` — jsdom 環境、CSS Modules 対応
- `.gitignore` — node_modules、dist、.env 等

**devDependencies:** typescript, tsup, vitest, jsdom, react, react-dom, @types/react, @types/react-dom, @testing-library/react, @testing-library/jest-dom

**ランタイム依存: なし**（fetch は native、React は peer dep）

### Step 2: TypeScript 型定義

バックエンドの OpenAPI 仕様に完全準拠した型を定義:

- `src/types/models.ts` — Ticket, TicketWithMessages, Message, Device, PaginationMeta
- `src/types/api.ts` — リクエスト型（CreateTicketParams, SendMessageParams 等）、レスポンス型、ApiErrorCode
- `src/types/config.ts` — AsqioConfig（baseUrl, tenantKey, getToken: async, appVersion?）

### Step 3: API クライアント

- `src/client/errors.ts` — AsqioError（API エラー、code + statusCode）、AsqioNetworkError（通信エラー）
- `src/client/device-info.ts` — navigator.userAgent からの OS/ブラウザ検出、locale、timezone 自動取得
- `src/client/AsqioClient.ts` — 全 10 エンドポイントをラップするクラス:
  - 毎リクエストで `getToken()` を呼び出し（トークンリフレッシュ対応）
  - `Authorization: Bearer <token>` + `X-Tenant-Key` ヘッダー自動付与
  - `createTicket` でデバイス情報を自動補完
  - エラーレスポンスを AsqioError に変換

### Step 4: React Context / Provider

- `src/context/AsqioContext.tsx` — `<AsqioProvider baseUrl tenantKey getToken>` で config を渡す
  - 内部で AsqioClient を useMemo で生成
  - `useAsqioClient()` フックで子コンポーネントからアクセス

### Step 5: React Hooks

各フックは loading/error/data パターンで統一:

| Hook | 機能 | 備考 |
|------|------|------|
| `useTickets` | スレッド一覧取得 | ページネーション、refetch、fetchPage |
| `useTicket` | スレッド詳細取得 | messages 含む |
| `useCreateTicket` | スレッド作成 | mutation パターン |
| `useMessages` | メッセージ一覧取得 | ページネーション |
| `useSendMessage` | メッセージ送信 | mutation パターン |
| `useMarkAsRead` | 既読更新 | |
| `useUnreadCount` | 未読数取得 | pollInterval でポーリング対応 |

### Step 6: UI コンポーネント

| コンポーネント | 役割 |
|------------|------|
| `ThreadList` | スレッド一覧。未読バッジ、ページネーション、`onSelectTicket` コールバック |
| `ThreadDetail` | スレッド詳細。メッセージ一覧 + 入力フォーム。マウント時に既読化 |
| `MessageBubble` | メッセージ表示。user=右寄せ、operator=左寄せ |
| `MessageInput` | テキスト入力 + 送信ボタン。Enter で送信、Shift+Enter で改行 |
| `NewThreadForm` | 新規スレッド作成フォーム。メッセージ（必須）+ タイトル（任意） |
| `AsqioSupport` | メインエントリ。内部で list/detail/new のビュー切替を管理 |

**スタイリング方針:**
- CSS カスタムプロパティ（`--asqio-primary-color` 等）でテーマカスタマイズ可能
- 全コンポーネントに `className` prop でスタイル上書き可能
- CSS Modules でスコープ分離し、利用者のスタイルと衝突しない

### Step 7: テスト

- **クライアントテスト:** fetch モックで全エンドポイントのリクエスト/レスポンスを検証
- **Hooks テスト:** `@testing-library/react` の `renderHook` + AsqioProvider ラッパー
- **コンポーネントテスト:** レンダリング、インタラクション、ビュー遷移

### Step 8: エントリポイント + ビルド確認

- `src/index.ts` — 全 public API を named export
- `npm run build` でビルド確認
- `npm run test` で全テスト通過確認

---

## 主要設計判断

1. **getToken は async** — トークンリフレッシュフローに対応
2. **ランタイム依存なし** — fetch native、React は peer dep のみ
3. **CSS を外部ファイルで出力** — `import '@asqio/web-sdk/styles'` で利用者が制御可能
4. **全て named export** — tree-shaking 対応
5. **AsqioClient を単独エクスポート** — React 以外の環境でも API クライアントとして利用可能

---

## 検証方法

1. `npm run build` — ESM/CJS/dts/CSS が `dist/` に出力されること
2. `npm run test` — 全テスト通過
3. `npm run typecheck` — 型エラーなし
4. ビルド後の `dist/` に以下が含まれること:
   - `index.js` (ESM) / `index.cjs` (CJS) / `index.d.ts` (型定義)
   - `index.css` (CSS Modules バンドル)

---

## 参照ファイル（バックエンド）

- OpenAPI 仕様: `/Users/yugo/asqio-backend/contracts/openapi/openapi.yaml`
- エラーコード: `/Users/yugo/asqio-backend/contracts/schema/error-codes.json`
- ルーティング: `/Users/yugo/asqio-backend/config/routes.rb`
- シリアライザ: `/Users/yugo/asqio-backend/app/serializers/`
- JWT 認証: `/Users/yugo/asqio-backend/app/services/jwt_authenticator.rb`
