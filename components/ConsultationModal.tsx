"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"

type Consultation = {
  id: string
  started_at: string
  ended_at: string
  teacher_id: string
  call_duration: number
  price: number
  recording_url: string | null
  signed_url: string | null
}

type Props = {
  consultation: Consultation
  userName: string
  teacherName: string
  userId: string
  hasApiKey: boolean
  hasGeminiKey: boolean
  onClose: () => void
}

export default function ConsultationModal({ consultation, userName, teacherName, userId, hasApiKey, hasGeminiKey, onClose }: Props) {
  const [transcript, setTranscript] = useState<string>("")
  const [transcribing, setTranscribing] = useState(false)
  const [transcriptError, setTranscriptError] = useState<string | null>(null)
  const [uploadingText, setUploadingText] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [summarizeError, setSummarizeError] = useState<string | null>(null)
  const [summarizeDone, setSummarizeDone] = useState(false)

  // 既存の文字起こしを取得
  useEffect(() => {
    const fetchTranscript = async () => {
      const { data } = await supabase
        .from("call_recordings")
        .select("transcript")
        .eq("consultation_id", consultation.id)
        .maybeSingle()
      if (data?.transcript) setTranscript(data.transcript)
    }
    fetchTranscript()
  }, [consultation.id])

  const formatDate = (s: string) => {
    const d = new Date(s)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
  }

  // 自動文字起こし
  const handleAutoTranscribe = async () => {
    setTranscribing(true)
    setTranscriptError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/transcribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ consultation_id: consultation.id }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTranscript(data.transcript)
    } catch (err: any) {
      setTranscriptError(err.message)
    } finally {
      setTranscribing(false)
    }
  }

  // テキストをアップロード（貼り付け後に保存）
  const handleSaveTranscript = async () => {
    setUploadingText(true)
    try {
      const { data: rec } = await supabase
        .from("call_recordings")
        .select("id")
        .eq("consultation_id", consultation.id)
        .maybeSingle()
      if (rec) {
        await supabase
          .from("call_recordings")
          .update({ transcript, updated_at: new Date().toISOString() })
          .eq("id", rec.id)
      }
    } finally {
      setUploadingText(false)
    }
  }

  // 要約を作る
  const handleSummarize = async () => {
    setSummarizing(true)
    setSummarizeError(null)
    setSummarizeDone(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/summarize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            consultation_id: consultation.id,
            teacher_id: consultation.teacher_id,
            user_id: userId,
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSummarizeDone(true)
    } catch (err: any) {
      setSummarizeError(err.message)
    } finally {
      setSummarizing(false)
    }
  }

  // テキストをダウンロード
  const handleDownloadTranscript = () => {
    const d = new Date(consultation.started_at)
    const fileName = `${userName}_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}_transcript.txt`
    const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasTranscript = transcript.trim().length > 0

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-xl">
          <div>
            <div className="font-bold text-gray-800">{userName}</div>
            <div className="text-xs text-gray-500">
              {formatDate(consultation.started_at)} / {teacherName} / {consultation.call_duration}分
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200"
          >✕</button>
        </div>

        <div className="p-4 space-y-4">

          {/* 音声プレイヤー */}
          {consultation.signed_url && (
            <div className="bg-gray-50 rounded-lg p-3 border">
              <div className="text-xs font-medium text-gray-500 mb-2">🎵 音声</div>
              <audio
                src={consultation.signed_url}
                controls
                className="w-full"
              />
            </div>
          )}

          {/* 文字起こし */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-500">📝 文字起こし</div>
              <div className="flex gap-2">
                {/* 自動文字起こし */}
                <button
                  onClick={handleAutoTranscribe}
                  disabled={!hasApiKey || transcribing}
                  className={`text-xs px-3 py-1 rounded font-medium transition-colors ${
                    hasApiKey
                      ? "bg-teal-500 hover:bg-teal-600 text-white"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                  title={!hasApiKey ? "OpenAI APIキーが設定されていません" : ""}
                >
                  {transcribing ? "⌛ 処理中..." : "🤖 自動文字起こし"}
                </button>

                {/* テキストをダウンロード */}
                {hasTranscript && (
                  <button
                    onClick={handleDownloadTranscript}
                    className="text-xs px-3 py-1 rounded font-medium bg-gray-200 hover:bg-gray-300 text-gray-700"
                  >⬇ DL</button>
                )}
              </div>
            </div>

            {transcriptError && (
              <div className="text-xs text-red-500 mb-2 bg-red-50 p-2 rounded">{transcriptError}</div>
            )}

            <textarea
              className="w-full border rounded p-2 text-sm resize-y min-h-32 focus:outline-none focus:border-teal-400"
              placeholder="ここにテキストを貼り付けるか、自動文字起こしを実行してください"
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
            />

            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-400">{transcript.length}文字</span>
              <button
                onClick={handleSaveTranscript}
                disabled={!hasTranscript || uploadingText}
                className={`text-xs px-3 py-1 rounded font-medium ${
                  hasTranscript
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                {uploadingText ? "保存中..." : "💾 テキストを保存"}
              </button>
            </div>
          </div>

          {/* 要約・アフターメッセージ */}
          {summarizeError && (
            <div className="text-xs text-red-500 bg-red-50 p-2 rounded">{summarizeError}</div>
          )}
          {summarizeDone && (
            <div className="text-xs text-green-600 bg-green-50 p-2 rounded">✅ 要約をメモに追記しました！</div>
          )}
          <div className="flex gap-2">
            <button
              disabled={!hasTranscript || !hasGeminiKey || summarizing}
              onClick={handleSummarize}
              title={!hasGeminiKey ? "Gemini APIキーが設定されていません" : ""}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                hasTranscript && hasGeminiKey
                  ? "bg-purple-500 hover:bg-purple-600 text-white"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {summarizing ? "⌛ 生成中..." : "📋 要約を作る"}
            </button>
            <button
              disabled={!hasTranscript}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                hasTranscript
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              ✉️ アフターメッセージを作る
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
