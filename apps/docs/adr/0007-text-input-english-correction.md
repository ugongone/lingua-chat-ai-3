# 0007 – テキスト入力での英語修正機能追加

## 背景 / Context

現在のシステムでは、音声入力時のみ英語修正機能が動作している。テキスト入力では以下の状況となっている：

- 音声入力: `transcribeAudio` 関数内で英語検出→修正処理→`correctedContent` 表示
- テキスト入力: `handleSend` 関数では修正処理なし→`correctedContent` は常に undefined

この不一致により、ユーザーがテキストで英語を入力した場合でも修正提案が表示されず、学習体験に一貫性がない。

---

## 決定 / Decision

テキスト入力でも音声入力と同様の英語修正機能を実装し、入力方法に関わらず一貫した英語学習支援を提供する。

---

## 理由 / Rationale

- **一貫性**: 音声・テキスト両方の入力で同じ機能を提供
- **学習効果**: タイピング時でも英語修正による学習機会を提供
- **ユーザビリティ**: 入力方法による機能差異をなくし、予測可能なUXを実現
- **保守性**: 既存の `correctEnglish` 関数を再利用し、ロジックの重複を避ける

---

## 実装詳細 / Implementation Notes

### 1. 英語検出ロジックの追加

```ts
// 音声入力と同じ英語判定パターンを使用
const isEnglishText = userInput.match(/^[a-zA-Z\s.,!?'"]+$/);
```

理由:
- 音声入力と同じ正規表現パターンを使用し一貫性を保持
- 英語の文字、スペース、基本的な句読点のみを許可
- シンプルで確実な英語判定

### 2. handleSend 関数の修正

```ts
const handleSend = async () => {
  if (!input.trim()) return;

  const userInput = input.trim();
  
  // 英語の場合は修正処理を実行
  let correctedContent: string | undefined;
  if (userInput.match(/^[a-zA-Z\s.,!?'"]+$/)) {
    correctedContent = (await correctEnglish(userInput)) || undefined;
  }

  // ユーザーメッセージを作成
  const newMessage: Message = {
    id: Date.now().toString(),
    role: "user",
    content: userInput,
    correctedContent, // 修正版を含める
    timestamp: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };

  setMessages((prev) => [...prev, newMessage]);
  setInput(""); // 入力をクリア
  setShowTextInput(false); // テキスト入力エリアを非表示

  // AI応答を生成（既存関数を再利用）
  await generateAIResponse(userInput);
};
```

理由:
- 英語修正処理をメッセージ作成前に実行
- `correctedContent` をメッセージオブジェクトに含める
- 音声入力と同じフローを踏襲し保守性を向上

### 3. 処理順序の最適化

1. 入力内容の取得・トリム
2. 英語判定と修正処理の実行
3. 修正結果を含むメッセージオブジェクトの作成
4. UI状態のリセット
5. AI応答の生成

理由:
- 修正処理を先に行うことで、メッセージ作成時に結果を含められる
- 非同期処理の順序を明確化し、競合状態を防止

---

## 影響 / Consequences

- **ポジティブ**:
  - テキスト・音声入力で一貫した英語学習体験を提供
  - ユーザーの予期する動作との一致度向上
  - 既存の修正APIを活用し開発コスト最小化

- **考慮事項**:
  - テキスト入力時にもAPI呼び出しが発生し、わずかなレスポンス遅延
  - 正規表現による厳密な英語判定のため、英数字混在テキストは対象外

---

## 言語的・技術的なポイント

- 正規表現による言語判定の限界を理解した実装
- 非同期処理（async/await）の適切な順序管理
- TypeScriptの型安全性を維持した `correctedContent` の扱い
- React状態管理における最適な更新タイミング

---

## 参考 / References

- 音声入力での英語修正実装 (page.tsx:112-119)
- 既存の `correctEnglish` 関数 (page.tsx:56-75)
- メッセージ表示での修正内容UI (page.tsx:370-385)