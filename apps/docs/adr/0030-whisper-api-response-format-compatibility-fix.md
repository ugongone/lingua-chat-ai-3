# 0030 – Whisper API response_format 互換性問題の修正

## 背景 / Context

OpenAI のWhisper APIを使用した音声転写機能で、`gpt-4o-transcribe`モデルにおいて`response_format: 'verbose_json'`が互換性エラーを引き起こし、音声入力機能が動作しない問題が発生していた。

---

## 決定 / Decision

`response_format`を`'verbose_json'`から`'json'`に変更し、適切なTypeScript型定義を追加することで互換性問題を解決する。

---

## 理由 / Rationale

- OpenAI APIのエラーメッセージで`'verbose_json'`は`gpt-4o-transcribe`モデルと互換性がないことが明示されていた
- `'json'`フォーマットは推奨される代替手段として提示されていた
- TypeScript型安全性を維持しつつ、オプショナルなプロパティアクセスを実装する必要があった

---

## 実装詳細 / Implementation Notes

### 1. response_formatパラメータの修正

```ts
const transcription = await client.audio.transcriptions.create({
  file: audioFile,
  model: 'gpt-4o-transcribe',
  // 言語を指定せず、自動検出を利用（多言語対応）
  response_format: 'json', // gpt-4o-transcribeモデルと互換性のある形式
  temperature: 0.2, // 一貫性を重視
});
```

理由:
- `'verbose_json'`は`gpt-4o-transcribe`モデルでサポートされていない
- `'json'`は互換性があり、基本的な転写結果を取得できる

### 2. TypeScript型定義の追加

```ts
// OpenAI音声転写レスポンスの型定義
interface TranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
}
```

理由:
- any型の使用を避けて型安全性を確保
- オプショナルプロパティとして`language`と`duration`を定義

### 3. 安全なプロパティアクセス

```ts
// 互換性のためオプショナルなプロパティとして処理
const transcriptionData = transcription as TranscriptionResponse;
const language = transcriptionData.language || 'unknown';
const duration = transcriptionData.duration || 0;
```

理由:
- `json`フォーマットでは`language`と`duration`が提供されない可能性がある
- デフォルト値を設定してAPIレスポンスの一貫性を保つ

---

## 影響 / Consequences

- 音声転写機能が正常に動作するようになる
- `language`と`duration`情報が取得できない場合があるが、基本的な転写機能は維持される
- TypeScript型安全性が向上し、lintエラーが解消される
- 既存の音声転写API利用者への影響は最小限（APIレスポンス形式は維持）

---

## 言語的・技術的なポイント

- OpenAI APIの異なるモデル間での互換性に注意が必要
- TypeScript型定義により実行時エラーのリスクを軽減
- オプショナルプロパティを使用したAPIレスポンスの堅牢性向上

---

## 参考 / References

- 関連ADR: [0004-gpt-4o-transcribe-migration.md](./0004-gpt-4o-transcribe-migration.md) - GPT-4o transcribeモデルへの移行
- 関連ADR: [0003-whisper-api-integration.md](./0003-whisper-api-integration.md) - Whisper API統合

---