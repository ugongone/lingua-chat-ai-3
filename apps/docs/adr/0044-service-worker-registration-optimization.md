# 0044 – Service Worker登録処理の最適化と無限ループ修正

## 背景 / Context

Service Worker登録処理において以下の問題が発生していた：

1. **TypeScriptコンパイルエラー**: `ServiceWorkerRegistration | null` と `ServiceWorkerRegistration | undefined` の型不一致
2. **無限ループ**: 毎秒大量のログが出力され、Service Worker登録が繰り返し実行される
3. **パフォーマンス問題**: 重複登録による不要な処理負荷

---

## 決定 / Decision

Service Worker登録処理のuseEffect依存配列を空にし、型定義を統一して、重複登録防止ガード処理を実装する。

---

## 理由 / Rationale

- Service Worker登録はマウント時に一度だけ実行すべきである
- TypeScriptの型安全性を確保するため一貫した型定義が必要
- 重複登録を防いでパフォーマンスとログの可読性を向上させる
- PWAの適切な動作を保証する

---

## 実装詳細 / Implementation Notes

### 1. 型定義の統一

```ts
// 修正前
const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

// 修正後
const [registration, setRegistration] = useState<ServiceWorkerRegistration | undefined>(undefined);
```

理由:

- UpdateNotificationコンポーネントが`ServiceWorkerRegistration | undefined`を期待している
- null vs undefined の不一致を解消してTypeScriptエラーを修正

### 2. 無限ループの修正

```ts
// 修正前
}, [registration, updateCheckInterval]);

// 修正後
}, []); // 空の依存配列でマウント時に一度だけ実行
```

理由:

- `setRegistration`や`setUpdateCheckInterval`の実行でuseEffectが再実行される無限ループを防止
- Service Worker登録はマウント時の一回のみで十分

### 3. 重複登録防止ガード処理

```ts
const [isRegistering, setIsRegistering] = useState<boolean>(false);

const registerServiceWorker = async () => {
  // 重複登録防止
  if (isRegistering) {
    console.log('Service Worker登録処理は既に実行中です');
    return;
  }

  // 既存の登録をチェック
  try {
    const existingReg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (existingReg) {
      console.log('既存の Service Worker 登録を使用します:', existingReg);
      setRegistration(existingReg);
      return existingReg;
    }
  } catch (error) {
    console.log('既存登録のチェックでエラー:', error);
  }

  setIsRegistering(true);
  try {
    // 新規登録処理...
  } finally {
    setIsRegistering(false);
  }
};
```

理由:

- 同時実行防止フラグで重複登録を防ぐ
- 既存登録の再利用でパフォーマンス向上
- 確実なクリーンアップでメモリリーク防止

### 4. 定期更新チェック最適化

```ts
const updateCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

const startPeriodicUpdateCheck = (reg: ServiceWorkerRegistration) => {
  // 既にインターバルが設定されている場合は停止
  if (updateCheckIntervalRef.current) {
    clearInterval(updateCheckIntervalRef.current);
    console.log('既存の定期更新チェックを停止しました');
  }

  const interval = setInterval(async () => {
    // 定期更新処理...
  }, 60 * 60 * 1000);

  updateCheckIntervalRef.current = interval;
};
```

理由:

- useRefによる直接参照で状態更新による再レンダリングを回避
- 重複インターバル設定防止
- 確実なクリーンアップ処理

---

## 影響 / Consequences

- Service Worker登録の無限ループが解消され、パフォーマンスが向上
- TypeScriptコンパイルエラーが解消され、開発体験が改善
- ログ出力が正常化され、デバッグ作業が効率化
- PWAとしての動作安定性が向上
- 技術的負債：既存のService Worker使用箇所での型チェックが必要

---

## 言語的・技術的なポイント

- React useEffectの依存配列による再実行制御は慎重に設計する必要がある
- Service Worker APIの非同期処理とReactライフサイクルの適切な組み合わせ
- useRefとuseStateの使い分け：再レンダリングが不要な値はuseRefを使用
- TypeScriptの型システムでnullとundefinedを一貫して使用する重要性

---

## Q&A / 技術理解のためのポイント

### Q1: なぜ無限ループが発生していたのか？

**Q: useEffectの依存配列に`registration`と`updateCheckInterval`を含めていた理由は？**

**A: 一見、関連する状態の変更を監視するのが適切に見えるが、実際はuseEffect内でこれらの状態を更新しているため無限ループが発生していた。Service Worker登録は初回マウント時のみ実行すべき処理のため、依存配列は空にするのが正解。**

### Q2: なぜuseRefを使用したのか？

**Q: 定期更新チェックのインターバル管理でuseRefを選んだ理由は？**

**A: useStateを使用すると、インターバルIDが更新されるたびにコンポーネントが再レンダリングされ、useEffectの依存配列に含めると再度無限ループのリスクがある。useRefは値の保持のみで再レンダリングを発生させないため、この用途に適している。**

### Q3: 既存登録チェックの必要性

**Q: Service Worker.register()は重複実行しても問題ないのでは？**

**A: register()自体は冪等だが、毎回ネットワークリクエストやファイル比較が発生するため、既存登録をチェックして再利用することでパフォーマンスが向上する。また、登録プロセス中の重複実行を防ぐフラグも併用している。**

---

## 参考 / References

- [0020-pwa-implementation.md](./0020-pwa-implementation.md) - PWA実装の基礎
- [0043-pwa-auto-update-implementation.md](./0043-pwa-auto-update-implementation.md) - Service Worker自動更新機能

---