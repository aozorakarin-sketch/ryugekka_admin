// lib/salesAggregation.ts
// app/api/admin/sales/* 各ルートで共通して使う集計ロジック・認証チェック

import { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const TEACHER_NAME_MAP: Record<string, string> = {
  'cd2c4101-2e24-4ae2-8d6a-507a943904af': '青空花林',
  '17cf0ca1-7526-466e-a644-9d3efefa4091': '椎名架月',
  '3ba85bb9-9065-461b-b76b-cc488d4c0c3b': '雲龍蓮',
}

// purchase時のpoint_typeは teacherKey（'hana'|'tsuki'|'ryu'）で保存されている
export const POINT_TYPE_TO_TEACHER_ID: Record<string, string> = {
  hana: 'cd2c4101-2e24-4ae2-8d6a-507a943904af',
  tsuki: '17cf0ca1-7526-466e-a644-9d3efefa4091',
  ryu: '3ba85bb9-9065-461b-b76b-cc488d4c0c3b',
}

export type Channel = 'call' | 'chat' | 'mail' | 'other'

// reason文字列からチャンネルを判定する。
// 通話側の実際の文言は確認済み（'通話料金...'）。チャット・メールも実コードで確認済み。
export function detectChannel(reason: string | null): Channel {
  if (!reason) return 'other'
  if (reason.includes('チャット')) return 'chat'
  if (reason.includes('メール鑑定')) return 'mail'
  if (reason.includes('通話')) return 'call'
  return 'other'
}

export interface TeacherStat {
  teacherId: string
  teacherName: string
  revenueJpy: number
  revenueJpyUnknownCount: number
  purchaseCount: number
  pointsUsed: { call: number; chat: number; mail: number; other: number; total: number }
}

export function createStatsMap() {
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
  return { stats, ensure }
}

// ログイン済み かつ teachers テーブルにメールが存在することを確認する（先生なら誰でも閲覧可）
export async function requireTeacherAuth(
  supabaseAdmin: SupabaseClient
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
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
    return { ok: false, error: '未ログインです', status: 401 }
  }

  const { data: teacherRow } = await supabaseAdmin
    .from('teachers')
    .select('id')
    .eq('email', user.email)
    .maybeSingle()

  if (!teacherRow) {
    return { ok: false, error: '閲覧権限がありません', status: 403 }
  }

  return { ok: true }
}
