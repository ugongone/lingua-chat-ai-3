import { audioCache } from './utils'

export interface AudioPlayerOptions {
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: Error) => void
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null
  private currentSource: AudioBufferSourceNode | null = null
  private isPlaying = false

  constructor() {
    // AudioContextは初回使用時に作成（ユーザー操作後）
  }

  // AudioContextを初期化（初回使用時）
  private async initAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // サスペンド状態の場合は再開
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }
    }
    
    return this.audioContext
  }

  // Blobを AudioBuffer に変換
  private async blobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
    const audioContext = await this.initAudioContext()
    const arrayBuffer = await blob.arrayBuffer()
    return audioContext.decodeAudioData(arrayBuffer)
  }

  // 音声を再生（速度指定可能）
  async play(blob: Blob, playbackRate = 1.0, options: AudioPlayerOptions = {}): Promise<void> {
    try {
      // 既に再生中の場合は停止
      this.stop()

      const audioContext = await this.initAudioContext()
      const audioBuffer = await this.blobToAudioBuffer(blob)
      
      // AudioBufferSourceNodeを作成
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.playbackRate.value = Math.max(0.25, Math.min(4.0, playbackRate))
      
      // 出力に接続
      source.connect(audioContext.destination)
      
      // イベントリスナーを設定
      source.onended = () => {
        this.isPlaying = false
        this.currentSource = null
        options.onEnd?.()
      }

      // 再生開始
      this.currentSource = source
      this.isPlaying = true
      
      options.onStart?.()
      source.start(0)
      
    } catch (error) {
      this.isPlaying = false
      this.currentSource = null
      const audioError = error instanceof Error ? error : new Error('Audio playback failed')
      options.onError?.(audioError)
      throw audioError
    }
  }

  // 再生停止
  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop()
      } catch (error) {
        // 既に停止済みの場合のエラーは無視
      }
      this.currentSource = null
    }
    this.isPlaying = false
  }

  // 再生状態を取得
  getIsPlaying(): boolean {
    return this.isPlaying
  }

  // リソースクリーンアップ
  dispose(): void {
    this.stop()
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}

// 従来のAudio APIを使ったフォールバック再生
async function fallbackPlay(
  blob: Blob, 
  playbackRate: number, 
  options: AudioPlayerOptions
): Promise<void> {
  const audioUrl = URL.createObjectURL(blob)
  const audio = new Audio(audioUrl)
  
  // 速度設定（従来のAudio APIでサポートされている場合）
  if ('playbackRate' in audio) {
    audio.playbackRate = Math.max(0.25, Math.min(4.0, playbackRate))
  }

  return new Promise((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl)
      options.onEnd?.()
      resolve()
    }

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl)
      const error = new Error('Audio playback failed')
      options.onError?.(error)
      reject(error)
    }

    audio.onloadstart = () => {
      options.onStart?.()
    }

    audio.play().catch(reject)
  })
}

// TTS APIから音声を取得してキャッシュ付きで再生
export class TTSPlayer {
  private audioPlayer = new AudioPlayer()
  private isLoading = false
  private useWebAudio = true

  // TTS APIから音声を取得（キャッシュ優先、速度別対応）
  private async fetchTTS(text: string, speed: number = 1.0): Promise<Blob> {
    // 速度別キャッシュチェック
    const cachedBlob = audioCache.get(text, speed)
    if (cachedBlob) {
      return cachedBlob
    }

    // API呼び出し（常に指定速度で生成）
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, speed }),
    })

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.status}`)
    }

    const blob = await response.blob()
    
    // 速度別キャッシュに保存
    try {
      audioCache.set(text, speed, blob)
    } catch (cacheError) {
      console.warn('Failed to cache audio:', cacheError)
      // キャッシュエラーは無視して続行
    }
    
    return blob
  }

  // テキストを音声で再生（速度別最適化、キャッシュ対応、フォールバック付き）
  async speak(
    text: string, 
    playbackRate = 1.0, 
    options: AudioPlayerOptions = {}
  ): Promise<void> {
    if (this.isLoading) {
      throw new Error('TTS request already in progress')
    }

    try {
      this.isLoading = true
      
      // 指定速度で音声データを取得（キャッシュ優先）
      const audioBlob = await this.fetchTTS(text, playbackRate)
      
      if (this.useWebAudio) {
        try {
          // Web Audio APIで基本再生（速度は既に最適化済み）
          await this.audioPlayer.play(audioBlob, 1.0, options)
        } catch (webAudioError) {
          console.warn('Web Audio API failed, falling back to Audio API:', webAudioError)
          this.useWebAudio = false
          
          // フォールバック：従来のAudio APIで基本再生
          await fallbackPlay(audioBlob, 1.0, options)
        }
      } else {
        // フォールバック再生（基本速度、音声は既に最適化済み）
        await fallbackPlay(audioBlob, 1.0, options)
      }
      
    } catch (error) {
      const ttsError = error instanceof Error ? error : new Error('TTS failed')
      options.onError?.(ttsError)
      throw ttsError
    } finally {
      this.isLoading = false
    }
  }

  // 再生停止
  stop(): void {
    this.audioPlayer.stop()
  }

  // 再生状態を取得
  getIsPlaying(): boolean {
    return this.audioPlayer.getIsPlaying()
  }

  // ローディング状態を取得
  getIsLoading(): boolean {
    return this.isLoading
  }

  // リソースクリーンアップ
  dispose(): void {
    this.audioPlayer.dispose()
  }
}

// グローバルインスタンス（シングルトン）
export const ttsPlayer = new TTSPlayer()