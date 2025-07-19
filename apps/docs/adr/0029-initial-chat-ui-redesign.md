# 0029 – 初期チャットUI選択肢システムの実装

## 背景 / Context

既存のシンプルな初期メッセージから、ユーザーが具体的なアクションを選択できる選択肢システムへと変更する必要があった。ユーザーエクスペリエンスの向上と、チャットの開始方法を明確化することが目的。

---

## 決定 / Decision

初期メッセージを「Hey! What should we do?」に変更し、3つの選択肢ボタン（ニュース、面接練習、チャット）を実装した。現在はモック状態として、選択時は何も反応しない仕様とした。

---

## 理由 / Rationale

- ユーザーに明確な行動選択肢を提示することで、チャット開始のハードルを下げる
- 将来的な機能拡張に向けたUIフレームワークの準備
- シンプルで直感的なインターフェース設計の採用

---

## 実装詳細 / Implementation Notes

### 1. 初期メッセージの変更

```ts
const [messages, setMessages] = useState<Message[]>([
  {
    id: "initial",
    role: "assistant",
    content: "Hey! What should we do?",
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  },
]);
```

理由:
- 親しみやすく、アクションを促す表現に変更
- タイムスタンプフォーマットを統一

### 2. 選択肢システムの実装

```ts
const initialOptions = [
  {
    id: "news",
    title: "最近のニュースについて教えて",
    icon: Newspaper,
    message: "最近のニュースについて教えてください。",
  },
  {
    id: "interview", 
    title: "面接の練習をしてほしい",
    icon: Briefcase,
    message: "面接の練習をお願いします。",
  },
  {
    id: "chat",
    title: "話し相手になって",
    icon: MessageCircle,
    message: "話し相手になってください。",
  },
];
```

理由:
- アイコンによる視覚的な分かりやすさの向上
- 各選択肢に明確な目的と内容を定義

### 3. モック実装のハンドラー

```ts
const handleOptionSelect = (option: (typeof initialOptions)[0]) => {
  // ボタンが押されるだけで何も反応しない
  console.log("選択肢が押されました:", option.title)
}
```

理由:
- 将来的な機能実装に向けた準備
- 現在は動作確認のみでメッセージ表示は行わない

### 4. UI レンダリング

```tsx
{message.id === "initial" && (
  <div className="mt-4 space-y-3 w-full max-w-sm">
    {initialOptions.map((option) => {
      const IconComponent = option.icon
      return (
        <Button
          key={option.id}
          onClick={() => handleOptionSelect(option)}
          variant="outline"
          className="w-full h-12 p-3 text-left hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 justify-start"
        >
          <div className="flex items-center gap-3">
            <IconComponent className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-900">{option.title}</span>
          </div>
        </Button>
      )
    })}
  </div>
)}
```

理由:
- 初期メッセージ専用の条件付きレンダリング
- アクセシブルで美しいボタンデザイン
- ホバー効果によるインタラクティブ性の向上

---

## 影響 / Consequences

- ユーザーは起動時に明確な選択肢を確認できるようになった
- 将来的な機能拡張のためのUIフレームワークが整備された
- 現在はモック状態のため、実際の機能実装が今後必要

---

## 言語的・技術的なポイント

- Lucide Reactアイコンライブラリの新規アイコン追加（Newspaper, Briefcase, MessageCircle）
- TypeScript の `typeof` を活用した型安全な選択肢システム
- React の条件付きレンダリングによる動的UI表示

---

## 参考 / References

- 特になし

---