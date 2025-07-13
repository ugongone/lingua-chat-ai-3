# 0014 – テキスト選択・翻訳機能の実装

## 背景 / Context

スマートフォンを中心とした音声チャットアプリにおいて、ユーザーが表示されたテキストの意味を即座に理解できるよう、リアルタイムな翻訳機能が求められていた。特に英語学習者にとって、チャット中に理解できない英単語や文章に遭遇した際、スムーズに翻訳を確認できる機能の必要性が高まっていた。

---

## 決定 / Decision

テキスト選択と長押し操作による日本語翻訳ポップアップ機能を実装し、モバイルファーストでありながらPC環境でも利用可能なインタラクティブ翻訳体験を提供する。

---

## 理由 / Rationale

- スマートフォンでの直感的な操作（長押し・選択）でアクセス可能
- 学習の流れを中断せずに翻訳確認が可能
- PCでもマウス操作で同様の体験を提供
- リアルタイムな視覚フィードバックでユーザビリティを向上
- 画面端での表示位置調整により全ての環境で利用可能

---

## 実装詳細 / Implementation Notes

### 1. 状態管理とイベントハンドリング

```ts
const [selectedText, setSelectedText] = useState("");
const [translationPosition, setTranslationPosition] = useState({ x: 0, y: 0 });
const [showTranslation, setShowTranslation] = useState(false);
const [isSelecting, setIsSelecting] = useState(false);
const [touchStartTime, setTouchStartTime] = useState(0);
const [isLongPress, setIsLongPress] = useState(false);
const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
```

理由:
- 複数の状態を組み合わせて複雑なタッチインタラクションを管理
- useRefを使用してタイマーの管理を効率化
- 選択状態と表示状態を分離してUXを最適化

### 2. タッチイベントハンドリング（モバイル最適化）

```ts
const handleTouchStart = useCallback((e: React.TouchEvent) => {
  setTouchStartTime(Date.now());
  setIsSelecting(true);
  setShowTranslation(false);
  setIsLongPress(false);

  // 長押し検知のタイマーを設定（500msに短縮）
  longPressTimeoutRef.current = setTimeout(() => {
    setIsLongPress(true);
  }, 500);
}, []);
```

理由:
- 一般的なモバイルUI標準（500ms）に合わせた長押し検知
- useCallbackによるレンダリング最適化
- タッチイベントの開始時間記録で操作時間を測定

### 3. 画面端での位置調整ロジック

```ts
// ポップアップの位置を画面端で調整
const popupWidth = 200;
let x = rect.left + rect.width / 2;
let y = rect.top - 10;

if (x - popupWidth / 2 < 10) {
  x = popupWidth / 2 + 10;
}
if (x + popupWidth / 2 > window.innerWidth - 10) {
  x = window.innerWidth - popupWidth / 2 - 10;
}
if (y < 50) {
  y = rect.bottom + 30;
}
```

理由:
- 小さな画面でもポップアップが表示領域外に出ない
- 選択テキストの位置に基づいた動的な表示位置計算
- 上端で切れる場合は下側に表示する fallback 機能

### 4. CSS選択ハイライトの最適化

```css
.selectable-text {
  cursor: text;
  transition: all 0.2s ease;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
  -webkit-touch-callout: none;
}

.selecting {
  background-color: rgba(59, 130, 246, 0.1);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  transition: all 0.2s ease;
}

@media (max-width: 768px) {
  .selectable-text {
    -webkit-tap-highlight-color: rgba(59, 130, 246, 0.2);
    tap-highlight-color: rgba(59, 130, 246, 0.2);
  }
}
```

理由:
- ブラウザ間の一貫した選択動作を保証
- 視覚的フィードバックの強化
- モバイル特有のタップハイライトの最適化

---

## 影響 / Consequences

- ユーザーの英語学習効率が向上（即座な翻訳確認）
- チャットアプリとしてのユーザビリティが大幅に改善
- モバイル・PC両環境での一貫した操作体験を提供
- 将来的にはAPIベースの高精度翻訳への拡張が可能
- メモリ使用量の軽微な増加（状態管理とイベントハンドラー）

---

## 言語的・技術的なポイント

- React 18のuseCallbackを活用したパフォーマンス最適化
- CSS-in-JSとstyleタグの組み合わせによる動的スタイリング
- ブラウザAPIの Selection と Range を活用したクロスブラウザ対応
- タッチイベントとマウスイベントの統合的なハンドリング
- TypeScriptの型安全性を活用したイベント処理

---

## 参考 / References

- [MDN - Selection API](https://developer.mozilla.org/en-US/docs/Web/API/Selection)
- [MDN - Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
- [React Event Handling Best Practices](https://react.dev/learn/responding-to-events)

---