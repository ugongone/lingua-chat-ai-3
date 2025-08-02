# 0039 – ブックマークページの実装

## 背景 / Context

ユーザーが学習中に出会った重要なフレーズや翻訳を保存・管理するための専用ページが必要となった。既存のシステムには修正・翻訳・ブックマークのカテゴリー分けされたフレーズ保存機能があるが、ブックマークに特化したインターフェースが求められていた。

---

## 決定 / Decision

ブックマーク機能に特化した新規ページを `/saved-phrases` パスに実装し、ブックマークされたフレーズのみを表示・管理できるようにする。

---

## 理由 / Rationale

- ブックマークされた重要なフレーズへの素早いアクセスが可能になる
- 日本語翻訳を優先的に表示することで、日本語学習者により適したインターフェースを提供
- モバイルファーストのUIデザインにより、スマートフォンでの使いやすさを向上

---

## 実装詳細 / Implementation Notes

### 1. ページコンポーネントの作成

```tsx
// apps/web/app/saved-phrases/page.tsx
export default function SavedPhrasesPage() {
  const bookmarkedPhrases = useMemo(() => {
    return savedPhrases.filter((phrase) => phrase.category === "bookmark")
  }, [savedPhrases])
  
  // ブックマークのみを表示
}
```

理由:
- `useMemo`を使用してブックマークフィルタリングのパフォーマンスを最適化
- カテゴリーフィルタリングロジックをシンプルに保つ

### 2. 日本語優先の表示順序

```tsx
{/* 日本語を最初に表示 */}
{phrase.translation && (
  <div className="text-gray-900 leading-relaxed font-medium text-base sm:text-lg">
    {phrase.translation}
  </div>
)}

{/* 英語を次に表示 */}
<div className="text-gray-700 leading-relaxed text-sm sm:text-base">
  {phrase.content}
</div>
```

理由:
- 日本語学習者にとって、日本語訳を先に見ることで理解しやすくなる
- フォントサイズと色の階層により、視覚的な優先順位を明確化

### 3. モバイル対応のアクションボタン

```tsx
<Button
  variant="ghost"
  size="sm"
  className="h-9 w-9 p-0 hover:bg-gray-100 touch-manipulation"
  onClick={() => handleCopy(phrase.content)}
>
  <Copy className="h-4 w-4" />
</Button>
```

理由:
- `touch-manipulation`クラスでタップ操作の反応性を向上
- 9x9のサイズでモバイルでのタップしやすさを確保

### 4. 空状態の処理

```tsx
{bookmarkedPhrases.length === 0 ? (
  <div className="text-center py-8 sm:py-12 px-4">
    <Bookmark className="h-10 w-10 sm:h-12 sm:w-12 mx-auto" />
    <h3>ブックマークがありません</h3>
    <p>チャットでフレーズをブックマークすると、ここに表示されます</p>
  </div>
) : (
  // フレーズリスト表示
)}
```

理由:
- 空状態でもユーザーが次のアクションを理解できるようガイダンスを提供
- レスポンシブなサイズ調整で各デバイスに最適化

---

## 影響 / Consequences

- 将来的にはローカルストレージやデータベースとの連携が必要
- 他のカテゴリー（修正・翻訳）の専用ページも同様に実装可能
- 音声再生機能の実装は別途音声APIとの統合が必要

---

## 言語的・技術的なポイント

- React Hooksの`useMemo`を使用してレンダリングパフォーマンスを最適化
- Tailwind CSSのレスポンシブプレフィックス（sm:）で画面サイズに応じたスタイル調整
- Lucide Reactアイコンライブラリを使用して一貫性のあるアイコンデザイン

---

## Q&A / 技術理解のためのポイント

### Q1: なぜ編集機能を含めているのか？

**Q: ブックマークページで編集機能は必要か？**

**A: ユーザーが保存したフレーズの誤字脱字を修正したり、より適切な表現に調整したりする需要があるため。ただし、編集時は元のcontentのみ編集可能とし、翻訳は再度APIを通じて取得する必要がある。**

### Q2: カテゴリー分けの意図は？

**Q: correction、bookmark、translationの3つのカテゴリーに分けている理由は？**

**A: ユーザーの学習目的に応じてフレーズを整理できるようにするため。correctionは英語の修正履歴、bookmarkは重要なフレーズ、translationは単語や短文の翻訳記録として使い分けられる。**

---

## 参考 / References

- 0034-casual-chat-experience-optimization.md - チャット体験の最適化
- 0036-auto-tts-sequential-playback.md - 音声再生機能の実装

---