"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

const TEACHER_MAP: Record<string, string> = {
  "e482fff7-25db-483d-8d68-46a893403be3": "宝明里茉",
  "3ba85bb9-9065-461b-b76b-cc488d4c0c3b": "雲龍蓮",
  "17cf0ca1-7526-466e-a644-9d3efefa4091": "椎名架月",
  "cd2c4101-2e24-4ae2-8d6a-507a943904af": "青空花林",
}

const TEACHER_ID_TO_SLUG: Record<string, string> = {
  "cd2c4101-2e24-4ae2-8d6a-507a943904af": "hana",
  "3ba85bb9-9065-461b-b76b-cc488d4c0c3b": "ryu",
  "17cf0ca1-7526-466e-a644-9d3efefa4091": "tsuki",
}

type TeacherRow = {
  teacher_id: string
  teacher_name: string
  consultation_count: number
  last_consultation_at: string | null
  slug: string | null
}

export default function UserTeacherListPage() {
  const { id } = useParams() as { id: string }
  const [handleName, setHandleName] = useState("")
  const [rows, setRows] = useState<TeacherRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    const { data: userData } = await supabase
      .from("users")
      .select("handle_name")
      .eq("id", id)
      .single()
    setHandleName(userData?.handle_name ?? "-")

    const { data: cons } = await supabase
      .from("consultations")
      .select("teacher_id, started_at")
      .eq("user_id", id)
      .order("started_at", { ascending: false })

    const map: Record<string, { count: number; last: string | null }> = {}
    for (const c of cons ?? []) {
      if (!map[c.teacher_id]) {
        map[c.teacher_id] = { count: 0, last: null }
      }
      map[c.teacher_id].count += 1
      if (!map[c.teacher_id].last) {
        map[c.teacher_id].last = c.started_at
      }
    }

    const result: TeacherRow[] = Object.entries(map).map(([teacherId, { count, last }]) => ({
      teacher_id: teacherId,
      teacher_name: TEACHER_MAP[teacherId] ?? "-",
      consultation_count: count,
      last_consultation_at: last,
      slug: TEACHER_ID_TO_SLUG[teacherId] ?? null,
    }))

    result.sort((a, b) => {
      if (!a.last_consultation_at) return 1
      if (!b.last_consultation_at) return -1
      return b.last_consultation_at.localeCompare(a.last_consultation_at)
    })

    setRows(result)
    setLoading(false)
  }

  const formatDate = (s: string | null) => {
    if (!s) return "-"
    const d = new Date(s)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  }

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-6">
      <div className="mb-6">
        <a href="/admin/users" className="text-xs text-gray-400 hover:underline">← ユーザー一覧に戻る</a>
        <h1 className="text-2xl font-bold mt-1">{handleName}</h1>
        <p className="text-sm text-gray-500 mt-1">先生別の鑑定履歴</p>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">先生</th>
              <th className="text-center px-4 py-3 font-medium">鑑定回数</th>
              <th className="text-left px-4 py-3 font-medium">最終鑑定日</th>
              <th className="text-center px-4 py-3 font-medium">鑑定履歴</th>
              <th className="text-center px-4 py-3 font-medium">ユーザー詳細</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  鑑定履歴がありません
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.teacher_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-3 font-medium">{row.teacher_name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                      {row.consultation_count}回
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(row.last_consultation_at)}</td>
                  <td className="px-4 py-3 text-center">
                    {row.slug ? (
                      <a
                        href={`/admin/consultations?userId=${id}&teacherSlug=${row.slug}`}
                        className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                      >
                        一覧
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.slug ? (
                      <a
                        href={`/admin/users/${id}/${row.slug}`}
                        className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded"
                      >
                        詳細
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
