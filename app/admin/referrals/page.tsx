"use client"

import { supabase } from "@/lib/supabaseClient"
import { useEffect, useMemo, useState } from "react"

const INVITE_BONUS = 3000 // 紹介1件あたり、紹介者・被紹介者それぞれに付与する共通トラカ

type Person = { id: string; email: string | null; handle_name: string | null } | null

type ReferralRow = {
  id: string
  created_at: string
  bonus_amount: number
  referrer: Person
  referred: Person
}

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  })

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric", month: "2-digit", day: "2-digit",
  })

const personLabel = (p: Person) => {
  if (!p) return "（退会済み）"
  return p.handle_name ? `${p.handle_name}` : (p.email ?? "（不明）")
}

// 日本時間での「今月1日0時」
const startOfThisMonthJST = () => {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 9 * 60 * 60 * 1000)
}

export default function ReferralsPage() {
  const [rows, setRows] = useState<ReferralRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("friend_referrals")
        .select(`
          id, created_at, bonus_amount,
          referrer:users!friend_referrals_referrer_id_fkey ( id, email, handle_name ),
          referred:users!friend_referrals_referred_id_fkey ( id, email, handle_name )
        `)
        .order("created_at", { ascending: false })
        .limit(2000)

      if (error) {
        console.error(error)
        setError(error.message)
      } else {
        setRows((data ?? []) as unknown as ReferralRow[])
      }
      setLoading(false)
    }
    load()
  }, [])

  // 合計
  const summary = useMemo(() => {
    const monthStart = startOfThisMonthJST().getTime()
    const thisMonth = rows.filter(r => new Date(r.created_at).getTime() >= monthStart).length
    // 1件につき紹介者・被紹介者の2人分
    const totalGranted = rows.reduce((sum, r) => sum + (r.bonus_amount ?? INVITE_BONUS) * 2, 0)
    const referrerCount = new Set(rows.map(r => r.referrer?.id).filter(Boolean)).size
    return { total: rows.length, thisMonth, totalGranted, referrerCount }
  }, [rows])

  // 紹介した人ランキング
  const ranking = useMemo(() => {
    const monthStart = startOfThisMonthJST().getTime()
    const map = new Map<string, { person: Person; count: number; thisMonth: number; last: string }>()
    for (const r of rows) {
      const key = r.referrer?.id ?? "unknown"
      const cur = map.get(key) ?? { person: r.referrer, count: 0, thisMonth: 0, last: r.created_at }
      cur.count += 1
      if (new Date(r.created_at).getTime() >= monthStart) cur.thisMonth += 1
      if (r.created_at > cur.last) cur.last = r.created_at
      map.set(key, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [rows])

  if (loading) return <div className="p-4 text-gray-500">読み込み中...</div>
  if (error) return <div className="p-4 text-red-600">読み込みに失敗しました：{error}</div>

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">友達紹介</h1>
        <p className="text-sm text-gray-500 mt-1">
          紹介1件につき、紹介した人・紹介された人それぞれに共通トラカ {INVITE_BONUS.toLocaleString()} を無償付与しています。
        </p>
      </div>

      {/* 合計 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "紹介の総数", value: `${summary.total.toLocaleString()} 件` },
          { label: "今月の紹介", value: `${summary.thisMonth.toLocaleString()} 件` },
          { label: "紹介してくれた人", value: `${summary.referrerCount.toLocaleString()} 人` },
          { label: "付与したトラカ合計", value: `${summary.totalGranted.toLocaleString()} トラカ` },
        ].map(card => (
          <div key={card.label} className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className="text-xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* ランキング */}
      <section>
        <h2 className="text-lg font-bold mb-3">紹介した人ランキング</h2>
        {ranking.length === 0 ? (
          <p className="text-sm text-gray-500">まだ紹介はありません。</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2 w-12">#</th>
                  <th className="text-left px-4 py-2">紹介した人</th>
                  <th className="text-right px-4 py-2">総数</th>
                  <th className="text-right px-4 py-2">今月</th>
                  <th className="text-right px-4 py-2">もらったトラカ</th>
                  <th className="text-left px-4 py-2">最後の紹介</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr key={r.person?.id ?? `unknown-${i}`} className="border-t">
                    <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{personLabel(r.person)}</div>
                      {r.person?.email && r.person?.handle_name && (
                        <div className="text-xs text-gray-500">{r.person.email}</div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-bold">{r.count.toLocaleString()} 人</td>
                    <td className={`px-4 py-2 text-right ${r.thisMonth >= 5 ? "text-red-600 font-bold" : ""}`}>
                      {r.thisMonth.toLocaleString()} 人
                    </td>
                    <td className="px-4 py-2 text-right">{(r.count * INVITE_BONUS).toLocaleString()}</td>
                    <td className="px-4 py-2">{fmtDate(r.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-2">※ 今月5人以上紹介している人は赤字で表示しています（念のための目印です）。</p>
      </section>

      {/* 最近の紹介 */}
      <section>
        <h2 className="text-lg font-bold mb-3">最近の紹介</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">まだ紹介はありません。</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2">日時</th>
                  <th className="text-left px-4 py-2">紹介した人</th>
                  <th className="text-left px-4 py-2">紹介された人</th>
                  <th className="text-right px-4 py-2">付与</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map(r => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 whitespace-nowrap">{fmtDateTime(r.created_at)}</td>
                    <td className="px-4 py-2">
                      <div>{personLabel(r.referrer)}</div>
                      {r.referrer?.email && r.referrer?.handle_name && (
                        <div className="text-xs text-gray-500">{r.referrer.email}</div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div>{personLabel(r.referred)}</div>
                      {r.referred?.email && r.referred?.handle_name && (
                        <div className="text-xs text-gray-500">{r.referred.email}</div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      {(r.bonus_amount ?? INVITE_BONUS).toLocaleString()} × 2
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > 100 && (
          <p className="text-xs text-gray-500 mt-2">※ 最新100件を表示しています。</p>
        )}
      </section>
    </div>
  )
}
