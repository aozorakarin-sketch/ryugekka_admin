import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''

  // auth.users は直接クエリできないので rpc か admin API を使う
  const { data, error } = await supabase.auth.admin.listUsers()
   console.log('error:', error)
  console.log('data:', data)
 
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const filtered = data.users
    .filter(u => {
      const name = u.user_metadata?.name || ''
      return (
        name.includes(q) ||
        (u.email || '').includes(q)
      )
    })
    .slice(0, 20)
    .map(u => ({
      id: u.id,
      name: u.user_metadata?.name || u.email || '',
      email: u.email || '',
    }))

  // 各ユーザーのポイント残高も取得
  const userIds = filtered.map(u => u.id)
  const { data: points } = await supabase
    .from('user_points')
    .select('user_id, teacher_id, points')
    .in('user_id', userIds)

  const TEACHERS = {
    '8248973c-ad5f-434e-b211-10b8e10ff742': 'hana',
    '70704a2a-964f-4254-a891-b1747b7e3522': 'tsuki',
    '62e32c9f-9f15-49e6-9d1b-2c8c2adf9577': 'ryu',
  } as const

  const usersWithPoints = filtered.map(u => {
    const userPoints = points?.filter(p => p.user_id === u.id) || []
    const balance = { ryu: 0, tsuki: 0, hana: 0 }
    userPoints.forEach(p => {
      const type = TEACHERS[p.teacher_id as keyof typeof TEACHERS]
      if (type) balance[type] = p.points
    })
    return { ...u, balance }
  })

  return NextResponse.json({ users: usersWithPoints })
}