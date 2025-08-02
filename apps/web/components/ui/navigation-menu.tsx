"use client"

import { Button } from "@/components/ui/button"
import { MessageCircle, Bookmark, Settings, HelpCircle, LogOut, X, Home, Mic, Languages, Newspaper } from "lucide-react"
import Link from "next/link"

interface NavigationMenuProps {
  isOpen: boolean
  onClose: () => void
}

export function NavigationMenu({ isOpen, onClose }: NavigationMenuProps) {
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

  return (
    <>
      {/* オーバーレイ */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300" onClick={onClose} />
      )}

      {/* ナビゲーションメニュー */}
      <div
        className={`
        fixed top-0 left-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="flex flex-col h-full">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">AI</span>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Lingua Chat AI</h2>
                <p className="text-sm text-gray-500">AI言語学習アシスタント</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* メニュー項目 */}
          <nav className="flex-1 py-4">
            <div className="space-y-1 px-2">
              {menuItems.map((item) => {
                const IconComponent = item.icon
                return (
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
                )
              })}
            </div>
          </nav>

          {/* フッター */}
          <div className="border-t border-gray-200 p-4">
            <Button
              variant="ghost"
              className="w-full justify-start h-12 px-4 text-red-600 hover:bg-red-50"
              onClick={() => {
                console.log("ログアウト")
                onClose()
              }}
            >
              <LogOut className="h-5 w-5 mr-3" />
              <span>ログアウト</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}