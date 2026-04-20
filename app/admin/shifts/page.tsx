"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮" },
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAYS = ["日", "月", "火", "水", "木", "金", "土"]

export default function ShiftsPage() {
  const [teacher, setTeacher] = useState<{ id: string; name: string } | null>(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [shifts, setShifts] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<"add" | "delete">("add")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [year, month])

  const fetchAll = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return
    const t = EMAIL_TO_TEACHER[user.email]
    if (!t) return
    setTeacher(t)

    const firstDay = `${year}-${String(month).padStart(2, "0")}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const lastDayStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`

    const { data } = await supabase
      .from("shifts")
      .select("shift_date, start_time")
      .eq("teacher_id", t.id)
      .eq("is_available", true)
      .gte("shift_date", firstDay)
      .lte("shift_date", lastDayStr)

    const set = new Set<string>()
    data?.forEach(s => {
      const hour = parseInt(s.start_time.split(":")[0])
      set.add(`${s.shift_date}_${hour}`)
    })
    setShifts(set)
    setLoading(false)
  }

  const getDaysInMonth = () => {
    const days = []
    const lastDay = new Date(year, month, 0).getDate()
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month - 1, d)
      days.push({ day: d, dayOfWeek: DAYS[date.getDay()] })
    }
    return days
  }

  const toggleCell = (dateStr: string, hour: number) => {
    const key = `${dateStr}_${hour}`
    const newShifts = new Set(shifts)
    if (mode === "add") {
      newShifts.add(key)
    } else {
      newShifts.delete(key)
    }
    setShifts(newShifts)
  }

  const saveShifts = async () => {
    if (!teacher) return
    setSaving(true)

    const firstDay = `${year}-${String(month).padStart(2, "0")}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const lastDayStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`

    // 既存データ削除
    await supabase.from("shifts")
      .delete()
      .eq("teacher_id", teacher.id)
      .gte("shift_date", firstDay)
      .lte("shift_date", lastDayStr)

    // 新規データ挿入
    const inserts = Array.from(shifts).map(key => {
      const [date, hour] = key.split("_")
      const h = String(parseInt(hour)).padStart(2, "0")
      const hNext = String(parseInt(hour) + 1).padStart(2, "0")
      return {
        teacher_id: teacher.id,
        shift_date: date,
        start_time: `${h}:00:00`,
        end_time: `${hNext}:00:00`,
        is_available: true,
        data_source: "minden",
      }
    })

    if (inserts.length > 0) {
      await supabase.from("shifts").insert(inserts)
    }

    setSaving(false)
    alert("シフトを登録しました！")
    fetchAll()
  }

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const days = getDaysInMonth()
  const totalSlots = shifts.size
  const totalMinutes = totalSlots * 60

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">シフト</h1>
          <button onClick={prevMonth} className="text-gray-500 hover:text-gray-700">‹</button>
          <span className="font-medium">{year}年{month}月</span>
          <button onClick={nextMonth} className="text-gray-500 hover:text-gray-700">›</button>
        </div>
        <span className="text-sm text-gray-600">{totalMinutes.toLocaleString()} 分（{totalSlots} コマ）</span>
      </div>

      <div className="flex gap-2 mb-3 justify-end">
        <button
          onClick={() => setMode("add")}
          className={`text-sm px-4 py-1.5 rounded ${mode === "add" ? "bg-teal-500 text-white" : "bg-gray-200 text-gray-600"}`}
        >
          シフト追加
        </button>
        <button
          onClick={() => setMode("delete")}
          className={`text-sm px-4 py-1.5 rounded ${mode === "delete" ? "bg-red-500 text-white" : "bg-gray-200 text-gray-600"}`}
        >
          シフト削除
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="border bg-gray-800 text-white px-1 py-1 w-16 sticky left-0 z-10"></th>
              {HOURS.map(h => (
                <th key={h} className="border bg-gray-800 text-white px-1 py-1 w-8 text-center">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(({ day, dayOfWeek }) => {
              const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
              const rowShiftCount = HOURS.filter(h => shifts.has(`${dateStr}_${h}`)).length
              return (
<tr key={day}>
  <td className={`border w-8 h-7 text-center cursor-pointer select-none sticky left-0 z-10 ${
    rowShiftCount > 0 ? "bg-orange-200" :
    dayOfWeek === "土" ? "bg-blue-50" :
    dayOfWeek === "日" ? "bg-red-50" :
    "bg-white"
  }`}>
    <span className={
      dayOfWeek === "土" ? "text-blue-400" :
      dayOfWeek === "日" ? "text-red-400" :
      "text-gray-700"
    }>
      {day}({dayOfWeek})
    </span>
    <span className="ml-1 text-gray-400">{rowShiftCount}</span>
  </td>
  {HOURS.map(h => {
    const key = `${dateStr}_${h}`
    const checked = shifts.has(key)
    return (
      <td
        key={h}
        onClick={() => toggleCell(dateStr, h)}
        className={`border w-8 h-7 text-center cursor-pointer select-none ${
          checked ? "bg-orange-300" :
          dayOfWeek === "土" ? "bg-blue-50 hover:bg-blue-100" :
          dayOfWeek === "日" ? "bg-red-50 hover:bg-red-100" :
          "bg-white hover:bg-orange-100"
        }`}
      >
        {checked && <span className="text-white text-xs">✓</span>}
      </td>
    )
  })}
</tr>              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={saveShifts}
          disabled={saving}
          className="text-sm bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded"
        >
          {saving ? "登録中..." : "シフト登録"}
        </button>
      </div>
    </div>
  )
}