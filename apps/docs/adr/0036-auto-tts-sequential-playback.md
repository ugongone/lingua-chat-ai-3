# 0036 – 自動音声読み上げ順序制御機能の実装

## 背景 / Context

既存の自動音声読み上げ機能では、AIからのメッセージのみが自動読み上げされていた。ユーザーから以下の要望が出された：

- 自動音声読み上げ機能がONの時、以下の順番で音声を自動読み上げしたい：
  1. 自分のメッセージの「英語翻訳」または「修正後の英語」
  2. それに対するAIのメッセージ

現在の実装では、ユーザーが日本語で入力した場合に英語翻訳（`translatedContent`）、英語で入力した場合に修正後英語（`correctedContent`）が生成されるが、これらが自動読み上げされていなかった。また、読み上げの順序制御も実装されていなかった。

---

## 決定 / Decision

自動音声読み上げ機能を拡張し、ユーザーメッセージの英語翻訳（日本語入力時）または修正後英語（英語入力時）を先に読み上げ、その完了後にAIメッセージを読み上げる順序制御システムを実装する。

---

## 理由 / Rationale

- ユーザーの学習体験向上：自分の日本語入力の英語翻訳、または英語入力の修正版を聞くことで英語表現を学べる
- 自然な会話フロー：ユーザーの英語（翻訳/修正） → AI応答の順序で、より自然な英語会話体験を提供
- 既存機能との一貫性：現在の自動読み上げ機能を拡張し、機能の統一性を保つ
- 重複防止：適切な状態管理により、重複読み上げを確実に防ぐ

---

## 実装詳細 / Implementation Notes

### 1. 新しい状態管理の追加

```ts
const autoPlayedTranslationsRef = useRef<Set<string>>(new Set());
const waitingForAIResponseRef = useRef<boolean>(false);
const messagesRef = useRef<Message[]>(messages);
```

理由:

- **autoPlayedTranslationsRef**: ユーザー翻訳の重複読み上げ防止
- **waitingForAIResponseRef**: 英語翻訳読み上げ中のAI読み上げ抑制制御
- **messagesRef**: コールバック内で最新のメッセージ配列にアクセスするため

### 2. handleTextToSpeech関数の拡張

```ts
const handleTextToSpeech = useCallback(async (
  messageId: string, 
  text: string, 
  customOptions?: { onEnd?: () => void; onStart?: () => void; onError?: (error: Error) => void }
) => {
  // ... existing implementation
  await ttsPlayer.speak(text, playbackSpeed, {
    onStart: () => {
      setIsPlaying((prev) => ({ ...prev, [messageId]: true }));
      customOptions?.onStart?.();
    },
    onEnd: () => {
      setIsPlaying((prev) => ({ ...prev, [messageId]: false }));
      customOptions?.onEnd?.();
    },
    onError: (error) => {
      console.error("TTS error:", error);
      setIsPlaying((prev) => ({ ...prev, [messageId]: false }));
      customOptions?.onError?.(error);
    }
  });
}, [playbackSpeed]);
```

理由:

- カスタムコールバックオプションにより、翻訳読み上げ完了後のAI読み上げトリガーを実現
- 既存のデフォルト動作を保持しつつ、追加機能を提供

### 3. ユーザー翻訳・修正英語の自動読み上げ機能

```ts
useEffect(() => {
  if (
    !autoPlayAudio ||
    messages.length === 0 ||
    autoPlayStartTimeRef.current === null
  )
    return;

  const lastMessage = messages[messages.length - 1];

  if (
    lastMessage &&
    lastMessage.role === "user" &&
    (lastMessage.translatedContent || lastMessage.correctedContent) &&
    !isPlaying[lastMessage.id] &&
    !autoPlayedTranslationsRef.current.has(lastMessage.id)
  ) {
    const messageId = Number.parseInt(lastMessage.id);
    const autoPlayStartTime = autoPlayStartTimeRef.current;

    if (messageId >= autoPlayStartTime) {
      autoPlayedTranslationsRef.current.add(lastMessage.id);
      waitingForAIResponseRef.current = true;

      const timer = setTimeout(() => {
        const textToRead = lastMessage.translatedContent || lastMessage.correctedContent!;
        handleTextToSpeech(lastMessage.id, textToRead, {
          onEnd: () => {
            setTimeout(() => {
              waitingForAIResponseRef.current = false;
              // Force re-evaluation of AI auto-play using latest messages
              const currentMessages = messagesRef.current;
              const lastAIMessage = currentMessages[currentMessages.length - 1];
              if (
                lastAIMessage &&
                lastAIMessage.role === "assistant" &&
                !autoPlayedMessagesRef.current.has(lastAIMessage.id) &&
                autoPlayStartTimeRef.current !== null
              ) {
                const messageId = Number.parseInt(lastAIMessage.id);
                if (messageId >= autoPlayStartTimeRef.current) {
                  autoPlayedMessagesRef.current.add(lastAIMessage.id);
                  handleTextToSpeech(lastAIMessage.id, lastAIMessage.content);
                }
              }
            }, 300);
          }
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }
}, [messages, autoPlayAudio, isPlaying, handleTextToSpeech]);
```

理由:

- ユーザーメッセージに英語翻訳または修正後英語がある場合に自動読み上げをトリガー
- 翻訳/修正読み上げ完了後、300ms待機してAI応答の読み上げを実行
- 既存のタイムスタンプベースの制御ロジックを活用
- 日本語入力時は`translatedContent`、英語入力時は`correctedContent`を優先的に使用

### 4. AI自動読み上げの制御ロジック修正

```ts
// Auto-play TTS for AI responses when autoPlayAudio is enabled
useEffect(() => {
  // ... existing checks
  
  if (lastMessage && lastMessage.role === "assistant" && /* other conditions */) {
    // Check if we need to wait for user translation to finish
    const shouldWaitForTranslation = waitingForAIResponseRef.current;
    
    if (shouldWaitForTranslation) {
      // Don't auto-play yet, let the translation callback handle it
      return;
    }

    // ... rest of auto-play logic
  }
}, [messages, autoPlayAudio, isPlaying, handleTextToSpeech]);
```

理由:

- 英語翻訳/修正読み上げ中はAI自動読み上げを抑制
- 翻訳/修正読み上げ完了後に適切なタイミングでAI読み上げを実行

### 5. 状態リセット処理の拡張

```ts
useEffect(() => {
  if (autoPlayAudio && autoPlayStartTimeRef.current === null) {
    autoPlayStartTimeRef.current = Date.now();
  } else if (!autoPlayAudio) {
    autoPlayStartTimeRef.current = null;
    autoPlayedMessagesRef.current.clear();
    autoPlayedTranslationsRef.current.clear();
    waitingForAIResponseRef.current = false;
  }
}, [autoPlayAudio]);
```

理由:

- 自動読み上げ機能をOFFにした際、新しく追加した状態もリセット
- 次回ON時の動作の一貫性を保証

---

## 影響 / Consequences

**ポジティブな影響:**
- ユーザーの英語学習体験が向上（自分の翻訳または修正後の英語を聞くことができる）
- より自然な英語会話フローの実現（日本語・英語どちらの入力でも対応）
- 既存の自動読み上げ機能との一貫性維持
- 重複読み上げの完全防止

**技術的な影響:**
- メモリ使用量の微増（新しいuseRefによる状態管理）
- コンポーネントの複雑性は最小限の増加
- 既存のTTS機能には影響なし

**UX への影響:**
- 翻訳・修正コンテンツがない場合は従来通りAIメッセージのみ読み上げ
- 読み上げ順序が明確になり、ユーザーの期待に合致
- 日本語・英語どちらの入力言語でも一貫した体験を提供

---

## 言語的・技術的なポイント

**React / useEffect パターン:**
- 複数のuseEffectを適切に分離し、それぞれの責任を明確化
- useRefを活用したコールバック内での最新状態アクセス
- 既存のタイムスタンプベースの制御ロジックの再利用

**非同期処理とタイミング制御:**
- TTSPlayerのPromiseベースAPIを活用した順序制御
- setTimeoutによる適切な遅延制御（レンダリング待機、AI応答待機）

**状態管理のベストプラクティス:**
- useRefとuseStateの適切な使い分け
- 重複防止のためのSet型データ構造の活用
- コールバック内でのクロージャ問題の回避

---

## Q&A / 技術理解のためのポイント

### Q1: 状態管理について

**Q: 今回新しく追加された3つのuseRefの役割を説明してください**

**A: 各useRefの役割と必要性:**

- **`autoPlayedTranslationsRef`**
  - **役割**: ユーザーメッセージの英語翻訳の重複読み上げを防ぐ
  - **必要な理由**: useEffectが再実行された際に、同じ翻訳を何度も読み上げることを防ぐため
  - **解決する問題**: 翻訳の重複読み上げによるUX悪化

- **`waitingForAIResponseRef`**
  - **役割**: 英語翻訳読み上げ中にAI応答の自動読み上げを抑制する
  - **必要な理由**: 翻訳読み上げとAI読み上げが同時に実行されることを防ぎ、順序制御を実現するため
  - **解決する問題**: 音声の重複再生と、意図した順序（翻訳→AI応答）の破綻

- **`messagesRef`**
  - **役割**: コールバック関数内で最新のメッセージ配列にアクセスする
  - **必要な理由**: useEffectのクロージャ問題を解決し、翻訳読み上げ完了時に最新のAI応答を取得するため
  - **解決する問題**: コールバック実行時に古いmessages配列を参照してしまう問題

### Q2: 読み上げ順序の制御メカニズム

**Q: ユーザーが日本語で「こんにちは」と入力した場合の読み上げ順序と、AI応答の待機制御について説明してください**

**A: 読み上げ順序とタイミング制御:**

**読み上げ順序:**
1. **英語翻訳の読み上げ**: "Hello" が読み上げられる
2. **AI応答の読み上げ**: AIからの返答（例："Hello! How are you today?"）が読み上げられる

**英語入力時（例："Helo"）:**
1. **修正後英語の読み上げ**: "Hello" が読み上げられる
2. **AI応答の読み上げ**: AIからの返答が読み上げられる

**待機状態のタイミング:**
- **待機開始**: ユーザーメッセージの英語翻訳読み上げが開始される瞬間（`waitingForAIResponseRef.current = true`）
- **待機解除**: 翻訳読み上げ完了後300ms経過時点（`waitingForAIResponseRef.current = false`）

**制御条件:**
- AI応答の自動読み上げuseEffectは`shouldWaitForTranslation`が`true`の間は早期リターンする
- 翻訳読み上げのonEndコールバックで待機を解除し、AI応答読み上げを手動トリガー

### Q3: 重複防止とタイミング制御

**Q: 翻訳読み上げ完了後の300ms遅延と、messagesRef.currentを使用する理由について説明してください**

**A: タイミング制御と状態アクセスの技術的背景:**

**`setTimeout(..., 300)`の理由:**
1. **AI応答の到着待機**: 翻訳読み上げ完了時点でAI応答がまだ生成中の可能性があるため
2. **レンダリング完了待機**: AI応答がDOMにレンダリングされるまでの時間を確保
3. **音声の自然な間隔**: 翻訳読み上げとAI読み上げの間に適切な間を作る

**`messagesRef.current`を使用する理由:**
- **クロージャ問題の回避**: useEffectで作成されたコールバック関数は、その時点のmessages配列をキャプチャする
- **最新状態へのアクセス**: 翻訳読み上げ完了時（数秒後）には新しいAI応答がmessages配列に追加されているが、コールバック内の`messages`変数は古い状態を参照している
- **messagesRef.current**: 常に最新のmessages配列を参照できるため、新しく追加されたAI応答を正しく取得できる

**通常の`messages`配列の問題:**
```javascript
// 問題のあるパターン
const onEnd = () => {
  // この'messages'は翻訳読み上げ開始時点の古い配列
  const lastMessage = messages[messages.length - 1]; // AI応答が含まれていない
}

// 解決パターン  
const onEnd = () => {
  // messagesRef.currentは常に最新の配列
  const lastMessage = messagesRef.current[messagesRef.current.length - 1]; // 最新のAI応答を取得
}
```

これらの仕組みにより、確実に「翻訳→AI応答」の順序で読み上げが実行され、重複や競合状態を防いでいます。

---

## 参考 / References

- 0018-auto-tts-feature.md（基盤となる自動TTS機能）
- 0008-japanese-to-english-translation.md（英語翻訳機能）
- 0011-text-to-speech-feature.md（基盤となるTTS機能）

---