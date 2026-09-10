// app/api/admin/sales/route.ts
// 先生全員が閲覧できる売上ダッシュボード用の集計API（期間自由指定・単一合計）。
// - 決済額（円）: point_transactions.amount_jpy（purchase・今後分のみ正しく入る）
// - トラカ消費実績: point_transactions（consume）を reason文字列でチャンネル分類して集計
//
// 月ごとの推移を見たい場合は /api/admin/sales/monthly を使う

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  POINT_TYPE_TO_TEACHER_ID,
  detectChannel,
  createStatsMap,
  requireTeacherAuth,
} from '@/lib/salesAggregation'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const auth = await requireTeacherAuth(supabaseAdmin)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    // 期間パラメータ（未指定なら今月1日〜今日まで）
    const { searchParams } = new URL(req.url)
    const now = new Date()
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const defaultTo = now.toISOString()

    const from = searchParams.get('from') ?? defaultFrom
    const to = searchParams.get('to') ?? defaultTo

    // ① 決済額（円）: purchaseのみ、point_typeで先生を判定
    const { data: purchaseRows, error: purchaseError } = await supabaseAdmin
      .from('point_transactions')
      .select('point_type, amount_jpy')
      .eq('transaction_type', 'purchase')
      .gte('created_at', from)
      .lt('created_at', to)

    if (purchaseError) throw purchaseError

    // ② トラカ消費実績: consumeのみ、teacher_id・reasonで集計
    const { data: consumeRows, error: consumeError } = await supabaseAdmin
      .from('point_transactions')
      .select('teacher_id, amount, reason')
      .eq('transaction_type', 'consume')
      .gte('created_at', from)
      .lt('created_at', to)

    if (consumeError) throw consumeError

    const { stats, ensure } = createStatsMap()

    // 決済額を集計
    for (const row of purchaseRows ?? []) {
      const teacherId = POINT_TYPE_TO_TEACHER_ID[row.point_type as string]
      if (!teacherId) continue // 'trk'（共通トラカ購入）等、先生に紐付かないものは対象外
      const stat = ensure(teacherId)
      stat.purchaseCount += 1
      if (row.amount_jpy != null) {
        stat.revenueJpy += row.amount_jpy
      } else {
        stat.revenueJpyUnknownCount += 1
      }
    }

    // トラカ消費実績を集計
    for (const row of consumeRows ?? []) {
      if (!row.teacher_id) continue
      const stat = ensure(row.teacher_id)
      const used = Math.abs(row.amount ?? 0)
      const channel = detectChannel(row.reason)
      stat.pointsUsed[channel] += used
      stat.pointsUsed.total += used
    }

    const teachers = Array.from(stats.values()).sort((a, b) => b.revenueJpy - a.revenueJpy)

    const totalRevenueJpy = teachers.reduce((sum, t) => sum + t.revenueJpy, 0)
    const totalPointsUsed = teachers.reduce((sum, t) => sum + t.pointsUsed.total, 0)

    return NextResponse.json({
      period: { from, to },
      totalRevenueJpy,
      totalPointsUsed,
      teachers,
    })

  } catch (err: any) {
    console.error('sales aggregation error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
