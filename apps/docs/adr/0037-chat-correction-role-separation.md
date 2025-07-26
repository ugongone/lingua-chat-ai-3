# 0037 – チャット機能と英語修正機能の役割分離

## 背景 / Context

現在のアプリケーションでは、入力された英語に対して二重の修正フィードバックが発生する問題がありました：

1. **専用の英語修正機能**: `/apps/web/app/api/correct-english/route.ts` で緑枠表示による修正フィードバック
2. **チャット機能**: `/apps/web/app/api/chat/route.ts` で「英語家庭教師」として英語の指摘や修正フィードバック

この二重フィードバックにより、ユーザーは同じ英語入力に対して複数の修正を受け取ることになり、混乱を招く状況でした。

---

## 決定 / Decision

チャット機能を「英語家庭教師」から「会話パートナー」に変更し、英語修正フィードバックを排除して自然な会話継続に集中させる。

---

## 理由 / Rationale

- 専用の英語修正機能が既に存在するため、チャット機能で重複する必要がない
- ユーザー体験の向上：二重フィードバックの解消により、明確で理解しやすいインターフェースを提供
- 機能の役割分離：各機能が明確な責任を持つことで、保守性と拡張性が向上
- 会話の自然性確保：修正に焦点を当てずに会話を継続することで、より自然な対話体験を実現

---

## 実装詳細 / Implementation Notes

### 1. チャットAPIシステムプロンプトの変更

```ts
// 変更前
{
  role: "system",
  content: "You are an English tutor. Please answer in ≤3 short sentences (≈45 words)",
}

// 変更後
{
  role: "system",
  content: "You are a conversational partner. Focus on continuing natural conversations without correcting English or providing language feedback. Please answer in ≤3 short sentences (≈45 words)",
}
```

理由:

- 「English tutor」から「conversational partner」への変更により、修正ではなく会話に焦点を移す
- 「without correcting English or providing language feedback」を明示的に追加し、英語修正フィードバックを排除
- 文章長制限（≤3 short sentences, ≈45 words）は維持し、簡潔な応答を保持

### 2. 機能の役割分離

```ts
// チャット機能 (chat/route.ts)
// - 自然な会話継続
// - 英語修正フィードバックなし
// - temperature: 0.7 (創造的な応答)

// 英語修正機能 (correct-english/route.ts) 
// - 英語の文法・自然性修正
// - 修正のみに特化
// - temperature: 0.1 (正確性重視)
```

理由:

- 各機能が単一の責任を持つことで、保守性が向上
- ユーザーが明確に機能を区別できる
- 今後の機能拡張時に影響範囲を限定できる

---

## 影響 / Consequences

- **ポジティブな影響**:
  - ユーザー体験の改善：二重フィードバックの解消
  - コードの保守性向上：機能の責任が明確に分離
  - 会話の自然性向上：修正に気を取られない流れるような対話
  
- **考慮事項**:
  - ユーザーが英語学習支援を期待している場合、修正機能の存在を明確に理解する必要がある
  - 今後チャット機能に英語学習支援を追加する場合は、専用機能との重複を避ける設計が必要

---

## 言語的・技術的なポイント

- **OpenAI GPT-4.1の用途別最適化**: 
  - チャット: temperature 0.7 で創造的な会話応答
  - 修正: temperature 0.1 で正確な言語修正
- **システムプロンプトの重要性**: AIの動作を明確に制御するための詳細な指示
- **React/Next.js**: APIルートの責任分離によるクリーンアーキテクチャの実現

---

## 参考 / References

- [0005-english-correction-feature.md](./0005-english-correction-feature.md) - 英語修正機能の初期実装
- [0034-casual-chat-experience-optimization.md](./0034-casual-chat-experience-optimization.md) - カジュアルなチャット体験最適化

---