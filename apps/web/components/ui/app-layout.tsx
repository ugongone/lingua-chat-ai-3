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
      <main>
        {children}
      </main>
    </>
  )
}