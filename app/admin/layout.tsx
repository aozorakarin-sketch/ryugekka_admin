"use client"

import { supabase } from "@/lib/supabaseClient"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { LayoutDashboard, Users, MessageSquare, Mic, Calendar, CalendarDays, Settings, LogOut, Star, FileText } from "lucide-react"
import { Phone } from "lucide-react"
import { Bell } from "lucide-react"
const ALLOWED_EMAILS = ['bazvideo412@gmail.com', 'tomo517ko@gmail.com', 'aozora.karin@gmail.com']

const menuItems = [
  { title: "ダッシュボード", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "お知らせ", url: "/admin/announcements", icon: Bell },
  { title: "鑑定履歴", url: "/admin/consultations", icon: MessageSquare },
  { title: "ユーザー一覧", url: "/admin/users", icon: Users },
  { title: "フォローメール", url: "/admin/follow-mails", icon: Mic },
  { title: "フォローメール下書き", url: "/admin/follow-mails/drafts", icon: FileText },
  { title: "つぶやき管理", url: "/admin/whispers", icon: Calendar },
  { title: "レビュー", url: "/admin/reviews", icon: Star },
  { title: "レビュー下書き", url: "/admin/reviews/drafts", icon: FileText },
  { title: "ダミーレビュー", url: "/admin/reviews/dummy", icon: Star },
  { title: "シフト管理", url: "/admin/shifts", icon: Calendar },  // ← 
  { title: "ブログ管理", url: "/admin/blog", icon: FileText },
  { title: "待機列管理", url: "/admin/waiting", icon: Users },
  { title: "設定", url: "/admin/settings", icon: Settings },
  { title: "通話", url: "/admin/call", icon: Phone },
]
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login")
      } else if (!ALLOWED_EMAILS.includes(user.email ?? '')) {
        router.push("/unauthorized")
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event) => {
      if (_event === 'SIGNED_OUT') {
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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>龍月花 管理画面</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={pathname === item.url}>
                        <a href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleLogout}>
                      <LogOut />
                      <span>ログアウト</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 p-6">
          <div className="md:hidden mb-4">
            <SidebarTrigger />
          </div>
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}
