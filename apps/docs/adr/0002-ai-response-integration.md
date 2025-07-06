# 0002 – OpenAI API を利用したAI応答機能の追加

## 背景 / Context

音声認識機能が実装済みで、ユーザーの音声入力をテキストとして受け取ることができるが、AI による応答生成機能がない。現在は音声入力がメッセージとして追加されるだけで、会話として成立していない。

ユーザーが音声で質問や要求を行った際に、AI が適切に応答を生成し、会話型のインタラクションを実現する必要がある。

---

## 決定 / Decision

OpenAI API（Chat Completions）を統合し、音声入力に対してリアルタイムでAI応答を生成する機能を実装する。

---

## 理由 / Rationale

- **API の信頼性**: OpenAI API は業界標準で、安定した高品質な応答を提供
- **TypeScript サポート**: 公式 Node.js SDK v4 で完全な TypeScript サポート
- **コスト効率**: 従量課金制で、開発・テスト段階では低コスト
- **Next.js 統合**: API Routes を使用してセキュアな実装が可能
- **将来の拡張性**: ストリーミング応答やファンクションコールなど、高度な機能への対応が容易

---

## 実装詳細 / Implementation Notes

### 1. 依存関係の追加

```bash
pnpm add openai
```

理由:

- 公式 SDK v4 は TypeScript ネイティブサポート
- ストリーミング応答やエラーハンドリングが組み込み済み
- 最新の Chat Completions API に対応

### 2. API Route の作成

```ts
// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 }
      );
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const assistantMessage = completion.choices[0].message;

    return NextResponse.json({
      id: Date.now().toString(),
      role: assistantMessage.role,
      content: assistantMessage.content,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    });
  } catch (error) {
    console.error("OpenAI API error:", error);

    return NextResponse.json(
      {
        error: "AI response generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

理由:

- Next.js の App Router API Routes を使用してセキュアな実装
- サーバーサイドで API キーを管理し、クライアントに露出しない
- RESTful な設計で、フロントエンドとの連携が容易
- 入力バリデーションによる堅牢性確保
- 標準化されたレスポンス形式（id, timestamp 付与）
- 詳細なエラーハンドリングと適切な HTTP ステータスコード

### 3. 環境変数の設定

```bash
# .env.local
OPENAI_API_KEY=sk-...
```

理由:

- API キーの安全な管理
- 開発・本番環境での設定分離
- Next.js の標準的な環境変数管理手法

### 4. フロントエンド統合

```ts
// 音声入力完了時のAI応答トリガー
const handleAIResponse = async (userMessage: string) => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        ...conversationHistory,
        { role: "user", content: userMessage },
      ],
    }),
  });

  const aiMessage = await response.json();
  setMessages((prev) => [...prev, aiMessage]);
};
```

理由:

- 既存の音声認識機能との自然な統合
- 会話履歴の維持でコンテキストを保持
- 非同期処理でUIをブロックしない

### 5. エラーハンドリングとローディング状態

```ts
const [isAIResponding, setIsAIResponding] = useState(false);

// API コール時のエラーハンドリング
try {
  setIsAIResponding(true);
  // API コール
} catch (error) {
  console.error("AI response error:", error);
  // フォールバック処理
} finally {
  setIsAIResponding(false);
}
```

理由:

- ユーザーに AI 処理中であることを明示
- ネットワークエラーや API 制限への適切な対応
- UX の向上とアプリの安定性確保

---

## 影響 / Consequences

### ポジティブな影響

- ユーザーは音声で AI と自然な会話が可能になる
- 会話履歴が保持され、コンテキストを理解した応答を得られる
- リアルタイム性の高いインタラクションを実現

### 注意点

- API コストが発生（使用量に応じた従量課金）
- インターネット接続が必要（オフライン動作不可）
- API レスポンス時間による多少の遅延（通常 1-3 秒）
- API キーの適切な管理が必要
- **モデルアクセス権限**: プロジェクトで特定のモデルへの権限を付与する必要がある
  - https://platform.openai.com/settings/{projectId}/limits から設定可能

### フォローアップタスク

- 会話履歴のローカルストレージへの保存
- AI 応答のストリーミング表示機能
- Text-to-Speech (TTS) 機能の実装
- API 使用量の監視とコスト管理

---

## 代替案 / Alternatives Considered

1. **他の AI サービス (Claude, Gemini など)**
   - 採用しない理由: OpenAI が最も安定しており、日本語対応も優秀

2. **ローカル LLM (Ollama, LM Studio など)**
   - 採用しない理由: ユーザー環境への依存が大きく、レスポンス品質が不安定

3. **ストリーミング応答の同時実装**
   - 採用しない理由: フェーズ1では基本機能に集中し、UX改善は後のフェーズで実装

4. **モデル選択について**
   - **GPT-4o**: 高性能だがプロジェクトアクセス権限が必要、403エラーの原因
   - **GPT-4o-mini**: より安価でアクセスしやすい、十分な性能
   - **GPT-4.1-mini**: 2025年の最新モデル、優れた命令追従性とコスト効率
   - **採用**: GPT-4.1-mini - 最新技術とアクセス性のバランスが最適

---

## 参考 / References

- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [OpenAI Node.js SDK v4](https://github.com/openai/openai-node)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Web Speech API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

---
