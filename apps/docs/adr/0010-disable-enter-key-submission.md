# 0010 – Enterキーによるメッセージ送信の無効化

## 背景 / Context

現在のテキスト入力機能では、Enterキーを押すとメッセージが自動的に送信される仕様となっている。しかし、長文の入力時や改行を含む文章を作成する際に、意図しない送信が発生してしまうリスクがある。ユーザーが安心してテキストを入力し、送信タイミングを制御できるようにしたい。

---

## 決定 / Decision

Enterキーによる自動送信を無効化し、明示的な送信ボタンクリックのみでメッセージ送信を行うよう変更する。

---

## 理由 / Rationale

- 意図しない送信を防ぎ、ユーザーの入力体験を向上させる
- 長文入力時の安全性を確保する
- メッセージ送信前の内容確認を促進する
- Shift+Enterでの改行機能は維持し、複数行テキストの入力を可能にする

---

## 実装詳細 / Implementation Notes

### 1. キーボードイベントハンドラーの修正

```ts
const handleKeyPress = (e: React.KeyboardEvent) => {
  // Enterキーでの送信を無効化
  // Shift+Enterでの改行のみを許可
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    // handleSend() の呼び出しを削除
  }
};
```

理由:

- Enterキー単体での自動送信処理を削除
- Shift+Enterでの改行機能は既存のブラウザデフォルト動作で維持
- preventDefault()により、Enterキー単体での改行も防ぐ

### 2. 送信ボタンでの明示的送信

```ts
// 既存の送信ボタンは変更なし
<Button
  onClick={handleSend}
  disabled={!input.trim()}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
>
  送信
</Button>
```

理由:

- 既存の送信ボタン機能をそのまま活用
- ユーザーは意図的にボタンをクリックして送信
- 入力が空の場合のバリデーションも維持

---

## 影響 / Consequences

- ユーザーの送信操作が明示的になり、誤送信のリスクが減少
- 既存の送信ボタン機能に変更はないため、UI的な影響は最小限
- Shift+Enterでの改行機能は維持されるため、複数行入力の利便性は保たれる
- 既存のユーザーがEnterキーでの送信に慣れている場合、操作方法の変更に注意が必要

---

## 言語的・技術的なポイント

- React の KeyboardEvent ハンドリングにおいて、preventDefault() で標準動作を制御
- 既存の handleSend 関数の呼び出しロジックは変更せず、イベントハンドラーのみを修正
- textareaの標準的な改行動作（Shift+Enter）は維持し、UXの一般的な期待に合致

---

## 参考 / References

- 現在の実装: `apps/web/app/page.tsx:377-382`
- MDN Web Docs - KeyboardEvent: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent

---