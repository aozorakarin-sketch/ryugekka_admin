import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 正しいteacher_id
const TEACHERS: Record<string, 'hana' | 'tsuki' | 'ryu'> = {
  'cd2c4101-2e24-4ae2-8d6a-507a943904af': 'hana',
  '17cf0ca1-7526-466e-a644-9d3efefa4091': 'tsuki',
  '3ba85bb9-9065-461b-b76b-cc488d4c0c3b': 'ryu',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const raw = searchParams.get('q') || ''
  // PostgRESTのフィルタ構文を壊す文字を除く
  const q = raw.replace(/[%,()"\\]/g, ' ').trim()

  if (!q) return NextResponse.json({ users: [] })

  // ★auth.admin.listUsers() は最初の50人しか返さないため、
  //   usersテーブルを直接検索する（名前＝handle_name またはメールアドレスの部分一致）
  const { data: found, error } = await supabase
    .from('users')
    .select('id, email, handle_name')
    .or(`handle_name.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const filtered = (found ?? []).map(u => ({
    id: u.id,
    name: u.handle_name || u.email || '',
    email: u.email || '',
  }))

  const userIds = filtered.map(u => u.id)

  const { data: points } = await supabase
    .from('user_points')
    .select('user_id, teacher_id, points')
    .in('user_id', userIds)

  // ★共通トラカ（user_common_points）も合わせて取得する
  const { data: commonPoints } = await supabase
    .from('user_common_points')
    .select('user_id, points')
    .in('user_id', userIds)

  const usersWithPoints = filtered.map(u => {
    const userPoints = points?.filter(p => p.user_id === u.id) || []
    const balance = { ryu: 0, tsuki: 0, hana: 0, common: 0 }
    userPoints.forEach(p => {
      const type = TEACHERS[p.teacher_id]
      if (type) balance[type] = p.points
    })
    const commonRow = commonPoints?.find(c => c.user_id === u.id)
    if (commonRow) balance.common = commonRow.points
    return { ...u, balance }
  })

  return NextResponse.json({ users: usersWithPoints })
}
