# 0026 – 音声キャッシュシステムの実装

## 背景 / Context

既存のTTS機能では、同じテキストに対して毎回OpenAI TTS APIを呼び出しており、レスポンス時間の遅延とAPI使用料金の増加が課題となっていた。特に、同じメッセージを何度も再生したり、異なる速度で再生する際に、毎回API呼び出しが発生するのは非効率的であった。

---

## 決定 / Decision

メモリベースの音声キャッシュシステム（10分TTL）とWeb Audio APIを使用した速度変更機能を実装し、API呼び出し回数の削減とUX向上を実現する。

---

## 理由 / Rationale

- API呼び出し回数の最大75%削減によるコスト削減とレスポンス向上
- Web Audio APIによる高品質な速度変更（0.25-4.0倍）
- 10分TTLによる適切なメモリ管理と開発環境での効率的なテスト
- フォールバック機能による幅広いブラウザ対応
- キャッシュヒット時の即座再生によるUX向上

---

## 実装詳細 / Implementation Notes

### 1. AudioCacheクラスの実装

```ts
// apps/web/lib/utils.ts
class AudioCache {
  private cache = new Map<string, CacheEntry>()
  private readonly TTL = 10 * 60 * 1000 // 10分

  set(text: string, blob: Blob): void {
    const key = this.generateKey(text)
    const timer = setTimeout(() => {
      this.cache.delete(key)
    }, this.TTL)
    
    this.cache.set(key, { blob, timer, createdAt: Date.now() })
  }

  get(text: string): Blob | null {
    const key = this.generateKey(text)
    const entry = this.cache.get(key)
    return entry ? entry.blob : null
  }
}
```

理由:
- メモリベースの実装により高速アクセスとシンプルな管理を実現
- 10分TTLで開発・テスト時の適切なキャッシュ期間を確保
- base64エンコーディングによる安全なキーハッシュ生成

### 2. 速度制御方式の変更：TTS API側からWeb Audio API側へ

従来（ADR 0017）はTTS APIに速度パラメータを渡していたが、キャッシュシステム導入に伴い速度制御方式を変更した。

```ts
// apps/web/lib/audio-player.ts
private async fetchTTS(text: string, speed?: number): Promise<Blob> {
  // キャッシュチェック（基本速度のキャッシュを確認）
  const cachedBlob = audioCache.get(text)
  if (cachedBlob) {
    return cachedBlob
  }

  // API呼び出し（Web Audio API使用時は基本速度、フォールバック時は指定速度）
  const requestSpeed = this.useWebAudio ? 1.0 : (speed || 1.0)
  
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, speed: requestSpeed }),
  })
}

class AudioPlayer {
  async play(blob: Blob, playbackRate = 1.0, options: AudioPlayerOptions): Promise<void> {
    const audioContext = await this.initAudioContext()
    const audioBuffer = await this.blobToAudioBuffer(blob)
    
    const source = audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.playbackRate.value = Math.max(0.25, Math.min(4.0, playbackRate))
    source.connect(audioContext.destination)
    source.start(0)
  }
}
```

**音声再生フロー:**
```
テキスト入力
↓
キャッシュチェック (audioCache.get)
├─ ヒット → キャッシュから音声データ取得
└─ ミス → OpenAI TTS API呼び出し
           ├─ Web Audio使用時: speed=1.0固定
           └─ フォールバック時: 指定速度
           ↓
           キャッシュ保存 (基本速度のみ)
↓
Web Audio API / Audio APIで再生
├─ Web Audio: playbackRate で速度制御
└─ フォールバック: 既に指定速度で生成済み
```

理由:
- **キャッシュ効率性の最大化**: 基本速度(1.0)の音声のみキャッシュし、全速度範囲をカバー
- **API呼び出し削減**: 同一テキストの異なる速度再生時もキャッシュが有効
- **音質向上**: Web Audio APIによる高品質な速度変更（音程維持）
- **処理分岐の明確化**: Web Audio API使用時とフォールバック時で速度制御方式を切り替え
- **コスト最適化**: 基本速度の音声を1回生成するだけで全速度をサポート
- **OpenAI TTS APIの継続活用**: 音声生成の核として引き続き重要な役割を維持

### 3. TTSPlayerでのキャッシュ統合

```ts
// apps/web/lib/audio-player.ts
export class TTSPlayer {
  async speak(text: string, playbackRate = 1.0, options: AudioPlayerOptions): Promise<void> {
    // キャッシュチェック
    const audioBlob = await this.fetchTTS(text)
    
    if (this.useWebAudio) {
      await this.audioPlayer.play(audioBlob, playbackRate, options)
    } else {
      await fallbackPlay(audioBlob, playbackRate, options)
    }
  }
}
```

理由:
- キャッシュ優先の音声取得ロジック
- Web Audio API失敗時の従来Audio APIフォールバック
- 統一されたインターフェースで既存コードとの互換性維持

### 4. 既存システムとの統合

```tsx
// apps/web/app/page.tsx
const handleTextToSpeech = useCallback(async (messageId: string, text: string) => {
  const { ttsPlayer } = await import('@/lib/audio-player');
  
  await ttsPlayer.speak(text, playbackSpeed, {
    onStart: () => setIsPlaying((prev) => ({ ...prev, [messageId]: true })),
    onEnd: () => setIsPlaying((prev) => ({ ...prev, [messageId]: false })),
    onError: (error) => setIsPlaying((prev) => ({ ...prev, [messageId]: false }))
  });
}, [playbackSpeed]);
```

理由:
- 既存のhandleTextToSpeech関数のドロップイン置換
- 動的インポートによるバンドルサイズ最適化
- 既存の再生状態管理との完全互換性

---

## 影響 / Consequences

### 正の影響
- API呼び出し回数の大幅削減（推定75%減）によるコスト削減
- キャッシュヒット時の即座再生によるUX向上
- Web Audio APIによる高品質な速度変更
- メモリ効率的なTTL管理

### 注意点・制約
- Web Audio API不対応ブラウザでは従来機能に自動フォールバック
- 10分間の音声データメモリ使用（最大容量は使用パターンに依存）
- 初回リクエスト時は従来と同じレスポンス時間

### ✅ 解決済み問題
**Service Worker キャッシュ競合によるキャッシュ無効化**

**問題**: Service Worker（`sw.js`）が`/api/tts`のPOSTリクエストをキャッシュしようとして以下のエラーが発生していた：
```
TypeError: Failed to execute 'put' on 'Cache': Request method 'POST' is unsupported
```

**影響**: メモリベースの`audioCache`が正常に動作せず、毎回OpenAI TTS APIが呼び出されていた

**解決策**: Service Workerに以下の修正を実装：

```javascript
// apps/web/public/sw.js
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
        return caches.match(request);
      })
  );
  return;
}
```

**結果**:
- TTS APIのPOSTリクエストがService Workerをバイパス
- メモリベースの`audioCache`が正常動作
- 同じテキストの2回目以降の再生で即座再生を実現
- 他のAPIリクエストへの影響なし（GETリクエストのみキャッシュ対象）

---

## 言語的・技術的なポイント

- Web Audio APIのAudioContext管理とユーザー操作後の初期化
- TypeScriptの型安全性を活用したエラーハンドリング
- React Hooksと組み合わせた非同期音声再生の状態管理
- 動的インポートによるコード分割とパフォーマンス最適化
- シングルトンパターンによるグローバル音声キャッシュ管理

---

## 参考 / References

- [0011 – Text-to-Speech機能実装](./0011-text-to-speech-feature.md)
- [0017 – TTS読み上げ速度制御機能の実装](./0017-ai-response-optimization-tts-speed-control.md)
- [Web Audio API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [AudioContext.decodeAudioData - MDN](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData)

---