# 0004 – whisper-1からgpt-4o-transcribeへの音声認識モデル移行

## 背景 / Context

従来の音声認識でwhisper-1モデルを使用していたが、より高精度な音声認識を実現するため、OpenAIの新しいgpt-4o-transcribeモデルへの移行を実施した。gpt-4o-transcribeは多言語対応、WER（Word Error Rate）の改善、より高精度な音声認識を提供する。

---

## 決定 / Decision

音声認識APIをwhisper-1からgpt-4o-transcribeに変更し、対応する音声フォーマットとレスポンス形式を調整する。

---

## 理由 / Rationale

- gpt-4o-transcribeはWhisperを上回るWER（Word Error Rate）を記録
- 33言語平均でWhisperより誤り率が低い
- 弱言語（マラヤラムなど）で大幅な改善を確認
- 最新のOpenAI音声認識技術を活用

---

## 実装詳細 / Implementation Notes

### 1. 音声認識モデルの変更

```ts
// apps/web/app/api/transcribe/route.ts
const transcription = await client.audio.transcriptions.create({
  file: audioFile,
  model: 'gpt-4o-transcribe', // whisper-1 から変更
  response_format: 'json', // verbose_json から変更
  temperature: 0.2,
});
```

理由:
- gpt-4o-transcribeはverbose_jsonをサポートしていない
- jsonまたはtextフォーマットのみ対応

### 2. レスポンス形式の調整

```ts
// apps/web/app/api/transcribe/route.ts
return NextResponse.json({
  text: transcription.text,
  timestamp: new Date().toISOString(),
  // language, duration プロパティを削除（jsonフォーマットでは未対応）
});
```

理由:
- jsonフォーマットではlanguage、durationプロパティが利用できない
- textプロパティのみ確実に取得可能

### 3. 音声フォーマット対応の拡張

```ts
// フロントエンド: apps/web/app/page.tsx
// ブラウザ別の最適な形式を動的検出
let mimeType = 'audio/webm;codecs=opus';
if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
  mimeType = 'audio/webm;codecs=opus';
} else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
  mimeType = 'audio/ogg;codecs=opus';
} else if (MediaRecorder.isTypeSupported('audio/mp4')) {
  mimeType = 'audio/mp4';
}
```

```ts
// バックエンド: apps/web/app/api/transcribe/route.ts
const supportedTypes = [
  'audio/wav', 
  'audio/mp3', 
  'audio/m4a', 
  'audio/ogg', 
  'audio/webm', 
  'audio/webm;codecs=opus',
  'audio/ogg;codecs=opus',
  'audio/mp4'
];
```

理由:
- ChromeやEdgeは`audio/webm;codecs=opus`を優先使用
- Firefox旧環境では`audio/ogg;codecs=opus`を使用
- Safariでは`audio/mp4`を使用
- codecsパラメータ付きのMIMEタイプに対応

### 4. ファイル名の動的生成

```ts
// apps/web/app/page.tsx
await transcribeAudio(audioBlob, `recording${fileExtension}`);
```

理由:
- 実際の音声フォーマットに応じた拡張子を使用
- デバッグ時のファイル識別を容易にする

---

## 影響 / Consequences

- 音声認識精度の向上
- 多言語対応の改善
- レスポンス形式の変更により、言語検出や音声長情報が取得不可
- 既存の音声認識機能との互換性を維持

---

## 代替案 / Alternatives Considered

- whisper-1の継続使用: 精度面で劣るため却下
- 独自の音声認識ライブラリ: 開発コスト・メンテナンス負荷が高いため却下
- 他社音声認識API: OpenAI統合環境での一貫性を保つため却下

---

## 参考 / References

- [OpenAI公式ブログ - gpt-4o-transcribe発表](https://openai.com)
- [TechCrunch - Whisper後継STT記事](https://techcrunch.com)
- [Artificial Analysis - 独立検証結果](https://artificialanalysis.ai)
- [VentureBeat - 33言語平均改善報告](https://venturebeat.com)

---