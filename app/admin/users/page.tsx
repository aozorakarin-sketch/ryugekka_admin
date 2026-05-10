"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Input } from "@/components/ui/input"
import { Search, ChevronDown, ChevronRight } from "lucide-react"

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

type TeacherCount = {
  teacher_id: string
  teacher_name: string
  count: number
  slug: string | null
}

type User = {
  id: string
  handle_name: string
  consultation_count: number
  last_consultation_at: string | null
  follow_mail_count: number
  teacher_counts: TeacherCount[]
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    let allUsers: any[] = []
    let from = 0
    while (true) {
      const { data, error } = await supabase
        .from("users")
        .select(`id, handle_name, created_at, follow_mails(count)`)
        .neq("data_source", "dummy")
        .range(from, from + 999)
      if (error || !data || data.length === 0) break
      allUsers = [...allUsers, ...data]
      if (data.length < 1000) break
      from += 1000
    }

    // 全鑑定履歴を取得
    let allCons: any[] = []
    from = 0
    while (true) {
      const { data, error } = await supabase
        .from("consultations")
        .select("user_id, teacher_id, started_at")
        .range(from, from + 999)
      if (error || !data || data.length === 0) break
      allCons = [...allCons, ...data]
      if (data.length < 1000) break
      from += 1000
    }

    // user_idごとに先生別集計
    const consMap: Record<string, { total: number; last: string | null; teachers: Record<string, number> }> = {}
    for (const c of allCons) {
      if (!consMap[c.user_id]) {
        consMap[c.user_id] = { total: 0, last: null, teachers: {} }
      }
      consMap[c.user_id].total += 1
      consMap[c.user_id].teachers[c.teacher_id] = (consMap[c.user_id].teachers[c.teacher_id] ?? 0) + 1
      if (!consMap[c.user_id].last || c.started_at > consMap[c.user_id].last!) {
        consMap[c.user_id].last = c.started_at
      }
    }

    const formatted: User[] = allUsers.map((u: any) => {
      const cm = consMap[u.id]
      const teacherCounts: TeacherCount[] = Object.entries(cm?.teachers ?? {}).map(([tid, count]) => ({
        teacher_id: tid,
        teacher_name: TEACHER_MAP[tid] ?? "-",
        count: count as number,
        slug: TEACHER_ID_TO_SLUG[tid] ?? null,
      })).sort((a, b) => b.count - a.count)

      return {
        id: u.id,
        handle_name: u.handle_name,
        consultation_count: cm?.total ?? 0,
        last_consultation_at: cm?.last ?? null,
        follow_mail_count: u.follow_mails?.[0]?.count ?? 0,
        teacher_counts: teacherCounts,
      }
    })

    formatted.sort((a, b) => {
      if (!a.last_consultation_at) return 1
      if (!b.last_consultation_at) return -1
      return b.last_consultation_at.localeCompare(a.last_consultation_at)
    })

    setUsers(formatted)
    setLoading(false)
  }

  const toggleExpand = (userId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const filtered = users.filter(u => u.handle_name?.includes(search))

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">ユーザー一覧（{users.length}人）</h1>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder="名前で検索..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
            {filtered.map((user, i) => (
              <>
                {/* メイン行 */}
                <tr
                  key={user.id}
                  className={`cursor-pointer hover:bg-blue-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                  onClick={() => toggleExpand(user.id)}
                >
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-1">
                      {expandedIds.has(user.id)
                        ? <ChevronDown className="h-4 w-4 text-gray-400" />
                        : <ChevronRight className="h-4 w-4 text-gray-400" />
                      }
                      <span className="text-blue-600">{user.handle_name}</span>
                    </div>
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

                {/* 展開行（先生別） */}
                {expandedIds.has(user.id) && user.teacher_counts.map(tc => (
                  <tr key={`${user.id}-${tc.teacher_id}`} className="bg-blue-50 border-t border-blue-100">
                    <td className="px-4 py-2 pl-10 text-gray-600">
                      {tc.slug ? (
                        <a
                          href={`/admin/users/${user.id}/${tc.slug}`}
                          className="hover:underline text-blue-500"
                          onClick={e => e.stopPropagation()}
                        >
                          {tc.teacher_name}
                        </a>
                      ) : (
                        <span className="text-gray-400">{tc.teacher_name}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                        {tc.count}回
                      </span>
                    </td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
