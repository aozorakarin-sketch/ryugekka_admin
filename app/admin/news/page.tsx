"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

const NEWS_TEMPLATE = `<p>お知らせの内容をここに書いてください。</p>

<hr style="border: none; border-top: 2px solid #8b7cb833; margin: 1.2rem 0;" />

<h2 style="color: #8b7cb8;">📢 詳細</h2>
<p>詳しい内容をここに書いてください。</p>

<blockquote style="border-left: 4px solid #8b7cb8; padding: 8px 16px; background: #f8f5ff; border-radius: 0 8px 8px 0; margin: 1rem 0;">
  重要なポイントや補足情報をここに入れてください。
</blockquote>

<hr style="border: none; border-top: 2px solid #8b7cb833; margin: 1.2rem 0;" />

<p style="text-align: center; color: #8b7cb8; font-size: 0.9em;">龍月花をご利用いただきありがとうございます🐉🌙🌸</p>`

type News = {
  id: string
  title: string
  content: string | null
  is_important: boolean
  is_published: boolean
  published_at: string | null
  created_at: string
}

export default function NewsPage() {
  const [news, setNews] = useState<News[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<News | null>(null)
  const [selected, setSelected] = useState<News | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isImportant, setIsImportant] = useState(false)
  const [isPublished, setIsPublished] = useState(false)
  const [publishedAt, setPublishedAt] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchNews() }, [])

  const fetchNews = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("news")
      .select("id, title, content, is_important, is_published, published_at, created_at")
      .order("created_at", { ascending: false })
    setNews(data ?? [])
    setLoading(false)
  }

  const openCreate = () => {
    setEditTarget(null)
    setTitle("")
    setContent(NEWS_TEMPLATE)
    setIsImportant(false)
    setIsPublished(false)
    setPublishedAt("")
    setShowModal(true)
  }

  const openEdit = (n: News) => {
    setEditTarget(n)
    setTitle(n.title)
    setContent(n.content ?? "")
    setIsImportant(n.is_important)
    setIsPublished(n.is_published)
    setPublishedAt(n.published_at ? new Date(n.published_at).toISOString().slice(0, 16) : "")
    setShowModal(true)
    setSelected(null)
  }

  const save = async () => {
    if (!title.trim()) { alert("タイトルを入力してください"); return }
    setSaving(true)
    const payload = {
      title,
      content,
      is_important: isImportant,
      is_published: isPublished,
      published_at: publishedAt ? new Date(publishedAt).toISOString() : isPublished ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }
    if (editTarget) {
      await supabase.from("news").update(payload).eq("id", editTarget.id)
    } else {
      await supabase.from("news").insert({ ...payload, created_at: new Date().toISOString(), data_source: "ryugekka" })
    }
    setSaving(false)
    setShowModal(false)
    fetchNews()
  }

  const deleteNews = async (id: string) => {
    if (!confirm("削除しますか？")) return
    await supabase.from("news").delete().eq("id", id)
    setSelected(null)
    fetchNews()
  }

  const togglePublish = async (n: News) => {
    await supabase.from("news").update({
      is_published: !n.is_published,
      published_at: !n.is_published ? new Date().toISOString() : n.published_at,
    }).eq("id", n.id)
    fetchNews()
  }

  const formatDate = (s: string | null) => {
    if (!s) return "-"
    const d = new Date(s)
    return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`
  }

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-4 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">ニュース管理 <span className="text-gray-400 text-base font-normal">{news.length}件</span></h1>
        <button onClick={openCreate} className="bg-teal-500 hover:bg-teal-600 text-white text-sm px-4 py-2 rounded">
          ＋ 新規作成
        </button>
      </div>

      {!selected && (
        <div className="space-y-2">
          {news.length === 0 && <p className="text-gray-400 text-sm">ニュースはまだありません</p>}
          {news.map(n => (
            <div key={n.id} className="bg-white border rounded-lg px-4 py-3 hover:border-teal-300 transition-colors">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => setSelected(n)}>
                  {n.is_important && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">❗ 重要</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${n.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {n.is_published ? "公開中" : "非公開"}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(n.published_at ?? n.created_at)}</span>
                  <p className="font-medium text-gray-800 truncate">{n.title}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => togglePublish(n)}
                    className={`text-xs px-2 py-1 rounded ${n.is_published ? "bg-orange-400 hover:bg-orange-500 text-white" : "bg-teal-500 hover:bg-teal-600 text-white"}`}
                  >
                    {n.is_published ? "非公開にする" : "公開にする"}
                  </button>
                  <button onClick={() => openEdit(n)} className="text-xs bg-blue-500 text-white px-2 py-1 rounded">編集</button>
                  <button onClick={() => deleteNews(n.id)} className="text-xs bg-red-500 text-white px-2 py-1 rounded">削除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setSelected(null)} className="text-sm text-gray-500 hover:text-gray-700">← 一覧へ</button>
            <div className="flex gap-2">
              <button onClick={() => openEdit(selected)} className="text-sm bg-blue-500 text-white px-3 py-1 rounded">編集</button>
              <button onClick={() => deleteNews(selected.id)} className="text-sm bg-red-500 text-white px-3 py-1 rounded">削除</button>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            {selected.is_important && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">❗ 重要</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full ${selected.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {selected.is_published ? "公開中" : "非公開"}
            </span>
          </div>
          <h2 className="text-xl font-bold mb-1">{selected.title}</h2>
          <p className="text-xs text-gray-400 mb-4">{formatDate(selected.published_at ?? selected.created_at)}</p>
          <style>{`
            .news-content p { margin: 0.4em 0; line-height: 1.7; }
            .news-content h1 { font-size: 1.8em; font-weight: bold; margin: 0.5em 0; }
            .news-content h2 { font-size: 1.4em; font-weight: bold; margin: 0.5em 0; }
            .news-content ul { list-style-type: disc; padding-left: 1.5em; }
            .news-content ol { list-style-type: decimal; padding-left: 1.5em; }
            .news-content blockquote { margin: 0.8rem 0; }
            .news-content hr { margin: 1rem 0; }
          `}</style>
          <div className="news-content" dangerouslySetInnerHTML={{ __html: selected.content ?? "" }} />
        </div>
      )}

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
            <div className="flex gap-4 mb-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={isImportant} onChange={e => setIsImportant(e.target.checked)} />
                ❗ 重要
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} />
                公開する
              </label>
              <div>
                <label className="text-xs text-gray-500 block mb-1">公開日時（予約投稿）</label>
                <input
                  type="datetime-local"
                  value={publishedAt}
                  onChange={e => setPublishedAt(e.target.value)}
                  className="border rounded px-2 py-1 text-sm bg-white"
                />
              </div>
            </div>
            <div className="flex gap-3 mb-4" style={{ height: "300px" }}>
              <div className="flex-1 flex flex-col">
                <div className="text-xs text-gray-500 mb-1">HTML</div>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="flex-1 border rounded p-2 text-sm font-mono resize-none focus:outline-none focus:border-teal-400"
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
                    .preview blockquote { margin: 0.8rem 0; }
                    .preview hr { margin: 1rem 0; }
                  `}</style>
                  <div className="preview" dangerouslySetInnerHTML={{ __html: content || "<p style='color:#aaa'>プレビュー</p>" }} />
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <button onClick={() => setShowModal(false)} className="bg-gray-400 text-white text-sm px-4 py-2 rounded">閉じる</button>
              <button onClick={save} disabled={saving || !title.trim()} className="bg-teal-500 hover:bg-teal-600 text-white text-sm px-4 py-2 rounded disabled:opacity-50">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
