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

### 5. 翻訳状態管理の強化

```ts
const [messageTranslations, setMessageTranslations] = useState<Map<string, string>>(new Map());
const [translatingMessages, setTranslatingMessages] = useState<Set<string>>(new Set());
const [translationErrors, setTranslationErrors] = useState<Map<string, string>>(new Map());
```

理由:
- 翻訳結果をメッセージIDごとにキャッシュして重複リクエストを回避
- 翻訳中の状態を管理してローディング表示とボタン無効化を実現
- エラー状態の管理によるユーザーフィードバックの向上

### 6. 実際の翻訳API統合

```ts
const handleTranslateMessage = async (messageId: string, content: string) => {
  try {
    setTranslatingMessages((prev) => new Set(prev).add(messageId));
    
    const response = await fetch("/api/translate-to-japanese", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: content }),
    });

    if (!response.ok) {
      throw new Error("翻訳リクエストが失敗しました");
    }

    const result = await response.json();
    const translatedText = result.translatedText;

    setMessageTranslations((prev) => {
      const newMap = new Map(prev);
      newMap.set(messageId, translatedText);
      return newMap;
    });

    setTranslatedMessages((prev) => {
      const newSet = new Set(prev);
      newSet.add(messageId);
      return newSet;
    });
  } catch (error) {
    setTranslationErrors((prev) => {
      const newMap = new Map(prev);
      newMap.set(messageId, error.message);
      return newMap;
    });
  } finally {
    setTranslatingMessages((prev) => {
      const newSet = new Set(prev);
      newSet.delete(messageId);
      return newSet;
    });
  }
};
```

理由:
- 既存の `/api/translate-to-japanese` エンドポイントを活用
- OpenAI GPT-4.1 による高品質な日本語翻訳を提供
- 非同期処理による UI の応答性維持

### 7. ローディングとエラー表示

```ts
<Button
  disabled={translatingMessages.has(message.id)}
  onClick={() => handleTranslateMessage(message.id, message.content)}
>
  {translatingMessages.has(message.id) ? (
    <div className="animate-spin h-4 w-4 border border-blue-500 border-t-transparent rounded-full" />
  ) : (
    <Languages className="h-4 w-4" />
  )}
</Button>

// 翻訳結果表示
<div className="whitespace-pre-line flex-1">
  {translationErrors.has(message.id) ? (
    <span className="text-red-600">{translationErrors.get(message.id)}</span>
  ) : (
    messageTranslations.get(message.id) || "翻訳中..."
  )}
</div>
```

理由:
- 翻訳中のスピナー表示によるユーザーフィードバック
- ボタン無効化による重複リクエストの防止
- エラー時の適切なメッセージ表示

---

## 影響 / Consequences

- AI応答メッセージに対する翻訳アクセシビリティの大幅な向上
- モバイルデバイスでのユーザビリティ改善
- 既存のテキスト選択翻訳機能との併用可能
- OpenAI APIコストの増加（翻訳リクエストによる）
- 翻訳結果のキャッシュによる重複API呼び出しの削減
- ネットワーク接続に依存する機能のため、オフライン時は利用不可

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