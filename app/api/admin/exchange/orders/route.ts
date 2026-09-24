import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getAdminEmail, canEditTeacher } from '@/lib/exchangeAdminAuth'

// ★得トラカ交換所：交換申込の一覧と、発送済み・先生のひと言の更新
export async function GET(req: NextRequest) {
  const email = await getAdminEmail(req)
  if (!email) return NextResponse.json({ error: '権限がありません' }, { status: 401 })
  const teacherId = req.nextUrl.searchParams.get('teacher_id')
  if (!teacherId) return NextResponse.json({ error: 'teacher_idが必要です' }, { status: 400 })

  const { data: orders, error } = await supabaseAdmin
    .from('exchange_orders')
    .select('id, user_id, tokens_spent, status, recipient_name, postal_code, address, phone, teacher_message, created_at, shipped_at, exchange_items(name, item_type, with_message)')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // お客さんの表示名（ハンドルネーム）
  const userIds = [...new Set((orders ?? []).map(o => o.user_id))]
  const names: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: users } = await supabaseAdmin.from('users').select('id, handle_name').in('id', userIds)
    for (const u of users ?? []) names[u.id] = u.handle_name ?? ''
  }
  return NextResponse.json({ orders: (orders ?? []).map(o => ({ ...o, handle_name: names[o.user_id] ?? '' })) })
}

export async function PATCH(req: NextRequest) {
  const email = await getAdminEmail(req)
  if (!email) return NextResponse.json({ error: '権限がありません' }, { status: 401 })
  const { id, status, teacher_message } = await req.json()
  const { data: current } = await supabaseAdmin.from('exchange_orders').select('teacher_id').eq('id', id).maybeSingle()
  if (!current || !canEditTeacher(email, current.teacher_id)) {
    return NextResponse.json({ error: '担当の先生のみ更新できます' }, { status: 403 })
  }
  const update: Record<string, any> = {}
  if (typeof teacher_message === 'string') update.teacher_message = teacher_message
  if (status === 'shipped') { update.status = 'shipped'; update.shipped_at = new Date().toISOString() }
  const { error } = await supabaseAdmin.from('exchange_orders').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
