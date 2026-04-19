"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮" },
}

type Template = {
  id: string
  title: string
  body: string
  created_at: string
}

export default function MailTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [teacher, setTeacher] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Template | null>(null)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
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
      .from("mail_templates")
      .select("id, title, body, created_at")
      .eq("teacher_id", t.id)
      .order("created_at", { ascending: false })
    setTemplates(data ?? [])
    setLoading(false)
  }

  const openNew = () => {
    setEditTarget(null)
    setTitle("")
    setBody("")
    setShowModal(true)
  }

  const openEdit = (t: Template) => {
    setEditTarget(t)
    setTitle(t.title)
    setBody(t.body)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditTarget(null)
    setTitle("")
    setBody("")
  }

  const save = async () => {
    if (!teacher || !title.trim()) return
    setSaving(true)
    if (editTarget) {
      await supabase.from("mail_templates").update({
        title,
        body,
        updated_at: new Date().toISOString(),
      }).eq("id", editTarget.id)
    } else {
      await supabase.from("mail_templates").insert({
        teacher_id: teacher.id,
        title,
        body,
        data_source: "minden",
      })
    }
    setSaving(false)
    closeModal()
    fetchAll()
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm("削除しますか？")) return
    await supabase.from("mail_templates").delete().eq("id", id)
    fetchAll()
  }

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">メールテンプレート</h1>
        <button
          onClick={openNew}
          className="text-sm bg-teal-500 hover:bg-teal-600 text-white px-4 py-1.5 rounded"
        >
          ＋ 新規作成
        </button>
      </div>

      <div className="space-y-3">
        {templates.length === 0 && (
          <div className="text-gray-400 text-sm p-4 border rounded">テンプレートがありません</div>
        )}
        {templates.map(t => (
          <div key={t.id} className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">{t.title}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(t)}
                  className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                >
                  編集
                </button>
                <button
                  onClick={() => deleteTemplate(t.id)}
                  className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                >
                  削除
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-3">{t.body}</p>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <h2 className="text-lg font-bold mb-4">{editTarget ? "編集" : "新規作成"}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">タイトル</label>
                <input
                  className="w-full border rounded px-2 py-1 mt-1 text-sm"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="テンプレート名"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">本文</label>
                <textarea
                  className="w-full border rounded px-2 py-1 mt-1 text-sm"
                  style={{ height: "400px" }}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="本文を入力してください"
                />
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
                disabled={saving || !title.trim()}
                className="text-sm bg-teal-500 hover:bg-teal-600 text-white px-4 py-1.5 rounded disabled:opacity-50"
              >
                {saving ? "保存中..." : "登録"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}