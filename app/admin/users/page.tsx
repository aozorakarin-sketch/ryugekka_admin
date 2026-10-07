"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

type Consultation = {
  ended_at: string | null
  teacher_id: string | null
}

type User = {
  id: string
  handle_name: string
  created_at: string
  consultations: Consultation[]
  follow_mail_count: number
}

type Teacher = {
  id: string
  name: string
}

// どの先生とも鑑定記録が結び付いていないユーザー用の選択肢
const OTHER = "__other__"

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [teacherId, setTeacherId] = useState("")

  useEffect(() => {
    fetchTeachers()
    fetchUsers()
  }, [])

  const fetchTeachers = async () => {
    const { data } = await supabase.from("teachers").select("*")
    const list: Teacher[] = (data ?? []).map((t: any) => ({
      id: t.id,
      name: t.name ?? t.display_name ?? t.handle_name ?? t.teacher_name ?? t.id,
    }))
    setTeachers(list)
  }

  const fetchUsers = async () => {
    let allData: any[] = []
    let from = 0

    while (true) {
      const { data, error } = await supabase
        .from("users")
        .select(`
          id,
          handle_name,
          created_at,
          consultations(ended_at, teacher_id),
          follow_mails(count)
        `)
        .neq("data_source", "dummy")
        .range(from, from + 999)

      if (error || !data || data.length === 0) break
      allData = [...allData, ...data]
      if (data.length < 1000) break
      from += 1000
    }

    const formatted: User[] = allData.map((u: any) => ({
      id: u.id,
      handle_name: u.handle_name,
      created_at: u.created_at,
      consultations: u.consultations ?? [],
      follow_mail_count: u.follow_mails?.[0]?.count ?? 0,
    }))

    setUsers(formatted)
    setLoading(false)
  }

  // 先生で絞り込んだときは、その先生との鑑定だけで回数・最終鑑定日を出す
  const teacherIdSet = new Set(teachers.map((t) => t.id))

  const rows = users
    .map((u) => {
      const cs =
        teacherId && teacherId !== OTHER
          ? u.consultations.filter((c) => c.teacher_id === teacherId)
          : u.consultations
      const dates = cs.map((c) => c.ended_at).filter(Boolean) as string[]
      const last = dates.sort().at(-1) ?? null
      return {
        id: u.id,
        handle_name: u.handle_name,
        consultation_count: cs.length,
        follow_mail_count: u.follow_mail_count,
        last_consultation_at: last,
        is_other: !u.consultations.some(
          (c) => c.teacher_id && teacherIdSet.has(c.teacher_id)
        ),
      }
    })
    .filter((r) =>
      teacherId === OTHER
        ? r.is_other
        : teacherId
        ? r.consultation_count > 0
        : true
    )
    .filter((r) => (r.handle_name ?? "").includes(search))
    .sort((a, b) => {
      if (!a.last_consultation_at) return 1
      if (!b.last_consultation_at) return -1
      return b.last_consultation_at.localeCompare(a.last_consultation_at)
    })

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          ユーザー一覧（{teacherId ? `${rows.length}人 / 全${users.length}人` : `${users.length}人`}）
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="名前で検索..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
        >
          <option value="">すべての先生</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
          <option value={OTHER}>その他</option>
        </select>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">名前</th>
              <th className="text-center px-4 py-3 font-medium">鑑定回数</th>
              <th className="text-center px-4 py-3 font-medium">メール回数</th>
              <th className="text-left px-4 py-3 font-medium">最終鑑定日</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((user, i) => (
              <tr key={user.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-4 py-3 font-medium">
                  <a href={`/admin/users/${user.id}`} className="hover:underline text-blue-600">
                    {user.handle_name}
                  </a>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                    {user.consultation_count}回
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-medium">
                    {user.follow_mail_count}回
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {user.last_consultation_at
                    ? new Date(user.last_consultation_at).toLocaleDateString("ja-JP")
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
