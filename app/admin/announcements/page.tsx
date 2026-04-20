"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮" },
}

const TEACHER_NAMES: Record<string, string> = {
  "cd2c4101-2e24-4ae2-8d6a-507a943904af": "青空花林",
  "17cf0ca1-7526-466e-a644-9d3efefa4091": "椎名架月",
  "3ba85bb9-9065-461b-b76b-cc488d4c0c3b": "雲龍蓮",
}

type Announcement = {
  id: string
  title: string
  content: string | null
  is_important: boolean
  is_pinned: boolean
  created_at: string
  teacher_id: string | null
}

export default function AnnouncementsPage() {
  const router = useRouter()
  const [teacher, setTeacher] = useState<{ id: string; name: string } | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Announcement | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isImportant, setIsImportant] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Announcement | null>(null)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return
    const t = EMAIL_TO_TEACHER[user.email]
    if (t) setTeacher(t)
    await fetchAnnouncements()
  }

  const fetchAnnouncements = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("announcements")
      .select("id, title, content, is_important, is_pinned, created_at, teacher_id")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
    setAnnouncements(data ?? [])
    setLoading(false)
  }

  const openCreate = () => {
    setEditTarget(null)
    setTitle("")
    setContent("")
    setIsImportant(false)
    setIsPinned(false)
    setShowModal(true)
  }

  const openEdit = (a: Announcement) => {
    setEditTarget(a)
    setTitle(a.title)
    setContent(a.content ?? "")
    setIsImportant(a.is_important)
    setIsPinned(a.is_pinned)
    setShowModal(true)
    setSelected(null)
  }

  const save = async () => {
    if (!teacher || !title.trim()) {
      alert("タイトルを入力してください")
      return
    }
    setSaving(true)
    const payload = {
      title,
      content,
      is_important: isImportant,
      is_pinned: isPinned,
      teacher_id: teacher.id,
      created_by: teacher.id,
      updated_at: new Date().toISOString(),
    }
    if (editTarget) {
      await supabase.from("announcements").update(payload).eq("id", editTarget.id)
    } else {
      await supabase.from("announcements").insert({
        ...payload,
        created_at: new Date().toISOString(),
        data_source: "ryugekka",
      })
    }
    setSaving(false)
    setShowModal(false)
    fetchAnnouncements()
  }

  const deleteAnnouncement = async (id: string) => {
    if (!confirm("削除しますか？")) return
    await supabase.from("announcements").delete().eq("id", id)
    setSelected(null)
    fetchAnnouncements()
  }

  const formatDate = (s: string) => {
    const d = new Date(s)
    return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`
  }

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-4 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">お知らせ <span className="text-gray-400 text-base font-normal">{announcements.length}件</span></h1>
        <button onClick={openCreate} className="bg-teal-500 hover:bg-teal-600 text-white text-sm px-4 py-2 rounded">
          ＋ 新規作成
        </button>
      </div>

      {/* 一覧 */}
      {!selected && (
        <div className="space-y-2">
          {announcements.length === 0 && <p className="text-gray-400 text-sm">お知らせはまだありません</p>}
          {announcements.map(a => (
            <div
              key={a.id}
              onClick={() => setSelected(a)}
              className={`bg-white border rounded-lg px-4 py-3 cursor-pointer hover:border-teal-300 transition-colors ${a.is_pinned ? "border-teal-300 bg-teal-50" : ""}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {a.is_pinned && <span className="text-xs bg-teal-500 text-white px-2 py-0.5 rounded-full">📌 固定</span>}
                {a.is_important && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">❗ 重要</span>}
                <span className="text-xs text-gray-400">{TEACHER_NAMES[a.teacher_id ?? ""] ?? "不明"}</span>
                <span className="text-xs text-gray-400">{formatDate(a.created_at)}</span>
              </div>
              <p className="font-medium text-gray-800 truncate">{a.title}</p>
            </div>
          ))}
        </div>
      )}

      {/* 詳細 */}
      {selected && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setSelected(null)} className="text-sm text-gray-500 hover:text-gray-700">← 一覧へ</button>
            <div className="flex gap-2">
              <button onClick={() => openEdit(selected)} className="text-sm bg-blue-500 text-white px-3 py-1 rounded">編集</button>
              <button onClick={() => deleteAnnouncement(selected.id)} className="text-sm bg-red-500 text-white px-3 py-1 rounded">削除</button>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            {selected.is_pinned && <span className="text-xs bg-teal-500 text-white px-2 py-0.5 rounded-full">📌 固定</span>}
            {selected.is_important && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">❗ 重要</span>}
          </div>
          <h2 className="text-xl font-bold mb-1">{selected.title}</h2>
          <p className="text-xs text-gray-400 mb-4">{TEACHER_NAMES[selected.teacher_id ?? ""] ?? "不明"} · {formatDate(selected.created_at)}</p>
          <style>{`
            .announcement-content p { margin: 0.4em 0; line-height: 1.7; }
            .announcement-content h1 { font-size: 1.8em; font-weight: bold; margin: 0.5em 0; }
            .announcement-content h2 { font-size: 1.4em; font-weight: bold; margin: 0.5em 0; }
            .announcement-content ul { list-style-type: disc; padding-left: 1.5em; }
            .announcement-content ol { list-style-type: decimal; padding-left: 1.5em; }
          `}</style>
          <div className="announcement-content" dangerouslySetInnerHTML={{ __html: selected.content ?? "" }} />
        </div>
      )}

      {/* モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editTarget ? "編集" : "新規作成"}</h2>

            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="タイトル"
              className="w-full border rounded px-3 py-2 text-sm mb-3"
            />

            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={isImportant} onChange={e => setIsImportant(e.target.checked)} />
                ❗ 重要
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} />
                📌 固定
              </label>
            </div>

            {/* 2カラム：HTMLエディタ＋プレビュー */}
            <div className="flex gap-3 mb-4" style={{ height: "300px" }}>
              <div className="flex-1 flex flex-col">
                <div className="text-xs text-gray-500 mb-1">HTML</div>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="flex-1 border rounded p-2 text-sm font-mono resize-none focus:outline-none focus:border-teal-400"
                  placeholder="<p>内容を入力</p>"
                  spellCheck={false}
                />
              </div>
              <div className="flex-1 flex flex-col">
                <div className="text-xs text-gray-500 mb-1">プレビュー</div>
                <div className="flex-1 border rounded p-3 overflow-y-auto bg-white text-sm">
                  <style>{`
                    .preview p { margin: 0.4em 0; line-height: 1.7; }
                    .preview h1 { font-size: 1.8em; font-weight: bold; }
                    .preview h2 { font-size: 1.4em; font-weight: bold; }
                    .preview ul { list-style-type: disc; padding-left: 1.5em; }
                  `}</style>
                  <div className="preview" dangerouslySetInnerHTML={{ __html: content || "<p style='color:#aaa'>プレビュー</p>" }} />
                </div>
              </div>
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