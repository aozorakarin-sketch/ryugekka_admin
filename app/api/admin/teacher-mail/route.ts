// app/api/admin/teacher-mail/route.ts
// 先生メール送信専用：お客さん検索（GET）と送信（POST）
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ログインメール → 先生（管理画面のフォローメール一覧ページと同じ対応表）
const EMAIL_TO_TEACHER: Record<string, { id: string; name: string }> = {
  'aozora.karin@gmail.com': { id: 'cd2c4101-2e24-4ae2-8d6a-507a943904af', name: '青空花林' },
  'tomo517ko@gmail.com': { id: '17cf0ca1-7526-466e-a644-9d3efefa4091', name: '椎名架月' },
  'bazvideo412@gmail.com': { id: '3ba85bb9-9065-461b-b76b-cc488d4c0c3b', name: '龍蓮' },
}

const MAX_SUBJECT = 100
const MAX_CONTENT = 5000

// リクエストのログイン情報（Bearerトークン）から先生を判定する。
// 先生以外・未ログインは null
async function getTeacher(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return null
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user?.email) return null
  return EMAIL_TO_TEACHER[data.user.email.toLowerCase()] ?? null
}

// お客さん検索：名前（handle_name）またはメールアドレスの部分一致。
// この先生とブロック関係にあるお客さんは候補から外す
export async function GET(req: NextRequest) {
  const teacher = await getTeacher(req)
  if (!teacher) {
    return NextResponse.json({ error: '権限がありません' }, { status: 401 })
  }

  const raw = new URL(req.url).searchParams.get('q') || ''
  // PostgRESTのフィルタ構文を壊す文字を除く
  const q = raw.replace(/[%,()"\\]/g, ' ').trim()
  if (!q) return NextResponse.json({ users: [] })

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, handle_name')
    .or(`handle_name.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (users ?? []).map(u => u.id)
  let blocked = new Set<string>()
  if (ids.length > 0) {
    const { data: blocks } = await supabase
      .from('teacher_customer_blocks')
      .select('user_id')
      .eq('teacher_id', teacher.id)
      .in('user_id', ids)
    blocked = new Set((blocks ?? []).map(b => b.user_id))
  }

  const result = (users ?? [])
    .filter(u => !blocked.has(u.id))
    .map(u => ({
      id: u.id,
      name: u.handle_name || u.email || '',
      email: u.email || '',
    }))

  return NextResponse.json({ users: result })
}

// 送信：follow_mails に下書きとして1行入れ、send-follow-mail（Edge Function）で送信する。
// 送信に失敗したら、その行は消す（下書き一覧に残さない）
export async function POST(req: NextRequest) {
  const teacher = await getTeacher(req)
  if (!teacher) {
    return NextResponse.json({ error: '権限がありません' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const userId = typeof body?.user_id === 'string' ? body.user_id : ''
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : ''
  const content = typeof body?.content === 'string' ? body.content.trim() : ''

  if (!userId) return NextResponse.json({ error: 'お客さんを選択してください' }, { status: 400 })
  if (!subject) return NextResponse.json({ error: '件名を入力してください' }, { status: 400 })
  if (!content) return NextResponse.json({ error: '本文を入力してください' }, { status: 400 })
  if (subject.length > MAX_SUBJECT) {
    return NextResponse.json({ error: `件名は${MAX_SUBJECT}文字以内にしてください` }, { status: 400 })
  }
  if (content.length > MAX_CONTENT) {
    return NextResponse.json({ error: `本文は${MAX_CONTENT}文字以内にしてください` }, { status: 400 })
  }

  // ブロック済みのお客さんには送らない
  const { data: blocks } = await supabase
    .from('teacher_customer_blocks')
    .select('id')
    .eq('teacher_id', teacher.id)
    .eq('user_id', userId)
    .limit(1)
  if (blocks && blocks.length > 0) {
    return NextResponse.json({ error: 'ブロック済みのお客さんには送信できません' }, { status: 403 })
  }

  // お客さんの存在とメールアドレスの確認
  const { data: target } = await supabase
    .from('users')
    .select('id, email')
    .eq('id', userId)
    .single()
  if (!target?.email) {
    return NextResponse.json({ error: 'お客さんのメールアドレスが見つかりません' }, { status: 404 })
  }

  // 下書きとして登録（data_source = 'teacher' が「先生本人」バッジとフッター文言の目印）
  const { data: row, error: insertError } = await supabase
    .from('follow_mails')
    .insert({
      user_id: userId,
      teacher_id: teacher.id,
      subject,
      content,
      is_draft: true,
      data_source: 'teacher',
      sender_type: 'teacher',
    })
    .select('id')
    .single()
  if (insertError || !row) {
    return NextResponse.json(
      { error: `登録に失敗しました: ${insertError?.message ?? ''}` },
      { status: 500 }
    )
  }

  // Edge Function で送信
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-follow-mail`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ follow_mail_id: row.id }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    // 送れなかった行は残さない
    await supabase.from('follow_mails').delete().eq('id', row.id)
    return NextResponse.json(
      { error: `送信に失敗しました: ${err?.error ?? res.status}` },
      { status: 502 }
    )
  }

  return NextResponse.json({ success: true })
}
