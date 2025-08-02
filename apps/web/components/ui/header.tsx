"use client"

import { Button } from "@/components/ui/button"
import { Menu, Settings, User } from "lucide-react"

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
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

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
          <Settings className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}