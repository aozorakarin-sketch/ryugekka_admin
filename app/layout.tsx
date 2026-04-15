"use client"

import { supabase } from "@/lib/supabaseClient"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Mic,
  Calendar,
  Settings,
  LogOut,
  Menu,
} from "lucide-react"

const menuItems = [
  { title: "ダッシュボード", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "鑑定履歴", url: "/admin/consultations", icon: MessageSquare },
  { title: "ユーザー一覧", url: "/admin/users", icon: Users },
  { title: "フォローメール", url: "/admin/follow-mails", icon: Mic },
  { title: "つぶやき管理", url: "/admin/whispers", icon: Calendar },
  { title: "設定", url: "/admin/settings", icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login")
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push("/login")
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>
  }

  // メニュー内容のコンポーネント
  const MenuContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-bold">龍月花 管理画面</h2>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <a
            key={item.title}
            href={item.url}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              pathname === item.url
                ? "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-400"
                : "hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.title}</span>
          </a>
        ))}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>ログアウト</span>
        </button>
      </nav>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* デスクトップ用サイドバー */}
      <div className="hidden md:flex fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r">
        <MenuContent />
      </div>

      {/* スマホ用ヘッダー */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-800 border-b flex items-center px-4 z-10">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <MenuContent />
          </SheetContent>
        </Sheet>
        <h1 className="ml-4 text-lg font-bold">龍月花 管理画面</h1>
      </div>

      {/* メインコンテンツ */}
      <div className="md:pl-64">
        <div className="md:hidden h-14" /> {/* スマホヘッダーのスペーサー */}
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}