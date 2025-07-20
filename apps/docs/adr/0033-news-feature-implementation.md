# 0033 – 最新技術ニュース取得機能の実装

## 背景 / Context

ユーザーが「最新のニュースについて教えて」ボタンを押した際に、実際のニュース情報を提供する機能が求められていた。既存のボタンは見た目だけで実際の機能は未実装の状態であった。

---

## 決定 / Decision

Hacker News APIから最新の技術ニュース1件を取得し、GPT-4.1-miniで英語要約を生成してチャット形式で表示する機能を実装した。

---

## 理由 / Rationale

- Hacker News APIは外部認証不要で技術系ニュースに特化している
- GPT-4.1-miniによるコスト効率的な要約生成
- 既存のチャットUIとシームレスに統合可能
- 1件取得でシンプルかつ高速なレスポンス

---

## 実装詳細 / Implementation Notes

### 1. ニュース取得APIの作成

```ts
// /apps/web/app/api/news/route.ts
export async function GET() {
  // Hacker News Top Stories を取得
  const topStoriesResponse = await fetch(
    "https://hacker-news.firebaseio.com/v0/topstories.json"
  );
  
  const topStoryIds: number[] = await topStoriesResponse.json();
  const topStoryId = topStoryIds[0];
  
  // 最初のストーリーの詳細を取得
  const storyResponse = await fetch(
    `https://hacker-news.firebaseio.com/v0/item/${topStoryId}.json`
  );

  const story: HackerNewsItem = await storyResponse.json();

  // GPT-4.1-mini で要約生成
  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: "あなたは技術ニュースを初学者向けに要約する専門家です。",
      },
      {
        role: "user", 
        content: summaryPrompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 300,
  });
}
```

理由:
- Hacker News APIのシンプルなREST構造を活用
- GPT-4.1-miniでコスト効率と品質のバランスを実現
- 既存のOpenAIクライアント設定を再利用

### 2. フロントエンド統合

```ts
// /apps/web/app/page.tsx
const handleOptionSelect = async (option: (typeof initialOptions)[0]) => {
  if (option.id === "news") {
    try {
      setIsAIResponding(true);
      const response = await fetch("/api/news");
      const newsMessage = await response.json();
      setMessages((prev) => [...prev, newsMessage]);
    } catch (error) {
      // エラーハンドリング
    } finally {
      setIsAIResponding(false);
    }
  }
}
```

理由:
- 既存のAI応答パターンと統一したUX
- ローディング状態の適切な管理
- 既存のエラーハンドリング構造を踏襲

### 3. Hacker News API仕様

Hacker News APIで利用可能なフィールド:

```ts
interface HackerNewsItem {
  id: number;           // アイテムID
  type: string;         // "story", "comment", "job", "poll", "pollopt"
  by: string;           // 投稿者ユーザー名
  time: number;         // 作成時刻（Unix timestamp）
  title?: string;       // ストーリー/ポールのタイトル
  url?: string;         // ストーリーのリンク先URL
  text?: string;        // HTML形式のテキスト内容
  score?: number;       // スコア（投票数）
  kids?: number[];      // 子コメント/ストーリーのID配列
  descendants?: number; // 総コメント数
}
```

重要な制約:
- **画像URL専用フィールドなし** - サムネイル機能は提供されていない
- 画像が必要な場合は`url`フィールドのリンク先から別途取得が必要
- APIは認証不要でレート制限も緩く、技術系ニュースに特化

---

## 影響 / Consequences

- 新しいAPIエンドポイント `/api/news` が追加される
- OpenAI API使用量が増加（ニュース要約リクエスト分）
- Hacker News APIへの外部依存が追加される
- ユーザーは手軽に最新技術ニュースを取得可能になる

---

## 言語的・技術的なポイント

- Next.js API Routesパターンの活用
- TypeScript型定義でHacker News APIレスポンスの安全性を確保
- React Hooksの適切な状態管理
- 非同期処理のエラーハンドリング

---

## 参考 / References

- [0002-ai-response-integration.md](./0002-ai-response-integration.md) - AI応答統合パターン
- [0016-openai-translation-implementation.md](./0016-openai-translation-implementation.md) - OpenAI API活用パターン

---