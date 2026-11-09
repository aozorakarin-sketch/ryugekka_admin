"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

// 運営メールを送れる人（ログインメール）。ここに入っている3人（花林・架月・龍蓮）だけがこの画面を使える
// ※サーバー側（/api/admin/info-mail）でも同じ3人で確認する
const ADMIN_EMAILS = [
  "aozora.karin@gmail.com", // 青空花林
  "tomo517ko@gmail.com", // 椎名架月
  "bazvideo412@gmail.com", // 龍蓮
]

// 運営の送信元（※実際に使うアドレスに合わせて変えてください）
const INFO_NAME = "チョコ鑑 運営"
const INFO_FROM = "info@chocokan.com"

const MAX_SUBJECT = 100
const MAX_CONTENT = 5000

type Customer = { id: string; name: string; email: string }

export default function InfoMailPage() {
  const [allowed, setAllowed] = useState(false)
  const [checking, setChecking] = useState(true)

  const [query, setQuery] = useState("")
  const [candidates, setCandidates] = useState<Customer[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selected, setSelected] = useState<Customer | null>(null)

  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seqRef = useRef(0)

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setAllowed(!!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()))
      setChecking(false)
    }
    check()
  }, [])

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? ""
  }

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    setSelected(null)
    setResult(null)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!val.trim()) {
      setCandidates([])
      setShowDropdown(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      const seq = ++seqRef.current
      try {
        const token = await getToken()
        const res = await fetch(`/api/admin/info-mail?q=${encodeURIComponent(val.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (seq !== seqRef.current) return // 古い検索結果は捨てる
        setCandidates(data.users || [])
        setShowDropdown(true)
      } catch {
        if (seq !== seqRef.current) return
        setCandidates([])
      }
    }, 300)
  }

  const handleSelect = (c: Customer) => {
    setSelected(c)
    setQuery(c.name || c.email)
    setCandidates([])
    setShowDropdown(false)
    setResult(null)
  }

  const canSend = !!selected && !!subject.trim() && !!content.trim() && !sending

  const handleSend = async () => {
    if (!selected || !canSend) return
    const ok = window.confirm(
      `${selected.name} さん（${selected.email}）にメールを送信します。\n送信元：${INFO_NAME} <${INFO_FROM}>\n\nよろしいですか？`
    )
    if (!ok) return

    setSending(true)
    setResult(null)
    try {
      const token = await getToken()
      const res = await fetch("/api/admin/info-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: selected.id, subject, content }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setResult({ success: true, message: `✅ ${selected.name} さんに送信しました（メールボックスにも届いています）` })
        setSelected(null)
        setQuery("")
        setSubject("")
        setContent("")
      } else {
        setResult({ success: false, message: `❌ ${data.error ?? "送信に失敗しました"}` })
      }
    } catch {
      setResult({ success: false, message: "❌ 通信エラー" })
    } finally {
      setSending(false)
    }
  }

  if (checking) return <div className="p-6">読み込み中...</div>

  if (!allowed) {
    return (
      <div className="p-6 max-w-lg mx-auto text-sm text-gray-500">
        この画面は、運営の管理者アカウントでログインしているときだけ使えます。
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">📮 運営メール送信専用</h1>

      <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 text-sm">
        <p className="font-semibold">送信元：{INFO_NAME}</p>
        <p className="text-xs text-gray-500">{INFO_FROM}</p>
        <p className="text-xs text-gray-400 mt-2">
          お客さんのメールアドレスに届き、同じ内容がメールボックスにも「運営」として表示されます。お客さんはメールボックスから1回だけ返信できます。
        </p>
      </div>

      {/* お客さん検索 */}
      <div className="relative">
        <label className="block text-sm font-medium mb-1">お客さん検索</label>
        <input
          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="名前またはメールアドレス"
          value={query}
          onChange={handleQueryChange}
          onFocus={() => candidates.length > 0 && setShowDropdown(true)}
          autoComplete="off"
        />
        {showDropdown && candidates.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
            {candidates.map(c => (
              <li
                key={c.id}
                className="px-4 py-2 hover:bg-amber-50 cursor-pointer text-sm"
                onMouseDown={e => {
                  e.preventDefault()
                  handleSelect(c)
                }}
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-gray-400 ml-2 text-xs">{c.email}</span>
              </li>
            ))}
          </ul>
        )}
        {showDropdown && candidates.length === 0 && query.trim() && (
          <p className="text-xs text-gray-400 mt-1">該当するお客さんがいません</p>
        )}
      </div>

      {selected && (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <p className="font-semibold text-sm">✅ {selected.name}</p>
          <p className="text-xs text-gray-400">{selected.email}</p>
        </div>
      )}

      {/* 件名 */}
      <div>
        <label className="block text-sm font-medium mb-1">件名</label>
        <input
          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="例：【チョコ鑑】運営からのお知らせ"
          value={subject}
          maxLength={MAX_SUBJECT}
          onChange={e => setSubject(e.target.value)}
        />
      </div>

      {/* 本文 */}
      <div>
        <label className="block text-sm font-medium mb-1">本文</label>
        <textarea
          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
          rows={10}
          placeholder="お客さんへのメッセージを入力..."
          value={content}
          maxLength={MAX_CONTENT}
          onChange={e => setContent(e.target.value)}
        />
        <p className="text-xs text-gray-400 text-right">{content.length} / {MAX_CONTENT}</p>
      </div>

      {!selected && (subject || content) && (
        <p className="text-xs text-red-400 text-center">⚠️ お客さんを候補リストから選択してください</p>
      )}

      <button
        onClick={handleSend}
        disabled={!canSend}
        className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500
          disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
      >
        {sending ? "送信中..." : "📮 メールを送信する"}
      </button>

      {result && (
        <div
          className={`p-4 rounded-xl text-center font-medium text-sm
          ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}
        >
          {result.message}
        </div>
      )}
    </div>
  )
}
