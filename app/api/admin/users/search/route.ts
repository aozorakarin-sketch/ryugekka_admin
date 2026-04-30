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
  const q = searchParams.get('q') || ''

  const { data, error } = await supabase.auth.admin.listUsers()

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

  const userIds = filtered.map(u => u.id)
  const { data: points } = await supabase
    .from('user_points')
    .select('user_id, teacher_id, points')
    .in('user_id', userIds)

  const usersWithPoints = filtered.map(u => {
    const userPoints = points?.filter(p => p.user_id === u.id) || []
    const balance = { ryu: 0, tsuki: 0, hana: 0 }
    userPoints.forEach(p => {
      const type = TEACHERS[p.teacher_id]
      if (type) balance[type] = p.points
    })
    return { ...u, balance }
  })

  return NextResponse.json({ users: usersWithPoints })
}
