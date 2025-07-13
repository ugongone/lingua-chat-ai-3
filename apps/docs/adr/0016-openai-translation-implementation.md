# 0016 – OpenAI APIを使用した実際の翻訳機能実装

## 背景 / Context

チャットUIのテキスト選択機能において、現在はモック関数による固定文字列（"日本語が表示されます"）を表示していた。ユーザーが選択した英語テキストを実際に日本語に翻訳する機能が求められており、既存のOpenAI API基盤を活用した本格的な翻訳機能の実装が必要となった。

---

## 決定 / Decision

OpenAI GPT-4.1を使用した英語→日本語翻訳APIエンドポイントを作成し、フロントエンドで非同期翻訳機能を実装する。

---

## 理由 / Rationale

- 既存の`/api/translate-to-english`と統一的なアーキテクチャで実装
- OpenAI GPT-4.1による高品質な翻訳結果の提供
- キャッシュ機能によるパフォーマンス向上とAPI使用量削減
- リアルタイムUIフィードバックによるユーザーエクスペリエンス向上
- 適切なエラーハンドリングによる安定性確保

---

## 実装詳細 / Implementation Notes

### 1. API エンドポイント作成

```ts
// apps/web/app/api/translate-to-japanese/route.ts
export async function POST(request: NextRequest) {
  const response = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "system",
        content: "You are a professional translator. Translate the given English text to natural Japanese. Only return the translated text without any additional explanation.",
      },
      {
        role: "user",
        content: text,
      },
    ],
    temperature: 0.1,
    max_tokens: 512,
  });
}
```

理由:
- 既存の`translate-to-english`と同様の実装パターンで保守性向上
- GPT-4.1モデル使用による高精度翻訳
- システムプロンプトで翻訳品質を制御

### 2. フロントエンド状態管理強化

```tsx
// 翻訳機能用の状態変数追加
const [translatedText, setTranslatedText] = useState<string>("");
const [isTranslating, setIsTranslating] = useState(false);
const [translationError, setTranslationError] = useState<string | null>(null);
const translationCache = useRef<Map<string, string>>(new Map());
```

理由:
- 翻訳の非同期処理状態を適切に管理
- キャッシュによる同一テキストの再翻訳防止
- エラー状態の明示的な管理でUX向上

### 3. 非同期翻訳関数の実装

```tsx
const getTranslation = async (text: string): Promise<string> => {
  try {
    // キャッシュチェック
    if (translationCache.current.has(text)) {
      return translationCache.current.get(text)!;
    }

    setIsTranslating(true);
    setTranslationError(null);

    const response = await fetch("/api/translate-to-japanese", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const result = await response.json();
    const translatedText = result.translatedText;

    // キャッシュに保存
    translationCache.current.set(text, translatedText);
    return translatedText;
  } catch (error) {
    setTranslationError("翻訳できませんでした");
    return "翻訳エラー";
  } finally {
    setIsTranslating(false);
  }
};
```

理由:
- モック関数から実際のAPI呼び出しに変更
- Map型キャッシュでメモリ効率とアクセス速度を両立
- try-catch-finallyによる適切な例外処理

### 4. 翻訳ポップアップUIの改善

```tsx
<div className="font-medium text-center">
  {isTranslating ? (
    <span className="animate-pulse">翻訳中...</span>
  ) : translationError ? (
    <span className="text-red-300">{translationError}</span>
  ) : (
    translatedText || "翻訳結果が表示されます"
  )}
</div>
```

理由:
- ローディング状態の視覚的フィードバック（アニメーション付き）
- エラー時の明確な表示（赤色）
- 状態に応じた条件分岐で適切な情報提示

### 5. イベントハンドラーでの翻訳実行

```tsx
// 長押しまたは一定時間選択していた場合に翻訳を表示
if (longPressMessageId === messageId || touchDuration > 800) {
  setShowTranslation(true);
  // 翻訳を実行
  getTranslation(selectedText).then(setTranslatedText);
}
```

理由:
- 選択完了時の自動翻訳実行
- Promise チェーンによる非同期処理の適切な管理
- UI表示と翻訳処理の分離

---

## 影響 / Consequences

- **ポジティブ**: 実際の翻訳結果が表示され、機能の実用性が大幅向上
- **ポジティブ**: キャッシュ機能によりAPI使用量とレスポンス時間を最適化
- **ポジティブ**: 既存のAPIエンドポイント群と統一的なアーキテクチャ
- **ポジティブ**: エラーハンドリングによる安定性向上
- **技術的負債**: OpenAI API使用量の増加（翻訳機能追加分）
- **運用面**: API使用量の監視が必要

---

## 言語的・技術的なポイント

- **React Hooks**: useRefを使用したキャッシュ実装とuseStateでの状態管理
- **非同期処理**: async/await + Promise.thenによる適切な非同期フロー
- **TypeScript**: 型安全な状態管理とエラーハンドリング
- **Next.js API Routes**: 既存パターンと統一的なREST API実装
- **OpenAI API**: GPT-4.1モデルを使用した高品質翻訳
- **パフォーマンス**: Map型キャッシュによる重複リクエスト削減
- **UX**: 条件分岐レンダリングによる状態フィードバック

---

## 参考 / References

- 関連ADR: [0014-text-selection-translation-feature.md](0014-text-selection-translation-feature.md) - テキスト選択翻訳基盤機能
- 関連ADR: [0015-message-selection-improvement.md](0015-message-selection-improvement.md) - メッセージ選択機能改善
- 既存実装: `/api/translate-to-english/route.ts` - 実装パターン参考