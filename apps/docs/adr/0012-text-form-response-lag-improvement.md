# 0012 – テキスト送信フォームのレスポンス改善

## 背景 / Context

テキスト送信ボタンを押してからフォームが閉じるまでに、約500-1000msのラグが発生しており、ユーザーエクスペリエンスを損なっていた。原因として、送信処理で英語修正・翻訳APIの応答を待機してからフォーム閉じる処理を実行していたため、API処理時間分のUIレスポンス遅延が発生していた。

---

## 決定 / Decision

テキスト送信時に、入力クリア・フォーム閉じる処理を最優先で実行し、その後に英語修正・翻訳処理を行うように処理順序を変更する。

---

## 理由 / Rationale

- ユーザーが送信ボタンを押した瞬間にフォームが閉じることで、即座のフィードバックを提供
- API処理時間に影響されない一貫したUIレスポンス性を実現
- 処理順序の変更のみで対応可能で、既存機能への影響が最小限

---

## 実装詳細 / Implementation Notes

### 1. handleSend関数の処理順序変更

```ts
const handleSend = async () => {
  if (!input.trim()) return;

  const userInput = input.trim();
  
  // 即座にUI更新（フォーム閉じる・入力クリア）
  setInput("");
  setShowTextInput(false);

  // 英語の場合は修正処理、日本語の場合は英訳処理を実行
  let correctedContent: string | undefined;
  let translatedContent: string | undefined;

  if (userInput.match(/^[a-zA-Z\s.,!?'"]+$/)) {
    correctedContent = (await correctEnglish(userInput)) || undefined;
  } else if (isJapanese(userInput)) {
    translatedContent = (await translateToEnglish(userInput)) || undefined;
  }

  // ユーザーメッセージを作成
  const newMessage: Message = {
    id: Date.now().toString(),
    role: "user",
    content: userInput,
    correctedContent,
    translatedContent,
    timestamp: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };

  setMessages((prev) => [...prev, newMessage]);

  // AI応答を生成（日本語の場合は英訳を使用）
  await generateAIResponse(translatedContent || userInput);
};
```

理由:

- `setInput("")`と`setShowTextInput(false)`を関数の最初に移動し、即座にUIを更新
- API処理を待つことなく、ユーザーに即座の視覚的フィードバックを提供
- 処理ロジック自体は変更せず、順序のみ変更でリスクを最小化

---

## 影響 / Consequences

- ユーザーエクスペリエンスの大幅改善：送信時の即座のフィードバック
- 既存機能への影響なし：処理順序変更のみで機能的変更なし
- API処理時間が変動してもUIレスポンス性が一定

---

## 言語的・技術的なポイント

- React の状態更新は非同期で処理されるが、連続する setState 呼び出しは適切にバッチ処理される
- UI更新を最優先にすることで、ユーザーの操作に対する即座のフィードバックを実現
- 非同期処理の順序管理において、ユーザー体験を重視した設計パターン

---

## 参考 / References

- React useState の非同期更新とバッチ処理
- UX設計における即座のフィードバックの重要性