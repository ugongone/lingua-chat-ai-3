# 0022 – 音声認識言語チェック機能の実装

## 背景 / Context

音声認識システムで、日本語・英語以外の言語が認識された場合、システムが適切に対応できずユーザーに混乱を与える可能性があった。多言語対応が限定的である中で、サポート外言語の早期検出とエラー表示が必要となった。

---

## 決定 / Decision

音声認識とテキスト入力において、日本語・英語以外の言語を検出した場合に即座にエラーメッセージを表示する言語バリデーション機能を実装する。

---

## 理由 / Rationale

- ユーザーエクスペリエンスの向上: サポート外言語での無駄な処理を避ける
- 明確なフィードバック: どの言語が検出されたかを表示し、対応言語を明示
- システムの安定性: 想定外の言語入力によるエラーを事前に防止
- リソース効率: 不要なAPI呼び出しやAI処理を回避

---

## 実装詳細 / Implementation Notes

### 1. 音声認識APIの応答形式変更

```ts
const transcription = await client.audio.transcriptions.create({
  file: audioFile,
  model: 'gpt-4o-transcribe',
  // 言語を指定せず、自動検出を利用（多言語対応）
  response_format: 'verbose_json', // 言語情報を含む詳細なレスポンス形式
  temperature: 0.2, // 一貫性を重視
});

console.log(`Transcription completed. Text: ${transcription.text}`);
console.log(`Detected language: ${transcription.language}`);
console.log(`Audio duration: ${transcription.duration} seconds`);

return NextResponse.json({
  text: transcription.text,
  language: transcription.language, // 検出された言語コード（es, ja, en など）
  duration: transcription.duration, // 音声の長さ（秒）
  timestamp: new Date().toISOString(),
});
```

理由:
- `verbose_json` 形式により言語コードと音声長が取得可能
- コメントを「多言語対応」に変更し、実際の機能を正確に表現
- APIレスポンスに言語情報とdurationを追加してフロントエンドで活用

### 2. 言語判定関数の拡張

```ts
const isEnglish = (text: string): boolean => {
  return /^[a-zA-Z\s.,!?'"0-9\-()]+$/.test(text);
};

const isSupportedLanguage = (detectedLang: string): boolean => {
  return detectedLang === "ja" || detectedLang === "en";
};
```

理由:
- APIから返される言語コード（detectedLang）を主要な判定基準として使用
- 英語判定では一般的な記号や数字も含めて実用的な判定を実現
- 関数の責務を明確にし、APIレスポンスの言語コードを優先

### 3. 音声認識での言語チェック

```ts
// 言語チェック: 日本語・英語以外の場合はエラー表示
if (result.language && !isSupportedLanguage(result.language)) {
  const errorMessage: Message = {
    id: Date.now().toString(),
    role: "assistant",
    content: `申し訳ございません。現在は日本語と英語のみ対応しています。検出された言語: ${result.language}`,
    timestamp: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
  setMessages((prev) => [...prev, errorMessage]);
  return;
}
```

理由:
- 音声認識結果を処理する前に言語をチェック
- 検出された言語を具体的に表示してユーザーに分かりやすく通知
- early return でその後の処理を停止し、リソースを節約

### 4. テキスト入力での言語チェック

```ts
if (isEnglish(userInput)) {
  correctedContent = (await correctEnglish(userInput)) || undefined;
} else if (isJapanese(userInput)) {
  translatedContent = (await translateToEnglish(userInput)) || undefined;
}
```

理由:
- テキスト入力では文字パターンによる判定を継続使用
- 音声認識とテキスト入力で適切な判定方法を使い分け
- 既存の言語判定ロジックとの整合性を保持

### 5. コード最適化

```ts
const getTranslation = useCallback(async (text: string): Promise<string> => {
  // 翻訳処理
}, []);

const handleTextToSpeech = useCallback(async (messageId: string, text: string) => {
  // TTS処理
}, [playbackSpeed]);

const handleMouseUp = useCallback(
  () => () => {
    // message.id パラメータを削除（未使用のため）
    // selectedText の処理のみ実行
  },
  [getTranslation]
);
```

理由:
- useCallbackを使用してコンポーネントの再レンダリング最適化
- 不要な変数（currentSelectedText）を削除してコードを簡潔化
- 未使用パラメータ（_messageId）をhandleMouseUpから削除
- 依存関係を明確にしてReactの最適化を活用

---

## 影響 / Consequences

- ユーザー体験の向上: サポート外言語に対する明確なフィードバック
- システム安定性の向上: 想定外言語による処理エラーの防止
- API使用量の削減: 不適切な言語での英語修正・翻訳API呼び出しを回避
- 保守性の向上: 言語判定ロジックが関数として分離され、将来の言語追加が容易
- パフォーマンス向上: useCallbackによるコンポーネント最適化とverbose_jsonによる詳細情報取得

---

## 言語的・技術的なポイント

- React の早期リターンパターンを活用した効率的な処理制御
- 正規表現を使った文字パターンベースの言語判定
- OpenAI Whisper APIのverbose_json形式による言語検出結果の活用
- useCallback を使用した関数の最適化でリント警告の解消
- 音声認識APIレスポンスの言語情報とdurationの取得・活用

---

## 参考 / References

- 0001-speech-recognition.md（音声認識の基本実装）
- 0003-whisper-api-integration.md（Whisper API統合）
- 0008-japanese-to-english-translation.md（日本語英訳機能）

---