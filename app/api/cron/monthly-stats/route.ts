import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

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

// 毎月の最終日の夜（日本時間23:50）に、その月の数字を1行保存する。
// Vercel Cron は 28〜31日の毎日このURLを呼ぶが、「明日が1日」の日だけ保存する。
// 動作確認用に ?force=1 を付けると、今月分をその場で（途中経過として）保存する。
export async function GET(req: NextRequest) {
  // 1. 合言葉の確認（Vercel Cron は Authorization: Bearer <CRON_SECRET> を付けて呼ぶ）
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  // 2. 今日（日本時間）が月末か判定
  const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const tomorrowJst = new Date(nowJst.getTime() + 24 * 60 * 60 * 1000)
  const force = req.nextUrl.searchParams.get("force") === "1"
  if (tomorrowJst.getUTCDate() !== 1 && !force) {
    return NextResponse.json({ skipped: true, reason: "not the last day of month (JST)" })
  }

  const y = nowJst.getUTCFullYear()
  const m = String(nowJst.getUTCMonth() + 1).padStart(2, "0")
  const monthStartDate = `${y}-${m}-01`
  const since = new Date(`${monthStartDate}T00:00:00+09:00`).getTime()
  const until = Date.now()

  // 3. Vercel Analytics から今月のアクセス数を取得（失敗してもログイン人数は保存する）
  let traffic: {
    site: { pageviews: number; visitors: number }
    top: { pageviews: number; visitors: number }
  } | null = null
  let trafficError: string | null = null

  const vercelToken = process.env.VERCEL_ANALYTICS_TOKEN
  if (!vercelToken) {
    trafficError = "VERCEL_ANALYTICS_TOKEN is not set"
  } else {
    const project = process.env.VERCEL_ANALYTICS_PROJECT ?? "ryugekka"
    const slug = process.env.VERCEL_TEAM_SLUG ?? "aozorakarin-sketchs-projects"
    try {
      const [site, top] = await Promise.all([
        fetchCount(vercelToken, project, slug, since, until),
        fetchCount(vercelToken, project, slug, since, until, "requestPath eq '/top'"),
      ])
      traffic = { site, top }
    } catch (e) {
      console.error("monthly-stats: analytics fetch failed", e)
      trafficError = "analytics fetch failed"
    }
  }

  // 4. Supabase に保存（ログイン人数は関数の中で数える）
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  const { error } = await supabase.rpc("save_monthly_stats", {
    p_month: monthStartDate,
    p_site_visitors: traffic?.site.visitors ?? null,
    p_site_pageviews: traffic?.site.pageviews ?? null,
    p_top_visitors: traffic?.top.visitors ?? null,
    p_top_pageviews: traffic?.top.pageviews ?? null,
  })
  if (error) {
    console.error("monthly-stats: save failed", error)
    return NextResponse.json({ error: "save failed", detail: error.message }, { status: 500 })
  }

  return NextResponse.json({
    saved: true,
    month: monthStartDate,
    forced: force,
    traffic,
    trafficError,
  })
}
