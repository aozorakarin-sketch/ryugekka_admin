"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
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
}

export default function FollowMailNewPage() {
  const { userId } = useParams()
  const router = useRouter()
  const [handleName, setHandleName] = useState("")
  const [teacher, setTeacher] = useState<{ id: string; name: string } | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
  }, [userId])

  const fetchAll = async () => {
    // ログイン中のユーザーを取得
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return
    const t = EMAIL_TO_TEACHER[user.email]
    if (!t) return
    setTeacher(t)

    // ユーザー名取得
    const { data: userData } = await supabase
      .from("users")
      .select("handle_name")
      .eq("id", userId)
      .single()
    setHandleName(userData?.handle_name ?? "-")

    // テンプレート取得（ログイン中の先生のもの）
    const { data: templateData } = await supabase
      .from("mail_templates")
      .select("id, title, body")
      .eq("teacher_id", t.id)
      .order("created_at", { ascending: false })
    setTemplates(templateData ?? [])

    // 下書きがあれば取得
    const { data: draftData } = await supabase
      .from("follow_mails")
      .select("id, content")
      .eq("user_id", userId)
      .eq("teacher_id", t.id)
      .eq("is_draft", true)
      .order("created_at", { ascending: false })
      .limit(1)
    if (draftData?.[0]) {
      setDraftId(draftData[0].id)
      setContent(draftData[0].content ?? "")
    }

    setLoading(false)
  }

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const t = templates.find(t => t.id === templateId)
    if (t) setContent(t.body)
  }

  const saveDraft = async () => {
    if (!teacher) return
    setSaving(true)
    const subject = `【龍月花】${teacher.name}先生からフォローメールが届いております`

    if (draftId) {
      await supabase.from("follow_mails").update({
        content,
        subject,
        updated_at: new Date().toISOString(),
      }).eq("id", draftId)
    } else {
      const { data } = await supabase.from("follow_mails").insert({
        user_id: userId,
        teacher_id: teacher.id,
        subject,
        content,
        is_draft: true,
        data_source: "minden",
      }).select("id").single()
      if (data) setDraftId(data.id)
    }
    setSaving(false)
  }

  const goToConfirm = async () => {
    await saveDraft()
    router.push(`/admin/follow-mails/confirm/${userId}`)
  }

  const subject = teacher ? `【龍月花】${teacher.name}先生からフォローメールが届いております` : ""

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-4">フォローメール作成</h1>

      <div className="border rounded-lg p-4 bg-white space-y-4">
        <div className="text-sm text-gray-600">
          送信先：<span className="font-medium text-gray-900">{handleName}</span>
       <div>
  <div className="flex items-center justify-between mb-1">
    <label className="text-xs text-gray-500">テンプレート</label>
    
      href="/admin/mail-templates"
      className="text-xs bg-teal-500 hover:bg-teal-600 text-white px-2 py-0.5 rounded"
    >
      テンプレート管理
    </a>
  </div>
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
          <label className="text-xs text-gray-500">件名</label>
          <div className="w-full border rounded px-2 py-2 mt-1 text-sm bg-gray-50 text-gray-700">
            {subject}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500">本文</label>
          <textarea
            className="w-full border rounded px-2 py-1 mt-1 text-sm"
            style={{ height: "400px" }}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="本文を入力してください"
          />
        </div>

        <div className="flex justify-between">
          <a href={`/admin/users/${userId}`} className="text-sm text-gray-500 hover:underline">
            ← 戻る
          </a>
          <div className="flex gap-2">
            <button
              onClick={saveDraft}
              disabled={saving}
              className="text-sm bg-gray-400 hover:bg-gray-500 text-white px-4 py-1.5 rounded"
            >
              {saving ? "保存中..." : "下書き保存"}
            </button>
            <button
              onClick={goToConfirm}
              disabled={saving || !content}
              className="text-sm bg-teal-500 hover:bg-teal-600 text-white px-4 py-1.5 rounded disabled:opacity-50"
            >
              確認へ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
