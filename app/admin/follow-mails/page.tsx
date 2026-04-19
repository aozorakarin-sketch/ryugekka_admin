"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮" },
}

type FollowMail = {
  id: string
  user_id: string
  subject: string
  sent_at: string
  handle_name: string
}

export default function FollowMailsPage() {
  const router = useRouter()
  const [mails, setMails] = useState<FollowMail[]>([])
  const [teacher, setTeacher] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return
    const t = EMAIL_TO_TEACHER[user.email]
    if (!t) return
    setTeacher(t)

    const { data: mailData } = await supabase
      .from("follow_mails")
      .select("id, user_id, subject, sent_at")
      .eq("teacher_id", t.id)
      .eq("is_draft", false)
      .order("sent_at", { ascending: false })

    if (!mailData) { setLoading(false); return }

    const userIds = [...new Set(mailData.map(m => m.user_id))]
    const { data: userData } = await supabase
      .from("users")
      .select("id, handle_name")
      .in("id", userIds)

    const userMap: Record<string, string> = {}
    userData?.forEach(u => { userMap[u.id] = u.handle_name })

    setMails(mailData.map(m => ({
      ...m,
      handle_name: userMap[m.user_id] ?? "-"
    })))

    setLoading(false)
  }

  const formatDate = (s: string) => {
    const d = new Date(s)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
  }

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-4">フォローメール一覧</h1>

      <div className="border rounded-lg bg-white overflow-hidden">
        {mails.length === 0 && (
          <div className="p-4 text-sm text-gray-400">送信済みメールがありません</div>
        )}
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 font-medium">送信日時</th>
              <th className="text-left px-4 py-2 font-medium">ユーザー</th>
              <th className="text-left px-4 py-2 font-medium">件名</th>
              <th className="text-center px-4 py-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {mails.map((m, i) => (
              <tr key={m.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-4 py-2 whitespace-nowrap text-xs">{formatDate(m.sent_at)}</td>
                <td className="px-4 py-2 text-xs">{m.handle_name}</td>
                <td className="px-4 py-2 text-xs">{m.subject}</td>
                <td className="px-4 py-2 text-center">
                  <div className="flex gap-1 justify-center">
                    <button
                      onClick={() => router.push(`/admin/users/${m.user_id}`)}
                      className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-0.5 rounded"
                    >
                      ユーザー
                    </button>
                    <button
                      onClick={() => router.push(`/admin/follow-mails/user/${m.user_id}`)}
                      className="text-xs bg-teal-500 hover:bg-teal-600 text-white px-2 py-0.5 rounded"
                    >
                      メール一覧
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}