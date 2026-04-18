"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

type User = {
  id: string
  handle_name: string
  created_at: string
  consultation_count: number
  last_consultation_at: string | null
  follow_mail_count: number
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetchUsers()
  }, [])

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
          consultations(ended_at),
          follow_mails(count)
        `)
        .eq("data_source", "minden")
        .range(from, from + 999)

      if (error || !data || data.length === 0) break
      allData = [...allData, ...data]
      if (data.length < 1000) break
      from += 1000
    }

    const formatted = allData.map((u: any) => {
      const dates = u.consultations?.map((c: any) => c.ended_at).filter(Boolean) ?? []
      const last = dates.sort().at(-1) ?? null

      return {
        id: u.id,
        handle_name: u.handle_name,
        created_at: u.created_at,
        consultation_count: u.consultations?.length ?? 0,
        follow_mail_count: u.follow_mails?.[0]?.count ?? 0,
        last_consultation_at: last,
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

  const filtered = users.filter(u =>
    u.handle_name?.includes(search)
  )

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
              <th className="text-left px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user, i) => (
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
                <td className="px-4 py-3">
                  <a href={`/admin/users/${user.id}`} className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded">
                    詳細
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}