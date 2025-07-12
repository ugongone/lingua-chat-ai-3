# 0008 – 日本語入力時の英訳表示機能

## 背景 / Context

現在のシステムでは英語入力時に文法修正機能が提供されているが、日本語入力時には英訳機能が存在しない。グローバルなコミュニケーション促進とユーザーの英語学習支援のため、日本語入力時に自動で英訳を表示する機能の追加が求められている。

---

## 決定 / Decision

日本語入力（音声・テキスト）時に、OpenAI APIを使用した自動英訳機能を実装し、既存の英語修正機能と同様の緑枠UIで英訳結果を表示する。

---

## 理由 / Rationale

- 英語学習支援とグローバルコミュニケーションの促進
- 既存の英語修正機能と統一されたUX提供
- OpenAI APIの高精度翻訳能力を活用
- 既存アーキテクチャとの一貫性を保持

---

## 実装詳細 / Implementation Notes

### 1. 英訳APIエンドポイントの作成

```ts
// apps/web/app/api/translate-to-english/route.ts
export async function POST(request: NextRequest) {
  const response = await client.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "system",
        content: "You are a professional translator. Translate the given Japanese text to natural English. Only return the translated text without any additional explanation."
      },
      {
        role: "user",
        content: text
      }
    ],
    temperature: 0.1,
    max_tokens: 512
  });
}
```

理由:
- 既存の`correct-english`APIと同様の構造で一貫性を保持
- gpt-4.1の高精度翻訳能力を活用
- システムプロンプトで翻訳品質とレスポンス形式を統制

### 2. フロントエンドのMessage型拡張

```ts
// apps/web/app/page.tsx
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  correctedContent?: string; // 既存: 英語修正用
  translatedContent?: string; // 新規: 日本語→英訳用
  timestamp: string;
}
```

理由:
- 既存のcorrectedContentと同様のパターンで拡張
- オプショナル型で既存データとの互換性を保持

### 3. 日本語判定と英訳処理ロジック

```ts
// apps/web/app/page.tsx
// 日本語判定（ひらがな、カタカナ、漢字を含む）
const isJapanese = (text: string): boolean => {
  return /[\u3072\u3089\u304c\u306a\u30ab\u30bf\u30ab\u30ca\u4e00-\u9faf]/.test(text);
};

// 英語修正とは別の処理分岐
if (userInput.match(/^[a-zA-Z\s.,!?'"]+$/)) {
  correctedContent = await correctEnglish(userInput);
} else if (isJapanese(userInput)) {
  translatedContent = await translateToEnglish(userInput);
}
```

理由:
- 正規表現による確実な日本語判定
- 英語修正と英訳を明確に分離した処理フロー
- 既存ロジックを破壊しない追加実装

### 4. 英訳表示UI実装

```tsx
{/* 日本語の英訳表示 */}
{message.role === "user" && message.translatedContent && (
  <div className="mt-2 rounded-lg p-3 bg-green-50 border border-green-200 text-green-800 text-sm max-w-full">
    <div className="flex items-start gap-2">
      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
      <div className="whitespace-pre-line">
        {message.translatedContent}
      </div>
    </div>
  </div>
)}
```

理由:
- 既存の英語修正UIと統一されたデザイン
- チェックマークアイコンによる視覚的な識別
- 同一のスタイルクラスで一貫性を保持
- シンプルな表示でユーザビリティを重視

### 5. 音声認識・テキスト入力両対応

```ts
// transcribeAudio関数内での処理
if (
  detectedLanguage === "en" ||
  result.text.match(/^[a-zA-Z\s.,!?'"]+$/)
) {
  correctedContent = (await correctEnglish(result.text)) || undefined;
} else if (isJapanese(result.text)) {
  translatedContent = (await translateToEnglish(result.text)) || undefined;
}

// handleSend関数内でも同様の処理
if (userInput.match(/^[a-zA-Z\s.,!?'"]+$/)) {
  correctedContent = (await correctEnglish(userInput)) || undefined;
} else if (isJapanese(userInput)) {
  translatedContent = (await translateToEnglish(userInput)) || undefined;
}
```

理由:
- 音声認識とテキスト入力で一貫した処理フロー
- 既存コードとの統合を重視した個別実装
- 明確な言語判定による処理分岐

---

## 影響 / Consequences

- 日本語ユーザーの英語学習支援機能が向上
- OpenAI APIの使用量増加（日本語入力時の追加リクエスト）
- UIの一貫性を保ちながら機能拡張を実現
- 既存の英語修正機能との共存が可能

---

## 言語的・技術的なポイント

- TypeScriptの型安全性を活用したMessage型拡張
- React Hooksパターンを維持した状態管理
- Next.js API Routesによる一貫したバックエンド実装
- 正規表現による効率的な言語判定

---

## 参考 / References

- 既存実装: `/apps/web/app/api/correct-english/route.ts`
- 既存実装: `/apps/web/app/page.tsx` (correctedContent関連処理)
- OpenAI Chat Completions API Documentation

---