# 0019 – フッターボタンのメニュー化による UI改善

## 背景 / Context

アプリケーションのフッターエリアに自動読み上げ、自動ブラー、読み上げ速度設定、ヘルプの4つのボタンが水平に配置されていたが、UI の密度が高くなりすぎており、特にモバイルでの操作性に問題があった。また、参考実装では縦の三点リーダー（⋯）をメインボタンとして、設定項目を垂直メニューで表示する形式が採用されていた。

**発生した問題:**
- フッターエリアのボタンが多すぎて視覚的に煩雑
- モバイルでの操作性が悪い
- ヘルプボタンが機能として不要になっていた
- 参考実装との UI 統一性の欠如

---

## 決定 / Decision

フッターの設定ボタンを垂直メニュー形式に変更し、縦の三点リーダー（⋯）をメインボタンとして配置する。メニューは `showSettingsMenu` 状態で表示制御し、`animate-slide-up` アニメーションで表示する。

---

## 理由 / Rationale

- UI の密度を下げて視覚的なスッキリ感を実現
- モバイルでの操作性向上（タップしやすい配置）
- 参考実装との UI 統一性の確保
- 不要なヘルプボタンの削除によるコードの簡素化
- アニメーションにより UX を向上

---

## 実装詳細 / Implementation Notes

### 1. showSettingsMenu状態の追加

```ts
const [showSettingsMenu, setShowSettingsMenu] = useState(false);
```

理由:

- メニューの表示/非表示を制御するための状態管理
- 既存の状態管理パターンに合わせたシンプルな実装

### 2. フッターボタンの構造変更

```tsx
{/* Right side - Settings menu */}
<div className="absolute right-6 flex items-center">
  <div className="relative">
    {/* Settings menu items - slide up animation */}
    {showSettingsMenu && (
      <div className="absolute bottom-12 right-0 flex flex-col gap-2 animate-slide-up">
        <Button
          variant={autoPlayAudio ? "default" : "outline"}
          size="sm"
          className="h-10 w-10 p-0 shadow-md"
          onClick={() => setAutoPlayAudio(!autoPlayAudio)}
        >
          {autoPlayAudio ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
        <Button
          variant={autoBlurText ? "default" : "outline"}
          size="sm"
          className="h-10 w-10 p-0 shadow-md"
          onClick={() => setAutoBlurText(!autoBlurText)}
        >
          {autoBlurText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-10 p-0 bg-white shadow-md"
          onClick={() => setShowSpeedControl(!showSpeedControl)}
        >
          <span className="text-xs font-medium">{playbackSpeed}x</span>
        </Button>
      </div>
    )}

    {/* Main menu button */}
    <Button
      variant="outline"
      size="sm"
      className="h-10 w-10 p-0 bg-white"
      onClick={() => setShowSettingsMenu(!showSettingsMenu)}
    >
      <span className="text-lg font-bold">⋯</span>
    </Button>
  </div>
</div>
```

理由:

- **水平から垂直へのレイアウト変更**: `flex flex-col` で縦方向に配置
- **position absolute**: `bottom-12` で上方向に表示
- **shadow-md**: 各ボタンに影を追加してメニューらしい見た目に
- **bg-white**: 背景色を白に設定して視覚的な区別を明確化
- **right-6**: 右端から少し内側に配置して余白を確保

### 3. アニメーションCSSの追加

```css
.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

理由:

- **slide-up アニメーション**: メニューが下から上にスライドして表示
- **opacity 変化**: フェードインでスムーズな表示
- **0.3s ease-out**: 適度な速度で自然な動き

### 4. 読み上げ速度変更モーダルの位置調整

```tsx
{showSpeedControl && (
  <div className="absolute bottom-16 right-20 mb-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg w-64 z-10">
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">読み上げ速度</span>
        <span className="text-sm text-blue-600 font-medium">{playbackSpeed}x</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min="0"
          max="6"
          step="1"
          value={speedOptions.indexOf(playbackSpeed)}
          onChange={(e) => setPlaybackSpeed(speedOptions[Number.parseInt(e.target.value)] || 1.0)}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>
    </div>
    {/* Arrow pointing down - 右端に配置 */}
    <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white border-r border-b border-gray-200 rotate-45"></div>
  </div>
)}
```

理由:

- **モーダルの位置**: `right-0` → `right-20` に変更して右端から適切な距離に配置
- **マージン調整**: `mb-3` → `mb-2` に変更してより自然な配置
- **パディング調整**: `p-3` → `p-4` に変更して内部の余白を改善
- **スペース調整**: `space-y-2` → `space-y-3` に変更して要素間の間隔を改善
- **アローの位置**: `right-12` → `right-4` に変更して右端に配置し、視覚的な統一性を確保

### 5. 不要なコードの削除

```ts
// 削除されたインポート
- HelpCircle,

// 削除された状態
- const [showHelp, setShowHelp] = useState(false);
```

理由:

- ヘルプボタンが参考実装に存在しないため削除
- 使用されなくなったインポートとコードの整理
- コードの保守性向上

---

## 影響 / Consequences

**ポジティブな影響:**
- フッターエリアの UI が整理されて視覚的にスッキリ
- モバイルでの操作性が大幅に向上
- 参考実装との UI 統一性が確保される
- アニメーションにより UX が向上
- 不要なヘルプボタンが削除されてコードが簡潔に

**技術的な影響:**
- 新しい状態管理が1つ追加（showSettingsMenu）
- CSS アニメーションが追加されるが軽量
- コンポーネントの再レンダリング頻度には影響しない
- 既存の機能（自動読み上げ、自動ブラー、速度制御）の動作は変更なし

**潜在的な課題:**
- メニューボタンの存在がユーザーに伝わりにくい可能性
- 既存のユーザーが操作方法に慣れるまで時間がかかる可能性

---

## 言語的・技術的なポイント

**React / State Management:**
- useState を活用したシンプルな状態管理
- 条件付きレンダリングによる動的な UI 制御
- 既存の状態管理パターンとの一貫性

**CSS / Animation:**
- CSS-in-JS（styled-jsx）を使用したスコープされたスタイル
- keyframes アニメーションによる滑らかな UI 遷移
- Tailwind CSS クラスとカスタム CSS の効果的な組み合わせ

**UX Design:**
- 情報の階層化によるユーザーの認知負荷軽減
- Progressive Disclosure パターンの適用
- モバイルファーストなアプローチ

---

## 参考 / References

- 0018-auto-tts-feature.md（自動読み上げ機能）
- 0011-text-to-speech-feature.md（TTS 機能）
- 0017-ai-response-optimization-tts-speed-control.md（速度制御機能）

---