"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

const STATUS_LABEL: Record<string, string> = {
  applied: "応募受付",
  reviewing: "選考中",
  accepted: "採用",
  session_done: "鑑定完了",
  audio_delivered: "音声提供済",
  posted: "投稿完了",
  rejected: "不採用",
}
const STATUS_ORDER = Object.keys(STATUS_LABEL)

const TEACHER_LABEL: Record<string, string> = { ryu: "龍蓮", tsuki: "椎名架月", hana: "青空花林" }

const CHANNEL_LABEL: Record<string, string> = { email: "メール", line: "LINE", dm: "SNSのDM", other: "その他" }

type App = {
  id: string
  display_name: string
  email: string
  sns_types: string[]
  sns_url: string
  preferred_teacher: string | null
  motive: string | null
  agreed_terms: boolean
  agreed_audio_publish: boolean
  agreed_pr_label: boolean
  agreed_at: string
  status: string
  post_url: string | null
  admin_memo: string | null
  created_at: string
}

type Log = {
  id: string
  channel: string
  subject: string | null
  body: string | null
  created_at: string
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(d)
}

export default function MonitorAdminDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [loading, setLoading] = useState(true)
  const [app, setApp] = useState<App | null>(null)
  const [logs, setLogs] = useState<Log[]>([])

  const [status, setStatus] = useState("applied")
  const [postUrl, setPostUrl] = useState("")
  const [memo, setMemo] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [channel, setChannel] = useState("email")
  const [logSubject, setLogSubject] = useState("")
  const [logBody, setLogBody] = useState("")
  const [logSaving, setLogSaving] = useState(false)
  const [logMsg, setLogMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    const [aRes, lRes] = await Promise.all([
      supabase.from("monitor_applications").select("*").eq("id", id).maybeSingle(),
      supabase.from("monitor_contact_logs").select("id, channel, subject, body, created_at")
        .eq("application_id", id).order("created_at", { ascending: false }),
    ])
    const a = (aRes.data as App | null) ?? null
    setApp(a)
    if (a) {
      setStatus(a.status)
      setPostUrl(a.post_url ?? "")
      setMemo(a.admin_memo ?? "")
    }
    setLogs((lRes.data as Log[]) ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!app) return
    setSaveMsg(null)
    const url = postUrl.trim()
    if (url && !/^https?:\/\//i.test(url)) {
      return setSaveMsg({ ok: false, text: "投稿動画のURLは「https://」から入力してください" })
    }
    setSaving(true)
    const { error } = await supabase.from("monitor_applications").update({
      status,
      post_url: url || null,
      admin_memo: memo.trim() || null,
    }).eq("id", app.id)
    setSaving(false)
    setSaveMsg(error ? { ok: false, text: "保存に失敗しました" } : { ok: true, text: "保存しました" })
  }

  const addLog = async () => {
    if (!app) return
    setLogMsg(null)
    if (!logSubject.trim() && !logBody.trim()) {
      return setLogMsg({ ok: false, text: "件名か内容のどちらかを入力してください" })
    }
    setLogSaving(true)
    const { error } = await supabase.from("monitor_contact_logs").insert({
      application_id: app.id,
      channel,
      subject: logSubject.trim() || null,
      body: logBody.trim() || null,
    })
    setLogSaving(false)
    if (error) {
      setLogMsg({ ok: false, text: "記録に失敗しました" })
      return
    }
    setLogSubject("")
    setLogBody("")
    setLogMsg({ ok: true, text: "記録しました" })
    load()
  }

  if (loading) return <div className="p-6">読み込み中...</div>

  if (!app) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <p className="text-sm text-gray-500">応募が見つかりません（管理者アカウントでログインしているか確認してください）。</p>
        <Link href="/admin/monitor" className="text-sm text-purple-600 underline">← 一覧へ戻る</Link>
      </div>
    )
  }

  const consent = (ok: boolean) => (ok ? "✅ 同意済み" : "❌ 未同意")

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Link href="/admin/monitor" className="text-sm text-purple-600 underline">← 応募一覧へ戻る</Link>
      <h1 className="text-2xl font-bold">{app.display_name} さん</h1>

      {/* 応募内容 */}
      <section className="bg-white rounded-xl border divide-y text-sm">
        {[
          ["応募日時", formatDateTime(app.created_at)],
          ["メールアドレス", app.email],
          ["SNSの種類", app.sns_types.join("・")],
          ["希望する占い師", app.preferred_teacher ? (TEACHER_LABEL[app.preferred_teacher] ?? app.preferred_teacher) : "おまかせ"],
        ].map(([k, v]) => (
          <div key={k} className="flex gap-4 px-4 py-3">
            <span className="w-32 shrink-0 text-gray-400">{k}</span>
            <span className="break-all">{v}</span>
          </div>
        ))}
        <div className="flex gap-4 px-4 py-3">
          <span className="w-32 shrink-0 text-gray-400">SNSアカウント</span>
          <a href={app.sns_url} target="_blank" rel="noopener noreferrer" className="text-purple-600 underline break-all">{app.sns_url}</a>
        </div>
        <div className="flex gap-4 px-4 py-3">
          <span className="w-32 shrink-0 text-gray-400">応募動機</span>
          <span className="whitespace-pre-wrap break-words">{app.motive || "（記入なし）"}</span>
        </div>
        <div className="px-4 py-3 space-y-1">
          <p className="text-gray-400">同意（{formatDateTime(app.agreed_at)}）</p>
          <p>利用規約・プライバシーポリシー：{consent(app.agreed_terms)}</p>
          <p>鑑定音声の提供・SNS公開：{consent(app.agreed_audio_publish)}</p>
          <p>PR表記つきの動画投稿：{consent(app.agreed_pr_label)}</p>
        </div>
      </section>

      {/* ステータス・投稿URL・メモ */}
      <section className="bg-purple-50 rounded-xl p-5 border border-purple-100 space-y-4">
        <h2 className="font-bold">管理</h2>
        <div>
          <label className="block text-sm font-medium mb-1">ステータス</label>
          <select className="w-full border rounded-lg px-3 py-2 bg-white" value={status} onChange={e => setStatus(e.target.value)}>
            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">投稿動画のURL</label>
          <input className="w-full border rounded-lg px-3 py-2 bg-white" placeholder="https://" value={postUrl} onChange={e => setPostUrl(e.target.value)} />
          {postUrl.trim() && /^https?:\/\//i.test(postUrl.trim()) && (
            <a href={postUrl.trim()} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 underline">動画を開く</a>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">管理者メモ（応募者には見えません）</label>
          <textarea rows={4} className="w-full border rounded-lg px-3 py-2 bg-white" value={memo} onChange={e => setMemo(e.target.value)} />
        </div>
        <button onClick={save} disabled={saving}
          className="px-6 py-2 rounded-xl font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 disabled:opacity-40 hover:opacity-90 transition">
          {saving ? "保存中..." : "保存する"}
        </button>
        {saveMsg && <p className={`text-sm ${saveMsg.ok ? "text-green-700" : "text-red-600"}`}>{saveMsg.ok ? "✅ " : "❌ "}{saveMsg.text}</p>}
      </section>

      {/* 連絡履歴 */}
      <section className="space-y-4">
        <h2 className="font-bold">連絡履歴</h2>
        <p className="text-xs text-gray-400">※ここは記録用です。実際のメールやDMは、別の場所で送ったあとに、内容をここへ記録してください。</p>

        <div className="bg-white rounded-xl border p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">連絡方法</label>
            <select className="w-full border rounded-lg px-3 py-2 bg-white" value={channel} onChange={e => setChannel(e.target.value)}>
              {Object.entries(CHANNEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <input className="w-full border rounded-lg px-3 py-2" placeholder="件名（任意）" value={logSubject} onChange={e => setLogSubject(e.target.value)} />
          <textarea rows={4} className="w-full border rounded-lg px-3 py-2" placeholder="連絡した内容" value={logBody} onChange={e => setLogBody(e.target.value)} />
          <button onClick={addLog} disabled={logSaving}
            className="px-5 py-2 rounded-xl font-bold text-white bg-purple-500 disabled:opacity-40 hover:opacity-90 transition">
            {logSaving ? "記録中..." : "連絡を記録する"}
          </button>
          {logMsg && <p className={`text-sm ${logMsg.ok ? "text-green-700" : "text-red-600"}`}>{logMsg.ok ? "✅ " : "❌ "}{logMsg.text}</p>}
        </div>

        {logs.length === 0 ? (
          <p className="text-sm text-gray-400">まだ連絡の記録はありません。</p>
        ) : (
          <ul className="space-y-3">
            {logs.map(l => (
              <li key={l.id} className="bg-white rounded-xl border p-4 text-sm">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{CHANNEL_LABEL[l.channel] ?? l.channel}</span>
                  <span>{formatDateTime(l.created_at)}</span>
                </div>
                {l.subject && <p className="font-medium">{l.subject}</p>}
                {l.body && <p className="whitespace-pre-wrap break-words text-gray-600">{l.body}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
