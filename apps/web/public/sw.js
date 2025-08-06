const CACHE_NAME = 'lingua-chat-ai-v2';
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
  console.log('Service Worker: インストール開始');
  
  // 即座にアクティブ状態に移行（自動更新のため）
  self.skipWaiting();
  
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
  console.log('Service Worker: アクティベーション開始');
  
  // 既存のクライアント（開いているタブ）もこのService Workerで制御
  self.clients.claim();
  
  event.waitUntil(
    Promise.all([
      // 古いキャッシュの削除
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: 古いキャッシュを削除しました', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 全クライアントに更新完了を通知
      clients.matchAll().then((clientList) => {
        console.log('Service Worker: クライアントに更新通知を送信');
        clientList.forEach((client) => {
          client.postMessage({
            type: 'SERVICE_WORKER_UPDATED',
            version: CACHE_NAME
          });
        });
      })
    ])
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
  
  // 静的リソースはStale-While-Revalidate戦略で対応
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // ネットワークから最新版を取得する処理（非同期で実行）
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            // レスポンスが正常な場合はキャッシュに保存
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                  console.log('Service Worker: キャッシュを更新しました', request.url);
                });
            }
            return networkResponse;
          })
          .catch((error) => {
            console.log('Service Worker: ネットワークエラー、キャッシュを使用', error);
            return cachedResponse; // ネットワークエラー時はキャッシュを返す
          });

        // キャッシュがある場合は即座に返し、裏でネットワークから更新
        if (cachedResponse) {
          console.log('Service Worker: キャッシュから返答', request.url);
          // 裏でネットワークから最新版を取得（次回のために更新）
          fetchPromise.catch(() => {}); // エラーは既にログ出力済みなので無視
          return cachedResponse;
        }
        
        // キャッシュがない場合はネットワークから取得を待つ
        return fetchPromise.catch(() => {
          // ネットワークエラーかつキャッシュもない場合
          if (request.destination === 'document') {
            return caches.match('/offline.html');
          }
          // その他のリソースの場合は適切なエラーレスポンスを返す
          return new Response('リソースが利用できません', {
            status: 503,
            statusText: 'Service Unavailable'
          });
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

// メッセージハンドリング（自動更新用）
self.addEventListener('message', (event) => {
  console.log('Service Worker: メッセージを受信:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: SKIP_WAITING メッセージを受信、即座にアクティブ化します');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    // クライアントにバージョン情報を返送
    event.ports[0].postMessage({
      type: 'VERSION_INFO',
      version: CACHE_NAME
    });
  }
});

// 重複したactivateイベントリスナーを削除（上で統合済み）