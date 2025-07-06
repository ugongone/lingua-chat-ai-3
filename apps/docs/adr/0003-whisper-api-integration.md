# 0003 – OpenAI Whisper API を利用した高精度音声認識への変更

## 背景 / Context

現在のWeb Speech APIによる音声認識は以下の課題がある：

- **精度の問題**: ブラウザ依存の音声認識で、特に日本語や複雑な内容で精度が低い
- **ブラウザ依存性**: Chrome/Edge（webkit）とFirefoxで実装が異なり、一部ブラウザでは未対応
- **リアルタイム処理の制限**: 中間結果は取得できるが、最終的な精度は期待値以下
- **言語モデルの制限**: 最新の言語理解や専門用語への対応が限定的
- **多言語対応の課題**: 日本語と英語の混在した音声や、言語切り替えに対する柔軟性が不足

より高精度で安定した音声認識を実現し、日本語と英語両方での自然な音声入力を可能にするため、OpenAI Whisper APIへの移行が必要。

---

## 決定 / Decision

Web Speech APIからOpenAI Whisper APIに移行し、MediaRecorder APIを使用した音声録音機能と組み合わせて、日本語・英語両対応の高精度音声認識を実装する。

**アーキテクチャの変更**:
- **現在**: 音声入力 → Web Speech API (ブラウザ内STT) → テキスト → OpenAI Chat API → AI応答
- **変更後**: 音声入力 → MediaRecorder API → 音声ファイル → Whisper API (サーバー側STT) → テキスト → OpenAI Chat API → AI応答

**重要**: AI応答生成部分（OpenAI Chat API統合）は既存システムをそのまま活用し、STT（Speech-to-Text）部分のみをWhisper APIで置き換える。

---

## 理由 / Rationale

- **高精度**: Whisper APIは業界最高水準の音声認識精度を提供
- **多言語対応**: 99言語に対応し、日本語・英語の認識精度が特に優秀
- **言語自動検出**: ユーザーが話した言語を自動的に検出し、適切に処理
- **混在言語対応**: 日本語と英語が混在した発話でも高い認識精度を維持
- **ノイズ耐性**: 背景ノイズや音質の悪い音声でも高い認識精度
- **専門用語対応**: 最新の言語モデルにより技術用語や固有名詞も正確に認識
- **一貫性**: ブラウザに依存しない安定した動作
- **既存統合**: すでにOpenAI APIを使用しているため、同一プロバイダーでの統合

---

## 実装詳細 / Implementation Notes

### 1. MediaRecorder APIによる音声録音

```ts
// 音声録音機能の実装
const initializeMediaRecorder = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
      }
    });
    
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };
    
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioChunksRef.current = [];
      
      // Stop all tracks to release microphone
      stream.getTracks().forEach(track => track.stop());
      
      if (audioBlob.size > 0) {
        await transcribeAudio(audioBlob);
      }
    };
    
    return mediaRecorder;
  } catch (error) {
    console.error('Error accessing microphone:', error);
    alert('マイクへのアクセスが許可されていません。ブラウザの設定を確認してください。');
    return null;
  }
};
```

理由:
- Web標準APIで安定した音声録音が可能
- ブラウザ間の互換性が高い
- 高品質音声設定（エコーキャンセレーション、ノイズ抑制）
- WebM/Opus形式で効率的な音声圧縮
- 適切なリソース管理（マイクの解放）
- エラーハンドリングとユーザーフィードバック

### 2. Whisper API用のAPI Route作成（多言語対応）

```ts
// app/api/transcribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // ファイルサイズチェック (25MB制限)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Audio file too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }

    // サポートされているファイル形式チェック
    const supportedTypes = ['audio/wav', 'audio/mp3', 'audio/m4a', 'audio/ogg', 'audio/webm'];
    if (!supportedTypes.includes(audioFile.type)) {
      return NextResponse.json(
        { error: 'Unsupported audio format. Supported formats: WAV, MP3, M4A, OGG, WebM' },
        { status: 400 }
      );
    }

    console.log(`Processing audio file: ${audioFile.name}, size: ${audioFile.size} bytes, type: ${audioFile.type}`);

    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      // 言語を指定せず、自動検出を利用（日本語・英語両対応）
      response_format: 'verbose_json', // 言語検出結果も取得
      temperature: 0.2, // 一貫性を重視
    });

    console.log(`Transcription completed. Language: ${transcription.language}, Text: ${transcription.text}`);

    return NextResponse.json({
      text: transcription.text,
      language: transcription.language, // 検出された言語
      duration: transcription.duration, // 音声の長さ
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Whisper API error:', error);
    
    // OpenAI APIのエラーメッセージを詳細に返す
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Transcription failed',
          details: error.message,
          type: 'whisper_api_error'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Unknown transcription error',
        type: 'unknown_error'
      },
      { status: 500 }
    );
  }
}
```

理由:
- 言語パラメータを省略することで自動言語検出を活用
- verbose_jsonで言語検出結果、音声時間も取得
- ファイルサイズ制限（25MB）で適切なリソース管理
- サポート形式チェックで安全性確保
- temperature設定で認識の一貫性向上
- 詳細なログ出力でデバッグ支援
- 構造化されたエラーレスポンス

### 3. フロントエンド統合（多言語表示対応）

```ts
// State管理
const [isRecording, setIsRecording] = useState(false);
const [isTranscribing, setIsTranscribing] = useState(false);
const [isAIResponding, setIsAIResponding] = useState(false);
const [detectedLanguage, setDetectedLanguage] = useState<string>('');
const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const audioChunksRef = useRef<Blob[]>([]);

// 音声録音とWhisper API統合
const transcribeAudio = async (audioBlob: Blob) => {
  try {
    setIsTranscribing(true);
    
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');

    console.log('Sending audio for transcription, size:', audioBlob.size);

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Transcription failed');
    }

    const result = await response.json();
    
    if (result.text) {
      console.log('Transcription result:', {
        text: result.text,
        language: result.language,
        duration: result.duration
      });

      // 検出された言語を保存
      setDetectedLanguage(result.language || '');
      
      // 認識されたテキストでメッセージを作成
      const newMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: result.text,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // AI応答を生成
      await generateAIResponse(result.text);
    }
  } catch (error) {
    console.error('Transcription error:', error);
    
    // エラーメッセージを表示
    const errorMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: "申し訳ございません。音声の認識中にエラーが発生しました。もう一度お試しください。",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };
    setMessages(prev => [...prev, errorMessage]);
  } finally {
    setIsTranscribing(false);
  }
};

// 録音開始・停止制御
const handleVoiceInput = async () => {
  if (isRecording) {
    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  } else {
    // Start recording
    const mediaRecorder = await initializeMediaRecorder();
    if (mediaRecorder) {
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.start();
      setIsRecording(true);
    }
  }
};
```

理由:
- 3段階の状態管理（録音中→文字起こし中→AI応答中）
- 詳細なエラーハンドリングとユーザーフィードバック
- 適切なリソース管理とメモリ管理
- レスポンス検証とエラー時のフォールバック
- ログ出力による詳細なデバッグ情報
- 既存AI応答システムとの完全統合

### 4. UI/UXの改善（多言語対応表示）

```tsx
// 各処理段階の状態表示
{isRecording && (
  <p className="text-center text-sm text-red-600 mt-3 animate-pulse">
    Recording... Tap to stop / 録音中... タップして停止
  </p>
)}
{isTranscribing && (
  <p className="text-center text-sm text-blue-600 mt-3 animate-pulse">
    Analyzing voice... / 音声を解析中...
  </p>
)}
{detectedLanguage && !isRecording && !isTranscribing && !isAIResponding && (
  <p className="text-center text-xs text-gray-500 mt-1">
    Detected: {detectedLanguage === 'ja' ? '日本語' : detectedLanguage === 'en' ? 'English' : detectedLanguage}
  </p>
)}
{isAIResponding && (
  <p className="text-center text-sm text-blue-600 mt-3 animate-pulse">
    AI generating response... / AI が回答を生成中...
  </p>
)}
{!isRecording && !isTranscribing && !isAIResponding && (
  <p className="text-center text-sm text-gray-500 mt-3">
    Press the microphone button to start conversation / マイクボタンを押して会話を始めましょう
  </p>
)}
```

理由:
- 日本語・英語ユーザー両方に配慮したバイリンガルUI
- 3段階の処理状況を明確に表示（録音→解析→AI応答）
- 検出言語の適切なタイミングでの表示
- 条件分岐による適切な状態管理
- ユーザーの不安を軽減する視覚的フィードバック

---

## 影響 / Consequences

### ポジティブな影響
- **大幅な精度向上**: 音声認識の精度が大幅に改善
- **多言語対応**: 日本語・英語・その他言語での自然な音声入力が可能
- **言語混在対応**: 日本語と英語が混在した発話も正確に認識
- **国際対応**: グローバルユーザーにも対応可能なアプリケーション
- **安定性向上**: ブラウザ依存性がなくなり、一貫した動作
- **ノイズ耐性**: 環境ノイズに強く、実用性が向上

### 注意点・変更点
- **API コスト増加**: Whisper APIの使用で追加コストが発生
- **レスポンス時間**: リアルタイム処理からバッチ処理に変更、若干の遅延が発生
- **ファイルアップロード**: 音声データのサーバー送信が必要
- **ストレージ**: 一時的な音声ファイルの処理が必要

### システム構成の変更点

| 機能 | 現在の実装 | 変更後の実装 | 変更有無 |
|------|------------|-------------|----------|
| **音声取得** | Web Speech API | MediaRecorder API | ✅ 変更 |
| **STT処理** | ブラウザ（Web Speech） | サーバー（Whisper API） | ✅ 変更 |
| **テキスト→AI** | OpenAI Chat API | OpenAI Chat API | ❌ 変更なし |
| **AI応答生成** | GPT-4.1-mini | GPT-4.1-mini | ❌ 変更なし |
| **UI表示** | React State管理 | React State管理 | ❌ 変更なし |

**既存機能の活用**: `generateAIResponse`関数、メッセージ管理、エラーハンドリングなどの既存AI統合部分は保持し、音声認識部分のみを高精度化する。

### フォローアップタスク
- 言語別の音声品質最適化
- 言語固有のUI/UX調整
- 多言語での音声コマンド対応
- 言語使用統計の収集と分析
- 音声ファイルサイズの最適化（圧縮・形式変更）
- 録音時間の制限設定
- Whisper APIのコスト監視

---

## 代替案 / Alternatives Considered

1. **Web Speech API の継続使用**
   - 採用しない理由: 精度の問題が解決されない、ブラウザ依存性、多言語対応の限界

2. **他の音声認識サービス (Azure Speech, Google Speech-to-Text)**
   - 採用しない理由: すでにOpenAI APIを使用しており、統合の一貫性を保つため

3. **ローカル音声認識 (WebAssembly Whisper)**
   - 採用しない理由: ブラウザでの処理負荷が高く、レスポンスが不安定、多言語モデルのサイズが大きい

4. **言語別の特化API使用**
   - 採用しない理由: 複数のAPIプロバイダー管理が複雑、言語混在音声への対応が困難

5. **ハイブリッド方式 (Web Speech + Whisper フォールバック)**
   - 採用しない理由: 複雑性が増し、ユーザー体験が一貫しない

---

## 参考 / References

- [OpenAI Whisper API Documentation](https://platform.openai.com/docs/guides/speech-to-text)
- [Whisper Multilingual Support](https://platform.openai.com/docs/guides/speech-to-text/supported-languages)
- [MediaRecorder API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Web Audio API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [FormData API for File Upload](https://developer.mozilla.org/en-US/docs/Web/API/FormData)

---