"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮" },
}

type FollowMail = {
  id: string
  subject: string
  content: string
  sent_at: string
  is_draft: boolean
}

export default function UserFollowMailsPage() {
  const { userId } = useParams()
  const router = useRouter()
  const [mails, setMails] = useState<FollowMail[]>([])
  const [handleName, setHandleName] = useState("")
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    fetchAll()
  }, [userId])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return
    const t = EMAIL_TO_TEACHER[user.email]
    if (!t) return

    const { data: userData } = await supabase
      .from("users")
      .select("handle_name")
      .eq("id", userId)
      .single()
    setHandleName(userData?.handle_name ?? "-")

    const { data: mailData } = await supabase
      .from("follow_mails")
      .select("id, subject, content, sent_at, is_draft")
      .eq("user_id", userId)
      .eq("teacher_id", t.id)
      .order("sent_at", { ascending: false })
    setMails(mailData ?? [])
    setLoading(false)
  }

  const formatDate = (s: string) => {
    if (!s) return "-"
    const d = new Date(s)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
  }

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{handleName} さんへのフォローメール</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/admin/users/${userId}`)}
            className="text-sm bg-gray-400 hover:bg-gray-500 text-white px-3 py-1.5 rounded"
          >
            ユーザー詳細
          </button>
          <button
            onClick={() => router.push(`/admin/follow-mails/new/${userId}`)}
            className="text-sm bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded"
          >
            新規作成
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {mails.length === 0 && (
          <div className="p-4 text-sm text-gray-400 border rounded">メールがありません</div>
        )}
        {mails.map(m => (
          <div key={m.id} className="border rounded-lg bg-white overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
              onClick={() => setOpenId(openId === m.id ? null : m.id)}
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${m.is_draft ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700"}`}>
                  {m.is_draft ? "下書き" : "送信済"}
                </span>
                <span className="text-sm font-medium">{m.subject}</span>
              </div>
              <span className="text-xs text-gray-400">{formatDate(m.sent_at)}</span>
            </div>
            {openId === m.id && (
              <div className="px-4 py-3 border-t bg-gray-50">
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}