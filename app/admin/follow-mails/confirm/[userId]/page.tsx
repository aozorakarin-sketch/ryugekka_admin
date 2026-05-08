"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function FollowMailConfirmPage() {
  const { userId } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const draftId = searchParams.get("draftId")

  const [handleName, setHandleName] = useState("")
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchMailData()
  }, [draftId])

  const fetchMailData = async () => {
    if (!draftId) return

    const { data: mailData } = await supabase
      .from("follow_mails")
      .select("subject, content, user_id")
      .eq("id", draftId)
      .single()

    if (!mailData) return

    setSubject(mailData.subject ?? "")
    setContent(mailData.content ?? "")

    const { data: userData } = await supabase
      .from("users")
      .select("handle_name")
      .eq("id", mailData.user_id)
      .single()

    setHandleName(userData?.handle_name ?? "-")
    setLoading(false)
  }

  const handleSend = async () => {
    if (!draftId) return
    setSending(true)
    setError("")

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-follow-mail`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ follow_mail_id: draftId }),
        }
      )

      const result = await res.json()
      if (!res.ok || result.error) {
        setError(result.error ?? "送信に失敗しました")
        setSending(false)
        return
      }

      // 送信成功 → ユーザー詳細へ
      router.push(`/admin/users/${userId}`)
    } catch (e: any) {
      setError(e.message ?? "送信に失敗しました")
      setSending(false)
    }
  }

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-4">フォローメール確認</h1>

      <div className="border rounded-lg p-4 bg-white space-y-4">
        <div className="text-sm text-gray-600">
          送信先：<span className="font-medium text-gray-900">{handleName}</span>
        </div>

        <div>
          <label className="text-xs text-gray-500">件名</label>
          <div className="w-full border rounded px-2 py-2 mt-1 text-sm bg-gray-50 text-gray-700">
            {subject}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500">本文</label>
          <div
            className="w-full border rounded px-2 py-2 mt-1 text-sm bg-gray-50 text-gray-700 whitespace-pre-wrap"
            style={{ minHeight: "400px" }}
          >
            {content}
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex justify-between">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:underline"
          >
            ← 戻る
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="text-sm bg-teal-500 hover:bg-teal-600 text-white px-6 py-1.5 rounded disabled:opacity-50"
          >
            {sending ? "送信中..." : "送信する"}
          </button>
        </div>
      </div>
    </div>
  )
}
