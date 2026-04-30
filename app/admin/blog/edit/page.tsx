"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮" },
}

const TEACHER_STYLE: Record<string, { color: string; bg: string; emoji: string }> = {
  "青空花林": { color: "#c0607a", bg: "#fff5f7", emoji: "🌸" },
  "椎名架月": { color: "#c9a84c", bg: "#fffbf0", emoji: "🌙" },
  "雲龍蓮":   { color: "#8b7cb8", bg: "#f8f5ff", emoji: "🐉" },
}

const CATEGORIES = ["スピリチュアル", "恋愛", "生活", "仕事", "健康", "その他"]

function getTemplate(name: string): string {
  const s = TEACHER_STYLE[name] ?? TEACHER_STYLE["青空花林"]
  return `<h1>ここにタイトルを入力してください</h1>

<p>導入文をここに書いてください。読者が続きを読みたくなるような一文から始めましょう${s.emoji}</p>

<hr style="border: none; border-top: 2px solid ${s.color}33; margin: 1.5rem 0;" />

<h2>${s.emoji} 最初の見出し</h2>
<p>ここに本文を入力してください。</p>
<p>段落を分けるときは &lt;p&gt; タグを使います。</p>

<h2>${s.emoji} 次の見出し</h2>
<p>ここに本文を入力してください。</p>

<h3>◆ 小見出し</h3>
<p>詳細な内容はここに書いてください。</p>

<blockquote style="border-left: 4px solid ${s.color}; padding: 8px 16px; background: ${s.bg}; border-radius: 0 8px 8px 0; margin: 1rem 0;">
  ここに引用や強調したいメッセージを入れてください。
</blockquote>

<h2>${s.emoji} まとめ</h2>
<p>記事のまとめを書いてください。</p>

<hr style="border: none; border-top: 2px solid ${s.color}33; margin: 1.5rem 0;" />

<p style="text-align: center; color: ${s.color}; font-size: 0.9em;">最後まで読んでくださってありがとうございました${s.emoji}</p>`
}

export default function BlogEditPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const postId = searchParams.get("id")

  const [teacher, setTeacher] = useState<{ id: string; name: string } | null>(null)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("スピリチュアル")
  const [publishedAt, setPublishedAt] = useState("")
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return
    const t = EMAIL_TO_TEACHER[user.email]
    if (!t) return
    setTeacher(t)

    if (postId) {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", postId)
        .single()
      if (data) {
        setTitle(data.title)
        setCategory(data.tags?.[0] ?? "スピリチュアル")
        setPublishedAt(data.published_at ? new Date(data.published_at).toISOString().slice(0, 16) : "")
        setContent(data.content ?? "")
      }
    } else {
      // 新規作成時はテンプレートを入れる
      setContent(getTemplate(t.name))
    }
    setLoading(false)
  }

  const save = async (saveStatus: "draft" | "published") => {
    if (!teacher || !title.trim()) {
      alert("タイトルを入力してください")
      return
    }
    setSaving(true)
    const payload = {
      teacher_id: teacher.id,
      title,
      content,
      excerpt: content.replace(/<[^>]*>/g, "").slice(0, 100),
      tags: [category],
      status: saveStatus,
      published_at: publishedAt
        ? new Date(publishedAt).toISOString()
        : saveStatus === "published" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }

    if (postId) {
      await supabase.from("blog_posts").update(payload).eq("id", postId)
    } else {
      await supabase.from("blog_posts").insert({ ...payload, created_at: new Date().toISOString() })
    }
    setSaving(false)
    router.push("/admin/blog")
  }

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-4 h-screen flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold">{postId ? "ブログ編集" : "ブログ作成"}</h1>
        <div className="flex gap-2">
          <button onClick={() => router.push("/admin/blog")} className="text-sm bg-gray-400 text-white px-4 py-2 rounded">
            戻る
          </button>
          <button onClick={() => save("draft")} disabled={saving} className="text-sm bg-gray-600 text-white px-4 py-2 rounded">
            下書き保存
          </button>
          <button onClick={() => save("published")} disabled={saving} className="text-sm bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded">
            {saving ? "保存中..." : "公開"}
          </button>
        </div>
      </div>

      {/* タイトル・設定 */}
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="タイトルを入力"
        className="w-full text-xl font-bold border-b-2 border-gray-200 focus:border-teal-400 outline-none pb-2 mb-3"
      />

      <div className="flex gap-4 mb-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">公開日時（予約投稿）</label>
          <input
            type="datetime-local"
            value={publishedAt}
            onChange={e => setPublishedAt(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* 2カラム：HTMLエディタ ＋ プレビュー */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 左：HTMLエディタ */}
        <div className="flex-1 flex flex-col">
          <div className="text-xs text-gray-500 mb-1 font-medium">HTML</div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="flex-1 border rounded p-3 text-sm font-mono resize-none focus:outline-none focus:border-teal-400"
            spellCheck={false}
          />
        </div>

        {/* 右：プレビュー */}
        <div className="flex-1 flex flex-col">
          <div className="text-xs text-gray-500 mb-1 font-medium">プレビュー</div>
          <div className="flex-1 border rounded p-4 overflow-y-auto bg-white">
            <style>{`
              .preview-content h1 { font-size: 2em; font-weight: bold; margin: 0.5em 0; }
              .preview-content h2 { font-size: 1.5em; font-weight: bold; margin: 0.5em 0; }
              .preview-content h3 { font-size: 1.2em; font-weight: bold; margin: 0.5em 0; }
              .preview-content p { margin: 0.4em 0; line-height: 1.7; }
              .preview-content ul { list-style-type: disc; padding-left: 1.5em; margin: 0.4em 0; }
              .preview-content ol { list-style-type: decimal; padding-left: 1.5em; margin: 0.4em 0; }
              .preview-content a { color: #0ea5e9; text-decoration: underline; }
              .preview-content strong { font-weight: bold; }
              .preview-content em { font-style: italic; }
              .preview-content blockquote { margin: 0.8rem 0; }
              .preview-content hr { margin: 1rem 0; }
            `}</style>
            <div
              className="preview-content"
              dangerouslySetInnerHTML={{ __html: content || "<p style='color:#aaa'>ここにプレビューが表示されます</p>" }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
