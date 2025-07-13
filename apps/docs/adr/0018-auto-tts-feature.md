# 0018 – 自動音声読み上げ機能の実装

## 背景 / Context

ユーザーがフッターで自動読み上げボタンを有効にした場合、AIからの返答が自動で音声読み上げされる機能が求められていた。現在は手動でボタンを押さないとTTS機能を使用できないため、UXの改善が必要だった。

**発生した問題:**
- 初期実装では同じメッセージが何回も読み上げられる重複実行が発生
- 自動読み上げ機能をONにした時点で既存のメッセージも読み上げられてしまう
- useEffectの依存配列による無限再実行の問題

---

## 決定 / Decision

`autoPlayAudio` 状態がtrueの場合、AIの応答メッセージが追加された際に自動でTTS機能を実行する仕組みを実装する。useRefを使用した安定した状態管理により、重複実行防止と適切なタイミング制御を実現する。

---

## 理由 / Rationale

- ユーザーが明示的に自動読み上げを有効にした場合の期待に応える
- 既存のTTS機能とautoPlayAudio状態を活用し、コードの重複を避ける
- 手動操作を減らして音声チャットのUXを向上させる
- useRefによる状態管理で React のライフサイクルに影響されない安定した実行を保証
- メッセージIDのタイムスタンプ特性を活用した効率的な時間比較

---

## 実装詳細 / Implementation Notes

### 1. useRefを使った安定した状態管理

```ts
const autoPlayedMessagesRef = useRef<Set<string>>(new Set());
const autoPlayStartTimeRef = useRef<number | null>(null);
```

理由:

- **依存配列問題の解決**: useStateではuseEffectの依存配列に含める必要があり、無限再実行が発生
- **autoPlayedMessagesRef**: 一度自動読み上げしたメッセージIDを記録し、重複実行を防ぐ
- **autoPlayStartTimeRef**: 自動読み上げ機能をONにした時点のタイムスタンプを記録
- **refの特性**: 値が変更されても再レンダリングを引き起こさない

### 2. 自動読み上げ開始時点の記録

```ts
// Track when auto-play is enabled
useEffect(() => {
  if (autoPlayAudio && autoPlayStartTimeRef.current === null) {
    autoPlayStartTimeRef.current = Date.now();
  } else if (!autoPlayAudio) {
    autoPlayStartTimeRef.current = null;
    autoPlayedMessagesRef.current.clear();
  }
}, [autoPlayAudio]);
```

理由:

- autoPlayAudioがONになった時のタイムスタンプを記録
- autoPlayAudioがOFFになったときは記録をクリアし、リセット
- 一度のON操作につき一つのタイムスタンプを記録

### 3. メッセージIDベースの時間比較による制御（修正版）

```ts
// Auto-play TTS for AI responses when autoPlayAudio is enabled
useEffect(() => {
  if (!autoPlayAudio || messages.length === 0 || autoPlayStartTimeRef.current === null) return;

  const lastMessage = messages[messages.length - 1];
  
  // Check if the last message is from assistant, not already playing, and not already auto-played
  if (
    lastMessage && 
    lastMessage.role === "assistant" && 
    !isPlaying[lastMessage.id] &&
    !autoPlayedMessagesRef.current.has(lastMessage.id)
  ) {
    // Since message ID is Date.now().toString(), we can compare numerically
    const messageId = Number.parseInt(lastMessage.id);
    const autoPlayStartTime = autoPlayStartTimeRef.current;
    
    // Only auto-play if message was created after auto-play was enabled
    if (messageId >= autoPlayStartTime) {
      // Mark this message as auto-played to prevent duplicate playback
      autoPlayedMessagesRef.current.add(lastMessage.id);
      
      // Add a small delay to ensure message is rendered
      const timer = setTimeout(() => {
        handleTextToSpeech(lastMessage.id, lastMessage.content);
      }, 500);

      return () => clearTimeout(timer);
    }
  }
}, [messages, autoPlayAudio, isPlaying]);
```

理由:

- **メッセージIDの特性活用**: メッセージIDが`Date.now().toString()`で生成されるため、数値比較で時間順序を判定可能
- **正確な時間比較**: autoPlayAudio ON以降のメッセージかを確実に判定
- **useRefによる安定性**: 依存配列の問題を根本的に解決
- **レンダリング待機**: 500msの遅延により、メッセージのレンダリング完了を待機
- **重複防止**: autoPlayedMessagesRefによる既読み上げメッセージの記録

### 4. useEffectのインポート追加

```ts
import { useState, useRef, useCallback, useEffect } from "react";
```

理由:

- useEffectフックを使用するために必要なインポート

---

## 影響 / Consequences

**ポジティブな影響:**
- 自動読み上げボタンが有効な場合、AIの応答が即座に音声で聞けるようになる
- 既存の手動TTS機能には影響しない
- 重複実行の問題が解決され、同じメッセージが何度も読み上げられることがなくなる
- 自動読み上げON以降のメッセージのみが対象となり、既存メッセージは影響を受けない
- useRefによる状態管理により、useEffectの依存配列問題が根本的に解決
- より安定した動作により、ユーザーエクスペリエンスが向上

**技術的な影響:**
- メモリ使用量の増加は最小限（refによる管理のため）
- コンポーネントの再レンダリング頻度に影響しない
- デバッグ時の状態追跡が容易（refの値は直接確認可能）

---

## 言語的・技術的なポイント

**React / useEffect ベストプラクティス:**
- useRefを活用した依存配列問題の根本解決
- useEffectのクリーンアップ関数でタイマーを適切に解除
- 複数のuseEffectを用途別に分離し、責任を明確化
- stateとrefの適切な使い分けによる安定した状態管理

**効率性とパフォーマンス:**
- Set型を活用した効率的な重複チェック（O(1)の時間計算量）
- メッセージIDのタイムスタンプ特性を利用した効率的な時間比較
- 既存のhandleTextToSpeech関数をそのまま利用し、コードの再利用性を保持

**問題解決のアプローチ:**
- 初期実装の問題（重複実行、タイミング制御）を段階的に解決
- useStateからuseRefへの移行による根本的な解決
- メッセージIDの生成ロジックを活用したエレガントな時間比較

---

## 参考 / References

- 0011-text-to-speech-feature.md（基盤となるTTS機能）
- 0017-ai-response-optimization-tts-speed-control.md（TTS速度制御機能）

---