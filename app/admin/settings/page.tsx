"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮" },
}

export default function SettingsPage() {
  const [teacher, setTeacher] = useState<{ id: string; name: string } | null>(null)
  const [pricePerMin, setPricePerMin] = useState(100)
  const [minMinutes, setMinMinutes] = useState(1)
  const [status, setStatus] = useState("offline")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return
    const t = EMAIL_TO_TEACHER[user.email]
    if (!t) return
    setTeacher(t)

    const { data } = await supabase
      .from("teachers")
      .select("price_per_min, min_minutes, status")
      .eq("id", t.id)
      .single()

    if (data) {
      setPricePerMin(data.price_per_min ?? 100)
      setMinMinutes(data.min_minutes ?? 1)
      setStatus(data.status ?? "offline")
    }
    setLoading(false)
  }

  const save = async () => {
    if (!teacher) return
    setSaving(true)
    await supabase
      .from("teachers")
      .update({
        price_per_min: pricePerMin,
        min_minutes: minMinutes,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", teacher.id)
    setSaving(false)
    alert("保存しました！")
  }

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-4 max-w-lg">
      <h1 className="text-xl font-bold mb-6">設定</h1>

      {/* ステータス */}
      <div className="bg-white border rounded-lg p-5 mb-4">
        <h2 className="font-bold text-gray-700 mb-3">ステータス</h2>
        <div className="flex gap-3">
          {[
            { value: "online", label: "受付中", color: "bg-green-500" },
            { value: "busy", label: "通話中", color: "bg-yellow-500" },
            { value: "offline", label: "オフライン", color: "bg-gray-400" },
          ].map(s => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
                status === s.value
                  ? "border-teal-500 bg-teal-50 text-teal-700"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${s.color}`}></span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 料金設定 */}
      <div className="bg-white border rounded-lg p-5 mb-4">
        <h2 className="font-bold text-gray-700 mb-4">料金設定</h2>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-600 mb-2">1分あたりの料金（円）</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPricePerMin(p => Math.max(10, p - 10))}
              className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 text-lg font-bold"
            >－</button>
            <input
              type="number"
              value={pricePerMin}
              onChange={e => setPricePerMin(Number(e.target.value))}
              className="w-24 text-center text-2xl font-bold border rounded px-2 py-1"
              min={10}
            />
            <button
              onClick={() => setPricePerMin(p => p + 10)}
              className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 text-lg font-bold"
            >＋</button>
            <span className="text-gray-500">円 / 分</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">最低通話時間（分）</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMinMinutes(m => Math.max(1, m - 1))}
              className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 text-lg font-bold"
            >－</button>
            <input
              type="number"
              value={minMinutes}
              onChange={e => setMinMinutes(Number(e.target.value))}
              className="w-24 text-center text-2xl font-bold border rounded px-2 py-1"
              min={1}
            />
            <button
              onClick={() => setMinMinutes(m => m + 1)}
              className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 text-lg font-bold"
            >＋</button>
            <span className="text-gray-500">分〜課金開始</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">例：1分に設定すると1分を超えた時点から課金</p>
        </div>
      </div>

      {/* 料金シミュレーター */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
        <h2 className="font-bold text-teal-700 mb-2 text-sm">料金シミュレーター</h2>
        <div className="space-y-1 text-sm text-teal-800">
          {[5, 10, 20, 30].map(min => (
            <div key={min} className="flex justify-between">
              <span>{min}分通話</span>
              <span className="font-bold">
                {min <= minMinutes ? "0円（最低時間内）" : `${(min - minMinutes) * pricePerMin}円`}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-2 rounded text-sm"
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </div>
    </div>
  )
}