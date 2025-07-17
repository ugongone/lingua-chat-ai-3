# 0023 – 読み上げ速度変更モーダルの外部タップ閉じ機能

## 背景 / Context

読み上げ速度変更モーダルが開いた状態で、他の箇所をタップしても閉じない状態になっており、ユーザビリティが低下していた。一般的なモーダルUIでは、モーダル外部をタップすることで閉じられるのが慣習的な動作であるため、この機能を追加する必要があった。

---

## 決定 / Decision

読み上げ速度変更モーダルに外部タップ検出機能を追加し、モーダル外部をタップした際に自動的に閉じるようにする。

---

## 理由 / Rationale

- 一般的なモーダルUIの慣習に従い、ユーザーの直感的な操作を実現
- モバイルデバイスでの操作性向上（タップによる簡単な閉じ操作）
- 他の類似機能（翻訳ポップアップなど）との操作一貫性の確保

---

## 実装詳細 / Implementation Notes

### 1. 外部タップ検出レイヤーの追加（クリックとタッチの両対応）

```tsx
{
  showSpeedControl && (
    <div
      className="fixed inset-0 z-10"
      onClick={() => {
        if (!speedModalTouchProcessedRef.current) {
          setShowSpeedControl(false);
        }
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        speedModalTouchProcessedRef.current = true;
        setShowSpeedControl(false);
        // クリックイベントの重複を防ぐため、短時間フラグを立てる
        setTimeout(() => {
          speedModalTouchProcessedRef.current = false;
        }, 300);
      }}
    >
      <div
        className="absolute bottom-16 right-20 mb-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg w-64"
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {/* モーダル内容 */}
      </div>
    </div>
  );
}
```

理由:

- `fixed inset-0` で全画面を覆う透明レイヤーを作成
- クリックとタッチの両方のイベントを処理してモバイル対応を強化
- `speedModalTouchProcessedRef` でタッチとクリックの重複実行を防止

### 2. イベント伝播の制御とタッチ処理の最適化

```tsx
const speedModalTouchProcessedRef = useRef(false);

// モーダル内部での伝播防止
onClick={(e) => e.stopPropagation()}
onTouchEnd={(e) => e.stopPropagation()}

// 外部レイヤーでの重複防止
onTouchEnd={(e) => {
  e.preventDefault();
  speedModalTouchProcessedRef.current = true;
  setShowSpeedControl(false);
  setTimeout(() => {
    speedModalTouchProcessedRef.current = false;
  }, 300);
}}
```

理由:

- モーダル内部のクリック/タッチが外部ハンドラーに伝播するのを防止
- タッチイベント後300ms間はクリックイベントを無視して重複実行を防止
- `e.preventDefault()` でモバイルブラウザのデフォルト動作をブロック
- スライダー操作時に意図しない閉じ動作を防ぐ

---

## 影響 / Consequences

- ユーザビリティの向上：直感的な操作でモーダルを閉じることが可能
- 操作の一貫性：他のモーダルUIと同様の動作パターンを提供
- モバイル対応の向上：タップによる簡単な閉じ操作を実現
- 技術的負債なし：既存のコードへの影響は最小限

---

## 言語的・技術的なポイント

- **React のイベント処理**: `stopPropagation()` を使用したイベントバブリングの制御
- **CSS の z-index 管理**: モーダルレイヤーの適切な重ね順の設定
- **Tailwind CSS**: `fixed inset-0` による全画面レイヤーの効率的な実装

---

## 参考 / References

- [0017-ai-response-optimization-tts-speed-control.md](./0017-ai-response-optimization-tts-speed-control.md) - 読み上げ速度制御機能の実装
- [0019-footer-menu-button-redesign.md](./0019-footer-menu-button-redesign.md) - フッターメニューボタンの再設計

---
