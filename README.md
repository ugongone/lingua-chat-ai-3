# Lingua Chat AI 3

AI駆動の音声認識・応答システムです。音声入力、テキスト入力、リアルタイム翻訳、音声合成機能を統合したWebアプリケーションです。

## 主な機能

### 🎤 音声認識
- Web Speech APIを使用したリアルタイム音声認識
- 音声からテキストへの変換
- Whisper API統合による高精度な音声認識

### 🤖 AI応答
- OpenAI GPT-4oを使用した知的な応答生成
- 日本語・英語に対応
- コンテキストを考慮した自然な会話

### 🌐 翻訳機能
- 日本語↔英語の双方向翻訳
- テキスト選択による翻訳ポップアップ
- 英語文章の添削機能

### 🔊 音声合成
- Text-to-Speech（TTS）機能
- 再生速度調整機能
- 自動音声再生機能

### 📱 PWA対応
- プログレッシブWebアプリとしてインストール可能
- オフライン対応
- ネイティブアプリ体験

## アーキテクチャ

このプロジェクトは[Turborepo](https://turbo.build/repo)を使用したモノレポ構成です。

### アプリケーション
- **`apps/web`**: メインのWebアプリケーション（Next.js）
- **`apps/docs`**: ドキュメントとADR（Architecture Decision Records）

### パッケージ
- **`@repo/ui`**: 共有UIコンポーネント
- **`@repo/eslint-config`**: ESLint設定
- **`@repo/typescript-config`**: TypeScript設定

## 開発環境のセットアップ

### 前提条件
- Node.js 18以上
- pnpm 9.0.0以上

### インストール

```bash
# リポジトリをクローン
git clone [repository-url]
cd lingua-chat-ai-3

# 依存関係をインストール
pnpm install
```

### 環境変数の設定

```bash
# apps/web/.env.local を作成
OPENAI_API_KEY=your_openai_api_key_here
```

## 開発

### 開発サーバー起動

```bash
# 全アプリケーションを開発モードで起動
pnpm dev

# 特定のアプリケーションのみ起動
pnpm dev --filter=web
```

### ビルド

```bash
# 全アプリケーションをビルド
pnpm build

# 特定のアプリケーションのみビルド
pnpm build --filter=web
```

### Linting & Formatting

```bash
# ESLintでコードをチェック
pnpm lint

# Prettierでコードをフォーマット
pnpm format

# TypeScriptの型チェック
pnpm check-types
```

## デプロイ

本番環境では以下の手順でデプロイしてください：

1. 環境変数を本番環境に設定
2. `pnpm build`でビルド
3. `apps/web`の成果物をデプロイ

## 技術スタック

- **フロントエンド**: Next.js 15, React 19, TypeScript
- **スタイリング**: Tailwind CSS
- **UI**: Radix UI, Lucide React
- **AI**: OpenAI API (GPT-4o, Whisper)
- **音声**: Web Speech API, Speech Synthesis API
- **パッケージ管理**: pnpm
- **ビルドツール**: Turbo

## 設計書（ADR）

このプロジェクトの設計決定は`apps/docs/adr/`に文書化されています。

- [音声認識機能](./apps/docs/adr/0001-speech-recognition.md)
- [AI応答統合](./apps/docs/adr/0002-ai-response-integration.md)
- [Whisper API統合](./apps/docs/adr/0003-whisper-api-integration.md)
- [GPT-4o転記機能](./apps/docs/adr/0004-gpt-4o-transcribe-migration.md)
- [英語添削機能](./apps/docs/adr/0005-english-correction-feature.md)
- [テキスト入力機能](./apps/docs/adr/0006-text-input-functionality.md)
- [日英翻訳機能](./apps/docs/adr/0008-japanese-to-english-translation.md)
- [Text-to-Speech機能](./apps/docs/adr/0011-text-to-speech-feature.md)
- [PWA実装](./apps/docs/adr/0020-pwa-implementation.md)
- [翻訳ポップアップ機能](./apps/docs/adr/0021-translation-popup-position-adjustment.md)

## Contributing

1. フォークまたはブランチを作成
2. 変更を実装
3. テストを実行: `pnpm lint && pnpm check-types`
4. プルリクエストを作成

## License

このプロジェクトは私的利用のためのものです。