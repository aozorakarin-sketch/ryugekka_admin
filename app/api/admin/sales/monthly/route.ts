// app/api/admin/sales/monthly/route.ts
// 指定した年の1〜12月を、先生別に月ごと集計して返す。
// クエリ: ?year=2026（省略時は今年）

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  POINT_TYPE_TO_TEACHER_ID,
  detectChannel,
  createStatsMap,
  requireTeacherAuth,
  TeacherStat,
} from '@/lib/salesAggregation'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface MonthBucket {
  month: string // 'YYYY-MM'
  totalRevenueJpy: number
  totalPointsUsed: number
  teachers: TeacherStat[]
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireTeacherAuth(supabaseAdmin)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(req.url)
    const year = parseInt(searchParams.get('year') ?? '') || new Date().getFullYear()

    const yearStart = new Date(year, 0, 1).toISOString()
    const yearEnd = new Date(year + 1, 0, 1).toISOString()

    // ① 決済額（円）: purchaseのみ、その年の全件
    const { data: purchaseRows, error: purchaseError } = await supabaseAdmin
      .from('point_transactions')
      .select('point_type, amount_jpy, created_at')
      .eq('transaction_type', 'purchase')
      .gte('created_at', yearStart)
      .lt('created_at', yearEnd)

    if (purchaseError) throw purchaseError

    // ② トラカ消費実績: consumeのみ、その年の全件
    const { data: consumeRows, error: consumeError } = await supabaseAdmin
      .from('point_transactions')
      .select('teacher_id, amount, reason, created_at')
      .eq('transaction_type', 'consume')
      .gte('created_at', yearStart)
      .lt('created_at', yearEnd)

    if (consumeError) throw consumeError

    // 月ごとの集計器を用意（1〜12月ぶん先に作っておく。データが無い月も0件として返すため）
    const monthBuckets = new Map<string, ReturnType<typeof createStatsMap>>()
    for (let m = 1; m <= 12; m++) {
      const monthKey = `${year}-${String(m).padStart(2, '0')}`
      monthBuckets.set(monthKey, createStatsMap())
    }

    const monthKeyOf = (createdAt: string) => createdAt.slice(0, 7) // 'YYYY-MM'

    // 決済額を月ごと・先生ごとに集計
    for (const row of purchaseRows ?? []) {
      const teacherId = POINT_TYPE_TO_TEACHER_ID[row.point_type as string]
      if (!teacherId) continue
      const bucket = monthBuckets.get(monthKeyOf(row.created_at))
      if (!bucket) continue
      const stat = bucket.ensure(teacherId)
      stat.purchaseCount += 1
      if (row.amount_jpy != null) {
        stat.revenueJpy += row.amount_jpy
      } else {
        stat.revenueJpyUnknownCount += 1
      }
    }

    // トラカ消費実績を月ごと・先生ごとに集計
    for (const row of consumeRows ?? []) {
      if (!row.teacher_id) continue
      const bucket = monthBuckets.get(monthKeyOf(row.created_at))
      if (!bucket) continue
      const stat = bucket.ensure(row.teacher_id)
      const used = Math.abs(row.amount ?? 0)
      const channel = detectChannel(row.reason)
      stat.pointsUsed[channel] += used
      stat.pointsUsed.total += used
    }

    const months: MonthBucket[] = Array.from(monthBuckets.entries()).map(([monthKey, bucket]) => {
      const teachers = Array.from(bucket.stats.values()).sort((a, b) => b.revenueJpy - a.revenueJpy)
      return {
        month: monthKey,
        totalRevenueJpy: teachers.reduce((sum, t) => sum + t.revenueJpy, 0),
        totalPointsUsed: teachers.reduce((sum, t) => sum + t.pointsUsed.total, 0),
        teachers,
      }
    })

    return NextResponse.json({ year, months })

  } catch (err: any) {
    console.error('sales monthly aggregation error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
