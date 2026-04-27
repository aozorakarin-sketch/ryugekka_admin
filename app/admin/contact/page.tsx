"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type ContactMessage = {
  id: string
  name: string | null
  email: string | null
  category: string | null
  message: string
  created_at: string
}

export default function ContactMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ContactMessage | null>(null)
  const [filterCategory, setFilterCategory] = useState('')

  useEffect(() => { fetchMessages() }, [])

  const fetchMessages = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("contact_messages")
      .select("id, name, email, category, message, created_at")
      .order("created_at", { ascending: false })
    setMessages(data ?? [])
    setLoading(false)
  }

  const deleteMessage = async (id: string) => {
    if (!confirm("削除しますか？")) return
    await supabase.from("contact_messages").delete().eq("id", id)
    setSelected(null)
    fetchMessages()
  }

  const formatDate = (s: string) => {
    const d = new Date(s)
    return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`
  }

  const categories = Array.from(new Set(messages.map(m => m.category).filter(Boolean))) as string[]
  const filtered = filterCategory ? messages.filter(m => m.category === filterCategory) : messages

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">
          お問い合わせ受信
          <span className="text-gray-400 text-base font-normal ml-2">{messages.length}件</span>
        </h1>
        <button onClick={fetchMessages} className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded">
          🔄 更新
        </button>
      </div>

      {/* カテゴリフィルター */}
      {!selected && categories.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFilterCategory('')}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${!filterCategory ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-gray-600 border-gray-300 hover:border-teal-300'}`}
          >
            すべて ({messages.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${filterCategory === cat ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-gray-600 border-gray-300 hover:border-teal-300'}`}
            >
              {cat} ({messages.filter(m => m.category === cat).length})
            </button>
          ))}
        </div>
      )}

      {/* 一覧 */}
      {!selected && (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="text-gray-400 text-sm p-6 text-center">お問い合わせはまだありません</p>
          )}
          {filtered.map(msg => (
            <div
              key={msg.id}
              onClick={() => setSelected(msg)}
              className="bg-white border rounded-lg px-4 py-3 cursor-pointer hover:border-teal-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {msg.category && (
                      <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full">
                        {msg.category}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{formatDate(msg.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{msg.name ?? '名前なし'}</span>
                    <span className="text-xs text-gray-400">{msg.email}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{msg.message}</p>
                </div>
                <span className="text-gray-300 text-lg shrink-0">›</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 詳細 */}
      {selected && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setSelected(null)} className="text-sm text-gray-500 hover:text-gray-700">
              ← 一覧へ
            </button>
            <button
              onClick={() => deleteMessage(selected.id)}
              className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
              削除
            </button>
          </div>

          {/* 送信者情報 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">お名前</p>
                <p className="font-medium text-gray-800">{selected.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">メールアドレス</p>
                <p className="font-medium text-gray-800">
                  <a href={`mailto:${selected.email}`} className="text-teal-600 hover:underline">
                    {selected.email ?? '—'}
                  </a>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">カテゴリ</p>
                <p className="font-medium text-gray-800">{selected.category ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">受信日時</p>
                <p className="font-medium text-gray-800">{formatDate(selected.created_at)}</p>
              </div>
            </div>
          </div>

          {/* お問い合わせ内容 */}
          <div>
            <p className="text-xs text-gray-400 mb-2">お問い合わせ内容</p>
            <div className="bg-white border rounded-lg p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              {selected.message}
            </div>
          </div>

          {/* 返信ボタン */}
          {selected.email && (
            <div className="mt-4">
              <a
                href={`mailto:${selected.email}?subject=【龍月花】お問い合わせへのご返信`}
                className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white text-sm px-4 py-2 rounded"
              >
                ✉️ メールで返信する
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
