# 0017 – TTS読み上げ速度制御機能の実装

## 背景 / Context

既存のTTS機能では読み上げ速度が固定されており、学習者のレベルや好みに応じた調整ができなかった。学習効果を高めるため、読み上げ速度の可変性が必要となった。

---

## 決定 / Decision

TTS機能に読み上げ速度制御機能を実装し、学習者が自由に速度を調整できるようにする。

---

## 理由 / Rationale

- 個人の学習レベルに応じた読み上げ速度調整で学習効果を向上させる
- OpenAI TTS APIの既存機能を活用することで実装コストを抑制
- 直感的なUI操作で学習体験の向上を図る

---

## 実装詳細 / Implementation Notes

### 1. TTS API速度パラメータ追加

```ts
export async function POST(request: Request) {
  try {
    const { text, speed = 1.0 } = await request.json();
    
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
        speed: Math.max(0.25, Math.min(4.0, speed)),
      }),
    });
  }
}
```

理由:
- OpenAI TTS APIの標準速度範囲（0.25-4.0）に準拠
- デフォルト値1.0で既存機能の互換性を保持

### 2. フロントエンド速度制御UI実装

```tsx
const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
const [showSpeedControl, setShowSpeedControl] = useState(false);
const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

// TTS API呼び出し時
const response = await fetch("/api/tts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text, speed: playbackSpeed }),
});
```

理由:
- 直感的なスライダーUIで操作性を向上
- 7段階の速度選択で幅広い学習ニーズに対応
- 既存のヘルプモーダルと統一されたデザイン

---

## 影響 / Consequences

- 読み上げ速度調整により個人の学習ペースに対応可能
- TTS APIリクエスト形式が変更されるが、既存機能は後方互換性を維持
- UIに新しい速度制御パネルが追加され、学習体験が向上

---

## 言語的・技術的なポイント

- OpenAI TTS APIの速度パラメータ活用による音声品質の維持
- Reactの状態管理とイベントハンドリングによるリアルタイムUI更新
- CSS-in-JSによるモーダルデザインの統一と一貫した操作体験

---

## 参考 / References

- [0011 – Text-to-Speech機能実装](./0011-text-to-speech-feature.md)
- [OpenAI TTS API Documentation](https://platform.openai.com/docs/guides/text-to-speech)