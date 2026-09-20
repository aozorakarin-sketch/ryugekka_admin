import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TEACHERS = [
  { key: 'hana', name: '青空花林' },
  { key: 'tsuki', name: '椎名架月' },
  { key: 'ryu', name: '雲龍蓮' },
]

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('paid_token_balance_summary')
      .select('teacher_key, holders, paid_unused_total, balance_total')

    if (error) throw new Error(error.message)

    const rows = Array.isArray(data) ? data : []

    const teachers = TEACHERS.map(t => {
      const r = rows.find((x: any) => x.teacher_key === t.key)
      return {
        key: t.key,
        name: t.name,
        paidUnused: Number(r?.paid_unused_total ?? 0),
        holders: Number(r?.holders ?? 0),
        balanceTotal: Number(r?.balance_total ?? 0),
      }
    })

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      teachers,
      totalPaidUnused: teachers.reduce((s, t) => s + t.paidUnused, 0),
      totalBalance: teachers.reduce((s, t) => s + t.balanceTotal, 0),
    })
  } catch (err: any) {
    console.error('token-monitor error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
