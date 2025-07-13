# 0015 – メッセージ選択機能の改善とユーザーメッセージ選択無効化

## 背景 / Context

チャットUIの長押し機能において、1つのメッセージを長押しすると全てのメッセージが選択状態（色変更）になってしまう問題があった。また、ユーザー自身の入力メッセージで翻訳機能を使用する必要がないため、ユーザーメッセージでの選択機能を無効化する要望があった。

---

## 決定 / Decision

メッセージ選択状態を個別メッセージごとに管理し、ユーザーメッセージでの選択機能を無効化する。

---

## 理由 / Rationale

- 長押し選択は該当メッセージのみに適用されるべき（他メッセージへの影響排除）
- ユーザーメッセージは翻訳対象外のため、選択機能は不要
- AIメッセージのみで翻訳機能を有効にすることで、UXの明確化を図る
- 視覚的な混乱を避け、直感的な操作を実現

---

## 実装詳細 / Implementation Notes

### 1. 状態管理の変更

```ts
// 修正前：グローバル状態
const [isSelecting, setIsSelecting] = useState(false);
const [isLongPress, setIsLongPress] = useState(false);

// 修正後：メッセージID単位での状態管理
const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
const [longPressMessageId, setLongPressMessageId] = useState<string | null>(null);
```

理由:
- 個別メッセージごとの状態管理により、選択状態を特定のメッセージに限定
- null許可型により、非選択状態を明示的に表現

### 2. イベントハンドラーの修正

```ts
// 修正前：全メッセージ共通のハンドラー
const handleTouchStart = useCallback((e: React.TouchEvent) => {
  setIsSelecting(true);
  setIsLongPress(false);
  // ...
}, []);

// 修正後：メッセージID対応のハンドラー
const handleTouchStart = useCallback(
  (messageId: string) => (e: React.TouchEvent) => {
    setSelectedMessageId(messageId);
    setLongPressMessageId(null);
    // ...
  }, []
);
```

理由:
- メッセージIDを受け取ることで、対象メッセージを特定
- カリー化による関数型設計で、再利用性を向上

### 3. CSS適用ロジックの条件分岐

```tsx
// 修正前：全メッセージ共通
className={`... ${isSelecting ? "selecting" : ""} ${isLongPress ? "long-press-feedback" : ""}`}

// 修正後：個別メッセージ対応 + role条件
className={`... 
  ${message.role === "assistant" ? "selectable-text" : ""} 
  ${message.role === "assistant" && selectedMessageId === message.id ? "selecting" : ""} 
  ${message.role === "assistant" && longPressMessageId === message.id ? "long-press-feedback" : ""}`}
```

理由:
- `message.role === "assistant"` 条件によりAIメッセージのみで機能有効化
- `selectedMessageId === message.id` により特定メッセージのみに状態適用
- 視覚的フィードバックを適切なメッセージに限定

### 4. イベントハンドラーの条件適用

```tsx
// 修正前：全メッセージに適用
onTouchStart={handleTouchStart(message.id)}
onMouseDown={handleMouseDown(message.id)}

// 修正後：assistantメッセージのみ
onTouchStart={message.role === "assistant" ? handleTouchStart(message.id) : undefined}
onMouseDown={message.role === "assistant" ? handleMouseDown(message.id) : undefined}
```

理由:
- ユーザーメッセージでのイベント処理を完全に無効化
- undefinedにより、不要な処理を回避

---

## 影響 / Consequences

- **ポジティブ**: 長押し時の視覚的混乱が解消され、直感的な操作が可能
- **ポジティブ**: ユーザーメッセージでの不要な選択機能が排除され、UIの明確化
- **ポジティブ**: 翻訳機能がAIメッセージのみで動作し、用途が明確化
- **技術的負債**: なし（既存機能の改善のため）

---

## 言語的・技術的なポイント

- **React Hooks**: useCallbackを使用したイベントハンドラーの最適化
- **TypeScript**: null許可型による状態管理の型安全性確保
- **カリー化**: メッセージID対応のイベントハンドラー設計
- **条件分岐**: role-based rendering によるコンポーネントの振る舞い制御
- **CSS-in-JS**: 動的クラス適用による状態依存スタイリング

---

## 参考 / References

- 関連Issue: 長押し選択時の全メッセージ色変更問題
- 関連Issue: ユーザーメッセージ選択機能無効化要望