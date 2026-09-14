"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮" },
}

const TEACHER_MAP: Record<string, string> = {
  "3ba85bb9-9065-461b-b76b-cc488d4c0c3b": "雲龍蓮",
  "17cf0ca1-7526-466e-a644-9d3efefa4091": "椎名架月",
  "cd2c4101-2e24-4ae2-8d6a-507a943904af": "青空花林",
}

type UnreadReply = {
  id: string
  user_id: string
  subject: string
  user_reply: string | null
  user_replied_at: string | null
  handle_name: string
}

type Announcement = {
  id: string
  title: string
  teacher_id: string
  created_at: string
  is_important: boolean
  isRead: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [teacherId, setTeacherId] = useState<string | null>(null)

  const [unreadReplies, setUnreadReplies] = useState<UnreadReply[]>([])
  const [unreadReplyCount, setUnreadReplyCount] = useState(0)
  const [loadingReplies, setLoadingReplies] = useState(true)

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [unreadAnnouncementCount, setUnreadAnnouncementCount] = useState(0)
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true)

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setLoadingReplies(false); setLoadingAnnouncements(false); return }
    const t = EMAIL_TO_TEACHER[user.email]
    if (!t) { setLoadingReplies(false); setLoadingAnnouncements(false); return }
    setMyUserId(user.id)
    setTeacherId(t.id)

    await Promise.all([
      fetchUnreadReplies(t.id),
      fetchAnnouncements(t.id),
    ])
  }

  const fetchUnreadReplies = async (myTeacherId: string) => {
    const { count } = await supabase
      .from("follow_mails")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", myTeacherId)
      .eq("is_user_replied", true)
      .eq("is_reply_read", false)

    setUnreadReplyCount(count ?? 0)

    const { data: replyData } = await supabase
      .from("follow_mails")
      .select("id, user_id, subject, user_reply, user_replied_at, users(handle_name)")
      .eq("teacher_id", myTeacherId)
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
    setLoadingReplies(false)
  }

  const fetchAnnouncements = async (myTeacherId: string) => {
    const { data: annData } = await supabase
      .from("announcements")
      .select("id, title, teacher_id, created_at, is_important")
      .order("created_at", { ascending: false })
      .limit(30)

    const { data: readData } = await supabase
      .from("announcement_reads")
      .select("announcement_id")
      .eq("teacher_id", myTeacherId)

    const readIds = new Set((readData ?? []).map((r: any) => r.announcement_id))

    const mapped: Announcement[] = (annData ?? []).map((a: any) => ({
      id: a.id,
      title: a.title,
      teacher_id: a.teacher_id,
      created_at: a.created_at,
      is_important: a.is_important,
      isRead: readIds.has(a.id),
    }))

    setAnnouncements(mapped)
    setUnreadAnnouncementCount(mapped.filter(a => !a.isRead).length)
    setLoadingAnnouncements(false)
  }

  const markAnnouncementRead = async (a: Announcement) => {
    if (a.isRead || !teacherId || !myUserId) return
    await supabase.from("announcement_reads").insert({
      announcement_id: a.id,
      teacher_id: teacherId,
      user_id: myUserId,
    })
    setAnnouncements(prev => prev.map(x => x.id === a.id ? { ...x, isRead: true } : x))
    setUnreadAnnouncementCount(c => Math.max(0, c - 1))
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">

        {/* お知らせ */}
        <div className="border rounded-lg bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-bold text-sm">お知らせ</h2>
            {unreadAnnouncementCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                未読 {unreadAnnouncementCount}件
              </span>
            )}
          </div>

          {loadingAnnouncements ? (
            <div className="p-4 text-sm text-gray-400">読み込み中...</div>
          ) : announcements.length === 0 ? (
            <div className="p-4 text-sm text-gray-400">お知らせはありません</div>
          ) : (
            <div className="divide-y max-h-80 overflow-y-auto">
              {announcements.map(a => (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50"
                  onClick={() => markAnnouncementRead(a)}
                >
                  <div className="min-w-0 flex items-center gap-2">
                    {!a.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    )}
                    <span className="text-xs text-gray-400 flex-shrink-0">{TEACHER_MAP[a.teacher_id] ?? "-"}</span>
                    <p className={`text-sm truncate ${a.isRead ? "text-gray-600" : "font-medium"}`}>{a.title}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-3">{formatDate(a.created_at)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="px-4 py-2 border-t">
            <button
              onClick={() => router.push(`/admin/announcements`)}
              className="text-sm text-teal-600 hover:text-teal-700"
            >
              一覧へ →
            </button>
          </div>
        </div>

        {/* フォローメールへの返信 */}
        <div className="border rounded-lg bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-bold text-sm">フォローメールへの返信</h2>
            {unreadReplyCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                未読 {unreadReplyCount}件
              </span>
            )}
          </div>

          {loadingReplies ? (
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
    </div>
  )
}
