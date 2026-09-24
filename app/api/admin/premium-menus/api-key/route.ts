import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'
import { supabaseAdmin, getAdminEmail, canEditTeacher } from '@/lib/exchangeAdminAuth'

// ★有料メニュー管理：先生ごとのAPIキー
//   GET：発行状況（先頭8文字と日付だけ。平文は返さない）
//   POST：発行／再発行（平文はこのレスポンスで1回だけ返す。DBにはハッシュのみ保存）

const SLUG: Record<string, string> = {
  'cd2c4101-2e24-4ae2-8d6a-507a943904af': 'hana',
  '17cf0ca1-7526-466e-a644-9d3efefa4091': 'tsuki',
  '3ba85bb9-9065-461b-b76b-cc488d4c0c3b': 'ryu',
}

export async function GET(req: NextRequest) {
  const email = await getAdminEmail(req)
  if (!email) return NextResponse.json({ error: '権限がありません' }, { status: 401 })
  const teacherId = req.nextUrl.searchParams.get('teacher_id')
  if (!teacherId) return NextResponse.json({ error: 'teacher_idが必要です' }, { status: 400 })

  const { data } = await supabaseAdmin
    .from('premium_api_keys')
    .select('key_prefix, created_at, rotated_at')
    .eq('teacher_id', teacherId)
    .maybeSingle()
  return NextResponse.json({ key: data ?? null })
}

export async function POST(req: NextRequest) {
  const email = await getAdminEmail(req)
  if (!email) return NextResponse.json({ error: '権限がありません' }, { status: 401 })
  const body = await req.json()
  const teacherId = body.teacher_id
  if (!teacherId || !SLUG[teacherId] || !canEditTeacher(email, teacherId)) {
    return NextResponse.json({ error: '担当の先生のみ発行できます' }, { status: 403 })
  }

  const plain = `rgk_${SLUG[teacherId]}_${randomBytes(30).toString('base64url')}`
  const keyHash = createHash('sha256').update(plain).digest('hex')
  const keyPrefix = plain.slice(0, 12)

  const { data: existing } = await supabaseAdmin
    .from('premium_api_keys').select('teacher_id').eq('teacher_id', teacherId).maybeSingle()

  const now = new Date().toISOString()
  const { error } = existing
    ? await supabaseAdmin.from('premium_api_keys')
        .update({ key_hash: keyHash, key_prefix: keyPrefix, rotated_at: now })
        .eq('teacher_id', teacherId)
    : await supabaseAdmin.from('premium_api_keys')
        .insert({ teacher_id: teacherId, key_hash: keyHash, key_prefix: keyPrefix })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ api_key: plain, key_prefix: keyPrefix })
}
