"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
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

const STATUS_COLOR: Record<string, string> = {
  applied: "bg-blue-50 text-blue-700",
  reviewing: "bg-yellow-50 text-yellow-700",
  accepted: "bg-green-50 text-green-700",
  session_done: "bg-purple-50 text-purple-700",
  audio_delivered: "bg-pink-50 text-pink-700",
  posted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-gray-100 text-gray-500",
}

const TEACHER_LABEL: Record<string, string> = { ryu: "龍蓮", tsuki: "椎名架月", hana: "青空花林" }

type Campaign = {
  id: string
  title: string
  is_open: boolean
  free_minutes: number
  capacity: number | null
  start_at: string | null
  end_at: string | null
  note: string | null
}

type AppRow = {
  id: string
  display_name: string
  sns_types: string[]
  status: string
  preferred_teacher: string | null
  created_at: string
}

// 日本時間(JST)の日時 <-> <input type="datetime-local"> の変換
function toLocalInput(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16)
}
function fromLocalInput(v: string): string | null {
  if (!v) return null
  return `${v}:00+09:00`
}
function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(d)
}

export default function MonitorAdminPage() {
  const [loading, setLoading] = useState(true)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [apps, setApps] = useState<AppRow[]>([])
  const [filter, setFilter] = useState<string>("all")
  const [loadError, setLoadError] = useState("")

  // 募集設定フォーム
  const [title, setTitle] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [freeMinutes, setFreeMinutes] = useState("10")
  const [capacity, setCapacity] = useState("")
  const [startAt, setStartAt] = useState("")
  const [endAt, setEndAt] = useState("")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoadError("")
    const [cRes, aRes] = await Promise.all([
      supabase.from("monitor_campaigns").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("monitor_applications")
        .select("id, display_name, sns_types, status, preferred_teacher, created_at")
        .order("created_at", { ascending: false }),
    ])
    if (cRes.error || aRes.error) {
      setLoadError("読み込みに失敗しました。管理者アカウントでログインしているか確認してください。")
    }
    const c = (cRes.data as Campaign | null) ?? null
    setCampaign(c)
    if (c) {
      setTitle(c.title)
      setIsOpen(c.is_open)
      setFreeMinutes(String(c.free_minutes))
      setCapacity(c.capacity != null ? String(c.capacity) : "")
      setStartAt(toLocalInput(c.start_at))
      setEndAt(toLocalInput(c.end_at))
      setNote(c.note ?? "")
    }
    setApps((aRes.data as AppRow[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const saveCampaign = async () => {
    if (!campaign) return
    setSaveMsg(null)
    const minutes = parseInt(freeMinutes, 10)
    if (!title.trim()) return setSaveMsg({ ok: false, text: "タイトルを入力してください" })
    if (!Number.isFinite(minutes) || minutes < 1) return setSaveMsg({ ok: false, text: "無料鑑定の時間は1分以上にしてください" })
    const cap = capacity.trim() === "" ? null : parseInt(capacity, 10)
    if (cap !== null && (!Number.isFinite(cap) || cap < 1)) return setSaveMsg({ ok: false, text: "募集人数は1以上にするか、空にしてください" })

    setSaving(true)
    const { error } = await supabase.from("monitor_campaigns").update({
      title: title.trim(),
      is_open: isOpen,
      free_minutes: minutes,
      capacity: cap,
      start_at: fromLocalInput(startAt),
      end_at: fromLocalInput(endAt),
      note: note.trim() || null,
    }).eq("id", campaign.id)
    setSaving(false)
    setSaveMsg(error ? { ok: false, text: "保存に失敗しました" } : { ok: true, text: "保存しました" })
  }

  const counts: Record<string, number> = {}
  apps.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1 })
  const shown = filter === "all" ? apps : apps.filter(a => a.status === filter)

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">🍫 モニター応募管理</h1>

      {loadError && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{loadError}</p>}

      {/* 募集設定 */}
      <section className="bg-purple-50 rounded-xl p-5 border border-purple-100 space-y-4">
        <h2 className="font-bold">募集設定</h2>
        {!campaign ? (
          <p className="text-sm text-gray-500">募集設定がありません。</p>
        ) : (
          <>
            <label className="flex items-center gap-3 text-sm font-medium">
              <input type="checkbox" className="w-5 h-5" checked={isOpen} onChange={e => setIsOpen(e.target.checked)} />
              <span>募集中にする（オフのあいだ、/monitor に応募フォームは出ません）</span>
            </label>
            <div>
              <label className="block text-sm font-medium mb-1">タイトル</label>
              <input className="w-full border rounded-lg px-3 py-2 bg-white" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">無料鑑定の時間（分）</label>
                <input type="number" min={1} className="w-full border rounded-lg px-3 py-2 bg-white" value={freeMinutes} onChange={e => setFreeMinutes(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">募集人数（空なら表示しない）</label>
                <input type="number" min={1} className="w-full border rounded-lg px-3 py-2 bg-white" value={capacity} onChange={e => setCapacity(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">開始日時（日本時間・空なら制限なし）</label>
                <input type="datetime-local" className="w-full border rounded-lg px-3 py-2 bg-white" value={startAt} onChange={e => setStartAt(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">終了日時（日本時間・空なら制限なし）</label>
                <input type="datetime-local" className="w-full border rounded-lg px-3 py-2 bg-white" value={endAt} onChange={e => setEndAt(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">管理用メモ（公開されません）</label>
              <textarea rows={2} className="w-full border rounded-lg px-3 py-2 bg-white" value={note} onChange={e => setNote(e.target.value)} />
            </div>
            <button onClick={saveCampaign} disabled={saving}
              className="px-6 py-2 rounded-xl font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 disabled:opacity-40 hover:opacity-90 transition">
              {saving ? "保存中..." : "設定を保存"}
            </button>
            {saveMsg && (
              <p className={`text-sm ${saveMsg.ok ? "text-green-700" : "text-red-600"}`}>{saveMsg.ok ? "✅ " : "❌ "}{saveMsg.text}</p>
            )}
          </>
        )}
      </section>

      {/* 応募一覧 */}
      <section className="space-y-4">
        <h2 className="font-bold">応募一覧（{apps.length}件）</h2>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-full text-xs border ${filter === "all" ? "bg-purple-500 text-white border-purple-500" : "bg-white text-gray-600"}`}>
            すべて {apps.length}
          </button>
          {STATUS_ORDER.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-full text-xs border ${filter === s ? "bg-purple-500 text-white border-purple-500" : "bg-white text-gray-600"}`}>
              {STATUS_LABEL[s]} {counts[s] || 0}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="text-sm text-gray-400">該当する応募はありません。</p>
        ) : (
          <ul className="divide-y border rounded-xl bg-white">
            {shown.map(a => (
              <li key={a.id}>
                <Link href={`/admin/monitor/${a.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-purple-50">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{a.display_name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {a.sns_types.join("・")}
                      {a.preferred_teacher ? `　希望：${TEACHER_LABEL[a.preferred_teacher] ?? a.preferred_teacher}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400">{formatDateTime(a.created_at)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[a.status] ?? "bg-gray-100"}`}>
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
