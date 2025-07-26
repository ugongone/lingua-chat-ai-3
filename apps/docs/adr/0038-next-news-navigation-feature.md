# 0038 – Hacker News 次のニュース取得機能の追加

## 背景 / Context

現在のニュース機能では、Hacker News の最上位記事（1件目）のみが取得可能で、ユーザーが他のニュースを見るには再度ボタンを押すしかない。ユーザーから「次のニュースを取得できるようにしたい」という要望があり、より多様なニュースコンテンツへのアクセスを可能にする必要がある。

---

## 決定 / Decision

API にインデックスパラメータを追加し、フロントエンドで状態管理による順次ニュース取得機能を実装する。

---

## 理由 / Rationale

- ユーザーは1回のニュース検索で複数の記事を順次閲覧できるようになる
- Hacker News API の topstories エンドポイントが提供する順位付けを活用
- 既存のニュース機能の基盤を維持しつつ最小限の変更で拡張
- インデックス管理により範囲外アクセスを防止

---

## 実装詳細 / Implementation Notes

### 1. API エンドポイントの拡張

```ts
export async function GET(request: Request) {
  // URLからインデックスパラメータを取得
  const { searchParams } = new URL(request.url);
  const indexParam = searchParams.get('index');
  const index = indexParam ? parseInt(indexParam, 10) : 0;

  // インデックスが負の場合は0にリセット
  const storyIndex = Math.max(0, index);

  // インデックスが範囲外の場合は最初に戻る
  const actualIndex = storyIndex >= topStoryIds.length ? 0 : storyIndex;
  
  // 指定されたインデックスのストーリーの詳細を取得
  const topStoryId = topStoryIds[actualIndex];
}
```

理由:
- クエリパラメータによりインデックスを柔軟に指定可能
- 範囲外や不正値への安全な対応
- 既存の API 構造を維持

### 2. レスポンス形式の拡張

```ts
return NextResponse.json({
  id: Date.now().toString(),
  role: "assistant",
  content: `${title}\n\n${content}`,
  type: "news",
  currentIndex: actualIndex,
  totalStories: topStoryIds.length,
  timestamp: new Date().toLocaleTimeString('ja-JP', {
    hour: "2-digit",
    minute: "2-digit", 
    hour12: false,
    timeZone: 'Asia/Tokyo'
  }),
});
```

理由:
- フロントエンドでメタデータを取得可能にする（今回は表示に使用しないが将来の拡張に備える）
- API レスポンスの一貫性を保持

### 3. フロントエンド状態管理

```ts
// ニュースインデックス管理の状態
const [currentNewsIndex, setCurrentNewsIndex] = useState(0);

// ニュース取得の共通処理
const fetchNewsWithIndex = async (index: number) => {
  const response = await fetch(`/api/news?index=${index}`);
  // ... エラーハンドリング
  setMessages((prev) => [...prev, newsMessage]);
};

// 次のニュースを取得する処理
const handleNextNews = async () => {
  const nextIndex = currentNewsIndex + 1;
  await fetchNewsWithIndex(nextIndex);
  setCurrentNewsIndex(nextIndex);
};
```

理由:
- インデックス状態の一元管理
- 共通処理の関数化によりコードの重複を削減

### 4. UI コンポーネントの追加

```tsx
{/* ニュースメッセージの場合の「他のニュースも知りたい」ボタン */}
{message.role === "assistant" && message.type === "news" && (
  <div className="mt-3 w-full max-w-sm">
    <Button
      onClick={handleNextNews}
      disabled={isAIResponding}
      variant="outline"
      className="w-full h-12 p-3 text-left hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 justify-start"
    >
      <div className="flex items-center gap-3">
        <Newspaper className="h-5 w-5 text-blue-600 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-900">他のニュースも知りたい</span>
      </div>
    </Button>
  </div>
)}
```

理由:
- 初期選択肢ボタンと統一されたUIデザインで一貫性を保持
- メッセージの下に配置して自然なフローを提供
- ページ数表示は削除してシンプルなUIを実現
- ローディング中は操作を無効化してUI の一貫性を保持

---

## 影響 / Consequences

- API のレスポンス形式が拡張されるが、既存の機能には影響なし
- フロントエンドで新しい状態管理が追加されるが、既存の chat 機能とは分離
- ニュース取得時のパフォーマンスは記事1件ずつの取得のため変化なし
- Hacker News の API 使用量は取得回数に比例して増加

---

## 言語的・技術的なポイント

- Next.js の API Routes で Request オブジェクトから URL パラメータを取得
- React の useState による状態管理でインデックス追跡
- TypeScript のインターフェース拡張で型安全性を保持
- Tailwind CSS による一貫したデザインシステムの活用

---

## Q&A / 技術理解のためのポイント

### Q1: インデックス管理の安全性について

**Q: 範囲外アクセスや不正な値に対する対応はどのように実装されているか？**

**A: `Math.max(0, index)`で負の値を0にリセットし、`storyIndex >= topStoryIds.length ? 0 : storyIndex`で範囲外の場合は最初に戻る仕様。これにより、どのような値が来ても安全に動作し、ユーザーに途切れのない体験を提供できる。**

### Q2: 状態管理とAPIコールの同期について

**Q: currentNewsIndexの状態管理とAPI呼び出しの同期はどのように保証されているか？**

**A: `handleNextNews`内で`currentNewsIndex + 1`を計算してAPIに送信した後、同じ値で`setCurrentNewsIndex`を更新している。ただし、APIが範囲外アクセスで0にリセットした場合でも、フロントエンドの状態は送信した値のままになる潜在的な問題がある。現在は問題ないが、将来的には API レスポンスの `currentIndex` を使って状態を同期する改善が考えられる。**

### Q3: TypeScript インターフェース拡張の設計

**Q: MessageインターフェースにcurrentIndexとtotalStoriesを追加した際の設計上の考慮点は？**

**A: オプショナルプロパティ（`?:`）として追加することで、既存のchatメッセージとの後方互換性を保持。newsタイプのメッセージのみがこれらのプロパティを持つため、type narrowingと組み合わせて型安全にアクセス可能。将来的に他のメッセージタイプでも拡張しやすい設計になっている。**

---

## 参考 / References

- [0033-news-feature-implementation.md](./0033-news-feature-implementation.md) - 基盤となるニュース機能の実装

---