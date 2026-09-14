"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮" },
}

type UnreadReply = {
  id: string
  user_id: string
  subject: string
  user_reply: string | null
  user_replied_at: string | null
  handle_name: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [unreadReplies, setUnreadReplies] = useState<UnreadReply[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUnreadReplies()
  }, [])

  const fetchUnreadReplies = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setLoading(false); return }
    const t = EMAIL_TO_TEACHER[user.email]
    if (!t) { setLoading(false); return }
    setTeacherId(t.id)

    const { count } = await supabase
      .from("follow_mails")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", t.id)
      .eq("is_user_replied", true)
      .eq("is_reply_read", false)

    setUnreadCount(count ?? 0)

    const { data: replyData } = await supabase
      .from("follow_mails")
      .select("id, user_id, subject, user_reply, user_replied_at, users(handle_name)")
      .eq("teacher_id", t.id)
      .eq("is_user_replied", true)
      .eq("is_reply_read", false)
      .order("user_replied_at", { ascending: false })
      .limit(5)

    const mapped: UnreadReply[] = (replyData ?? []).map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      subject: r.subject,
      user_reply: r.user_reply,
      user_replied_at: r.user_replied_at,
      handle_name: r.users?.handle_name ?? "-",
    }))
    setUnreadReplies(mapped)
    setLoading(false)
  }

  const formatDate = (s: string | null) => {
    if (!s) return "-"
    const d = new Date(s)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">ダッシュボード</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        ようこそ、龍月花管理画面へ！
      </p>

      <div className="border rounded-lg bg-white overflow-hidden max-w-2xl">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
          <h2 className="font-bold text-sm">フォローメールへの返信</h2>
          {unreadCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
              未読 {unreadCount}件
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-4 text-sm text-gray-400">読み込み中...</div>
        ) : unreadReplies.length === 0 ? (
          <div className="p-4 text-sm text-gray-400">未読の返信はありません</div>
        ) : (
          <div className="divide-y">
            {unreadReplies.map(r => (
              <div
                key={r.id}
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => router.push(`/admin/follow-mails/user/${r.user_id}?teacherId=${teacherId}`)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.handle_name}</p>
                  <p className="text-xs text-gray-500 truncate max-w-xs">{r.user_reply}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-3">{formatDate(r.user_replied_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
