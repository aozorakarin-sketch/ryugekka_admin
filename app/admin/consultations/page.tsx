"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Consultation = {
  id: string
  started_at: string
  ended_at: string
  user_name: string
  teacher_name: string
  teacher_id: string
  user_id: string
  consultation_count: number
  follow_mail_count: number
  call_duration: number
  price: number
  recording_url: string | null
}

const TEACHERS = [
  { id: "e482fff7-25db-483d-8d68-46a893403be3", name: "宝明里茉" },
  { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮" },
  { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月" },
  { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林" },
]

const TEACHER_MAP: Record<string, string> = {
  "e482fff7-25db-483d-8d68-46a893403be3": "宝明里茉",
  "3ba85bb9-9065-461b-b76b-cc488d4c0c3b": "雲龍蓮",
  "17cf0ca1-7526-466e-a644-9d3efefa4091": "椎名架月",
  "cd2c4101-2e24-4ae2-8d6a-507a943904af": "青空花林",
}

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [teacherFilter, setTeacherFilter] = useState("")
  const [monthFilter, setMonthFilter] = useState("")

  useEffect(() => {
    fetchConsultations()
  }, [])

  const fetchConsultations = async () => {
    let allData: any[] = []
    let from = 0

    while (true) {
      const { data, error } = await supabase
        .from("consultations")
        .select(`
          id,
          started_at,
          ended_at,
          user_name,
          teacher_name,
          teacher_id,
          user_id,
          call_duration,
          price,
          call_recordings(recording_url)
        `)
        .order("started_at", { ascending: false })
        .range(from, from + 999)

      if (error || !data || data.length === 0) break
      allData = [...allData, ...data]
      if (data.length < 1000) break
      from += 1000
    }

    const userConsultationCount: Record<string, number> = {}
    allData.forEach((c) => {
      userConsultationCount[c.user_id] = (userConsultationCount[c.user_id] ?? 0) + 1
    })

    const formatted = allData.map((c: any) => ({
      id: c.id,
      started_at: c.started_at,
      ended_at: c.ended_at,
      user_name: c.user_name ?? "-",
      teacher_name: TEACHER_MAP[c.teacher_id] ?? c.teacher_name ?? "-",
      teacher_id: c.teacher_id,
      user_id: c.user_id,
      consultation_count: userConsultationCount[c.user_id] ?? 0,
      follow_mail_count: 0,
      call_duration: c.call_duration ?? 0,
      price: c.price ?? 0,
      recording_url: c.call_recordings?.[0]?.recording_url ?? null,
    }))

    setConsultations(formatted)
    setLoading(false)
  }

  const months = [...new Set(consultations.map(c =>
    c.started_at ? c.started_at.slice(0, 7) : null
  ).filter(Boolean))].sort().reverse()

  const filtered = consultations.filter(c => {
    if (teacherFilter && c.teacher_id !== teacherFilter) return false
    if (monthFilter && c.started_at?.slice(0, 7) !== monthFilter) return false
    return true
  })

  const formatDate = (s: string) => {
    if (!s) return "-"
    const d = new Date(s)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`
  }

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">鑑定履歴（{filtered.length}件）</h1>
      </div>

      <div className="flex gap-3 mb-4">
        <select
          className="border rounded px-3 py-1.5 text-sm"
          value={teacherFilter}
          onChange={(e) => setTeacherFilter(e.target.value)}
        >
          <option value="">先生：全員</option>
          {TEACHERS.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <select
          className="border rounded px-3 py-1.5 text-sm"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
        >
          <option value="">月：全期間</option>
          {months.map(m => (
            <option key={m} value={m!}>{m}</option>
          ))}
        </select>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-3 font-medium whitespace-nowrap">開始日時</th>
              <th className="text-left px-3 py-3 font-medium whitespace-nowrap">終了日時</th>
              <th className="text-left px-3 py-3 font-medium whitespace-nowrap">名前</th>
              <th className="text-left px-3 py-3 font-medium whitespace-nowrap">先生</th>
              <th className="text-center px-3 py-3 font-medium whitespace-nowrap">鑑定回数</th>
              <th className="text-center px-3 py-3 font-medium whitespace-nowrap">メール回数</th>
              <th className="text-center px-3 py-3 font-medium whitespace-nowrap">鑑定分数</th>
              <th className="text-center px-3 py-3 font-medium whitespace-nowrap">報酬</th>
              <th className="text-center px-3 py-3 font-medium whitespace-nowrap">音声</th>
              <th className="text-center px-3 py-3 font-medium whitespace-nowrap">鑑定メモ</th>
              <th className="text-center px-3 py-3 font-medium whitespace-nowrap">ユーザーレビュー</th>
              <th className="text-center px-3 py-3 font-medium whitespace-nowrap">返信状況</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={c.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(c.started_at)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(c.ended_at)}</td>
                <td className="px-3 py-2 font-medium whitespace-nowrap">
  {c.user_id ? <a href={`/admin/users/${c.user_id}`} className="text-blue-600 hover:underline">{c.user_name}</a> : <span>{c.user_name}</span>}
</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">{c.teacher_name}</td>
                <td className="px-3 py-2 text-center">
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                    {c.consultation_count}回
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-medium">
                    {c.follow_mail_count}回
                  </span>
                </td>
                <td className="px-3 py-2 text-center">{c.call_duration}分</td>
                <td className="px-3 py-2 text-center">{c.price.toLocaleString()}円</td>
                <td className="px-3 py-2 text-center">
                  {c.recording_url
                    ? <a href={c.recording_url} target="_blank" className="text-blue-600 hover:underline text-xs">再生</a>
                    : <span className="text-gray-400 text-xs">-</span>
                  }
                </td>
                <td className="px-3 py-2 text-center">
                  <button className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-2 py-0.5 rounded">入</button>
                </td>
                <td className="px-3 py-2 text-center text-gray-400 text-xs">-</td>
                <td className="px-3 py-2 text-center text-gray-400 text-xs">-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}