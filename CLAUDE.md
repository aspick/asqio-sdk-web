# asqio-sdk-web

asqio の Web 向けサポート SDK（`@asqio/web-sdk`）。React 18+ を前提とした UI コンポーネント・Hooks・API クライアントを提供する。

## Tech Stack

- **Language**: TypeScript 5.7+
- **UI**: React 18+ (peerDependency)
- **Bundler**: tsup (ESM + CJS dual export)
- **Test**: Vitest + @testing-library/react + jsdom
- **Styling**: CSS Modules (`.module.css`)

## Project Structure

```
src/
├── types/          # TypeScript 型定義 (models, api, config)
├── client/         # API クライアント (AsqioClient, errors, device-info)
├── context/        # React Context / Provider (AsqioProvider)
├── hooks/          # React Hooks (useTickets, useTicket, useSendMessage, etc.)
├── components/     # UI コンポーネント (ThreadList, ThreadDetail, etc.)
│   └── */          # 各コンポーネントは ComponentName/ ディレクトリに .tsx + .module.css
└── index.ts        # Public API エントリポイント
__tests__/
├── client/         # AsqioClient テスト
├── hooks/          # Hooks テスト
└── components/     # コンポーネントテスト
```

## Commands

```sh
npm run build       # tsup でビルド (dist/ に出力)
npm run typecheck   # tsc --noEmit で型チェック
npm run test        # vitest run でテスト実行
npm run test:watch  # vitest でウォッチモード
```

## Conventions

- コンポーネントは `src/components/ComponentName/ComponentName.tsx` + `.module.css` の構成
- CSS カスタムプロパティ (`--asqio-*`) でテーマカスタマイズ可能
- Hooks は `loading` / `error` / `data` パターンで統一
- API 仕様は `../asqio-backend/contracts/openapi/openapi.yaml` に準拠
- エラーコードは `../asqio-backend/contracts/schema/error-codes.json` に準拠

## API Spec Reference

バックエンドの OpenAPI 仕様は `../asqio-backend/contracts/openapi/openapi.yaml` にある。型定義やエンドポイントの変更時は必ず参照すること。
