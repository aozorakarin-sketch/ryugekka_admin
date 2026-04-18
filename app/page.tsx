"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

export default function Home() {
  const [isLINE, setIsLINE] = useState(false)

  useEffect(() => {
    if (navigator.userAgent.includes("Line")) {
      setIsLINE(true)
    }
  }, [])

  if (isLINE) {
    return (
      <div style={{
        textAlign: "center",
        padding: "60px 20px",
        background: "#1a1612",
        color: "#E8D8B0",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "sans-serif",
      }}>
        <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#F0D080", marginBottom: "1.5rem" }}>
          ⚠️ ご注意
        </div>
        <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>
          LINEアプリ内ブラウザでは<br />正しく動作しません。
        </p>
        <p style={{ marginBottom: "2rem", fontSize: "0.9rem", color: "#9A8060", lineHeight: 1.8 }}>
          以下の手順で、ChromeまたはSafariで<br />開き直してください。
        </p>
        <div style={{
          background: "rgba(200,160,40,0.1)",
          border: "1px solid rgba(200,160,40,0.3)",
          borderRadius: "8px",
          padding: "1.5rem",
          marginBottom: "2rem",
          textAlign: "left",
          maxWidth: "280px",
        }}>
          <p style={{ marginBottom: "0.8rem" }}>❶ 右上の <strong style={{ color: "#F0D080" }}>「...」</strong> をタップ</p>
          <p style={{ marginBottom: "0.8rem" }}>❷ <strong style={{ color: "#F0D080" }}>「Chromeで開く」</strong> を選択</p>
          <p>❸ そのままログインしてください</p>
        </div>
        <p style={{ fontSize: "0.7rem", color: "#7A5C1E" }}>龍月花 管理画面</p>
      </div>
    )
  }

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
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { name: "🐉 雲龍蓮", desc: "龍の如く、力強い導き" },
            { name: "🌙 椎名架月", desc: "月の光、静かな洞察" },
            { name: "🌸 青空花林", desc: "花の如く、優しい癒し" }
          ].map((teacher) => (
            <div key={teacher.name} className="bg-white rounded-lg shadow-lg p-6 text-center">
              <h3 className="text-xl font-semibold mb-2">{teacher.name}</h3>
              <p className="text-gray-500">{teacher.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}