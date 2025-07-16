# 0020 – PWA（Progressive Web App）実装によるネイティブアプリ化

## 背景 / Context

iPhoneでWebアプリをネイティブアプリのように動作させる要求があり、「ホーム画面に追加」機能を活用したPWA化が必要となった。既存のWebアプリはPWA機能が一切実装されていない状態で、ユーザーエクスペリエンスの向上と、アプリのような使用感を実現する必要がある。

---

## 決定 / Decision

Next.jsプロジェクトにPWA機能（Web App Manifest、Service Worker、インストールプロンプト）を実装し、iOS Safari及びAndroid Chromeでのネイティブアプリ化を実現する。

---

## 理由 / Rationale

- iPhoneでの「ホーム画面に追加」によるアプリ化を実現
- オフライン機能による可用性向上
- ブラウザUIの非表示によるネイティブアプリ体験
- 音声チャットアプリとしての没入感向上
- 追加のアプリストア申請なしでの配布

---

## 実装詳細 / Implementation Notes

### 1. Web App Manifest の作成

```json
{
  "name": "Lingua Chat AI",
  "short_name": "Lingua Chat",
  "description": "AI-powered voice chat application with real-time speech recognition and text-to-speech",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait",
  "scope": "/",
  "lang": "ja",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512", 
      "type": "image/png",
      "purpose": "maskable any"
    }
  ]
}
```

理由:
- `standalone` モードでブラウザUIを非表示
- 日本語対応（lang: "ja"）
- 縦向き固定でモバイル最適化
- 各種サイズのアイコン対応

### 2. Service Worker の実装

```javascript
const CACHE_NAME = 'lingua-chat-ai-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/_next/static/css/',
  '/_next/static/js/',
  '/fonts/GeistVF.woff',
  '/fonts/GeistMonoVF.woff',
];

self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // API リクエストは常にネットワークを優先
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }
  
  // 静的リソースはキャッシュファースト
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(request);
      })
  );
});
```

理由:
- API通信は常にネットワークを優先し、フォールバック用にキャッシュ
- 静的リソースはキャッシュファーストで高速化
- 音声認識・AI応答機能の特性を考慮したキャッシュ戦略

### 3. PWA インストールプロンプトの実装

```tsx
export function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Service Worker の登録
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker 登録成功:', registration);
        })
        .catch((error) => {
          console.error('Service Worker 登録失敗:', error);
        });
    }

    // PWA インストールプロンプトの処理
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };
}
```

理由:
- ユーザーフレンドリーなインストールプロンプト
- Service Worker の自動登録
- iOS Safari および Android Chrome での対応

### 4. Next.js メタデータの設定

```tsx
export const metadata: Metadata = {
  title: "Lingua Chat AI",
  description: "AI-powered voice chat application with real-time speech recognition and text-to-speech",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lingua Chat AI",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
  themeColor: "#000000",
};
```

理由:
- iOS Safari での「ホーム画面に追加」対応
- ビューポートの固定でネイティブアプリ感を演出
- テーマカラーの統一

---

## 影響 / Consequences

- ユーザーはiPhoneのホーム画面からアプリのようにアクセス可能
- オフライン時でも基本的なUI表示が可能
- Service Workerによる静的リソースの高速化
- 音声認識・AI応答はネットワーク必須のため、オフライン時は制限あり
- PWA用アイコン（192x192、512x512、180x180）の追加生成が必要

---

## 言語的・技術的なポイント

- Next.js 15のApp Routerでのメタデータ設定
- Service WorkerとNext.jsの静的ファイルキャッシュの両立
- iOS SafariとAndroid Chromeでの挙動差異への対応
- 音声認識APIとPWAの組み合わせでのUX設計

---

## 参考 / References

- [0001-speech-recognition.md](./0001-speech-recognition.md) - 音声認識機能との連携
- [0002-ai-response-integration.md](./0002-ai-response-integration.md) - AI応答機能との連携
- [0011-text-to-speech-feature.md](./0011-text-to-speech-feature.md) - 音声合成機能との連携