const CACHE_NAME = 'lingua-chat-ai-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/offline.html',
  // 静的アセット
  '/_next/static/css/',
  '/_next/static/js/',
  // フォント
  '/fonts/GeistVF.woff',
  '/fonts/GeistMonoVF.woff',
];

// インストール時にキャッシュを作成
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: キャッシュを作成しました');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: キャッシュの作成に失敗しました', error);
      })
  );
});

// アクティベーション時に古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: 古いキャッシュを削除しました', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// ネットワークリクエストをインターセプト
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // API リクエストは常にネットワークを優先
  if (request.url.includes('/api/')) {
    // TTS APIのPOSTリクエストはキャッシュ対象外（メモリキャッシュを使用）
    if (request.url.includes('/api/tts') && request.method === 'POST') {
      event.respondWith(fetch(request));
      return;
    }
    
    event.respondWith(
      fetch(request)
        .then((response) => {
          // レスポンスが正常で、かつGETリクエストの場合のみキャッシュ
          if (response.status === 200 && request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // ネットワークエラーの場合はキャッシュから返す
          return caches.match(request);
        })
    );
    return;
  }
  
  // 静的リソースはキャッシュファーストで対応
  event.respondWith(
    caches.match(request)
      .then((response) => {
        // キャッシュにある場合はそれを返す
        if (response) {
          return response;
        }
        
        // キャッシュにない場合はネットワークから取得
        return fetch(request)
          .then((response) => {
            // レスポンスが無効な場合はそのまま返す
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // レスポンスをキャッシュに保存
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // ネットワークエラーの場合はオフラインページを表示
            if (request.destination === 'document') {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// バックグラウンド同期（将来の拡張用）
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // バックグラウンドでの同期処理
      console.log('Service Worker: バックグラウンド同期を実行しました')
    );
  }
});

// プッシュ通知（将来の拡張用）
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});