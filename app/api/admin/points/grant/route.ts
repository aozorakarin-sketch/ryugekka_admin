import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 正しいteacher_id
const TEACHER_IDS = {
  hana:  'cd2c4101-2e24-4ae2-8d6a-507a943904af',
  tsuki: '17cf0ca1-7526-466e-a644-9d3efefa4091',
  ryu:   '3ba85bb9-9065-461b-b76b-cc488d4c0c3b',
} as const

// 管理画面にログインできる人（app/admin/layout.tsx の ALLOWED_EMAILS と同じ）
const ALLOWED_EMAILS = [
  'bazvideo412@gmail.com',
  'tomo517ko@gmail.com',
  'aozora.karin@gmail.com',
  'ohayo0840ohayo@gmail.com',
]

// リクエストのログイン情報（Bearerトークン）から、管理画面の利用者かを確認する
async function isAdmin(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return false
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user?.email) return false
  return ALLOWED_EMAILS.includes(data.user.email.toLowerCase())
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: '権限がありません' }, { status: 401 })
    }

    const { user_id, point_type, amount, reason } = await req.json()

    if (!user_id || !point_type || !amount) {
      return NextResponse.json({ error: 'user_id, point_type, amount は必須' }, { status: 400 })
    }
    if (!['ryu', 'tsuki', 'hana', 'common'].includes(point_type)) {
      return NextResponse.json({ error: 'point_type は ryu / tsuki / hana / common のいずれか' }, { status: 400 })
    }
    // 数値（整数）以外は受け付けない（文字列だと残高に「連結」されてしまうため）
    if (typeof amount !== 'number' || !Number.isInteger(amount)) {
      return NextResponse.json({ error: 'amount は整数で指定してください' }, { status: 400 })
    }

    // ★共通トラカ（user_common_points）は先生別テーブルとは別扱い。
    //   このテーブルにはid列が無いため、user_idで行を特定する。
    if (point_type === 'common') {
      const { data: current } = await supabase
        .from('user_common_points')
        .select('points')
        .eq('user_id', user_id)
        .maybeSingle()

      const currentPoints = current?.points ?? 0
      const newPoints = currentPoints + amount

      if (newPoints < 0) {
        return NextResponse.json(
          { error: `残高不足（現在: ${currentPoints}pt）` },
          { status: 400 }
        )
      }

      const { error: writeError } = current
        ? await supabase
            .from('user_common_points')
            .update({ points: newPoints, updated_at: new Date().toISOString() })
            .eq('user_id', user_id)
        : await supabase
            .from('user_common_points')
            .insert({ user_id, points: newPoints, updated_at: new Date().toISOString() })

      if (writeError) {
        console.error(writeError)
        return NextResponse.json(
          { error: `残高の更新に失敗しました: ${writeError.message}` },
          { status: 500 }
        )
      }

      // 履歴記録：共通トラカはpoint_type='trk'として記録する（他の付与処理と揃える）
      const { error: historyError } = await supabase.from('point_transactions').insert({
        user_id,
        point_type: 'trk',
        amount,
        balance_after: newPoints,
        transaction_type: amount > 0 ? 'manual_grant' : 'manual_deduct',
        reason: reason || '管理者による手動操作',
      })
      if (historyError) console.error('履歴の記録に失敗:', historyError)

      return NextResponse.json({
        success: true,
        point_type,
        previous: currentPoints,
        granted: amount,
        balance: newPoints,
      })
    }

    const teacher_id = TEACHER_IDS[point_type as keyof typeof TEACHER_IDS]

    // 現在のポイント取得
    const { data: current } = await supabase
      .from('user_points')
      .select('id, points')
      .eq('user_id', user_id)
      .eq('teacher_id', teacher_id)
      .maybeSingle()

    const currentPoints = current?.points ?? 0
    const newPoints = currentPoints + amount

    if (newPoints < 0) {
      return NextResponse.json(
        { error: `残高不足（現在: ${currentPoints}pt）` },
        { status: 400 }
      )
    }

    const { error: writeError } = current
      ? await supabase
          .from('user_points')
          .update({ points: newPoints, updated_at: new Date().toISOString() })
          .eq('id', current.id)
      : await supabase
          .from('user_points')
          .insert({ user_id, teacher_id, points: newPoints })

    if (writeError) {
      console.error(writeError)
      return NextResponse.json(
        { error: `残高の更新に失敗しました: ${writeError.message}` },
        { status: 500 }
      )
    }

    // 履歴記録
    const { error: historyError } = await supabase.from('point_transactions').insert({
      user_id,
      point_type,
      amount,
      balance_after: newPoints,
      transaction_type: amount > 0 ? 'manual_grant' : 'manual_deduct',
      reason: reason || '管理者による手動操作',
    })
    if (historyError) console.error('履歴の記録に失敗:', historyError)

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
