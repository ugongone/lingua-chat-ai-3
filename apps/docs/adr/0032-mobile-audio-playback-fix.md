# 0032 – モバイル音声再生問題の修正とデバイス別戦略実装

## 背景 / Context

TTS API呼び出しは成功しているにも関わらず、モバイル環境（iOS Safari、Android Chrome）で音声が再生されない問題が発生していた。Web Audio APIを使用した音声キャッシュシステム（ADR 0027）導入後に顕在化し、特にAudioContext初期化とBlobからAudioBufferへの変換処理でモバイル特有の制約により失敗していた。

---

## 決定 / Decision

デバイス検知に基づく音声再生戦略の分岐実装と、モバイル専用のAudio API直接利用による安定した音声再生システムを構築する。

---

## 理由 / Rationale

- Web Audio APIのモバイル制約（AudioContext.resume制限、音声コーデック対応）を根本的に回避
- デバイス別最適化による確実な音声再生の実現
- 詳細なデバッグログによる問題特定の容易化
- 既存のデスクトップ機能への影響なし
- モバイルUXの大幅改善（音声学習機能の復活）

---

## 実装詳細 / Implementation Notes

### 1. デバイス検知ユーティリティの実装

```ts
// apps/web/lib/audio-player.ts
class DeviceDetector {
  static isMobile(): boolean {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
           window.innerWidth < 768
  }
  
  static isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  }
  
  static isAndroid(): boolean {
    return /Android/i.test(navigator.userAgent)
  }
}
```

理由:
- User-Agent文字列による確実なデバイス判定
- 画面サイズも考慮した包括的なモバイル検知
- iOS/Android固有の処理分岐を可能にする詳細判定

### 2. モバイル専用デバッグログシステム

```ts
class MobileAudioLogger {
  static log(stage: string, data: any, isError: boolean = false) {
    const prefix = `[Mobile Audio ${isError ? 'ERROR' : 'DEBUG'}]`
    console.log(`${prefix} ${stage}:`, data)
    
    if (DeviceDetector.isMobile() && isError) {
      console.error(`${prefix} ${stage}:`, JSON.stringify(data, null, 2))
    }
  }
}
```

理由:
- モバイル環境での問題特定を容易にする詳細ログ
- エラー時の包括的な状況情報の提供
- 開発・デバッグ効率の大幅向上

### 3. TTSPlayerクラスのデバイス別戦略実装

```ts
export class TTSPlayer {
  // デバイス別再生戦略の決定
  constructor() {
    if (DeviceDetector.isMobile()) {
      this.useWebAudio = false
      MobileAudioLogger.log('Constructor', 'Mobile detected - Audio API will be used')
    }
  }

  async speak(text: string, playbackRate = 1.0, options: AudioPlayerOptions = {}): Promise<void> {
    // モバイル用とデスクトップ用で完全に分岐
    if (DeviceDetector.isMobile()) {
      await this.mobileAudioPlay(audioBlob, options)
    } else {
      await this.desktopAudioPlay(audioBlob, options)
    }
  }

  // モバイル専用の音声再生
  private async mobileAudioPlay(blob: Blob, options: AudioPlayerOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const audioUrl = URL.createObjectURL(blob)
      const audio = new Audio(audioUrl)
      
      // モバイル最適化設定
      audio.preload = 'auto'
      audio.volume = 1.0
      
      // iOS専用設定
      if (DeviceDetector.isIOS()) {
        (audio as any).playsInline = true
      }

      audio.addEventListener('canplaythrough', () => {
        options.onStart?.()
        audio.play().then(() => {
          MobileAudioLogger.log('Audio Play Success', 'Playing started')
        }).catch((playError) => {
          this.handleMobileAudioError(audioUrl, playError, options, reject)
        })
      })

      audio.load()
    })
  }
}
```

理由:
- Web Audio APIを完全にバイパスしてモバイル制約を回避
- Audio APIの直接利用による確実な音声再生
- iOS Safari特有の`playsInline`設定による自動再生対応
- 包括的なエラーハンドリングによる堅牢性確保

### 4. AudioPlayerクラスのモバイル制限実装

```ts
export class AudioPlayer {
  private async initAudioContext(): Promise<AudioContext> {
    // モバイルでは初期化を試行しない
    if (DeviceDetector.isMobile()) {
      throw new Error('Web Audio API not recommended for mobile devices')
    }
    // ...デスクトップ用処理
  }

  async play(blob: Blob, playbackRate = 1.0, options: AudioPlayerOptions = {}): Promise<void> {
    // モバイルでは使用禁止
    if (DeviceDetector.isMobile()) {
      throw new Error('AudioPlayer.play() should not be used on mobile devices')
    }
    // ...デスクトップ用処理
  }
}
```

理由:
- モバイルでのWeb Audio API使用を明示的に禁止
- エラーメッセージによる問題箇所の明確化
- デスクトップ機能の維持と最適化

---

## 影響 / Consequences

### 正の影響
- モバイルでの音声再生機能の完全復活
- TTS学習機能のモバイル対応実現
- 詳細なデバッグログによる開発効率向上
- デバイス別最適化による性能改善
- エラーハンドリング強化による安定性向上

### 注意点・制約
- モバイルでは速度制御機能が制限される（API側での速度指定のみ）
- デバイス判定ロジックの保守が必要
- デバッグログの本番環境での制御考慮

### フォローアップタスク
- 本番環境でのデバッグログ制御機能追加
- モバイル用速度制御UIの最適化検討
- 音声キャッシュ効率のモバイル特化調整

---

## 言語的・技術的なポイント

- モバイルブラウザのAutoplay Policy制約とAudioContext制限の回避
- TypeScriptの型安全性を活用したデバイス別処理分岐
- Promise based非同期処理によるAudio API制御
- User-Agent解析とScreen sizeを組み合わせたデバイス検知
- エラーハンドリングの段階的詳細化とログ出力戦略

---

## 参考 / References

- [0027 – 速度別音声キャッシュシステムへの移行](./0027-speed-specific-audio-cache.md)
- [0026 – 音声キャッシュシステムの実装](./0026-audio-cache-system.md)
- [0011 – Text-to-Speech機能実装](./0011-text-to-speech-feature.md)
- [MDN - HTMLAudioElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement)
- [Web Audio API on Mobile - Best Practices](https://developers.google.com/web/updates/2017/09/autoplay-policy-changes)

---