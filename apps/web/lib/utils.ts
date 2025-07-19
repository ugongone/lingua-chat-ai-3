import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 音声キャッシュシステム（10分TTL）
interface CacheEntry {
  blob: Blob
  timer: NodeJS.Timeout
  createdAt: number
}

class AudioCache {
  private cache = new Map<string, CacheEntry>()
  private readonly TTL = 10 * 60 * 1000 // 10分

  // キャッシュキーを生成（テキスト内容から）
  private generateKey(text: string): string {
    return btoa(encodeURIComponent(text)).slice(0, 50)
  }

  // 音声をキャッシュに保存
  set(text: string, blob: Blob): void {
    const key = this.generateKey(text)
    
    // 既存のエントリがある場合、タイマーをクリア
    const existing = this.cache.get(key)
    if (existing) {
      clearTimeout(existing.timer)
    }
    
    // 新しいタイマーを設定して自動削除
    const timer = setTimeout(() => {
      this.cache.delete(key)
    }, this.TTL)
    
    this.cache.set(key, {
      blob,
      timer,
      createdAt: Date.now()
    })
  }

  // キャッシュから音声を取得
  get(text: string): Blob | null {
    const key = this.generateKey(text)
    const entry = this.cache.get(key)
    return entry ? entry.blob : null
  }

  // キャッシュをクリア
  clear(): void {
    for (const entry of this.cache.values()) {
      clearTimeout(entry.timer)
    }
    this.cache.clear()
  }

  // キャッシュ統計
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        size: entry.blob.size,
        age: Date.now() - entry.createdAt
      }))
    }
  }
}

// シングルトンインスタンス
export const audioCache = new AudioCache()
