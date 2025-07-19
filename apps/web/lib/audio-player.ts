import { audioCache } from './utils'

// デバイス検知ユーティリティ
class DeviceDetector {
  static isMobile(): boolean {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
           window.innerWidth < 768
  }
  
  static isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  }
  
  static isAndroid(): boolean {
    return /Android/i.test(navigator.userAgent)
  }
}

// モバイル専用デバッグログ
class MobileAudioLogger {
  static log(stage: string, data: any, isError: boolean = false) {
    const prefix = `[Mobile Audio ${isError ? 'ERROR' : 'DEBUG'}]`
    console.log(`${prefix} ${stage}:`, data)
    
    // モバイルでの確認用（開発時のみ）
    if (DeviceDetector.isMobile() && isError) {
      console.error(`${prefix} ${stage}:`, JSON.stringify(data, null, 2))
    }
  }
}

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
    // モバイルでは初期化を試行しない
    if (DeviceDetector.isMobile()) {
      throw new Error('Web Audio API not recommended for mobile devices')
    }

    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        
        MobileAudioLogger.log('AudioContext Created', {
          state: this.audioContext.state,
          sampleRate: this.audioContext.sampleRate
        })
        
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume()
          MobileAudioLogger.log('AudioContext Resumed', {
            newState: this.audioContext.state
          })
        }
      } catch (error) {
        MobileAudioLogger.log('AudioContext Init Failed', error, true)
        throw new Error(`AudioContext initialization failed: ${error}`)
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
    // モバイルでは使用禁止
    if (DeviceDetector.isMobile()) {
      throw new Error('AudioPlayer.play() should not be used on mobile devices')
    }

    try {
      this.stop()

      const audioContext = await this.initAudioContext()
      const audioBuffer = await this.blobToAudioBuffer(blob)
      
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.playbackRate.value = Math.max(0.25, Math.min(4.0, playbackRate))
      
      source.connect(audioContext.destination)
      
      source.onended = () => {
        this.isPlaying = false
        this.currentSource = null
        options.onEnd?.()
      }

      this.currentSource = source
      this.isPlaying = true
      
      options.onStart?.()
      source.start(0)
      
    } catch (error) {
      this.isPlaying = false
      this.currentSource = null
      const audioError = error instanceof Error ? error : new Error('Audio playback failed')
      MobileAudioLogger.log('AudioPlayer Play Error', audioError, true)
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
  MobileAudioLogger.log('Fallback Play Start', { 
    blobSize: blob.size, 
    playbackRate,
    isMobile: DeviceDetector.isMobile()
  })

  const audioUrl = URL.createObjectURL(blob)
  const audio = new Audio(audioUrl)
  
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
      const error = new Error('Fallback audio playback failed')
      MobileAudioLogger.log('Fallback Play Error', error, true)
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

  // デバイス別再生戦略の決定
  constructor() {
    if (DeviceDetector.isMobile()) {
      this.useWebAudio = false
      MobileAudioLogger.log('Constructor', 'Mobile detected - Audio API will be used')
    }
  }

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
      MobileAudioLogger.log('Speak Start', { 
        text: text.slice(0, 50), 
        playbackRate,
        isMobile: DeviceDetector.isMobile(),
        useWebAudio: this.useWebAudio 
      })
      
      const audioBlob = await this.fetchTTS(text, playbackRate)
      MobileAudioLogger.log('TTS Fetch Success', { 
        blobSize: audioBlob.size, 
        blobType: audioBlob.type 
      })
      
      // モバイル用とデスクトップ用で完全に分岐
      if (DeviceDetector.isMobile()) {
        await this.mobileAudioPlay(audioBlob, options)
      } else {
        await this.desktopAudioPlay(audioBlob, options)
      }
      
    } catch (error) {
      MobileAudioLogger.log('Speak Error', error, true)
      const ttsError = error instanceof Error ? error : new Error('TTS failed')
      options.onError?.(ttsError)
      throw ttsError
    } finally {
      this.isLoading = false
    }
  }

  // モバイル専用の音声再生
  private async mobileAudioPlay(blob: Blob, options: AudioPlayerOptions): Promise<void> {
    MobileAudioLogger.log('Mobile Audio Play Start', { blobSize: blob.size })
    
    return new Promise((resolve, reject) => {
      const audioUrl = URL.createObjectURL(blob)
      const audio = new Audio(audioUrl)
      
      // モバイル最適化設定
      audio.preload = 'auto'
      audio.volume = 1.0
      
      // iOSでの追加設定
      if (DeviceDetector.isIOS()) {
        (audio as any).playsInline = true
      }

      audio.addEventListener('canplaythrough', () => {
        MobileAudioLogger.log('Audio Can Play Through', 'Ready to play')
        options.onStart?.()
        
        audio.play()
          .then(() => {
            MobileAudioLogger.log('Audio Play Success', 'Playing started')
          })
          .catch((playError) => {
            MobileAudioLogger.log('Audio Play Error', playError, true)
            this.handleMobileAudioError(audioUrl, playError, options, reject)
          })
      })

      audio.addEventListener('ended', () => {
        MobileAudioLogger.log('Audio Ended', 'Playback completed')
        URL.revokeObjectURL(audioUrl)
        options.onEnd?.()
        resolve()
      })

      audio.addEventListener('error', (errorEvent) => {
        MobileAudioLogger.log('Audio Error Event', errorEvent, true)
        this.handleMobileAudioError(audioUrl, new Error('Audio element error'), options, reject)
      })

      // 読み込み開始
      audio.load()
    })
  }

  // デスクトップ用の音声再生（既存ロジック改善）
  private async desktopAudioPlay(blob: Blob, options: AudioPlayerOptions): Promise<void> {
    if (this.useWebAudio) {
      try {
        await this.audioPlayer.play(blob, 1.0, options)
      } catch (webAudioError) {
        MobileAudioLogger.log('Web Audio Failed, Fallback to Audio API', webAudioError, true)
        this.useWebAudio = false
        await fallbackPlay(blob, 1.0, options)
      }
    } else {
      await fallbackPlay(blob, 1.0, options)
    }
  }

  // モバイル音声エラーの包括的処理
  private handleMobileAudioError(
    audioUrl: string, 
    error: Error, 
    options: AudioPlayerOptions, 
    reject: (error: Error) => void
  ): void {
    URL.revokeObjectURL(audioUrl)
    
    const detailedError = new Error(`Mobile audio failed: ${error.message}`)
    MobileAudioLogger.log('Mobile Audio Error Handler', {
      originalError: error.message,
      userAgent: navigator.userAgent,
      audioSupport: !!window.Audio
    }, true)
    
    options.onError?.(detailedError)
    reject(detailedError)
  }

  // 再生停止
  stop(): void {
    if (!DeviceDetector.isMobile()) {
      this.audioPlayer.stop()
    }
    // モバイルでは現在の実装では停止機能なし
  }

  // 再生状態を取得
  getIsPlaying(): boolean {
    if (DeviceDetector.isMobile()) {
      // モバイルではローディング状態を返す
      return this.isLoading
    }
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