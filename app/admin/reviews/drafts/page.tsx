"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮" },
}

type Review = {
  id: string
  user_id: string
  satisfaction: number
  comment: string
  private_message_to_teacher: string | null
  reply_comment: string
  created_at: string
  handle_name: string
}

type Template = {
  id: string
  title: string
  body: string
}

export default function ReviewDraftsPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [teacher, setTeacher] = useState<{ id: string; name: string } | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [targetReview, setTargetReview] = useState<Review | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return
    const t = EMAIL_TO_TEACHER[user.email]
    if (!t) return
    setTeacher(t)

    const { data: reviewData } = await supabase
      .from("reviews")
      .select("id, user_id, satisfaction, comment, private_message_to_teacher, reply_comment, created_at")
      .eq("teacher_id", t.id)
      .eq("is_replied", false)
      .not("reply_comment", "is", null)
      .order("created_at", { ascending: false })

    if (!reviewData) { setLoading(false); return }

    const userIds = [...new Set(reviewData.map(r => r.user_id))]
    const { data: userData } = await supabase
      .from("users")
      .select("id, handle_name")
      .in("id", userIds)

    const userMap: Record<string, string> = {}
    userData?.forEach(u => { userMap[u.id] = u.handle_name })

    setReviews(reviewData.map(r => ({
      ...r,
      handle_name: userMap[r.user_id] ?? "-"
    })))

    const { data: templateData } = await supabase
      .from("mail_templates")
      .select("id, title, body")
      .eq("teacher_id", t.id)
      .order("created_at", { ascending: false })
    setTemplates(templateData ?? [])

    setLoading(false)
  }

  const openReply = (r: Review) => {
    setTargetReview(r)
    setReplyContent(r.reply_comment ?? "")
    setSelectedTemplateId("")
    setShowModal(true)
  }

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const t = templates.find(t => t.id === templateId)
    if (t) setReplyContent(t.body)
  }

  const saveReply = async (send: boolean) => {
    if (!targetReview) return
    setSaving(true)
    await supabase.from("reviews").update({
      reply_comment: send ? replyContent : null,
      is_replied: send,
      updated_at: new Date().toISOString(),
    }).eq("id", targetReview.id)
    setSaving(false)
    setShowModal(false)
    fetchAll()
  }

  const formatDate = (s: string) => {
    const d = new Date(s)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  }

  const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n)

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">レビュー下書き一覧</h1>
        <button
          onClick={() => router.push("/admin/reviews")}
          className="text-sm bg-gray-400 hover:bg-gray-500 text-white px-3 py-1.5 rounded"
        >
          レビュー一覧へ
        </button>
      </div>

      <div className="space-y-3">
        {reviews.length === 0 && (
          <div className="p-4 text-sm text-gray-400 border rounded">下書きがありません</div>
        )}
        {reviews.map(r => (
          <div key={r.id} className="border rounded-lg bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <a href={`/admin/users/${r.user_id}`} className="font-medium text-sm text-blue-600 hover:underline">{r.handle_name}</a>
                  <span className="text-yellow-500 text-sm">{stars(r.satisfaction)}</span>
                  <span className="text-xs text-gray-400">{formatDate(r.created_at)}</span>
                </div>
                {r.comment && <p className="text-sm text-gray-700 mb-2">{r.comment}</p>}
                {r.private_message_to_teacher && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded p-2 mb-2">
                    占い師へ：{r.private_message_to_teacher}
                  </p>
                )}
                <p className="text-xs text-teal-700 bg-teal-50 rounded p-2">
                  下書き：{r.reply_comment}
                </p>
              </div>
              <button
                onClick={() => openReply(r)}
                className="text-xs bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded shrink-0"
              >
                返信する
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && targetReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <h2 className="text-lg font-bold mb-1">返信</h2>
            <p className="text-sm text-gray-500 mb-4">{targetReview.handle_name}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">テンプレート</label>
                <select
                  className="w-full border rounded px-2 py-1 mt-1 text-sm bg-white"
                  value={selectedTemplateId}
                  onChange={e => handleTemplateChange(e.target.value)}
                >
                  <option value="">-</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">返信内容</label>
                <textarea
                  className="w-full border rounded px-2 py-1 mt-1 text-sm"
                  style={{ height: "300px" }}
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-between mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="text-sm bg-gray-400 hover:bg-gray-500 text-white px-4 py-1.5 rounded"
              >
                閉じる
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => saveReply(false)}
                  disabled={saving}
                  className="text-sm bg-red-400 hover:bg-red-500 text-white px-4 py-1.5 rounded"
                >
                  下書き削除
                </button>
                <button
                  onClick={() => saveReply(true)}
                  disabled={saving || !replyContent}
                  className="text-sm bg-teal-500 hover:bg-teal-600 text-white px-4 py-1.5 rounded disabled:opacity-50"
                >
                  送信
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}