"use client";

import React, { createContext, useContext, useReducer, useEffect } from 'react';

// SavedPhraseインターフェースの定義（既存のものと統一）
export interface SavedPhrase {
  id: string;
  content: string;
  translation?: string;
  category: "correction" | "bookmark" | "translation";
  timestamp: string;
  originalContent?: string;
}

// アクションタイプの定義
type BookmarkAction = 
  | { type: 'LOAD_BOOKMARKS'; payload: SavedPhrase[] }
  | { type: 'ADD_BOOKMARK'; payload: SavedPhrase }
  | { type: 'REMOVE_BOOKMARK'; payload: string }
  | { type: 'UPDATE_BOOKMARK'; payload: SavedPhrase };

// BookmarkStateの定義
interface BookmarkState {
  savedPhrases: SavedPhrase[];
}

// BookmarkContextの定義
interface BookmarkContextType extends BookmarkState {
  addBookmark: (phrase: SavedPhrase) => void;
  removeBookmark: (id: string) => void;
  updateBookmark: (phrase: SavedPhrase) => void;
  isBookmarked: (id: string) => boolean;
  isMessageBookmarked: (messageId: string) => boolean;
  getBookmarkedPhrases: () => SavedPhrase[];
}

// Reducerの実装
function bookmarkReducer(state: BookmarkState, action: BookmarkAction): BookmarkState {
  switch (action.type) {
    case 'LOAD_BOOKMARKS':
      return { savedPhrases: action.payload };
    case 'ADD_BOOKMARK':
      return { savedPhrases: [...state.savedPhrases, action.payload] };
    case 'REMOVE_BOOKMARK':
      return { 
        savedPhrases: state.savedPhrases.filter(phrase => phrase.id !== action.payload) 
      };
    case 'UPDATE_BOOKMARK':
      return {
        savedPhrases: state.savedPhrases.map(phrase => 
          phrase.id === action.payload.id ? action.payload : phrase
        )
      };
    default:
      return state;
  }
}

// LocalStorageキー
const STORAGE_KEY = 'lingua-chat-bookmarks';

// LocalStorageヘルパー関数
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

const saveToLocalStorage = (savedPhrases: SavedPhrase[]): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPhrases));
  } catch (error) {
    console.error('LocalStorageへのブックマーク保存エラー:', error);
  }
};

// Context作成
const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

// Provider実装
export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(bookmarkReducer, { savedPhrases: [] });

  // 初期読み込み
  useEffect(() => {
    const loadedPhrases = loadFromLocalStorage();
    dispatch({ type: 'LOAD_BOOKMARKS', payload: loadedPhrases });
  }, []);

  // 状態変更時の自動保存
  useEffect(() => {
    if (state.savedPhrases.length >= 0) {
      saveToLocalStorage(state.savedPhrases);
    }
  }, [state.savedPhrases]);

  // Context value
  const contextValue: BookmarkContextType = {
    ...state,
    addBookmark: (phrase: SavedPhrase) => {
      dispatch({ type: 'ADD_BOOKMARK', payload: phrase });
    },
    removeBookmark: (id: string) => {
      dispatch({ type: 'REMOVE_BOOKMARK', payload: id });
    },
    updateBookmark: (phrase: SavedPhrase) => {
      dispatch({ type: 'UPDATE_BOOKMARK', payload: phrase });
    },
    isBookmarked: (id: string) => {
      return state.savedPhrases.some(phrase => phrase.id === id);
    },
    isMessageBookmarked: (messageId: string) => {
      return state.savedPhrases.some(phrase => phrase.id === `bookmark-${messageId}`);
    },
    getBookmarkedPhrases: () => {
      return state.savedPhrases.filter(phrase => phrase.category === 'bookmark');
    }
  };

  return (
    <BookmarkContext.Provider value={contextValue}>
      {children}
    </BookmarkContext.Provider>
  );
}

// Hook
export function useBookmark() {
  const context = useContext(BookmarkContext);
  if (context === undefined) {
    throw new Error('useBookmarkはBookmarkProvider内で使用してください');
  }
  return context;
}

// チャットメッセージからSavedPhraseへの変換ヘルパー
export function createSavedPhraseFromMessage(
  messageId: string,
  content: string,
  correctedContent?: string,
  translatedContent?: string,
  originalContent?: string,
  forceBookmarkCategory: boolean = false
): SavedPhrase {
  // カテゴリーの判定
  let category: "correction" | "bookmark" | "translation";
  
  if (forceBookmarkCategory) {
    // ブックマークボタンから呼ばれた場合は強制的にbookmark
    category = "bookmark";
  } else {
    // 自動修正・翻訳時の自動判定
    if (correctedContent) {
      category = "correction";
    } else if (translatedContent) {
      category = "translation";
    } else {
      category = "bookmark";
    }
  }

  // 保存対象のコンテンツを決定
  const finalContent = correctedContent || translatedContent || content;
  const translation = category === "translation" ? content : translatedContent;

  return {
    id: `bookmark-${messageId}`,
    content: finalContent,
    translation,
    category,
    timestamp: new Date().toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }),
    originalContent
  };
}