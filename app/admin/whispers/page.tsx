"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮" },
}

type Whisper = {
  id: string
  content: string
  is_visible: boolean
  publish_at: string | null
  created_at: string
}

export default function WhispersPage() {
  const [whispers, setWhispers] = useState<Whisper[]>([])
  const [teacher, setTeacher] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Whisper | null>(null)
  const [content, setContent] = useState("")
  const [publishAt, setPublishAt] = useState("")
  const [isVisible, setIsVisible] = useState(true)
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

    const { data } = await supabase
      .from("whispers")
      .select("id, content, is_visible, publish_at, created_at")
      .eq("teacher_id", t.id)
      .order("publish_at", { ascending: false, nullsFirst: false })
    setWhispers(data ?? [])
    setLoading(false)
  }

  const openNew = () => {
    setEditTarget(null)
    setContent("")
    setPublishAt("")
    setIsVisible(true)
    setShowModal(true)
  }

  const openEdit = (w: Whisper) => {
    setEditTarget(w)
    setContent(w.content)
    setPublishAt(w.publish_at ? w.publish_at.slice(0, 16) : "")
    setIsVisible(w.is_visible)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditTarget(null)
  }

  const save = async () => {
    if (!teacher || !content.trim()) return
    setSaving(true)
    const payload = {
      content,
      is_visible: isVisible,
      publish_at: publishAt ? new Date(publishAt).toISOString() : null,
    }

    if (editTarget) {
      await supabase.from("whispers").update(payload).eq("id", editTarget.id)
    } else {
      await supabase.from("whispers").insert({
        ...payload,
        teacher_id: teacher.id,
        data_source: "minden",
      })
    }
    setSaving(false)
    closeModal()
    fetchAll()
  }

  const toggleVisible = async (w: Whisper) => {
    await supabase.from("whispers").update({ is_visible: !w.is_visible }).eq("id", w.id)
    fetchAll()
  }

  const deleteWhisper = async (id: string) => {
    if (!confirm("削除しますか？")) return
    await supabase.from("whispers").delete().eq("id", id)
    fetchAll()
  }

  const formatDate = (s: string | null) => {
    if (!s) return "-"
    const d = new Date(s)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
  }

  const isPublished = (w: Whisper) => {
    if (!w.is_visible) return false
    if (!w.publish_at) return true
    return new Date(w.publish_at) <= new Date()
  }

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">つぶやき管理</h1>
        <button
          onClick={openNew}
          className="text-sm bg-teal-500 hover:bg-teal-600 text-white px-4 py-1.5 rounded"
        >
          ＋ 新規作成
        </button>
      </div>

      <div className="space-y-3">
        {whispers.length === 0 && (
          <div className="p-4 text-sm text-gray-400 border rounded">つぶやきがありません</div>
        )}
        {whispers.map(w => (
          <div key={w.id} className="border rounded-lg bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isPublished(w) ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {isPublished(w) ? "公開中" : w.publish_at && new Date(w.publish_at) > new Date() ? "予約中" : "非公開"}
                  </span>
                  <span className="text-xs text-gray-400">
                    公開日時：{formatDate(w.publish_at)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{w.content}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => toggleVisible(w)}
                  className={`text-xs px-2 py-1 rounded ${w.is_visible ? "bg-orange-400 hover:bg-orange-500 text-white" : "bg-gray-300 hover:bg-gray-400 text-white"}`}
                >
                  {w.is_visible ? "非公開にする" : "公開にする"}
                </button>
                <button
                  onClick={() => openEdit(w)}
                  className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                >
                  編集
                </button>
                <button
                  onClick={() => deleteWhisper(w.id)}
                  className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <h2 className="text-lg font-bold mb-4">{editTarget ? "編集" : "新規作成"}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">本文</label>
                <textarea
                  className="w-full border rounded px-2 py-1 mt-1 text-sm"
                  style={{ height: "200px" }}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="つぶやきを入力してください"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">公開日時（未来の日付で予約投稿）</label>
                <input
                  type="datetime-local"
                  className="w-full border rounded px-2 py-1 mt-1 text-sm bg-white"
                  value={publishAt}
                  onChange={e => setPublishAt(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">空欄の場合は即時公開</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isVisible"
                  checked={isVisible}
                  onChange={e => setIsVisible(e.target.checked)}
                />
                <label htmlFor="isVisible" className="text-sm">公開する</label>
              </div>
            </div>
            <div className="flex justify-between mt-4">
              <button
                onClick={closeModal}
                className="text-sm bg-gray-400 hover:bg-gray-500 text-white px-4 py-1.5 rounded"
              >
                閉じる
              </button>
              <button
                onClick={save}
                disabled={saving || !content.trim()}
                className="text-sm bg-teal-500 hover:bg-teal-600 text-white px-4 py-1.5 rounded disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}