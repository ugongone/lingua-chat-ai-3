# 0025 – AI応答メッセージ翻訳ボタン機能の実装

## 背景 / Context

AI側のメッセージに対してユーザーが翻訳を確認したい場合に、現在はテキスト選択による翻訳機能のみが利用可能でした。より直感的で簡単な翻訳アクセス方法として、メッセージ全体の翻訳を簡単に表示できる機能が求められました。

---

## 決定 / Decision

AI側メッセージの下にLanguagesアイコンの翻訳ボタンを追加し、クリックでメッセージ全体の翻訳を青い背景で表示する機能を実装する。

---

## 理由 / Rationale

- ユーザーが簡単にAI応答の翻訳を確認できるUXの改善
- テキスト選択操作が不要で、特にモバイルデバイスでの利便性向上
- 既存のコピー・音声再生ボタンと統一されたデザイン
- 翻訳表示の切り替え機能によるスペース効率の最適化

---

## 実装詳細 / Implementation Notes

### 1. Languages アイコンのインポート追加

```ts
import {
  Copy,
  Volume2,
  Mic,
  MicOff,
  VolumeX,
  Eye,
  EyeOff,
  Keyboard,
  Send,
  X,
  Bookmark,
  Languages, // 追加
} from "lucide-react";
```

理由:
- 翻訳機能を表現する統一されたアイコンとして Languages を使用
- lucide-react の標準アイコンセットとの整合性を維持

### 2. 翻訳状態管理

```ts
const [translatedMessages, setTranslatedMessages] = useState<Set<string>>(new Set());
```

理由:
- どのメッセージが翻訳表示されているかを効率的に管理
- Set データ構造による高速な存在確認と追加・削除操作
- メッセージ ID をキーとした状態管理

### 3. 翻訳切り替えハンドラー

```ts
const handleTranslateMessage = (messageId: string) => {
  setTranslatedMessages((prev) => {
    const newSet = new Set(prev);
    if (newSet.has(messageId)) {
      newSet.delete(messageId);
    } else {
      newSet.add(messageId);
    }
    return newSet;
  });
};
```

理由:
- 翻訳表示の切り替え機能を提供
- 不変性を保った状態更新によるReactのレンダリング最適化
- 複数メッセージの独立した翻訳状態管理

### 4. 翻訳ボタンの追加

```ts
<Button
  variant="ghost"
  size="sm"
  className={`h-8 w-8 p-0 hover:bg-gray-100 ${translatedMessages.has(message.id) ? "bg-blue-100 text-blue-600" : ""}`}
  onClick={() => handleTranslateMessage(message.id)}
>
  <Languages className="h-4 w-4" />
</Button>
```

理由:
- 既存のボタンデザインとの統一性を保持
- 翻訳表示中の視覚的フィードバック（青色ハイライト）
- アクセシブルなボタンサイズとクリック領域

### 5. 翻訳コンテンツ表示

```ts
{message.role === "assistant" && translatedMessages.has(message.id) && (
  <div className="mt-2 rounded-lg p-3 bg-blue-50 border border-blue-200 text-blue-800 text-sm max-w-full">
    <div className="flex items-start gap-2">
      <Languages className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
      <div className="whitespace-pre-line flex-1">日本語訳が表示されます。</div>
    </div>
  </div>
)}
```

理由:
- 青い背景による翻訳コンテンツの明確な視覚的区別
- Languages アイコンによる翻訳内容であることの明示
- レスポンシブデザインに対応した適切な幅制限

---

## 影響 / Consequences

- AI応答メッセージに対する翻訳アクセシビリティの大幅な向上
- モバイルデバイスでのユーザビリティ改善
- 既存のテキスト選択翻訳機能との併用可能
- 将来的な実際の翻訳API統合への基盤提供

---

## 言語的・技術的なポイント

- React の状態管理における Set データ構造の効率的活用
- 条件付きCSSクラスによる動的スタイリング
- コンポーネントの再レンダリング最適化を考慮した状態設計
- Tailwind CSS による統一されたデザインシステムの維持

---

## 参考 / References

- 0014-text-selection-translation-feature.md - 既存のテキスト選択翻訳機能
- 0016-openai-translation-implementation.md - OpenAI翻訳API実装

---