## Before Coding

- 思考は日本語で出力すること
- 必ず "Plan → Reasoning → Code" の順で進行すること
- /apps/docs/adr/ 配下に機能追加の設計書(adr)を作成すること
  - フォーマットは/apps/docs/guide/0000-adr-template.mdの内容を参考にすること
  - adrの内容(コード例など)は既存のコードを参考に考えること

## After Coding

- 実装内容と、adrに差分があれば、adrを修正すること

## Todo

以下のうち、指示された箇所に絞って実装すること。
明示的に指示されていない箇所は実装しないこと。

### フェーズ1: 基本機能実装

1. 音声認識機能の実装

- Web Speech API を使用したリアルタイム音声認識
- マイクアクセス許可とエラーハンドリング
- 音声→テキスト変換の実装

2. AI応答機能の実装

- OpenAI API との統合
- 非同期処理とローディング状態
- エラーハンドリングとフォールバック

3. 音声出力機能の実装

- Text-to-Speech (TTS) API の実装
- 音声再生コントロール

### フェーズ2: UX改善

4. データ永続化

- 会話履歴のローカルストレージ保存
- セッション管理

5. UIの改善

- ローディング状態とエラーメッセージ表示
- レスポンシブデザイン調整
