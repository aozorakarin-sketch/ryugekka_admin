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
  // teacher_id -> 'teacher' | 'customer'（先生からブロック済み／お客さんからブロック済み）
  const [blockedTeachers, setBlockedTeachers] = useState<Record<string, 'teacher' | 'customer'>>({})
  const [blockingId, setBlockingId] = useState<string | null>(null)
  // 友達紹介：この人を紹介した人（紹介されて登録した場合のみ）／この人が紹介した人数
  const [referrer, setReferrer] = useState<{ id: string; name: string; email: string; at: string } | null>(null)
  const [referredCount, setReferredCount] = useState(0)

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

    // 友達紹介：この人が「紹介されて登録した」記録があれば、紹介元を取得
    const { data: refRow } = await supabase
      .from("friend_referrals")
      .select("referrer_id, created_at")
      .eq("referred_id", id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
    if (refRow) {
      const { data: refUser } = await supabase
        .from("users")
        .select("handle_name, email")
        .eq("id", refRow.referrer_id)
        .single()
      setReferrer({
        id: refRow.referrer_id,
        name: refUser?.handle_name ?? "-",
        email: refUser?.email ?? "",
        at: refRow.created_at,
      })
    } else {
      setReferrer(null)
    }

    // この人が紹介した人数
    const { count: refCount } = await supabase
      .from("friend_referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", id)
    setReferredCount(refCount ?? 0)

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

    // このお客さんに関するブロック行を取得
    const { data: blocks } = await supabase
      .from("teacher_customer_blocks")
      .select("teacher_id, blocked_by")
      .eq("user_id", id)
    const bMap: Record<string, 'teacher' | 'customer'> = {}
    for (const b of blocks ?? []) {
      bMap[b.teacher_id] = b.blocked_by
    }
    setBlockedTeachers(bMap)

    setLoading(false)
  }

  const handleBlock = async (teacherId: string, teacherName: string) => {
    const ok = window.confirm(
      `${teacherName}として、${handleName}さんをブロックします。\n\n` +
      `・ブロックは一切解除できません\n` +
      `・残りのトラカは返金対応（運営から振込先を確認します）\n\n` +
      `本当にブロックしますか？`
    )
    if (!ok) return

    setBlockingId(teacherId)
    const { error } = await supabase.from("teacher_customer_blocks").insert({
      teacher_id: teacherId,
      user_id: id,
      blocked_by: "teacher",
    })
    setBlockingId(null)

    if (error) {
      alert(`ブロックに失敗しました: ${error.message}`)
      return
    }
    setBlockedTeachers(prev => ({ ...prev, [teacherId]: "teacher" }))

    // 運営への通知（失敗してもブロック自体は成立済みなので、ここはベストエフォート）
    supabase.functions.invoke("notify-teacher-block", {
      body: { teacher_id: teacherId, user_id: id },
    }).catch(() => {})
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
        {referrer && (
          <p className="text-sm mt-2">
            <span className="bg-pink-100 text-pink-800 px-2 py-0.5 rounded-full text-xs font-medium">🎁 紹介元</span>{" "}
            <a href={`/admin/users/${referrer.id}`} className="font-medium text-blue-600 hover:underline">
              {referrer.name}
            </a>
            {referrer.email && <span className="text-gray-500">（{referrer.email}）</span>}
            <span className="text-gray-400"> ／ {formatDate(referrer.at)} 登録</span>
          </p>
        )}
        {referredCount > 0 && (
          <p className="text-sm mt-1 text-gray-600">
            友達紹介：{referredCount}人を紹介
          </p>
        )}
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
              <th className="text-center px-4 py-3 font-medium">ブロック</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  鑑定履歴がありません
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                const blockStatus = blockedTeachers[row.teacher_id]
                return (
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
                  <td className="px-4 py-3 text-center">
                    {blockStatus === 'teacher' ? (
                      <span className="text-xs text-gray-400">ブロック済み</span>
                    ) : blockStatus === 'customer' ? (
                      <span className="text-xs text-gray-400">お客様がブロック中</span>
                    ) : (
                      <button
                        onClick={() => handleBlock(row.teacher_id, row.teacher_name)}
                        disabled={blockingId === row.teacher_id}
                        className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded disabled:opacity-50"
                      >
                        {blockingId === row.teacher_id ? '処理中...' : 'ブロック'}
                      </button>
                    )}
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
