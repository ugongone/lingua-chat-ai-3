# 0013 – 修正版英語フレーズと翻訳版へのアクション機能統一

## 背景 / Context

英語修正版（`correctedContent`）には音声再生やブックマーク機能があったが、日本語翻訳版（`translatedContent`）にはこれらの機能がなく、ユーザー体験が一貫していなかった。また、同様の機能を2箇所で別々に実装していたため、コードの重複とメンテナンス性の問題があった。

---

## 決定 / Decision

CorrectionDisplayという共通コンポーネントを作成し、英語修正版と日本語翻訳版の両方に統一されたアクション機能（コピー、音声再生、ブックマーク）を提供する。

---

## 理由 / Rationale

- ユーザー体験の一貫性向上：両方の機能で同じアクションが使用可能
- コードの重複削減：共通コンポーネントによる保守性向上
- レイアウトの統一：アイコンをメッセージモジュール外に配置してUI一貫性確保
- 将来の機能拡張における効率性向上

---

## 実装詳細 / Implementation Notes

### 1. 共通コンポーネントの作成

```ts
// components/ui/correction-display.tsx
export function CorrectionDisplay({
  content,
  type,
}: CorrectionDisplayProps) {
  return (
    <div className="mt-2 rounded-lg p-3 bg-green-50 border border-green-200 text-green-800 text-sm max-w-full">
      <div className="flex items-start gap-2">
        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
        <div className="whitespace-pre-line flex-1">{content}</div>
      </div>
    </div>
  );
}
```

理由:
- テキスト表示部分を共通化してコードの重複を削減
- typeパラメータで将来的な機能拡張に対応可能な設計

### 2. アクションボタンの外部配置

```ts
// 英語修正版・日本語翻訳版共通のアクションボタン
<div className="flex items-center gap-2 mt-2">
  <Button onClick={() => handleCopy(content)}>
    <Copy className="h-4 w-4" />
  </Button>
  <Button onClick={() => handleTextToSpeech(messageId, content)}>
    <Volume2 className="h-4 w-4" />
  </Button>
  <Button onClick={() => console.log("Bookmark:", content)}>
    <Bookmark className="h-4 w-4" />
  </Button>
</div>
```

理由:
- メッセージモジュール外に配置してレイアウトの自由度向上
- 両方の機能で同じアクションパターンを使用してUI一貫性確保

### 3. 既存コードの置き換え

```ts
// 修正前：別々の実装（37行のコード重複）
{message.correctedContent && (
  <div>...英語修正版専用の実装...</div>
)}
{message.translatedContent && (
  <div>...日本語翻訳版の簡易実装...</div>
)}

// 修正後：統一された実装
{message.correctedContent && (
  <>
    <CorrectionDisplay content={message.correctedContent} type="correction" />
    {/* 共通アクションボタン */}
  </>
)}
{message.translatedContent && (
  <>
    <CorrectionDisplay content={message.translatedContent} type="translation" />
    {/* 共通アクションボタン */}
  </>
)}
```

理由:
- コード行数を大幅削減（37行→8行）
- 一箇所の変更で両方の機能に反映される保守性

---

## 影響 / Consequences

- **正の影響**: 日本語翻訳版でも音声再生・ブックマーク機能が利用可能になり、ユーザー体験が向上
- **正の影響**: コードの重複削減により、今後の機能拡張時の開発効率が向上
- **正の影響**: UI/UXの一貫性確保により、ユーザーの学習コストが削減
- **技術的負債**: 既存のブックマーク機能は現在console.logのみの実装のため、今後実際の保存機能が必要

---

## 言語的・技術的なポイント

- **React**: 共通コンポーネント化によるコンポーネント設計の改善
- **TypeScript**: 型定義（`CorrectionDisplayProps`）による型安全性確保
- **コンポーネント分離**: 表示ロジックとアクションロジックの適切な分離
- **TailwindCSS**: 統一されたスタイリングシステムによる一貫性確保

---

## 参考 / References

- [既存の英語修正機能実装](./0005-english-correction-feature.md)
- [日本語翻訳機能実装](./0008-japanese-to-english-translation.md)
- [TTS機能実装](./0011-text-to-speech-feature.md)

---