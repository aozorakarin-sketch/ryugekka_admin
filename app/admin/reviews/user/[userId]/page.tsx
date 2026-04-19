"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮" },
}

type Review = {
  id: string
  satisfaction: number
  comment: string
  private_message_to_teacher: string | null
  is_replied: boolean
  reply_comment: string | null
  created_at: string
}

type Template = {
  id: string
  title: string
  body: string
}

export default function UserReviewsPage() {
  const { userId } = useParams()
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [handleName, setHandleName] = useState("")
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
  }, [userId])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return
    const t = EMAIL_TO_TEACHER[user.email]
    if (!t) return
    setTeacher(t)

    const { data: userData } = await supabase
      .from("users")
      .select("handle_name")
      .eq("id", userId)
      .single()
    setHandleName(userData?.handle_name ?? "-")

    const { data: reviewData } = await supabase
      .from("reviews")
      .select("id, satisfaction, comment, private_message_to_teacher, is_replied, reply_comment, created_at")
      .eq("user_id", userId)
      .eq("teacher_id", t.id)
      .order("created_at", { ascending: false })
    setReviews(reviewData ?? [])

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
      reply_comment: replyContent,
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
        <h1 className="text-xl font-bold">{handleName} さんのレビュー</h1>
        <button
          onClick={() => router.push(`/admin/users/${userId}`)}
          className="text-sm bg-gray-400 hover:bg-gray-500 text-white px-3 py-1.5 rounded"
        >
          ユーザー詳細
        </button>
      </div>

      <div className="space-y-3">
        {reviews.length === 0 && (
          <div className="p-4 text-sm text-gray-400 border rounded">レビューがありません</div>
        )}
        {reviews.map(r => (
          <div key={r.id} className="border rounded-lg bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-500 text-sm">{stars(r.satisfaction)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.is_replied ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                    {r.is_replied ? "返信済" : "未返信"}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(r.created_at)}</span>
                </div>
                {r.comment && <p className="text-sm text-gray-700 mb-2">{r.comment}</p>}
                {r.private_message_to_teacher && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                    占い師へ：{r.private_message_to_teacher}
                  </p>
                )}
                {r.reply_comment && (
                  <p className="text-xs text-teal-700 bg-teal-50 rounded p-2 mt-2">
                    返信：{r.reply_comment}
                  </p>
                )}
              </div>
              <button
                onClick={() => openReply(r)}
                className="text-xs bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded shrink-0"
              >
                {r.is_replied ? "返信を見る" : "返信する"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && targetReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <h2 className="text-lg font-bold mb-4">返信</h2>
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
                  placeholder="返信内容を入力してください"
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
                  className="text-sm bg-gray-500 hover:bg-gray-600 text-white px-4 py-1.5 rounded"
                >
                  保存
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