# 0021 – 翻訳ポップアップの表示位置調整によるUX改善

## 背景 / Context

テキスト選択時に表示される翻訳ポップアップが、スマートフォンのネイティブ選択ツール（コピー、調べる、共有など）と表示位置が重複し、ユーザビリティを損なっていた。特にモバイル環境において、システムのポップアップとアプリケーションのポップアップが視覚的に競合し、操作性が低下していた。

---

## 決定 / Decision

翻訳ポップアップの表示位置を選択範囲の上部30px上に表示し、スマホの選択ツールとの重複を適切に回避しつつ、視認性を保つバランスの取れた位置に調整する。

---

## 理由 / Rationale

- モバイル端末のシステム選択ツールとの視覚的競合を解消
- ユーザーが翻訳ポップアップとシステムポップアップを区別しやすくする
- コードの複雑性を軽減し、保守性を向上させる
- 参考実装に基づく信頼性の高いアプローチを採用

---

## 実装詳細 / Implementation Notes

### 1. ポップアップ表示位置の調整

```ts
// 変更前
let y = rect.top - 10;

// 変更後（段階的調整を経た最終位置）
setTranslationPosition({
  x: rect.left + rect.width / 2,
  y: rect.top - 30, // 適切な位置に調整
});
```

理由:
- 選択範囲の上部10pxから30pxに変更し、20px上に移動
- スマートフォンのシステム選択ツールとの重複を適切に回避
- 過度に上に表示されることを防ぎ、視認性とのバランスを保持

### 2. 実装の簡素化

```ts
// 変更前（複雑な調整ロジック）
const popupWidth = 200;
let x = rect.left + rect.width / 2;
let y = rect.top - 10;

if (x - popupWidth / 2 < 10) {
  x = popupWidth / 2 + 10;
}
if (x + popupWidth / 2 > window.innerWidth - 10) {
  x = window.innerWidth - popupWidth / 2 - 10;
}
if (y < 150) {
  y = rect.bottom + 30;
}

// 変更後（シンプルな実装）
setTranslationPosition({
  x: rect.left + rect.width / 2,
  y: rect.top - 30,
});
```

理由:
- 画面端での複雑な調整ロジックを削除
- より単純で理解しやすいコードに変更
- 適切な距離（30px）でシステムUIとの競合を回避
- 保守性とパフォーマンスを向上

---

## 影響 / Consequences

- モバイル環境でのテキスト選択・翻訳機能のUXが改善
- システムUIとの競合が適切に回避され、操作性が向上
- 翻訳ポップアップの視認性と使いやすさのバランスが最適化
- シンプルな実装により保守性が向上

---

## 言語的・技術的なポイント

- React TouchEventとMouseEventの両方でポップアップ位置を統一的に管理
- getBoundingClientRect()を使用した正確な位置計算
- CSS transformプロパティとの連携による滑らかなアニメーション表示
- シンプルな実装による保守性とパフォーマンスの向上

---

## 参考 / References

- 0014-text-selection-translation-feature.md（テキスト選択翻訳機能の実装）
- 0016-openai-translation-implementation.md（OpenAI API翻訳機能の実装）

---