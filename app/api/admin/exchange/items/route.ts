import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getAdminEmail, canEditTeacher } from '@/lib/exchangeAdminAuth'

// ★得トラカ交換所：出品商品の一覧・追加・編集・削除
//   見るのは管理者4人全員OK、変更はその先生本人だけ

const EDITABLE = ['name', 'description', 'image_url', 'required_tokens', 'item_type', 'coupon_spec',
  'digital_url', 'digital_file_path', 'digital_file_name', 'with_message', 'stock', 'is_published', 'sort_order'] as const

function pickEditable(body: any) {
  const out: Record<string, any> = {}
  for (const k of EDITABLE) if (k in body) out[k] = body[k]
  return out
}

export async function GET(req: NextRequest) {
  const email = await getAdminEmail(req)
  if (!email) return NextResponse.json({ error: '権限がありません' }, { status: 401 })
  const teacherId = req.nextUrl.searchParams.get('teacher_id')
  if (!teacherId) return NextResponse.json({ error: 'teacher_idが必要です' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('exchange_items').select('*')
    .eq('teacher_id', teacherId)
    .order('sort_order', { ascending: true }).order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const email = await getAdminEmail(req)
  if (!email) return NextResponse.json({ error: '権限がありません' }, { status: 401 })
  const body = await req.json()
  if (!body.teacher_id || !canEditTeacher(email, body.teacher_id)) {
    return NextResponse.json({ error: '担当の先生のみ登録できます' }, { status: 403 })
  }
  const { data, error } = await supabaseAdmin
    .from('exchange_items')
    .insert({ teacher_id: body.teacher_id, ...pickEditable(body) })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ item: data })
}

export async function PATCH(req: NextRequest) {
  const email = await getAdminEmail(req)
  if (!email) return NextResponse.json({ error: '権限がありません' }, { status: 401 })
  const body = await req.json()
  const { data: current } = await supabaseAdmin.from('exchange_items').select('teacher_id').eq('id', body.id).maybeSingle()
  if (!current || !canEditTeacher(email, current.teacher_id)) {
    return NextResponse.json({ error: '担当の先生のみ編集できます' }, { status: 403 })
  }
  const { error } = await supabaseAdmin.from('exchange_items').update(pickEditable(body)).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const email = await getAdminEmail(req)
  if (!email) return NextResponse.json({ error: '権限がありません' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  const { data: current } = await supabaseAdmin.from('exchange_items').select('teacher_id').eq('id', id).maybeSingle()
  if (!current || !canEditTeacher(email, current.teacher_id)) {
    return NextResponse.json({ error: '担当の先生のみ削除できます' }, { status: 403 })
  }
  // すでに交換された商品は、履歴を残すため削除せず非公開にする
  const { count } = await supabaseAdmin.from('exchange_orders').select('id', { count: 'exact', head: true }).eq('item_id', id)
  if ((count ?? 0) > 0) {
    await supabaseAdmin.from('exchange_items').update({ is_published: false }).eq('id', id)
    return NextResponse.json({ ok: true, unpublished: true })
  }
  const { error } = await supabaseAdmin.from('exchange_items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
