import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getAdminEmail, canEditTeacher } from '@/lib/exchangeAdminAuth'

// ★有料メニュー管理：先生ごとのLP画像（一覧・追加・並び替え・差し替え・削除）
//   見るのは管理者4人全員OK、変更はその先生本人だけ

export async function GET(req: NextRequest) {
  const email = await getAdminEmail(req)
  if (!email) return NextResponse.json({ error: '権限がありません' }, { status: 401 })
  const teacherId = req.nextUrl.searchParams.get('teacher_id')
  if (!teacherId) return NextResponse.json({ error: 'teacher_idが必要です' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('premium_lp_images').select('*')
    .eq('teacher_id', teacherId)
    .order('display_order', { ascending: true }).order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ images: data ?? [] })
}

export async function POST(req: NextRequest) {
  const email = await getAdminEmail(req)
  if (!email) return NextResponse.json({ error: '権限がありません' }, { status: 401 })
  const body = await req.json()
  if (!body.teacher_id || !canEditTeacher(email, body.teacher_id)) {
    return NextResponse.json({ error: '担当の先生のみ登録できます' }, { status: 403 })
  }
  if (!body.image_url) return NextResponse.json({ error: '画像がありません' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('premium_lp_images')
    .insert({ teacher_id: body.teacher_id, image_url: body.image_url, display_order: Number(body.display_order) || 0 })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ image: data })
}

export async function PATCH(req: NextRequest) {
  const email = await getAdminEmail(req)
  if (!email) return NextResponse.json({ error: '権限がありません' }, { status: 401 })
  const body = await req.json()
  const { data: current } = await supabaseAdmin.from('premium_lp_images').select('teacher_id').eq('id', body.id).maybeSingle()
  if (!current || !canEditTeacher(email, current.teacher_id)) {
    return NextResponse.json({ error: '担当の先生のみ編集できます' }, { status: 403 })
  }
  const fields: Record<string, any> = {}
  if ('image_url' in body) fields.image_url = body.image_url
  if ('display_order' in body) fields.display_order = Number(body.display_order) || 0
  const { error } = await supabaseAdmin.from('premium_lp_images').update(fields).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const email = await getAdminEmail(req)
  if (!email) return NextResponse.json({ error: '権限がありません' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  const { data: current } = await supabaseAdmin.from('premium_lp_images').select('teacher_id').eq('id', id).maybeSingle()
  if (!current || !canEditTeacher(email, current.teacher_id)) {
    return NextResponse.json({ error: '担当の先生のみ削除できます' }, { status: 403 })
  }
  const { error } = await supabaseAdmin.from('premium_lp_images').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
