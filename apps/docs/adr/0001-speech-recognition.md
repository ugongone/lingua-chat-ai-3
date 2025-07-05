# 0001 - Web Speech API を利用した音声認識機能の追加

---

## 全体的な設計思想

この実装は段階的な機能拡張を意識しています：

1. まず音声認識の基本機能を確実に動作させる
2. エラー処理でアプリの安定性を確保
3. リアルタイム UI でユーザー体験を向上
4. 将来的な AI 応答機能への準備

特に、ブラウザ API の不安定性（Web Speech API はまだ標準化途中）に対して、適切なフォールバック処理とエラーハンドリングを実装しているのが重要なポイントです。

---

## 1. インポートの拡張

```ts
import { useState, useEffect, useRef } from "react";
```

理由: 音声認識機能には以下が必要だったため：

- **useEffect**: コンポーネントマウント時に Web Speech API を初期化
- **useRef**: SpeechRecognition インスタンスをレンダリング間で永続化（state にすると再作成されてしまう）

## 2. グローバル型定義の追加

```ts
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
```

理由: Web Speech API の現実的な問題への対処：

- **Chrome/Edge**: `webkitSpeechRecognition`
- **Firefox**: `SpeechRecognition`
- TypeScript デフォルトではこれらの型が未定義
- クロスブラウザ対応のために両方の型定義が必要

## 3. 新しい State 変数の追加

```ts
const [transcript, setTranscript] = useState("");
const recognitionRef = useRef<SpeechRecognition | null>(null);
```

理由:

- **transcript**:
  リアルタイム UX のため。ユーザーが「今何が認識されているか」を視覚的に確認できる
- **recognitionRef**:
  音声認識インスタンスのライフサイクル管理。`start / stop` を適切に制御するために必要

## 4. useEffect での初期化処理

```ts
useEffect(() => {
  if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
    // ここで認識インスタンスを生成・設定
  }
}, []);
```

理由:

- **SSR 対応**: Next.js ではサーバーサイドでも実行されるため `window` チェックが必須
- **グレースフルデグラデーション**: 音声認識非対応ブラウザでもアプリが動作する

## 5. 音声認識の詳細設定

```ts
recognition.continuous = true; // 連続認識
recognition.interimResults = true; // 中間結果取得
recognition.lang = "ja-JP"; // 日本語設定
```

理由:

- **continuous**: 一度の発話で止まらない自然な会話体験
- **interimResults**: リアルタイムフィードバックでユーザー体験向上
- **lang**: 日本語 UI / メッセージに合わせた言語設定

## 6. 結果処理の二段階アプローチ

```ts
if (event.results[i].isFinal) {
  finalTranscript += transcript; // 確定 → メッセージ化
} else {
  interimTranscript += transcript; // 中間 → リアルタイム表示
}
```

理由: UX の最適化

- **中間結果**: ユーザーに「認識されている」安心感を与える
- **確定結果**: 実際のメッセージとして記録

## 7. エラーハンドリングの実装

```ts
recognition.onerror = (event) => {
  console.error("Speech recognition error:", event.error);
  setIsRecording(false); // UI 状態をリセット
};
```

理由: 堅牢性の確保

- マイクアクセス拒否
- ネットワークエラー
- ブラウザ制限
  これらで UI 状態が不整合にならないよう制御

## 8. handleVoiceInput の実装

```ts
if (!recognitionRef.current) {
  alert("音声認識はこのブラウザでサポートされていません");
  return;
}
```

理由: ユーザビリティ

- サポート状況の明確な通知
- 適切な開始 / 停止制御
- UI 状態との同期

## 9. UI でのリアルタイム表示

```tsx
{
  transcript && (
    <p className="text-center text-sm text-blue-600 mt-2 italic">
      "{transcript}"
    </p>
  );
}
```

理由: 視覚的フィードバック

- 音声認識の進行状況を可視化
- ユーザーの発話内容確認
- 認識精度への信頼感向上
