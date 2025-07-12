# 0011 – Text-to-Speech発音機能の追加

## 背景 / Context

現在のシステムではAIからのテキスト応答を読むことで英語学習を行っているが、正しい発音を確認する手段がない。英語学習効果を最大化するため、AIの応答テキストを高品質な音声で読み上げる機能が必要。特に英語の発音練習において、ネイティブレベルの音声を聞けることで学習者のリスニング力向上と正しい発音の習得を支援したい。

---

## 決定 / Decision

各AIメッセージに発音ボタンを追加し、OpenAI TTS-1-HDモデルを使用してテキストを高品質な音声に変換・再生する機能を実装する。

---

## 理由 / Rationale

- 英語学習における発音確認の重要性
- OpenAI TTS-1-HDによる高品質でナチュラルな音声合成
- 既存のUIに最小限の変更で統合可能
- 英語学習者にとってのリスニング練習効果
- オンデマンド再生によるユーザビリティ向上

---

## 実装詳細 / Implementation Notes

### 1. TTS API エンドポイント作成

```ts
// apps/web/app/api/tts/route.ts
export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text) {
      return new Response('Text is required', { status: 400 });
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1-hd',
        voice: 'alloy',
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error('TTS API request failed');
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('TTS API error:', error);
    return new Response('TTS generation failed', { status: 500 });
  }
}
```

理由:
- OpenAI TTS-1-HDモデルで高品質音声生成
- サーバーサイドでAPIキー管理によるセキュリティ確保
- 音声データのストリーミング配信
- 入力バリデーションとエラーハンドリングによる堅牢性
- Cache-Controlヘッダーによる適切なキャッシュ制御

### 2. 発音ボタンコンポーネント追加

```tsx
// apps/web/app/page.tsx - 発音機能の追加
const [isPlaying, setIsPlaying] = useState<Record<string, boolean>>({});

const handleTextToSpeech = async (messageId: string, text: string) => {
  try {
    setIsPlaying(prev => ({ ...prev, [messageId]: true }));
    
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    audio.onended = () => {
      setIsPlaying(prev => ({ ...prev, [messageId]: false }));
      URL.revokeObjectURL(audioUrl);
    };

    audio.onerror = () => {
      setIsPlaying(prev => ({ ...prev, [messageId]: false }));
      URL.revokeObjectURL(audioUrl);
    };
    
    await audio.play();
  } catch (error) {
    console.error('TTS error:', error);
    setIsPlaying(prev => ({ ...prev, [messageId]: false }));
  }
};
```

理由:
- メッセージごとの再生状態管理
- 音声ファイルのメモリ効率的な管理
- エラーハンドリングによる堅牢性（ネットワークエラーと音声再生エラーの両方に対応）
- 音声再生の完了とエラー時の適切なリソース解放

### 3. UI統合（メッセージごとの発音ボタン）

```tsx
// メッセージレンダリング部分への発音ボタン追加
{message.role === "assistant" && (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => handleTextToSpeech(message.id, message.content)}
    disabled={isPlaying[message.id]}
    className="h-8 w-8 p-0 hover:bg-gray-100"
  >
    {isPlaying[message.id] ? (
      <VolumeX className="h-4 w-4" />
    ) : (
      <Volume2 className="h-4 w-4" />
    )}
  </Button>
)}
```

理由:
- アシスタントメッセージのみに発音ボタンを配置
- 再生中の視覚的フィードバック（VolumeX/Volume2アイコンの切り替え）
- 既存のUIデザインとの統一性（hover効果とサイズ調整）
- 古いhandlePlayAudio関数を新しいhandleTextToSpeech関数で置き換え

### 4. ローディング状態とエラーハンドリング

```tsx
// 再生状態の管理とエラー処理
const [ttsError, setTtsError] = useState<string>("");

// エラー状態の表示
{ttsError && (
  <div className="text-red-500 text-sm mt-1">
    {ttsError}
  </div>
)}
```

理由:
- ネットワークエラーやAPI制限時の適切なフィードバック
- ユーザー体験を損なわないエラー処理
- 一時的なエラー状態の管理

---

## 影響 / Consequences

### 正の影響
- 英語学習者の発音学習効果向上
- リスニング力の強化
- AIの応答内容の理解促進
- アクセシビリティの向上（視覚障害者支援）

### 注意点・制約
- OpenAI API使用料金の増加（TTS API呼び出し）
- 音声データの一時的なメモリ使用量増加
- ネットワーク帯域幅の消費増加
- 同時再生制限の考慮が必要

---

## 技術的なポイント

- Web Audio APIを使用したブラウザ音声再生
- Blob URLを使用した一時的な音声ファイル管理
- React Hooksを使用した再生状態管理
- 音声ファイルの適切なメモリ解放（URL.revokeObjectURL）
- OpenAI TTS-1-HDモデルによる高品質音声合成

---

## 参考 / References

- [OpenAI Text-to-Speech API Documentation](https://platform.openai.com/docs/guides/text-to-speech)
- [Web Audio API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- 既存実装: `/apps/web/app/page.tsx` (音声機能基盤)
- 関連コンポーネント: Lucide React Volume2, VolumeX アイコン

---