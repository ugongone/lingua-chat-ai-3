# 0027 – 速度別音声キャッシュシステムへの移行

## 背景 / Context

既存の音声キャッシュシステム（ADR 0026）では、基本速度(1.0)で生成した音声をWeb Audio APIのplaybackRateで速度変更していた。しかし、低速再生時（0.5倍など）に音質が低下し、聞き取りづらくなる問題が発生していた。この問題はWeb Audio APIの速度変更による音程・音質の劣化に起因していた。

---

## 決定 / Decision

OpenAI TTS APIで各再生速度別に最適化された音声を生成し、テキスト+速度の組み合わせでキャッシュする速度別音声キャッシュシステムに移行する。

---

## 理由 / Rationale

- OpenAI TTS APIの自然な速度調整機能を活用した高品質音声の提供
- 低速再生時の音質劣化を根本的に解決
- 速度別キャッシュにより、同じテキスト・速度の組み合わせでAPI呼び出しを回避
- Web Audio APIの複雑な音質調整処理を排除してシンプルな再生処理に
- よく使用される速度（0.5x, 1.0x, 1.5x等）での効率的なキャッシュ活用

---

## 実装詳細 / Implementation Notes

### 1. AudioCacheクラスの速度対応

```ts
// apps/web/lib/utils.ts
class AudioCache {
  // キャッシュキーを生成（テキスト内容と速度から）
  private generateKey(text: string, speed: number): string {
    const speedKey = speed.toFixed(2) // 0.50, 1.00, 1.50 など
    const textKey = btoa(encodeURIComponent(text)).slice(0, 40)
    return `${textKey}_${speedKey}`
  }

  // 音声をキャッシュに保存
  set(text: string, speed: number, blob: Blob): void {
    const key = this.generateKey(text, speed)
    // TTL管理でキャッシュ自動削除
  }

  // キャッシュから音声を取得
  get(text: string, speed: number): Blob | null {
    const key = this.generateKey(text, speed)
    const entry = this.cache.get(key)
    return entry ? entry.blob : null
  }
}
```

理由:
- テキストと速度を組み合わせたキーハッシュ生成で一意性を確保
- 速度は小数点第2位まで固定フォーマットで正規化
- 既存のTTL管理機能を継承して適切なメモリ管理を維持

### 2. TTSPlayerの速度制御ロジック変更

```ts
// apps/web/lib/audio-player.ts
export class TTSPlayer {
  // TTS APIから音声を取得（キャッシュ優先、速度別対応）
  private async fetchTTS(text: string, speed: number = 1.0): Promise<Blob> {
    // 速度別キャッシュチェック
    const cachedBlob = audioCache.get(text, speed)
    if (cachedBlob) {
      return cachedBlob
    }

    // API呼び出し（常に指定速度で生成）
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, speed }),
    })

    const blob = await response.blob()
    // 速度別キャッシュに保存
    audioCache.set(text, speed, blob)
    return blob
  }

  // テキストを音声で再生（速度別最適化）
  async speak(text: string, playbackRate = 1.0, options: AudioPlayerOptions = {}): Promise<void> {
    // 指定速度で音声データを取得（キャッシュ優先）
    const audioBlob = await this.fetchTTS(text, playbackRate)
    
    // Web Audio APIで基本再生（速度は既に最適化済み）
    await this.audioPlayer.play(audioBlob, 1.0, options)
  }
}
```

理由:
- Web Audio APIのplaybackRateによる音質劣化を回避
- OpenAI TTS APIで各速度に最適化された音声を直接取得
- シンプルな基本再生(1.0)処理で安定性向上
- キャッシュミス時のみAPI呼び出しでコスト最適化

### 3. 音声再生フローの改善

```
テキスト + 速度指定
↓
速度別キャッシュチェック (audioCache.get(text, speed))
├─ ヒット → キャッシュから最適化音声取得
└─ ミス → OpenAI TTS API呼び出し（指定速度）
           ↓
           速度別キャッシュ保存
↓
基本再生（playbackRate=1.0）
├─ Web Audio API → 高品質再生
└─ フォールバック → Audio API再生
```

理由:
- 各速度でOpenAI TTS APIの自然な音声合成を活用
- Web Audio APIの複雑な速度調整処理を排除
- キャッシュヒット率向上による高速レスポンス
- 安定したフォールバック機能の維持

---

## 影響 / Consequences

### 正の影響
- 全速度範囲での高品質音声提供（音質劣化の根本解決）
- よく使用される速度でのキャッシュ効率向上
- OpenAI TTS APIの自然な音声合成機能を最大活用
- シンプルな再生ロジックによる安定性向上
- 低速学習や高速確認などの用途で大幅なUX改善

### 注意点・制約
- キャッシュ使用量の増加（速度数 × テキスト数）
- 初回再生時は各速度別にAPI呼び出しが必要
- 10分TTLによる適切なメモリ管理で使用量制御
- 速度別の初回生成時間は従来と同等

### フォローアップタスク
- キャッシュ使用量の実運用でのモニタリング
- よく使用される速度の分析とキャッシュ戦略最適化

---

## 言語的・技術的なポイント

- OpenAI TTS APIのspeedパラメータによる自然な音声合成の活用
- TypeScriptの型安全性を活用した速度パラメータ管理
- キャッシュキー設計におけるハッシュ衝突回避とメモリ効率のバランス
- Web Audio APIとAudio APIのフォールバック戦略の簡素化
- 単一責任原則に基づく速度制御ロジックの分離

---

## 参考 / References

- [0026 – 音声キャッシュシステムの実装](./0026-audio-cache-system.md)
- [0017 – TTS読み上げ速度制御機能の実装](./0017-ai-response-optimization-tts-speed-control.md) 
- [OpenAI TTS API Documentation](https://platform.openai.com/docs/guides/text-to-speech)

---