"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮" },
}

const TAG_LIST = [
  "#霊感・霊視", "#恋愛", "#復縁", "#不倫",
  "#仕事・職場", "#人間関係", "#家族", "#金運", "#健康"
]

type DummyReview = {
  id: string
  satisfaction: number
  comment: string | null
  created_at: string
  tags: string[]
}

export default function DummyReviewsPage() {
  const [teacher, setTeacher] = useState<{ id: string; name: string } | null>(null)
  const [reviews, setReviews] = useState<DummyReview[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<DummyReview | null>(null)

  const [satisfaction, setSatisfaction] = useState(5)
  const [comment, setComment] = useState("")
  const [createdAt, setCreatedAt] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return
    const t = EMAIL_TO_TEACHER[user.email]
    if (!t) return
    setTeacher(t)
    await fetchReviews(t.id)
  }

  const fetchReviews = async (teacherId: string) => {
    setLoading(true)
    const { data } = await supabase
      .from("reviews")
      .select("id, satisfaction, comment, created_at, tags")
      .eq("teacher_id", teacherId)
      .eq("data_source", "dummy")
      .order("created_at", { ascending: false })
    setReviews(data ?? [])
    setLoading(false)
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : prev.length < 3 ? [...prev, tag] : prev
    )
  }

  const openCreate = () => {
    setEditTarget(null)
    setSatisfaction(5)
    setComment("")
    setCreatedAt("")
    setSelectedTags([])
    setShowModal(true)
  }

  const openEdit = (r: DummyReview) => {
    setEditTarget(r)
    setSatisfaction(r.satisfaction)
    setComment(r.comment ?? "")
    setCreatedAt(r.created_at.slice(0, 16))
    setSelectedTags(r.tags ?? [])
    setShowModal(true)
  }

  const save = async () => {
    if (!teacher) return
    setSaving(true)
    const payload = {
      teacher_id: teacher.id,
      satisfaction,
      comment: comment || null,
      created_at: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
      data_source: "dummy",
      tags: selectedTags,
    }
    if (editTarget) {
      await supabase.from("reviews").update(payload).eq("id", editTarget.id)
    } else {
      await supabase.from("reviews").insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    fetchReviews(teacher.id)
  }

  const deleteReview = async (id: string) => {
    if (!confirm("削除しますか？")) return
    await supabase.from("reviews").delete().eq("id", id)
    if (teacher) fetchReviews(teacher.id)
  }

  const formatDate = (s: string) => {
    const d = new Date(s)
    return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`
  }

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">ダミーレビュー管理</h1>
        <button onClick={openCreate} className="bg-teal-500 hover:bg-teal-600 text-white text-sm px-4 py-2 rounded">
          ＋ 新規作成
        </button>
      </div>

      <div className="space-y-3">
        {reviews.length === 0 && <p className="text-gray-500 text-sm">ダミーレビューはまだありません</p>}
        {reviews.map(r => (
          <div key={r.id} className="border rounded p-4 bg-white flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-yellow-400 text-lg">{"★".repeat(r.satisfaction)}{"☆".repeat(5 - r.satisfaction)}</span>
                <span className="text-sm text-gray-500">{formatDate(r.created_at)}</span>
              </div>
              {r.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {r.tags.map(tag => (
                    <span key={tag} className="text-xs bg-teal-50 text-teal-600 border border-teal-200 rounded-full px-2 py-0.5">{tag}</span>
                  ))}
                </div>
              )}
              {r.comment && <p className="text-sm text-gray-700">{r.comment}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => openEdit(r)} className="text-sm bg-blue-500 text-white px-3 py-1 rounded">編集</button>
              <button onClick={() => deleteReview(r.id)} className="text-sm bg-red-500 text-white px-3 py-1 rounded">削除</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editTarget ? "編集" : "新規作成"}</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">満足度</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setSatisfaction(n)}
                    className={`text-2xl ${n <= satisfaction ? "text-yellow-400" : "text-gray-300"}`}>★</button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                タグ <span className="text-gray-400 text-xs">（3つまで）</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {TAG_LIST.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      selectedTags.includes(tag)
                        ? "bg-teal-500 text-white border-teal-500"
                        : selectedTags.length >= 3
                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                        : "bg-white text-teal-600 border-teal-300 hover:bg-teal-50"
                    }`}
                  >{tag}</button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">コメント（任意）</label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={4}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="レビューコメントを入力"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">投稿日時</label>
              <input
                type="datetime-local"
                value={createdAt}
                onChange={e => setCreatedAt(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">空欄の場合は現在時刻</p>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setShowModal(false)} className="bg-gray-400 text-white text-sm px-4 py-2 rounded">閉じる</button>
              <button onClick={save} disabled={saving} className="bg-teal-500 hover:bg-teal-600 text-white text-sm px-4 py-2 rounded">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}