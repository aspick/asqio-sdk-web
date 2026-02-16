# @asqio/web-sdk

asqio の Web 向けサポート SDK。React 18+ を前提とした UI コンポーネント・Hooks・API クライアントを提供します。

## インストール

```sh
npm install @asqio/web-sdk
```

React 18 以上が peerDependency として必要です。

## セットアップ

```tsx
import { AsqioProvider } from '@asqio/web-sdk';
import '@asqio/web-sdk/styles';

function App() {
  return (
    <AsqioProvider apiKey="your-api-key" projectId="your-project-id">
      {/* your app */}
    </AsqioProvider>
  );
}
```

## コンポーネント

| コンポーネント | 説明 |
| --- | --- |
| `AsqioSupport` | サポート UI の統合コンポーネント |
| `ThreadList` | チケット一覧 |
| `ThreadDetail` | チケット詳細・メッセージ表示 |
| `MessageBubble` | 個別メッセージの吹き出し |
| `MessageInput` | メッセージ入力フォーム |
| `NewThreadForm` | 新規チケット作成フォーム |

## Hooks

| Hook | 説明 |
| --- | --- |
| `useTickets` | チケット一覧を取得 |
| `useTicket` | 単一チケットを取得 |
| `useCreateTicket` | チケットを作成 |
| `useMessages` | メッセージ一覧を取得 |
| `useSendMessage` | メッセージを送信 |
| `useMarkAsRead` | チケットを既読にする |
| `useUnreadCount` | 未読数を取得 |

## API クライアント

Hooks を使わずに直接 API を呼び出す場合は `AsqioClient` を利用できます。

```ts
import { AsqioClient } from '@asqio/web-sdk';

const client = new AsqioClient({
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
});

const tickets = await client.getTickets();
```

## テーマカスタマイズ

CSS カスタムプロパティ (`--asqio-*`) でスタイルをカスタマイズできます。

```css
:root {
  --asqio-primary-color: #4f46e5;
  --asqio-border-radius: 8px;
}
```

## 開発

```sh
npm install           # 依存関係のインストール
npm run build         # ビルド
npm run typecheck     # 型チェック
npm run test          # テスト実行
npm run test:watch    # テスト (ウォッチモード)
```

## ライセンス

UNLICENSED
