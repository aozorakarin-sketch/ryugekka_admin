import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireTeacherAuth } from '@/lib/salesAggregation'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const auth = await requireTeacherAuth(supabaseAdmin)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(req.url)
    const teacherId = searchParams.get('teacherId')
    const year = parseInt(searchParams.get('year') ?? '') || new Date().getFullYear()
    const month = parseInt(searchParams.get('month') ?? '') || new Date().getMonth() + 1

    if (!teacherId) {
      return NextResponse.json({ error: 'teacherIdが必要です' }, { status: 400 })
    }

    const [monthlyRes, hourlyRes, trendRes, dailyRes] = await Promise.all([
      supabaseAdmin.rpc('get_monthly_performance', { p_teacher_id: teacherId, p_year: year, p_month: month }).single(),
      supabaseAdmin.rpc('get_hourly_performance', { p_teacher_id: teacherId, p_year: year, p_month: month }),
      supabaseAdmin.rpc('get_performance_trend', { p_teacher_id: teacherId, p_months: 3 }),
      supabaseAdmin.rpc('get_daily_revenue', { p_teacher_id: teacherId, p_year: year, p_month: month }),
    ])

    if (monthlyRes.error) throw monthlyRes.error
    if (hourlyRes.error) throw hourlyRes.error
    if (trendRes.error) throw trendRes.error
    if (dailyRes.error) throw dailyRes.error

    return NextResponse.json({
      monthly: monthlyRes.data,
      hourly: hourlyRes.data,
      trend: trendRes.data,
      daily: dailyRes.data,
    })
  } catch (err: any) {
    console.error('performance api error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
