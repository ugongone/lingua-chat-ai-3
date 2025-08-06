# 0043 – PWA 自動アップデート機能の実装

## 背景 / Context

PWA（Progressive Web App）として運用しているアプリケーションで、ユーザーがホーム画面に追加した後も、新しい機能やバグ修正を自動的に適用したいという要件があった。従来の実装では、Service Worker は手動更新が必要で、特に iOS Safari では更新チェックが 24 時間以上遅れることがあり、ユーザーが最新版を利用できない問題があった。

---

## 決定 / Decision

Service Worker の自動更新機能と手動更新 UI を両方実装し、「基本は自動、必要時は手動」という二段構えのアップデート戦略を採用する。

---

## 理由 / Rationale

- iOS Safari は更新チェックが 24 時間以上遅延することがあり、重要な修正を即座に適用できない
- ユーザーに更新プロセスの透明性を提供し、任意のタイミングでの更新を可能にする
- Stale-While-Revalidate 戦略でオフライン動作とリアルタイム更新を両立
- Service Worker の `skipWaiting()` と `clients.claim()` で即座にアクティブ化を実現

---

## 実装詳細 / Implementation Notes

### 1. 更新通知 UI コンポーネント

```tsx
// components/ui/update-notification.tsx
export function UpdateNotification({ registration }: UpdateNotificationProps) {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  
  const handleUpdateNow = async () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    // Service Workerがcontrollerに変更されるのを待ってリロード
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  };
}
```

理由:
- 新バージョン検知時にバナーを表示し、ユーザーが更新タイミングをコントロール可能
- iOS Safari 向けに特別なメッセージと説明を表示
- `SKIP_WAITING` メッセージで Service Worker に即座の有効化を指示

### 2. Service Worker 登録コンポーネント

```tsx
// components/service-worker-register.tsx
const registerServiceWorker = async () => {
  const reg = await navigator.serviceWorker.register('/sw.js', {
    updateViaCache: 'none', // HTTPキャッシュをバイパス
  });
  
  // 定期更新チェック（1時間毎）
  setInterval(async () => {
    await reg.update();
  }, 60 * 60 * 1000);
  
  return reg;
};
```

理由:
- `updateViaCache: 'none'` で常にネットワークから最新の Service Worker をチェック
- 1 時間毎の定期更新チェックで iOS Safari の遅延問題を軽減
- フォーカス時の強制更新チェックでアプリ復帰時に確実に更新

### 3. Service Worker 自動更新機能

```js
// public/sw.js
self.addEventListener('install', (event) => {
  self.skipWaiting(); // 即座にアクティブ状態に移行
  // キャッシュ処理...
});

self.addEventListener('activate', (event) => {
  self.clients.claim(); // 既存のタブも制御下に
  // 全クライアントに更新完了を通知
  clients.matchAll().then((clientList) => {
    clientList.forEach((client) => {
      client.postMessage({ type: 'SERVICE_WORKER_UPDATED', version: CACHE_NAME });
    });
  });
});
```

理由:
- `skipWaiting()` で waiting 状態をスキップし即座に有効化
- `clients.claim()` で既存の開いているタブも新 Worker が制御
- クライアントへの通知で UI 側での更新処理を可能に

### 4. Stale-While-Revalidate キャッシュ戦略

```js
// キャッシュから即座に返し、裏でネットワークから更新
if (cachedResponse) {
  fetchPromise.catch(() => {}); // 裏で更新処理
  return cachedResponse; // キャッシュを即座に返す
}
```

理由:
- ユーザーに高速な応答を提供しつつ、バックグラウンドで最新版を取得
- オフライン時もキャッシュから動作継続
- 次回アクセス時には常に最新版が利用可能

---

## 影響 / Consequences

- Service Worker の更新が自動化され、ユーザー体験が向上
- iOS Safari と Android Chrome の両プラットフォームで一貫した更新体験を提供
- キャッシュ戦略の最適化により、オフライン動作性能が向上
- 既存の PWA インストール機能は維持され、機能が分離・整理された

---

## 言語的・技術的なポイント

- Next.js App Router での Service Worker 登録は `'use client'` コンポーネントで実行
- React hooks を使った Service Worker 状態管理とライフサイクル制御
- TypeScript での Service Worker 関連型定義とイベントハンドリング
- PWA manifest との連携維持とプラットフォーム差異への対応

---

## Q&A / 技術理解のためのポイント

### Q1: なぜ自動更新と手動更新の両方を実装したのか？

**Q: 自動更新だけでは不十分な理由は？**

**A: iOS Safari の更新チェックが 24 時間以上遅れることがあり、重要なバグ修正やセキュリティ更新を即座に適用できないため。手動更新 UI があることで、ユーザーが任意のタイミングで確実に最新版に更新できる。**

### Q2: skipWaiting() と clients.claim() の違いは？

**Q: この2つの API の役割分担は？**

**A: `skipWaiting()` は新しい Service Worker を即座に active 状態にし、`clients.claim()` は既存の開いているタブも新しい Worker で制御するようになる。両方使うことで、ユーザーがページをリロードしなくても新 Worker が有効になる。**

### Q3: Stale-While-Revalidate戦略の利点は？

**Q: キャッシュファーストとの違いは？**

**A: キャッシュから即座にレスポンスを返しつつ、バックグラウンドでネットワークから最新版を取得する。これにより高速な応答と常に最新のコンテンツ配信を両立できる。キャッシュファーストは更新が遅れがちだが、この戦略は次回アクセス時に最新版が利用可能になる。**

---

## 参考 / References

- [0020-pwa-implementation.md](/apps/docs/adr/0020-pwa-implementation.md) - 基本的な PWA 実装
- [Service Worker Update Lifecycle | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers#updating_your_service_worker)
- [Stale-While-Revalidate | web.dev](https://web.dev/stale-while-revalidate/)

---