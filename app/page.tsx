"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

export default function Home() {
  const [isLINE, setIsLINE] = useState(false)

  useEffect(() => {
    alert(navigator.userAgent)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100">
      <header className="border-b border-amber-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-amber-800">🌸 龍月花</h1>
          <Button variant="outline" asChild>
            <a href="/login">ログイン</a>
          </Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">三人の鑑定士が集う場所</h2>
          <p className="text-gray-600">龍・月・花 — それぞれの視点で、あなたの運命を照らします</p>
        </div>
      </main>
    </div>
  )
}