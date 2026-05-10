"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林" },
  "tomo517ko@gmail.com":    { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月" },
  "bazvideo412@gmail.com":  { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮" },
}

const SOURCE_LABEL: Record<string, string> = {
  ryugekka: "電話",
  chat: "チャット",
  mail: "メール",
  minden: "みんでん",
}

type Review = {
  id: string
  user_id: string
  consultation_id: string | null
  satisfaction: number
  comment: string | null
  tags: string[] | null
  private_message_to_teacher: string | null
  is_replied: boolean
  reply_comment: string | null
  created_at: string
  handle_name: string
  started_at: string | null
  data_source: string | null
}

type Template = {
  id: string
  title: string
  body: string
}

function StarIcon({ fill }: { fill: "full" | "half" | "empty" }) {
  const filled = "#f0c040"
  const empty = "#ddd"
  const id = `star-${Math.random().toString(36).slice(2)}`
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" style={{ display: "inline-block" }}>
      {fill === "half" && (
        <defs>
          <linearGradient id={id}>
            <stop offset="50%" stopColor={filled} />
            <stop offset="50%" stopColor={empty} />
          </linearGradient>
        </defs>
      )}
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={fill === "full" ? filled : fill === "half" ? `url(#${id})` : empty}
      />
    </svg>
  )
}

function StarRow({ satisfaction }: { satisfaction: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2, verticalAlign: "middle" }}>
      {[1, 2, 3, 4, 5].map(n => {
        const fill = satisfaction >= n ? "full" : satisfaction >= n - 0.5 ? "half" : "empty"
        return <StarIcon key={n} fill={fill} />
      })}
      <span className="text-xs text-gray-500 ml-1">{satisfaction.toFixed(1)}</span>
    </span>
  )
}

const formatDateTime = (s: string) => {
  const d = new Date(s)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [filtered, setFiltered] = useState<Review[]>([])
  const [teacher, setTeacher] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unreplied" | "replied">("all")
  const [templates, setTemplates] = useState<Template[]>([])
  const [showModal, setShowModal] = useState(false)
  const [targetReview, setTargetReview] = useState<Review | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    if (filter === "all") setFiltered(reviews)
    else if (filter === "unreplied") setFiltered(reviews.filter(r => !r.is_replied))
    else setFiltered(reviews.filter(r => r.is_replied))
  }, [filter, reviews])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return
    const t = EMAIL_TO_TEACHER[user.email]
    if (!t) return
    setTeacher(t)

    const { data: reviewData } = await supabase
      .from("reviews")
      .select("id, user_id, consultation_id, satisfaction, comment, tags, private_message_to_teacher, is_replied, reply_comment, created_at")
      .eq("teacher_id", t.id)
      .neq("data_source", "dummy")
      .order("created_at", { ascending: false })

    if (!reviewData) { setLoading(false); return }

    // ユーザー名
    const userIds = [...new Set(reviewData.map(r => r.user_id).filter(Boolean))]
    const { data: userData } = await supabase
      .from("users").select("id, handle_name").in("id", userIds)
    const userMap: Record<string, string> = {}
    userData?.forEach(u => { userMap[u.id] = u.handle_name })

    // 鑑定日時・種別
    const conIds = [...new Set(reviewData.map(r => r.consultation_id).filter(Boolean))]
    const { data: conData } = await supabase
      .from("consultations").select("id, started_at, data_source").in("id", conIds)
    const conMap: Record<string, { started_at: string; data_source: string }> = {}
    conData?.forEach(c => { conMap[c.id] = { started_at: c.started_at, data_source: c.data_source } })

    setReviews(reviewData.map(r => ({
      ...r,
      handle_name: userMap[r.user_id] ?? "-",
      started_at: r.consultation_id ? conMap[r.consultation_id]?.started_at ?? null : null,
      data_source: r.consultation_id ? conMap[r.consultation_id]?.data_source ?? null : null,
    })))

    const { data: templateData } = await supabase
      .from("mail_templates").select("id, title, body")
      .eq("teacher_id", t.id).order("created_at", { ascending: false })
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

    if (send) {
      // まず reply_comment を保存
      await supabase.from("reviews").update({
        reply_comment: replyContent,
        updated_at: new Date().toISOString(),
      }).eq("id", targetReview.id)

      // Edge Function でメール送信 + is_replied: true
      const { error } = await supabase.functions.invoke("send-review-reply", {
        body: { review_id: targetReview.id },
      })

      if (error) {
        alert("送信に失敗しました: " + error.message)
        setSaving(false)
        return
      }
    } else {
      // 保存のみ（下書き）
      await supabase.from("reviews").update({
        reply_comment: replyContent,
        is_replied: false,
        updated_at: new Date().toISOString(),
      }).eq("id", targetReview.id)
    }

    setSaving(false)
    setShowModal(false)
    fetchAll()
  }

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">レビュー一覧</h1>
        <div className="flex gap-2">
          {(["all", "unreplied", "replied"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded ${filter === f ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {f === "all" ? "すべて" : f === "unreplied" ? "未返信" : "返信済"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="p-4 text-sm text-gray-400 border rounded">レビューがありません</div>
        )}
        {filtered.map(r => (
          <div key={r.id} className="border rounded-lg bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                {/* ユーザー名・ステータス */}
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <a href={`/admin/users/${r.user_id}`} className="font-medium text-sm text-blue-600 hover:underline">{r.handle_name}</a>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.is_replied ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                    {r.is_replied ? "返信済" : "未返信"}
                  </span>
                </div>
                {/* 鑑定日時・種別・レビュー日時 */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {r.started_at && (
                    <span className="text-xs text-gray-500">鑑定：{formatDateTime(r.started_at)}</span>
                  )}
                  {r.data_source && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {SOURCE_LABEL[r.data_source] ?? r.data_source}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">レビュー：{formatDateTime(r.created_at)}</span>
                </div>
                {/* 星・タグ */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <StarRow satisfaction={r.satisfaction} />
                  {r.tags && r.tags.length > 0 && r.tags.map(tag => (
                    <span key={tag} className="text-xs bg-teal-50 text-teal-600 border border-teal-200 rounded-full px-2 py-0.5">#{tag}</span>
                  ))}
                </div>
                {/* コメント */}
                {r.comment && <p className="text-sm text-gray-700 mb-2">{r.comment}</p>}
                {/* 占い師へ */}
                {r.private_message_to_teacher && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded p-2 mb-2">
                    占い師へ：{r.private_message_to_teacher}
                  </p>
                )}
                {/* 返信 */}
                {r.reply_comment && (
                  <p className="text-xs text-teal-700 bg-teal-50 rounded p-2">
                    返信：{r.reply_comment}
                  </p>
                )}
              </div>
              <button onClick={() => openReply(r)}
                className="text-xs bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded shrink-0">
                {r.is_replied ? "返信を見る" : "返信する"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 返信モーダル */}
      {showModal && targetReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-1">返信</h2>

            {/* モーダル内レビュー情報 */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{targetReview.handle_name}</span>
                <StarRow satisfaction={targetReview.satisfaction} />
                {targetReview.data_source && (
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                    {SOURCE_LABEL[targetReview.data_source] ?? targetReview.data_source}
                  </span>
                )}
              </div>
              {targetReview.started_at && (
                <div className="text-xs text-gray-500">鑑定日時：{formatDateTime(targetReview.started_at)}</div>
              )}
              {targetReview.tags && targetReview.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {targetReview.tags.map(tag => (
                    <span key={tag} className="text-xs bg-teal-50 text-teal-600 border border-teal-200 rounded-full px-2 py-0.5">#{tag}</span>
                  ))}
                </div>
              )}
              {targetReview.comment && (
                <p className="text-sm text-gray-700">{targetReview.comment}</p>
              )}
              {targetReview.private_message_to_teacher && (
                <p className="text-xs text-gray-500 bg-white rounded p-2">
                  占い師へ：{targetReview.private_message_to_teacher}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">テンプレート</label>
                <select className="w-full border rounded px-2 py-1 mt-1 text-sm bg-white"
                  value={selectedTemplateId} onChange={e => handleTemplateChange(e.target.value)}>
                  <option value="">-</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">返信内容</label>
                <textarea className="w-full border rounded px-2 py-1 mt-1 text-sm" style={{ height: "240px" }}
                  value={replyContent} onChange={e => setReplyContent(e.target.value)}
                  placeholder="返信内容を入力してください" />
              </div>
            </div>

            <div className="flex justify-between mt-4">
              <button onClick={() => setShowModal(false)}
                className="text-sm bg-gray-400 hover:bg-gray-500 text-white px-4 py-1.5 rounded">閉じる</button>
              <div className="flex gap-2">
                <button onClick={() => saveReply(false)} disabled={saving}
                  className="text-sm bg-gray-500 hover:bg-gray-600 text-white px-4 py-1.5 rounded disabled:opacity-50">
                  {saving ? "保存中..." : "保存"}
                </button>
                <button onClick={() => saveReply(true)} disabled={saving || !replyContent}
                  className="text-sm bg-teal-500 hover:bg-teal-600 text-white px-4 py-1.5 rounded disabled:opacity-50">
                  {saving ? "送信中..." : "送信"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
