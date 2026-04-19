"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮" },
}

type DraftMail = {
  id: string
  user_id: string
  subject: string
  content: string
  created_at: string
  handle_name: string
}

export default function FollowMailDraftsPage() {
  const router = useRouter()
  const [drafts, setDrafts] = useState<DraftMail[]>([])
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

    const { data: draftData } = await supabase
      .from("follow_mails")
      .select("id, user_id, subject, content, created_at")
      .eq("teacher_id", t.id)
      .eq("is_draft", true)
      .order("created_at", { ascending: false })

    if (!draftData) { setLoading(false); return }

    const userIds = [...new Set(draftData.map(d => d.user_id))]
    const { data: userData } = await supabase
      .from("users")
      .select("id, handle_name")
      .in("id", userIds)

    const userMap: Record<string, string> = {}
    userData?.forEach(u => { userMap[u.id] = u.handle_name })

    setDrafts(draftData.map(d => ({
      ...d,
      handle_name: userMap[d.user_id] ?? "-"
    })))

    setLoading(false)
  }

  const deleteDraft = async (id: string) => {
    if (!confirm("下書きを削除しますか？")) return
    await supabase.from("follow_mails").delete().eq("id", id)
    fetchAll()
  }

  const formatDate = (s: string) => {
    const d = new Date(s)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
  }

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">フォローメール下書き一覧</h1>
        <button
          onClick={() => router.push("/admin/follow-mails")}
          className="text-sm bg-gray-400 hover:bg-gray-500 text-white px-3 py-1.5 rounded"
        >
          送信済み一覧へ
        </button>
      </div>

      <div className="space-y-3">
        {drafts.length === 0 && (
          <div className="p-4 text-sm text-gray-400 border rounded">下書きがありません</div>
        )}
        {drafts.map(d => (
          <div key={d.id} className="border rounded-lg bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <a href={`/admin/users/${d.user_id}`} className="font-medium text-sm text-blue-600 hover:underline">{d.handle_name}</a>
                  <span className="text-xs text-gray-400">{formatDate(d.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{d.subject}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{d.content}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => router.push(`/admin/follow-mails/new/${d.user_id}`)}
                  className="text-xs bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded"
                >
                  編集
                </button>
                <button
                  onClick={() => deleteDraft(d.id)}
                  className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded"
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}