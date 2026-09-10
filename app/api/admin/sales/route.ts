// app/api/admin/sales/route.ts
// 先生全員が閲覧できる売上ダッシュボード用の集計API。
// - 決済額（円）: point_transactions.amount_jpy（purchase・今後分のみ正しく入る）
// - トラカ消費実績: point_transactions（consume）を reason文字列でチャンネル分類して集計
//
// 認証: ログイン済みかつ teachers テーブルにメールが存在すること（先生なら誰でも閲覧可、の実装）

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TEACHER_NAME_MAP: Record<string, string> = {
  'cd2c4101-2e24-4ae2-8d6a-507a943904af': '青空花林',
  '17cf0ca1-7526-466e-a644-9d3efefa4091': '椎名架月',
  '3ba85bb9-9065-461b-b76b-cc488d4c0c3b': '雲龍蓮',
}

// purchase時のpoint_typeは teacherKey（'hana'|'tsuki'|'ryu'）で保存されている
const POINT_TYPE_TO_TEACHER_ID: Record<string, string> = {
  hana: 'cd2c4101-2e24-4ae2-8d6a-507a943904af',
  tsuki: '17cf0ca1-7526-466e-a644-9d3efefa4091',
  ryu: '3ba85bb9-9065-461b-b76b-cc488d4c0c3b',
}

type Channel = 'call' | 'chat' | 'mail' | 'other'

// reason文字列からチャンネルを判定する。
// 通話側の実際の文言は未確認のため「通話」を含む場合のみ暫定でcall判定にしている。
function detectChannel(reason: string | null): Channel {
  if (!reason) return 'other'
  if (reason.includes('チャット')) return 'chat'
  if (reason.includes('メール鑑定')) return 'mail'
  if (reason.includes('通話')) return 'call'
  return 'other'
}

export async function GET(req: NextRequest) {
  try {
    // 認証確認（先生なら誰でも閲覧可）
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.json({ error: '未ログインです' }, { status: 401 })
    }

    const { data: teacherRow } = await supabaseAdmin
      .from('teachers')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()

    if (!teacherRow) {
      return NextResponse.json({ error: '閲覧権限がありません' }, { status: 403 })
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

    // 先生ごとの集計器を用意
    type TeacherStat = {
      teacherId: string
      teacherName: string
      revenueJpy: number
      revenueJpyUnknownCount: number // amount_jpyがNULL（旧データ）だった購入件数
      purchaseCount: number
      pointsUsed: { call: number; chat: number; mail: number; other: number; total: number }
    }

    const stats = new Map<string, TeacherStat>()
    function ensure(teacherId: string): TeacherStat {
      if (!stats.has(teacherId)) {
        stats.set(teacherId, {
          teacherId,
          teacherName: TEACHER_NAME_MAP[teacherId] ?? teacherId,
          revenueJpy: 0,
          revenueJpyUnknownCount: 0,
          purchaseCount: 0,
          pointsUsed: { call: 0, chat: 0, mail: 0, other: 0, total: 0 },
        })
      }
      return stats.get(teacherId)!
    }

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
