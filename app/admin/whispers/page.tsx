"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮" },
}

const MAX_CHARS = 60
const MAX_LINES = 3
const MAX_LINE_CHARS = 20

type Whisper = {
  id: string
  content: string
  is_visible: boolean
  publish_at: string | null
  created_at: string
  button1_label: string | null
  button1_url: string | null
  button2_label: string | null
  button2_url: string | null
  button3_label: string | null
  button3_url: string | null
  likes_count: number
}

// 文字数・行数チェック
function validateContent(text: string): { valid: boolean; charCount: number; lineCount: number; lineErrors: number[] } {
  const lines = text.split("\n")
  const lineErrors: number[] = []
  lines.forEach((line, i) => {
    if (line.length > MAX_LINE_CHARS) lineErrors.push(i)
  })
  return {
    valid: text.length <= MAX_CHARS && lines.length <= MAX_LINES && lineErrors.length === 0,
    charCount: text.length,
    lineCount: lines.length,
    lineErrors,
  }
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
  const [button1Label, setButton1Label] = useState("")
  const [button1Url, setButton1Url] = useState("")
  const [button2Label, setButton2Label] = useState("")
  const [button2Url, setButton2Url] = useState("")
  const [button3Label, setButton3Label] = useState("")
  const [button3Url, setButton3Url] = useState("")
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
      .select("id, content, is_visible, publish_at, created_at, button1_label, button1_url, button2_label, button2_url, button3_label, button3_url, likes_count")
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
    setButton1Label(""); setButton1Url("")
    setButton2Label(""); setButton2Url("")
    setButton3Label(""); setButton3Url("")
    setShowModal(true)
  }

  const openEdit = (w: Whisper) => {
    setEditTarget(w)
    setContent(w.content)
    setPublishAt(w.publish_at ? w.publish_at.slice(0, 16) : "")
    setIsVisible(w.is_visible)
    setButton1Label(w.button1_label ?? ""); setButton1Url(w.button1_url ?? "")
    setButton2Label(w.button2_label ?? ""); setButton2Url(w.button2_url ?? "")
    setButton3Label(w.button3_label ?? ""); setButton3Url(w.button3_url ?? "")
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditTarget(null)
  }

  const save = async () => {
    if (!teacher || !content.trim()) return
    const { valid } = validateContent(content)
    if (!valid) return
    setSaving(true)
    const payload = {
      content,
      is_visible: isVisible,
      publish_at: publishAt ? new Date(publishAt).toISOString() : null,
      button1_label: button1Label.trim() || null,
      button1_url: button1Url.trim() || null,
      button2_label: button2Label.trim() || null,
      button2_url: button2Url.trim() || null,
      button3_label: button3Label.trim() || null,
      button3_url: button3Url.trim() || null,
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

  const validation = validateContent(content)
  const charColor = !validation.valid
    ? "text-red-500"
    : validation.charCount > MAX_CHARS * 0.85
    ? "text-orange-400"
    : "text-gray-400"

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
                  {w.likes_count > 0 && (
                    <span className="text-xs text-gray-400">❤️ {w.likes_count}</span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{w.content}</p>
                {/* ボタン表示 */}
                {[
                  { label: w.button1_label, url: w.button1_url },
                  { label: w.button2_label, url: w.button2_url },
                  { label: w.button3_label, url: w.button3_url },
                ].filter(b => b.label).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {[
                      { label: w.button1_label, url: w.button1_url },
                      { label: w.button2_label, url: w.button2_url },
                      { label: w.button3_label, url: w.button3_url },
                    ].filter(b => b.label).map((b, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border">
                        🔗 {b.label}
                      </span>
                    ))}
                  </div>
                )}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editTarget ? "編集" : "新規作成"}</h2>
            <div className="space-y-4">

              {/* 本文 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-500">本文</label>
                  <div className={`text-xs font-mono ${charColor}`}>
                    {validation.charCount}/{MAX_CHARS}文字　{validation.lineCount}/{MAX_LINES}行
                  </div>
                </div>
                <textarea
                  className={`w-full border rounded px-2 py-1 text-sm resize-none font-mono ${!validation.valid && content.trim() ? "border-red-400 bg-red-50" : ""}`}
                  rows={4}
                  value={content}
                  onChange={e => {
                    // 改行で行数チェック
                    const lines = e.target.value.split("\n")
                    if (lines.length > MAX_LINES) return
                    setContent(e.target.value)
                  }}
                  placeholder={"1行20文字以内・最大3行\n例：今日も鑑定中です✨\n気になる方はお気軽に"}
                />
                {/* 行ごとの文字数バー */}
                <div className="mt-1 space-y-0.5">
                  {content.split("\n").map((line, i) => {
                    const over = line.length > MAX_LINE_CHARS
                    return (
                      <div key={i} className="flex items-center gap-1">
                        <span className="text-xs text-gray-300 w-8">{i + 1}行</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${over ? "bg-red-400" : line.length > MAX_LINE_CHARS * 0.8 ? "bg-orange-400" : "bg-teal-400"}`}
                            style={{ width: `${Math.min((line.length / MAX_LINE_CHARS) * 100, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs w-8 text-right ${over ? "text-red-500 font-bold" : "text-gray-400"}`}>
                          {line.length}/{MAX_LINE_CHARS}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {!validation.valid && content.trim() && (
                  <p className="text-xs text-red-500 mt-1">
                    {validation.lineErrors.length > 0 && `${validation.lineErrors.map(i => i + 1).join("・")}行目が20文字を超えています。`}
                    {validation.charCount > MAX_CHARS && `合計${validation.charCount}文字（上限${MAX_CHARS}文字）。`}
                  </p>
                )}
              </div>

              {/* 公開日時 */}
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

              {/* 公開チェック */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isVisible"
                  checked={isVisible}
                  onChange={e => setIsVisible(e.target.checked)}
                />
                <label htmlFor="isVisible" className="text-sm">公開する</label>
              </div>

              {/* ボタン設定 */}
              <div>
                <label className="text-xs text-gray-500 block mb-2">ボタン（最大3つ・ラベルとURLをセットで入力）</label>
                <div className="space-y-2">
                  {[
                    { n: 1, label: button1Label, url: button1Url, setLabel: setButton1Label, setUrl: setButton1Url },
                    { n: 2, label: button2Label, url: button2Url, setLabel: setButton2Label, setUrl: setButton2Url },
                    { n: 3, label: button3Label, url: button3Url, setLabel: setButton3Label, setUrl: setButton3Url },
                  ].map(({ n, label, url, setLabel, setUrl }) => (
                    <div key={n} className="flex gap-2 items-center p-2 bg-gray-50 rounded-lg border">
                      <span className="text-xs text-gray-400 font-bold w-4 shrink-0">#{n}</span>
                      <input
                        type="text"
                        className="border rounded px-2 py-1 text-sm w-28 shrink-0"
                        placeholder="ラベル"
                        maxLength={12}
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                      />
                      <input
                        type="text"
                        className="border rounded px-2 py-1 text-sm flex-1 min-w-0"
                        placeholder="URL（https://… または /blog/hana など）"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                      />
                      {(label || url) && (
                        <button
                          onClick={() => { setLabel(""); setUrl("") }}
                          className="text-gray-300 hover:text-red-400 text-sm shrink-0"
                          title="クリア"
                        >✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">ラベルのみ入力でURLなしボタンは表示されません</p>
              </div>

            </div>

            <div className="flex justify-between mt-5">
              <button
                onClick={closeModal}
                className="text-sm bg-gray-400 hover:bg-gray-500 text-white px-4 py-1.5 rounded"
              >
                閉じる
              </button>
              <button
                onClick={save}
                disabled={saving || !content.trim() || !validation.valid}
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
