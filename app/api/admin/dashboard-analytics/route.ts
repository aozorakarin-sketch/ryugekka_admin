import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

// ダッシュボードを見てよい人（先生3人）
const ALLOWED_EMAILS = [
  "aozora.karin@gmail.com",
  "tomo517ko@gmail.com",
  "bazvideo412@gmail.com",
]

const VERCEL_COUNT_URL = "https://api.vercel.com/v1/query/web-analytics/visits/count"

async function fetchCount(
  token: string,
  project: string,
  slug: string,
  since: number,
  until: number,
  filter?: string
): Promise<{ pageviews: number; visitors: number }> {
  const params = new URLSearchParams({
    projectId: project,
    slug,
    since: String(since),
    until: String(until),
  })
  if (filter) params.set("filter", filter)

  const res = await fetch(`${VERCEL_COUNT_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`Vercel API error: ${res.status}`)
  }
  const json = await res.json()
  return {
    pageviews: Number(json?.data?.pageviews ?? 0),
    visitors: Number(json?.data?.visitors ?? 0),
  }
}

export async function GET(req: NextRequest) {
  // 1. ログイン中の先生か確認
  const accessToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!accessToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
  if (authError || !user?.email || !ALLOWED_EMAILS.includes(user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  // 2. Vercel Analytics APIの設定
  const vercelToken = process.env.VERCEL_ANALYTICS_TOKEN
  if (!vercelToken) {
    return NextResponse.json({ error: "VERCEL_ANALYTICS_TOKEN is not set" }, { status: 500 })
  }
  const project = process.env.VERCEL_ANALYTICS_PROJECT ?? "ryugekka"
  const slug = process.env.VERCEL_TEAM_SLUG ?? "aozorakarin-sketchs-projects"

  // 3. 今月（日本時間）の1日0時〜今
  const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const y = nowJst.getUTCFullYear()
  const m = String(nowJst.getUTCMonth() + 1).padStart(2, "0")
  const since = new Date(`${y}-${m}-01T00:00:00+09:00`).getTime()
  const until = Date.now()

  try {
    const [site, top] = await Promise.all([
      fetchCount(vercelToken, project, slug, since, until),
      fetchCount(vercelToken, project, slug, since, until, "requestPath eq '/top'"),
    ])
    return NextResponse.json({ site, top })
  } catch (e) {
    console.error("dashboard-analytics error", e)
    return NextResponse.json({ error: "failed to fetch analytics" }, { status: 502 })
  }
}
