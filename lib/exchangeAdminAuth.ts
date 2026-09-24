import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ★得トラカ交換所（管理画面）用の共通処理
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 管理画面に入れる4人（layout.tsx の ALLOWED_EMAILS と同じ）
export const ALLOWED_EMAILS = [
  'bazvideo412@gmail.com',
  'tomo517ko@gmail.com',
  'aozora.karin@gmail.com',
  'ohayo0840ohayo@gmail.com',
]

// 先生ごとの担当メールアドレス（ショップ管理と同じ）。自分の交換所だけ編集できる
export const TEACHER_EMAIL: Record<string, string> = {
  '3ba85bb9-9065-461b-b76b-cc488d4c0c3b': 'bazvideo412@gmail.com',   // 龍
  '17cf0ca1-7526-466e-a644-9d3efefa4091': 'tomo517ko@gmail.com',     // 月
  'cd2c4101-2e24-4ae2-8d6a-507a943904af': 'aozora.karin@gmail.com',  // 花
}

// ログイン中の管理者のメールアドレスを返す（管理者でなければnull）
export async function getAdminEmail(req: NextRequest): Promise<string | null> {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  const email = data?.user?.email ?? null
  if (error || !email || !ALLOWED_EMAILS.includes(email)) return null
  return email
}

export const canEditTeacher = (email: string, teacherId: string) => TEACHER_EMAIL[teacherId] === email
