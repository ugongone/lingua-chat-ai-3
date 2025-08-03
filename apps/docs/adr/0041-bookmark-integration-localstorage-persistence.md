# 0041 – ブックマーク機能の統合・永続化実装

## 背景 / Context

チャット画面でのブックマーク機能とブックマーク専用ページが完全に分離しており、チャット内で保存したブックマークがブックマーク画面で表示されない課題があった。また、ブラウザを閉じるとデータが消失し、永続的な保存ができていなかった。

---

## 決定 / Decision

React ContextとLocalStorageを組み合わせたアプリ全体でのブックマーク状態管理システムを実装し、チャット画面とブックマーク画面の完全な連携と永続化を実現する。

---

## 理由 / Rationale

- ユーザーがチャットで保存したブックマークを専用ページで確認・管理できるようになる
- LocalStorageによりブラウザを閉じてもデータが保持される
- React Contextによりアプリ全体で統一された状態管理が可能
- 外部データベース不要でシンプルな実装を維持できる

---

## 実装詳細 / Implementation Notes

### 1. ブックマークContext管理システムの構築

```tsx
// lib/bookmark-context.tsx
export interface SavedPhrase {
  id: string;
  content: string;
  translation?: string;
  category: "correction" | "bookmark" | "translation";
  timestamp: string;
  originalContent?: string;
}

interface BookmarkContextType extends BookmarkState {
  addBookmark: (phrase: SavedPhrase) => void;
  removeBookmark: (id: string) => void;
  updateBookmark: (phrase: SavedPhrase) => void;
  isBookmarked: (id: string) => boolean;
  isMessageBookmarked: (messageId: string) => boolean;
  getBookmarkedPhrases: () => SavedPhrase[];
}
```

理由:
- useReducerでReactのベストプラクティスに従った状態管理
- TypeScriptで型安全なAPI設計
- メッセージIDベースでの簡単なブックマーク状態確認機能

### 2. LocalStorage永続化システム

```tsx
const STORAGE_KEY = 'lingua-chat-bookmarks';

const loadFromLocalStorage = (): SavedPhrase[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('LocalStorageからのブックマーク読み込みエラー:', error);
    return [];
  }
};

// 状態変更時の自動保存
useEffect(() => {
  if (state.savedPhrases.length >= 0) {
    saveToLocalStorage(state.savedPhrases);
  }
}, [state.savedPhrases]);
```

理由:
- SSR対応でwindow.undefinedチェックを実装
- try-catchでエラーハンドリングを適切に処理
- useEffectによる自動保存でデータ損失を防止

### 3. カテゴリー自動判定とID統一

```tsx
export function createSavedPhraseFromMessage(
  messageId: string,
  content: string,
  correctedContent?: string,
  translatedContent?: string,
  originalContent?: string,
  forceBookmarkCategory: boolean = false
): SavedPhrase {
  let category: "correction" | "bookmark" | "translation";
  
  if (forceBookmarkCategory) {
    category = "bookmark";
  } else {
    if (correctedContent) {
      category = "correction";
    } else if (translatedContent) {
      category = "translation";  
    } else {
      category = "bookmark";
    }
  }

  return {
    id: `bookmark-${messageId}`,
    content: correctedContent || translatedContent || content,
    // ...
  };
}
```

理由:
- ブックマークボタンからの保存時は強制的に「bookmark」カテゴリーに設定
- ID生成ロジックを統一して状態管理の整合性を保証
- 修正・翻訳・ブックマークの自動カテゴリー分類

### 4. 音声再生機能の統合

```tsx
// app/saved-phrases/page.tsx
const handleTextToSpeech = useCallback(async (
  phraseId: string, 
  text: string
) => {
  try {
    setIsPlaying((prev) => ({ ...prev, [phraseId]: true }));
    const { ttsPlayer } = await import('@/lib/audio-player');
    await ttsPlayer.speak(text, playbackSpeed, {
      onStart: () => setIsPlaying((prev) => ({ ...prev, [phraseId]: true })),
      onEnd: () => setIsPlaying((prev) => ({ ...prev, [phraseId]: false })),
      onError: (error) => {
        console.error("TTS error:", error);
        setIsPlaying((prev) => ({ ...prev, [phraseId]: false }));
      }
    });
  } catch (error) {
    console.error("TTS error:", error);
    setIsPlaying((prev) => ({ ...prev, [phraseId]: false }));
  }
}, [playbackSpeed]);
```

理由:
- チャット画面と同様の音声再生機能を実装
- 動的importで初回使用時のみライブラリ読み込み
- 再生状態管理とエラーハンドリングを適切に実装

---

## 影響 / Consequences

- ユーザーエクスペリエンスの大幅向上：チャットとブックマーク画面の完全連携
- データ永続化によりブラウザ再起動後もブックマークが保持される
- 音声再生機能によりブックマーク画面でも学習効率が向上
- 将来的なデータベース連携への拡張基盤が整備される

---

## 言語的・技術的なポイント

- React ContextとuseReducerを組み合わせた大規模状態管理
- LocalStorageのSSR対応実装
- TypeScriptでの型安全なAPI設計
- 動的importによるコード分割とパフォーマンス最適化

---

## Q&A / 技術理解のためのポイント

### Q1: なぜLocalStorageを選択したのか？

**Q: 外部データベース（Firebase、Supabaseなど）ではなくLocalStorageを採用した理由は？**

**A: シンプルさと学習目的を重視したため。LocalStorageは実装が単純で、認証機能がなくても即座に使用可能。プロトタイプ段階では適切な選択肢。将来的にはバックエンド連携への移行も容易な設計にしている。**

### Q2: ID生成の統一が重要な理由は？

**Q: `bookmark-${messageId}-${Date.now()}`から`bookmark-${messageId}`に変更した理由は？**

**A: 同一メッセージに対する一意性を保つため。Date.now()があると同じメッセージを複数回ブックマークした場合に異なるIDが生成され、状態管理が複雑になる。メッセージベースでの単一ブックマーク管理が目標。**

### Q3: forceBookmarkCategoryパラメータの必要性は？

**Q: カテゴリー自動判定にforceBookmarkCategoryが必要な理由は？**

**A: 修正英語があるメッセージをブックマークした場合、自動判定では「correction」カテゴリーになり、ブックマーク画面で表示されない問題があった。ブックマークボタンからの保存時は強制的に「bookmark」カテゴリーにすることで、表示の整合性を保証している。**

---

## 参考 / References

- 0039-bookmark-page-implementation.md - ブックマークページの基礎実装
- 0026-audio-cache-system.md - 音声システムの基盤技術

---