# 0009 – 日本語入力時のAIリクエスト英訳化

## 背景 / Context

現在のシステムでは、日本語入力時に英訳表示機能が実装されているが、AIへのリクエストには元の日本語がそのまま送信されている。これにより、AIからの応答も日本語になることがあり、英語学習効果の最大化が図れていない。常にAIから英語での応答を得ることで、日本語→英語→英語応答のフローを確立し、英語学習効果を向上させたい。

---

## 決定 / Decision

日本語入力（音声・テキスト）時に、既に生成されている英訳をAIリクエストに使用し、常に英語での応答を得られるようにする。英訳が失敗した場合は元の日本語をフォールバックとして使用する。

---

## 理由 / Rationale

- 英語学習効果の最大化（日本語→英語→英語応答のフロー確立）
- 既存の英訳機能を最大限活用
- 最小限の変更でリスクを抑制
- 英訳失敗時のフォールバック機能で堅牢性を確保

---

## 実装詳細 / Implementation Notes

### 1. transcribeAudio関数の修正

```ts
// apps/web/app/page.tsx (172行目)
// 変更前
        // AI応答を生成
        await generateAIResponse(result.text);

// 変更後
        // AI応答を生成（日本語の場合は英訳を使用）
        await generateAIResponse(translatedContent || result.text);
```

理由:
- 音声認識結果が日本語の場合、英訳が存在すれば英訳をAIリクエストに使用
- 英訳が失敗した場合は元の音声認識結果をフォールバック

### 2. handleSend関数の修正

```ts
// apps/web/app/page.tsx (374行目)
// 変更前
    // AI応答を生成（既存関数を再利用）
    await generateAIResponse(userInput);

// 変更後
    // AI応答を生成（日本語の場合は英訳を使用）
    await generateAIResponse(translatedContent || userInput);
```

理由:
- テキスト入力が日本語の場合、英訳が存在すれば英訳をAIリクエストに使用
- 英訳が失敗した場合は元のテキスト入力をフォールバック

### 3. 処理フロー

```
日本語入力 → 英訳生成 → 英訳表示（緑枠） → AIリクエスト（英訳使用） → 英語応答
     ↓         ↓                           ↓                    ↓
   音声/文字   成功/失敗                  UI表示              GPT-4.1
                ↓
            失敗時は元テキストでAIリクエスト
```

理由:
- 既存の英訳機能との完全な互換性
- エラーハンドリングによる堅牢性確保
- ユーザー体験を損なわない設計

---

## 影響 / Consequences

### 正の影響
- 日本語入力時に常に英語応答が得られる
- 英語学習効果の向上（一貫した英語環境）
- 既存機能との完全な互換性維持
- 修正箇所が2行のみでリスク最小化

### 注意点
- 英訳API失敗時は従来通り日本語応答になる可能性
- 日本語入力時のAPI呼び出し順序（英訳→AI応答）が重要

---

## 技術的なポイント

- 既存の`translatedContent`変数を活用した最小限の変更
- JavaScript/TypeScriptの論理OR演算子を使用したフォールバック実装
- 既存のエラーハンドリング機能をそのまま活用

---

## 参考 / References

- 既存実装: `/apps/web/app/page.tsx` (英訳機能)
- 関連ADR: `0008-japanese-to-english-translation.md`
- OpenAI Chat Completions API Documentation

---