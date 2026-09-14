"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮" },
}

const TEACHER_MAP: Record<string, string> = {
  "e482fff7-25db-483d-8d68-46a893403be3": "宝明里茉",
  "3ba85bb9-9065-461b-b76b-cc488d4c0c3b": "雲龍蓮",
  "17cf0ca1-7526-466e-a644-9d3efefa4091": "椎名架月",
  "cd2c4101-2e24-4ae2-8d6a-507a943904af": "青空花林",
}

const TEACHER_ID_TO_SLUG: Record<string, string> = {
  "cd2c4101-2e24-4ae2-8d6a-507a943904af": "hana",
  "3ba85bb9-9065-461b-b76b-cc488d4c0c3b": "ryu",
  "17cf0ca1-7526-466e-a644-9d3efefa4091": "tsuki",
}

type FollowMail = {
  id: string
  subject: string
  content: string
  sent_at: string
  is_draft: boolean
  user_reply: string | null
  user_replied_at: string | null
  is_user_replied: boolean
  is_reply_read: boolean
}

export default function UserFollowMailsPage() {
  const { userId } = useParams() as { userId: string }
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlTeacherId = searchParams.get("teacherId") ?? ""

  const [mails, setMails] = useState<FollowMail[]>([])
  const [handleName, setHandleName] = useState("")
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [myTeacherId, setMyTeacherId] = useState<string | null>(null)
  const [targetTeacherId, setTargetTeacherId] = useState<string>("")

  useEffect(() => {
    fetchAll()
  }, [userId, urlTeacherId])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return
    const t = EMAIL_TO_TEACHER[user.email]
    if (!t) return

    setMyTeacherId(t.id)

    // URLパラメータにteacherIdがあればそれを使う、なければログイン先生
    const teacherId = urlTeacherId || t.id
    setTargetTeacherId(teacherId)

    const { data: userData } = await supabase
      .from("users")
      .select("handle_name")
      .eq("id", userId)
      .single()
    setHandleName(userData?.handle_name ?? "-")

    const { data: mailData } = await supabase
      .from("follow_mails")
      .select("id, subject, content, sent_at, is_draft, user_reply, user_replied_at, is_user_replied, is_reply_read")
      .eq("user_id", userId)
      .eq("teacher_id", teacherId)
      .order("sent_at", { ascending: false })
    setMails(mailData ?? [])
    setLoading(false)
  }

  const formatDate = (s: string) => {
    if (!s) return "-"
    const d = new Date(s)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
  }

  // メールを開いたとき、未読の返信があれば既読にする
  const handleToggle = async (m: FollowMail) => {
    const nextOpen = openId === m.id ? null : m.id
    setOpenId(nextOpen)
    if (nextOpen && m.is_user_replied && !m.is_reply_read) {
      await supabase.from("follow_mails").update({ is_reply_read: true }).eq("id", m.id)
      setMails(prev => prev.map(x => x.id === m.id ? { ...x, is_reply_read: true } : x))
    }
  }

  // ログイン先生が表示中の先生と同じなら編集可
  const canEdit = myTeacherId === targetTeacherId
  const slug = TEACHER_ID_TO_SLUG[targetTeacherId] ?? null
  const teacherName = TEACHER_MAP[targetTeacherId] ?? "-"

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">{handleName} さんへのフォローメール</h1>
          {!canEdit && (
            <div className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 mt-1 inline-block">
              閲覧のみ（{teacherName}担当）
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {slug && (
            <button
              onClick={() => router.push(`/admin/users/${userId}/${slug}`)}
              className="text-sm bg-gray-400 hover:bg-gray-500 text-white px-3 py-1.5 rounded"
            >
              ユーザー詳細
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => router.push(`/admin/follow-mails/new/${userId}`)}
              className="text-sm bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded"
            >
              新規作成
            </button>
          )}
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
              onClick={() => handleToggle(m)}
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${m.is_draft ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700"}`}>
                  {m.is_draft ? "下書き" : "送信済"}
                </span>
                {m.is_user_replied && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${m.is_reply_read ? "bg-pink-100 text-pink-700" : "bg-red-100 text-red-700 font-bold"}`}>
                    {m.is_reply_read ? "返信あり" : "返信あり（未読）"}
                  </span>
                )}
                <span className="text-sm font-medium">{m.subject}</span>
              </div>
              <span className="text-xs text-gray-400">{formatDate(m.sent_at)}</span>
            </div>
            {openId === m.id && (
              <div className="px-4 py-3 border-t bg-gray-50">
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                {m.is_user_replied && m.user_reply && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-pink-700">💬 あなたの返信</span>
                      <span className="text-xs text-gray-400">{formatDate(m.user_replied_at ?? "")}</span>
                    </div>
                    <div className="bg-pink-50 rounded-lg px-3 py-2">
                      <p className="text-sm whitespace-pre-wrap">{m.user_reply}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
