import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TEACHER_IDS = {
  hana:  '8248973c-ad5f-434e-b211-10b8e10ff742',
  tsuki: '70704a2a-964f-4254-a891-b1747b7e3522',
  ryu:   '62e32c9f-9f15-49e6-9d1b-2c8c2adf9577',
} as const

export async function POST(req: NextRequest) {
  try {
    const { user_id, point_type, amount, reason } = await req.json()

    if (!user_id || !point_type || !amount) {
      return NextResponse.json({ error: 'user_id, point_type, amount は必須' }, { status: 400 })
    }
    if (!['ryu', 'tsuki', 'hana'].includes(point_type)) {
      return NextResponse.json({ error: 'point_type は ryu / tsuki / hana のいずれか' }, { status: 400 })
    }

    const teacher_id = TEACHER_IDS[point_type as keyof typeof TEACHER_IDS]

    // 現在のポイント取得
    const { data: current } = await supabase
      .from('user_points')
      .select('id, points')
      .eq('user_id', user_id)
      .eq('teacher_id', teacher_id)
      .single()

    const currentPoints = current?.points ?? 0
    const newPoints = currentPoints + amount

    if (newPoints < 0) {
      return NextResponse.json(
        { error: `残高不足（現在: ${currentPoints}pt）` },
        { status: 400 }
      )
    }

    if (current) {
      // 既存行を更新
      await supabase
        .from('user_points')
        .update({ points: newPoints, updated_at: new Date().toISOString() })
        .eq('id', current.id)
    } else {
      // 新規行を挿入（そのユーザー×占い師の初ポイント）
      await supabase
        .from('user_points')
        .insert({ user_id, teacher_id, points: newPoints })
    }

    // 履歴記録
    await supabase.from('point_transactions').insert({
      user_id,
      point_type,
      amount,
      balance_after: newPoints,
      transaction_type: amount > 0 ? 'manual_grant' : 'manual_deduct',
      reason: reason || '管理者による手動操作',
    })

    return NextResponse.json({
      success: true,
      point_type,
      previous: currentPoints,
      granted: amount,
      balance: newPoints,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}