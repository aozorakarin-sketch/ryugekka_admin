import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getAdminEmail, canEditTeacher } from '@/lib/exchangeAdminAuth'

// ★有料メニュー管理：メニューの一覧・追加・編集・削除
//   見るのは管理者4人全員OK、変更はその先生本人だけ（得トラカ交換所と同じルール）

const EDITABLE = ['title', 'description', 'image_url', 'price', 'endpoint_url', 'display_order', 'is_active'] as const

function pickEditable(body: any) {
  const out: Record<string, any> = {}
  for (const k of EDITABLE) if (k in body) out[k] = body[k]
  return out
}

function validate(fields: Record<string, any>, isCreate: boolean): string | null {
  if (isCreate || 'title' in fields) {
    if (!fields.title || !String(fields.title).trim()) return 'メニュー名を入力してください'
  }
  if (isCreate || 'price' in fields) {
    const p = Number(fields.price)
    if (!Number.isInteger(p) || p <= 0) return 'トラカ価格は1以上の整数で入力してください'
    fields.price = p
  }
  if (isCreate || 'endpoint_url' in fields) {
    const u = String(fields.endpoint_url ?? '').trim()
    if (!u.startsWith('https://')) return '送信先URLは https:// で始まるURLを入力してください'
    fields.endpoint_url = u
  }
  return null
}

export async function GET(req: NextRequest) {
  const email = await getAdminEmail(req)
  if (!email) return NextResponse.json({ error: '権限がありません' }, { status: 401 })
  const teacherId = req.nextUrl.searchParams.get('teacher_id')
  if (!teacherId) return NextResponse.json({ error: 'teacher_idが必要です' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('premium_menus').select('*')
    .eq('teacher_id', teacherId)
    .order('display_order', { ascending: true }).order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ menus: data ?? [] })
}

export async function POST(req: NextRequest) {
  const email = await getAdminEmail(req)
  if (!email) return NextResponse.json({ error: '権限がありません' }, { status: 401 })
  const body = await req.json()
  if (!body.teacher_id || !canEditTeacher(email, body.teacher_id)) {
    return NextResponse.json({ error: '担当の先生のみ登録できます' }, { status: 403 })
  }
  const fields = pickEditable(body)
  const err = validate(fields, true)
  if (err) return NextResponse.json({ error: err }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('premium_menus')
    .insert({ teacher_id: body.teacher_id, ...fields })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ menu: data })
}

export async function PATCH(req: NextRequest) {
  const email = await getAdminEmail(req)
  if (!email) return NextResponse.json({ error: '権限がありません' }, { status: 401 })
  const body = await req.json()
  const { data: current } = await supabaseAdmin.from('premium_menus').select('teacher_id').eq('id', body.id).maybeSingle()
  if (!current || !canEditTeacher(email, current.teacher_id)) {
    return NextResponse.json({ error: '担当の先生のみ編集できます' }, { status: 403 })
  }
  const fields = pickEditable(body)
  const err = validate(fields, false)
  if (err) return NextResponse.json({ error: err }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('premium_menus')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const email = await getAdminEmail(req)
  if (!email) return NextResponse.json({ error: '権限がありません' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  const { data: current } = await supabaseAdmin.from('premium_menus').select('teacher_id').eq('id', id).maybeSingle()
  if (!current || !canEditTeacher(email, current.teacher_id)) {
    return NextResponse.json({ error: '担当の先生のみ削除できます' }, { status: 403 })
  }
  // すでに申し込みがあるメニューは、履歴を残すため削除せず非公開にする
  const { count } = await supabaseAdmin.from('premium_tokens').select('id', { count: 'exact', head: true }).eq('menu_id', id)
  if ((count ?? 0) > 0) {
    await supabaseAdmin.from('premium_menus').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id)
    return NextResponse.json({ ok: true, unpublished: true })
  }
  const { error } = await supabaseAdmin.from('premium_menus').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
