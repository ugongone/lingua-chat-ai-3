# 0005 – 不自然な英語の自動修正機能

## 背景 / Context

ユーザーが音声入力で話した内容が不自然な英語の場合、自動で自然な英語に修正して表示する機能が必要。
音声認識の精度やユーザーの英語レベルにより、文法的に不正確または不自然な英語が入力される可能性が高いため、
リアルタイムでの修正機能により学習効果とユーザー体験の向上を図る。

---

## 決定 / Decision

OpenAI GPT-4o を利用した英語修正APIエンドポイントを新設し、音声認識後に自動で文法チェックと修正を行う機能を実装する。

---

## 理由 / Rationale

- OpenAI GPT-4oは高精度な英語修正能力を持つ
- 既存のOpenAI統合との一貫性を保てる
- レスポンス速度が比較的良好
- ユーザーの学習効果向上に寄与
- 元の文章と修正版の両方を表示することで比較学習が可能

---

## 実装詳細 / Implementation Notes

### 1. 英語修正APIエンドポイントの追加

```ts
// apps/web/app/api/correct-english/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  const { text } = await request.json();
  
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You will be provided with statements, and your task is to convert them to standard English. Only return the corrected text without any additional explanation."
      },
      {
        role: "user",
        content: text
      }
    ],
    temperature: 0.1,
    max_tokens: 256
  });
  
  return NextResponse.json({
    originalText: text,
    correctedText: response.choices[0].message.content
  });
}
```

理由:
- 専用エンドポイントにより責務を分離
- 低いtemperatureで一貫性のある修正結果を保証
- システムプロンプトで修正のみに特化

### 2. フロントエンドでの修正機能統合

```tsx
// apps/web/app/page.tsx内のtranscribeAudio関数に追加
const correctEnglish = async (text: string): Promise<string | null> => {
  try {
    const response = await fetch('/api/correct-english', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      console.error('English correction failed:', response.status);
      return null;
    }

    const result = await response.json();
    return result.correctedText !== text ? result.correctedText : null;
  } catch (error) {
    console.error('English correction error:', error);
    return null;
  }
};

// transcribeAudio関数内で修正処理を追加
// 英語の場合は修正処理を実行（言語検出または正規表現マッチ）
let correctedContent: string | undefined;
if (detectedLanguage === 'en' || result.text.match(/^[a-zA-Z\s.,!?'"]+$/)) {
  correctedContent = await correctEnglish(result.text) || undefined;
}

newMessage.correctedContent = correctedContent;
```

理由:
- **言語検出とパターンマッチの二重判定**: `detectedLanguage === 'en'`での明示的判定に加え、正規表現 `/^[a-zA-Z\s.,!?'"]+$/` による英語パターンマッチを併用し、検出精度を向上
- **堅牢なエラーハンドリング**: try-catch構文でネットワークエラーやAPIエラーに対応、`console.error`でデバッグ支援
- **型安全性の向上**: `Promise<string | null>`の明示的な戻り値型定義
- **レスポンスステータス確認**: `response.ok`チェックでHTTPエラーを適切にハンドリング
- **フォールバック処理**: エラー時は`null`を返してアプリケーションの継続実行を保証
- 元のテキストと修正版が同じ場合は修正結果を表示しない
- 既存のメッセージオブジェクト構造を活用

### 3. UIでの修正結果表示

```tsx
// 既存のcorrectedContentを活用した表示（実装済み）
{message.role === "user" && message.correctedContent && (
  <div className="mt-2 rounded-lg p-3 bg-green-50 border border-green-200">
    <CheckCircle className="h-4 w-4 text-green-600" />
    <div className="font-medium text-green-700">修正版:</div>
    <div>{message.correctedContent}</div>
  </div>
)}
```

理由:
- 緑色でポジティブな修正として表示
- 元の発言と視覚的に区別
- アイコンで修正であることを明示

---

## 影響 / Consequences

- 英語学習者のユーザー体験向上
- OpenAI APIの使用量増加（コスト影響）
- レスポンス時間の若干の増加
- 日本語入力時は修正処理を行わないため、日本語ユーザーへの影響は最小限

---

## 言語的・技術的なポイント

- Next.js App Routerのapi/routeパターンを活用
- TypeScriptの型安全性を保持したAPI設計
- React Stateの既存構造を最大限活用
- エラーハンドリングとフォールバック処理の実装

---

## 参考 / References

- OpenAI GPT-4o API Documentation
- 既存のMessage型定義とUI実装