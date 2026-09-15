"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabaseClient"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮" },
}

interface MonthlyPerf {
  revenue_jpy: number
  shop_revenue_jpy: number
  combined_revenue_jpy: number
  consultation_count: number
  total_minutes: number
  avg_minutes: number
  waiting_minutes: number
  shift_koma_count: number
  occupancy_rate: number
  shift_occupancy_rate: number
  new_user_count: number
  repeat_user_count: number
  total_user_count: number
}

interface HourlyPerf {
  hour: number
  waiting_minutes: number
  consultation_count: number
  total_minutes: number
  avg_minutes: number
  shift_slot_count: number
  shift_occupancy_rate: number
  occupancy_rate: number
}

interface TrendRow extends MonthlyPerf {
  month: string
}

interface DailyRevenue {
  day: number
  revenue_jpy: number
  shop_revenue_jpy: number
  combined_revenue_jpy: number
}

function Card({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-lg p-4 text-white ${color}`}>
      <div className="text-xs opacity-90">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs opacity-80 mt-1">{sub}</div>}
    </div>
  )
}

export default function PerformancePage() {
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [teacherName, setTeacherName] = useState<string | null>(null)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const [monthly, setMonthly] = useState<MonthlyPerf | null>(null)
  const [hourly, setHourly] = useState<HourlyPerf[]>([])
  const [trend, setTrend] = useState<TrendRow[]>([])
  const [daily, setDaily] = useState<DailyRevenue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email && EMAIL_TO_TEACHER[user.email]) {
        setTeacherId(EMAIL_TO_TEACHER[user.email].id)
        setTeacherName(EMAIL_TO_TEACHER[user.email].name)
      } else {
        setLoading(false)
      }
    })
  }, [])

  const load = useCallback(async () => {
    if (!teacherId) return
    setLoading(true)
    const [{ data: m }, { data: h }, { data: t }, { data: d }] = await Promise.all([
      supabase.rpc("get_monthly_performance", { p_teacher_id: teacherId, p_year: year, p_month: month }).single(),
      supabase.rpc("get_hourly_performance", { p_teacher_id: teacherId, p_year: year, p_month: month }),
      supabase.rpc("get_performance_trend", { p_teacher_id: teacherId, p_months: 3 }),
      supabase.rpc("get_daily_revenue", { p_teacher_id: teacherId, p_year: year, p_month: month }),
    ])
    setMonthly((m as MonthlyPerf) ?? null)
    setHourly((h as HourlyPerf[]) ?? [])
    setTrend((t as TrendRow[]) ?? [])
    setDaily((d as DailyRevenue[]) ?? [])
    setLoading(false)
  }, [teacherId, year, month])

  useEffect(() => { load() }, [load])

  const goPrevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) } else { setMonth(m => m - 1) }
  }
  const goNextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) } else { setMonth(m => m + 1) }
  }

  const yen = (n: number) => `${n.toLocaleString()}円`
  const monthLabel = (m: string) => {
    const [, mm] = m.split("-")
    return `${parseInt(mm, 10)}月`
  }

  if (!teacherId && !loading) {
    return <div className="p-6 text-sm text-gray-500">この画面は先生アカウントでログインしている場合のみ表示されます。</div>
  }

  const maxDailyRevenue = Math.max(1, ...daily.map(d => d.combined_revenue_jpy))

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">成果確認</h1>
        <div className="flex items-center gap-3">
          <button onClick={goPrevMonth} className="text-gray-500 hover:text-gray-700">‹</button>
          <span className="font-medium">{year}年{month}月</span>
          <button onClick={goNextMonth} className="text-gray-500 hover:text-gray-700">›</button>
        </div>
      </div>

      {teacherName && <p className="text-sm text-gray-500 mb-4">{teacherName}先生</p>}

      {loading && <p className="text-sm text-gray-400">集計中...</p>}

      {!loading && monthly && (
        <>
          {/* サマリーカード */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card label="トラカ売上" value={yen(monthly.revenue_jpy)} color="bg-pink-500" />
            <Card label="ショップ売上" value={yen(monthly.shop_revenue_jpy)} color="bg-orange-500" />
            <Card label="総売上" value={yen(monthly.combined_revenue_jpy)} color="bg-emerald-600" />
            <Card label="鑑定回数" value={`${monthly.consultation_count.toLocaleString()}回`} color="bg-teal-600" />
            <Card label="鑑定分数" value={`${monthly.total_minutes.toLocaleString()}分`} color="bg-red-500" />
            <Card label="平均分数" value={`${monthly.avg_minutes.toLocaleString()}分`} color="bg-purple-600" />
            <Card
              label="待機分数"
              value={`${monthly.waiting_minutes.toLocaleString()}分`}
              sub={`（${monthly.shift_koma_count.toLocaleString()}コマ）`}
              color="bg-blue-500"
            />
            <Card label="時間占有率" value={`${monthly.occupancy_rate}%`} color="bg-orange-400" />
            <Card label="シフト占有率" value={`${monthly.shift_occupancy_rate}%`} color="bg-yellow-500" />
            <Card
              label="ユーザー数"
              value={`${monthly.total_user_count.toLocaleString()}人`}
              sub={`（新規${monthly.new_user_count} / リピート${monthly.repeat_user_count}）`}
              color="bg-pink-600"
            />
          </div>

          {/* 時間帯毎テーブル */}
          <h2 className="text-lg font-bold mt-8 mb-2">時間帯毎</h2>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr className="bg-slate-600 text-white">
                  <th className="p-2 text-left sticky left-0 bg-slate-600">時間</th>
                  {hourly.map(h => <th key={h.hour} className="p-2 text-center min-w-[40px]">{h.hour}</th>)}
                </tr>
              </thead>
              <tbody className="bg-slate-500 text-white">
                <tr className="border-t border-slate-400">
                  <td className="p-2 sticky left-0 bg-slate-500">待機時間</td>
                  {hourly.map(h => <td key={h.hour} className="p-2 text-center">{h.waiting_minutes}</td>)}
                </tr>
                <tr className="border-t border-slate-400">
                  <td className="p-2 sticky left-0 bg-slate-500">鑑定件数</td>
                  {hourly.map(h => <td key={h.hour} className="p-2 text-center">{h.consultation_count}</td>)}
                </tr>
                <tr className="border-t border-slate-400 bg-slate-400">
                  <td className="p-2 sticky left-0 bg-slate-400">鑑定分数</td>
                  {hourly.map(h => <td key={h.hour} className="p-2 text-center">{h.total_minutes}</td>)}
                </tr>
                <tr className="border-t border-slate-400">
                  <td className="p-2 sticky left-0 bg-slate-500">平均分数</td>
                  {hourly.map(h => <td key={h.hour} className="p-2 text-center">{h.avg_minutes}</td>)}
                </tr>
                <tr className="border-t border-slate-400">
                  <td className="p-2 sticky left-0 bg-slate-500">シフト占有率</td>
                  {hourly.map(h => <td key={h.hour} className="p-2 text-center">{h.shift_occupancy_rate}%</td>)}
                </tr>
                <tr className="border-t border-slate-400">
                  <td className="p-2 sticky left-0 bg-slate-500">占有率</td>
                  {hourly.map(h => <td key={h.hour} className="p-2 text-center">{h.occupancy_rate}%</td>)}
                </tr>
              </tbody>
            </table>
          </div>

          {/* 直近3ヶ月分 */}
          <h2 className="text-lg font-bold mt-8 mb-2">直近3ヶ月分</h2>
          <div className="overflow-x-auto">
            <table className="text-sm border-collapse w-full">
              <thead>
                <tr className="border-b-2 border-gray-300 text-right">
                  <th className="p-2 text-left">月</th>
                  <th className="p-2">待機分数</th>
                  <th className="p-2">鑑定回数</th>
                  <th className="p-2">シフト占有率</th>
                  <th className="p-2">鑑定分数</th>
                  <th className="p-2">時間占有率</th>
                  <th className="p-2">平均分数</th>
                  <th className="p-2">ユーザー数</th>
                  <th className="p-2">新規</th>
                  <th className="p-2">リピート</th>
                  <th className="p-2">トラカ売上</th>
                  <th className="p-2">ショップ売上</th>
                  <th className="p-2">総売上</th>
                </tr>
              </thead>
              <tbody>
                {trend.map(row => (
                  <tr key={row.month} className="border-b border-gray-100 text-right">
                    <td className="p-2 text-left font-medium">{monthLabel(row.month)}</td>
                    <td className="p-2">{row.waiting_minutes.toLocaleString()}</td>
                    <td className="p-2">{row.consultation_count.toLocaleString()}</td>
                    <td className="p-2">{row.shift_occupancy_rate}%</td>
                    <td className="p-2">{row.total_minutes.toLocaleString()}</td>
                    <td className="p-2">{row.occupancy_rate}%</td>
                    <td className="p-2">{row.avg_minutes}</td>
                    <td className="p-2">{row.total_user_count}</td>
                    <td className="p-2">{row.new_user_count}</td>
                    <td className="p-2">{row.repeat_user_count}</td>
                    <td className="p-2">{yen(row.revenue_jpy)}</td>
                    <td className="p-2">{yen(row.shop_revenue_jpy)}</td>
                    <td className="p-2 font-bold">{yen(row.combined_revenue_jpy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 日別売上グラフ */}
          <h2 className="text-lg font-bold mt-8 mb-2">日別総売上</h2>
          <div className="flex items-end gap-1 h-40 border-b border-gray-300 pb-1">
            {daily.map(d => (
              <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full" title={`${d.day}日：${yen(d.combined_revenue_jpy)}`}>
                <div
                  className="w-full bg-red-400 rounded-t"
                  style={{ height: `${Math.max(2, (d.combined_revenue_jpy / maxDailyRevenue) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-1 text-[10px] text-gray-400 mt-1">
            {daily.map(d => (
              <div key={d.day} className="flex-1 text-center">{d.day}</div>
            ))}
          </div>

          <p className="text-xs text-gray-400 mt-6">
            ※分給・ギフト成果・NPS・売上予測は今回未対応です（先生ごとの歩合設定など、追加の仕組みが必要なため）。<br />
            ※「シフト占有率」は「鑑定回数 ÷ シフトコマ数」として実装しています。意図と異なる場合は教えてください。
          </p>
        </>
      )}
    </div>
  )
}
