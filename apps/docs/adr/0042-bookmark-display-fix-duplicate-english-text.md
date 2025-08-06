# 0042 – ブックマーク表示における重複英語テキスト問題の修正

## 背景 / Context

ブックマーク機能において、日本語と英語のテキストが重複して表示される問題が発生していた。特に、日本語テキストが期待される場所に英語テキストが表示され、またブックマーク保存時のパラメータ渡しが適切でないことで表示順序が意図した通りにならない問題があった。

---

## 決定 / Decision

メッセージオブジェクトに`originalContent`フィールドを追加し、ブックマーク保存・表示ロジックを修正して日本語テキストを正しく優先表示する。

---

## 理由 / Rationale

- ユーザーが入力した元の日本語テキストを適切に保持・表示するため
- 英語翻訳と日本語原文を明確に区別して表示するため
- ブックマーク機能のUXを向上させ、期待通りの言語順序で表示するため

---

## 実装詳細 / Implementation Notes

### 1. originalContentフィールドの追加

```ts
// apps/web/app/page.tsx (音声入力)
const newMessage: Message = {
  content: result.text,
  correctedContent,
  translatedContent,
  originalContent: result.text, // 追加
  timestamp: new Date().toLocaleTimeString('ja-JP', {
    hour: "2-digit",
    minute: "2-digit",
  }),
};

// apps/web/app/page.tsx (テキスト入力)
const newMessage: Message = {
  content: userInput,
  correctedContent,
  translatedContent,
  originalContent: userInput, // 追加
  timestamp: new Date().toLocaleTimeString('ja-JP', {
    hour: "2-digit", 
    minute: "2-digit",
  }),
};
```

理由:
- ユーザーの元入力を明示的に保持することで、後の表示処理で適切な言語を選択可能
- 音声入力とテキスト入力の両方で一貫した情報保持

### 2. ブックマーク保存パラメータの修正

```ts
// apps/web/app/page.tsx
onClick={() =>
  handleBookmark(
    message.id, 
    message.translatedContent || "", // 英語テキスト
    message.translatedContent,       // 修正された英語
    message.originalContent,         // 日本語原文
    message.originalContent          // 日本語原文（重複だが既存API仕様に合わせる）
  )
}
```

理由:
- 英語テキストと日本語原文を明確に区別してブックマーク保存
- 既存のhandleBookmark関数のパラメータ順序に合わせて適切な値を渡す

### 3. ブックマーク表示ロジックの修正

```ts
// apps/web/app/saved-phrases/page.tsx  
{phrase.originalContent && (
  <div className="text-gray-900 leading-relaxed font-medium text-base sm:text-lg">
    {phrase.originalContent}
  </div>
)}
```

理由:
- `phrase.translation`ではなく`phrase.originalContent`を使用することで日本語原文を正しく表示
- 日本語コンテンツが存在しない場合の空フィールド表示を防止

---

## 影響 / Consequences

- ブックマーク機能における日本語-英語の表示順序が改善される
- 重複英語テキストの表示問題が解消される
- 既存のブックマークデータとの互換性は保持される（新しいoriginalContentフィールドの追加のみ）

---

## 言語的・技術的なポイント

- TypeScriptのMessage型に新しいoriginalContentフィールドが追加される想定
- LocalStorageに保存されるブックマークデータ構造が更新される
- 既存データとの後方互換性を考慮した実装

---

## Q&A / 技術理解のためのポイント

### Q1: なぜoriginalContentフィールドが必要だったのか？

**Q: 既存のcontentフィールドでは不十分だったのか？**

**A: contentフィールドは処理の過程で変更される可能性があり、ユーザーの元入力を確実に保持するためにoriginalContentが必要だった。特にブックマーク表示時に日本語原文を正確に表示するため。**

### Q2: handleBookmarkのパラメータが複雑な理由

**Q: なぜhandleBookmarkで同じoriginalContentを2回渡しているのか？**

**A: 既存のhandleBookmark関数のAPI仕様に合わせるため。将来的にはAPI設計を見直して冗長性を削減する余地がある。**

---

## 参考 / References

- [0039-bookmark-page-implementation.md](0039-bookmark-page-implementation.md) - ブックマーク機能の初期実装

---