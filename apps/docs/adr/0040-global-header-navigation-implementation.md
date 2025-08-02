# 0040 – 全ページ共通のヘッダーとナビゲーション実装

## 背景 / Context

Lingua Chat AIアプリケーションに全ページ共通のヘッダーとナビゲーションメニューが必要となった。ユーザーがアプリケーション内の各機能に簡単にアクセスできるよう、統一されたナビゲーション体験を提供する必要があった。

---

## 決定 / Decision

Next.jsのルートレイアウトに、ハンバーガーメニュー形式のヘッダーとスライド式のサイドナビゲーションを実装する。

---

## 理由 / Rationale

- モバイルファーストのデザインで、限られた画面スペースを効率的に活用
- スライド式のナビゲーションにより、メイン画面を妨げることなく機能へのアクセスを提供
- Next.jsのApp Routerを活用し、全ページで一貫したナビゲーション体験を実現

---

## 実装詳細 / Implementation Notes

### 1. Client Componentラッパーの実装

```tsx
// apps/web/components/ui/app-layout.tsx
"use client"

import { useState } from "react"
import { Header } from "./header"
import { NavigationMenu } from "./navigation-menu"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <>
      <Header onMenuClick={() => setIsMenuOpen(true)} />
      <NavigationMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <main className="pt-[60px]">
        {children}
      </main>
    </>
  )
}
```

理由:

- Server ComponentであるルートレイアウトとClient Componentの状態管理を分離
- メニューの開閉状態をClient Componentで管理し、パフォーマンスを最適化

### 2. ヘッダーコンポーネントの実装

```tsx
// apps/web/components/ui/header.tsx
<header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
  <div className="flex items-center gap-3">
    <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={onMenuClick}>
      <Menu className="h-5 w-5" />
    </Button>
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
        <span className="text-white font-bold text-sm">AI</span>
      </div>
      <h1 className="text-lg font-semibold text-gray-900">Lingua Chat AI</h1>
    </div>
  </div>
  {/* 設定とユーザーアイコン */}
</header>
```

理由:

- sticky positionでスクロール時も上部に固定表示
- z-indexを適切に設定してレイヤー順序を管理
- Tailwind CSSを活用したレスポンシブデザイン

### 3. ナビゲーションメニューの実装

```tsx
// apps/web/components/ui/navigation-menu.tsx
const menuItems = [
  { icon: Home, label: "ホーム", href: "/" },
  { icon: MessageCircle, label: "チャット履歴", href: "/history" },
  { icon: Bookmark, label: "保存したフレーズ", href: "/saved-phrases" },
  { icon: Newspaper, label: "ニュース", href: "/news" },
  { icon: Mic, label: "音声設定", href: "/voice-settings" },
  { icon: Languages, label: "言語設定", href: "/language" },
  { icon: Settings, label: "設定", href: "/settings" },
  { icon: HelpCircle, label: "ヘルプ", href: "/help" },
]

// Next.js Linkコンポーネントを使用
<Link key={item.href} href={item.href} passHref>
  <Button
    variant="ghost"
    className="w-full justify-start h-12 px-4 text-left hover:bg-gray-100"
    onClick={onClose}
  >
    <IconComponent className="h-5 w-5 mr-3 text-gray-600" />
    <span className="text-gray-900">{item.label}</span>
  </Button>
</Link>
```

理由:

- Next.jsのLinkコンポーネントでクライアントサイドルーティングを実現
- 各メニュー項目にアイコンを配置して視認性を向上
- オーバーレイとアニメーションで直感的なUXを提供

---

## 影響 / Consequences

- 全ページでpadding-topの調整が必要（ヘッダーの高さ分）
- 新しいページを追加する際は、ナビゲーションメニューへの追加を検討する必要がある
- 将来的にはユーザー認証状態に応じたメニュー項目の表示/非表示の実装が必要

---

## 言語的・技術的なポイント

- Next.js 13+ のApp Routerを活用し、Server ComponentとClient Componentを適切に分離
- Tailwind CSSのユーティリティクラスを活用したレスポンシブデザイン
- lucide-reactアイコンライブラリを使用し、一貫性のあるアイコンデザインを実現
- CSS transformとtransitionを使用したスムーズなアニメーション

---

## Q&A / 技術理解のためのポイント

### Q1: なぜルートレイアウトを直接Client Componentにしなかったのか？

**Q: layout.tsxを"use client"にすることも可能だが、なぜClient Componentラッパーを作成したのか？**

**A: Server Componentのメリットを最大限活用するため。ルートレイアウトをServer Componentとして保つことで、メタデータの設定やSEO最適化、パフォーマンスの向上が可能となる。状態管理が必要な部分のみをClient Componentとして切り出すことで、最適なパフォーマンスを実現している。**

### Q2: z-indexの値はどのように決定したのか？

**Q: ヘッダーにz-30、オーバーレイにz-40、ナビゲーションメニューにz-50を設定した理由は？**

**A: 適切なレイヤー順序を保つため。ヘッダー < オーバーレイ < ナビゲーションメニューの順で重なるように設定。Tailwind CSSのz-indexスケール（10刻み）を使用して、将来的な要素の追加にも対応できる余裕を持たせている。**

---

## 参考 / References

- 0029-initial-chat-ui-redesign.md - UIデザインの基本方針
- 0033-news-feature-implementation.md - ニュース機能の実装

---