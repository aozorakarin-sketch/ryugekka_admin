"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "龍蓮" },
}

const TEACHER_MAP: Record<string, string> = {
  "3ba85bb9-9065-461b-b76b-cc488d4c0c3b": "龍蓮",
  "17cf0ca1-7526-466e-a644-9d3efefa4091": "椎名架月",
  "cd2c4101-2e24-4ae2-8d6a-507a943904af": "青空花林",
}

type UnreadReply = {
  id: string
  user_id: string
  subject: string
  user_reply: string | null
  user_replied_at: string | null
  handle_name: string
}

type Announcement = {
  id: string
  title: string
  teacher_id: string
  created_at: string
  is_important: boolean
  isRead: boolean
}

type NewsItem = {
  id: string
  title: string
  is_important: boolean
  is_published: boolean
  created_at: string
}

type Birthday = {
  user_id: string
  handle_name: string
  birth_date: string
  daysUntil: number
}

type UnrepliedReview = {
  id: string
  user_id: string
  handle_name: string
  satisfaction: number | null
  comment: string | null
  created_at: string
}

type YesterdaySummary = {
  consultation_count: number
  chat_count: number
  total_call_minutes: number
  avg_call_minutes: number
  consumed_points: number
  revenue_jpy: number
}

type MonthSummary = {
  consumed_points: number
  consumed_points_call: number
  consumed_points_mail: number
  consumed_points_chat: number
  revenue_jpy: number
}

type MonthShopSummary = {
  revenue_jpy: number
  order_count: number
}

type PendingShopOrder = {
  id: string
  quantity: number
  total_price: number
  recipient_name: string
  created_at: string
  product_name: string
}

type SiteLoginStats = {
  new_users: number
  logged_in_users: number
  total_users: number
}

type TrafficCount = {
  pageviews: number
  visitors: number
}

type AccessStats = {
  site: TrafficCount
  top: TrafficCount
}

type MonthlyStat = {
  month: string
  new_users: number
  logged_in_users: number | null
  total_users: number
  site_visitors: number | null
  site_pageviews: number | null
  top_visitors: number | null
  top_pageviews: number | null
  saved_at: string
}

function StatTile({ label, value, unit, sub }: { label: string; value: number | null; unit: string; sub?: string }) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-800 mt-0.5">
        {value === null ? "-" : value.toLocaleString()}
        <span className="text-xs font-normal text-gray-400 ml-1">{unit}</span>
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [teacherName, setTeacherName] = useState<string | null>(null)

  const [unreadReplies, setUnreadReplies] = useState<UnreadReply[]>([])
  const [unreadReplyCount, setUnreadReplyCount] = useState(0)
  const [loadingReplies, setLoadingReplies] = useState(true)

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [unreadAnnouncementCount, setUnreadAnnouncementCount] = useState(0)
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true)

  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [loadingNews, setLoadingNews] = useState(true)

  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [loadingBirthdays, setLoadingBirthdays] = useState(true)

  const [unrepliedReviews, setUnrepliedReviews] = useState<UnrepliedReview[]>([])
  const [unrepliedReviewCount, setUnrepliedReviewCount] = useState(0)
  const [loadingReviews, setLoadingReviews] = useState(true)

  const [yesterdaySummary, setYesterdaySummary] = useState<YesterdaySummary | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(true)

  const [monthSummary, setMonthSummary] = useState<MonthSummary | null>(null)
  const [monthShopSummary, setMonthShopSummary] = useState<MonthShopSummary | null>(null)
  const [pendingShopOrders, setPendingShopOrders] = useState<PendingShopOrder[]>([])
  const [loadingShopOrders, setLoadingShopOrders] = useState(true)

  const [siteLoginStats, setSiteLoginStats] = useState<SiteLoginStats | null>(null)
  const [loadingSiteStats, setLoadingSiteStats] = useState(true)
  const [accessStats, setAccessStats] = useState<AccessStats | null>(null)
  const [loadingAccessStats, setLoadingAccessStats] = useState(true)
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([])

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setLoadingReplies(false); setLoadingAnnouncements(false); setLoadingNews(false); setLoadingBirthdays(false); setLoadingReviews(false); setLoadingSummary(false); setLoadingShopOrders(false); setLoadingSiteStats(false); setLoadingAccessStats(false); return }
    const t = EMAIL_TO_TEACHER[user.email]
    if (!t) { setLoadingReplies(false); setLoadingAnnouncements(false); setLoadingNews(false); setLoadingBirthdays(false); setLoadingReviews(false); setLoadingSummary(false); setLoadingShopOrders(false); setLoadingSiteStats(false); setLoadingAccessStats(false); return }
    setMyUserId(user.id)
    setTeacherId(t.id)
    setTeacherName(t.name)

    await Promise.all([
      fetchUnreadReplies(t.id),
      fetchAnnouncements(t.id),
      fetchNews(),
      fetchBirthdays(t.id),
      fetchUnrepliedReviews(t.id),
      fetchYesterdaySummary(t.id),
      fetchMonthSummary(t.id),
      fetchMonthShopSummary(t.id),
      fetchPendingShopOrders(t.id),
      fetchSiteLoginStats(),
      fetchAccessStats(),
      fetchMonthlyStats(),
    ])
  }

  const fetchMonthlyStats = async () => {
    const { data, error } = await supabase.rpc("get_monthly_stats")
    if (!error && data) {
      setMonthlyStats(data as MonthlyStat[])
    }
  }

  const fetchSiteLoginStats = async () => {
    const { data, error } = await supabase.rpc("get_site_login_stats").single()
    if (!error && data) {
      setSiteLoginStats(data as SiteLoginStats)
    }
    setLoadingSiteStats(false)
  }

  const fetchAccessStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const res = await fetch("/api/admin/dashboard-analytics", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          setAccessStats(await res.json())
        }
      }
    } catch {
      // 取得できない場合は「-」表示のまま
    }
    setLoadingAccessStats(false)
  }

  const fetchUnreadReplies = async (myTeacherId: string) => {
    const { count } = await supabase
      .from("follow_mails")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", myTeacherId)
      .eq("is_user_replied", true)
      .eq("is_reply_read", false)

    setUnreadReplyCount(count ?? 0)

    const { data: replyData } = await supabase
      .from("follow_mails")
      .select("id, user_id, subject, user_reply, user_replied_at, users(handle_name)")
      .eq("teacher_id", myTeacherId)
      .eq("is_user_replied", true)
      .eq("is_reply_read", false)
      .order("user_replied_at", { ascending: false })
      .limit(20)

    const mapped: UnreadReply[] = (replyData ?? []).map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      subject: r.subject,
      user_reply: r.user_reply,
      user_replied_at: r.user_replied_at,
      handle_name: r.users?.handle_name ?? "-",
    }))
    setUnreadReplies(mapped)
    setLoadingReplies(false)
  }

  const fetchAnnouncements = async (myTeacherId: string) => {
    const { data: annData } = await supabase
      .from("announcements")
      .select("id, title, teacher_id, created_at, is_important")
      .order("created_at", { ascending: false })
      .limit(20)

    const { data: readData } = await supabase
      .from("announcement_reads")
      .select("announcement_id")
      .eq("teacher_id", myTeacherId)

    const readIds = new Set((readData ?? []).map((r: any) => r.announcement_id))

    const mapped: Announcement[] = (annData ?? []).map((a: any) => ({
      id: a.id,
      title: a.title,
      teacher_id: a.teacher_id,
      created_at: a.created_at,
      is_important: a.is_important,
      isRead: readIds.has(a.id),
    }))

    setAnnouncements(mapped)
    setUnreadAnnouncementCount(mapped.filter(a => !a.isRead).length)
    setLoadingAnnouncements(false)
  }

  const markAnnouncementRead = async (a: Announcement) => {
    if (a.isRead || !teacherId || !myUserId) return
    await supabase.from("announcement_reads").insert({
      announcement_id: a.id,
      teacher_id: teacherId,
      user_id: myUserId,
    })
    setAnnouncements(prev => prev.map(x => x.id === a.id ? { ...x, isRead: true } : x))
    setUnreadAnnouncementCount(c => Math.max(0, c - 1))
  }

  const fetchNews = async () => {
    const { data } = await supabase
      .from("news")
      .select("id, title, is_important, is_published, created_at")
      .order("created_at", { ascending: false })
      .limit(20)
    setNewsItems(data ?? [])
    setLoadingNews(false)
  }

  const daysUntilNextBirthday = (birthDate: string): number => {
    const [, m, d] = birthDate.split("-").map(Number)
    const today = new Date()
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    let next = new Date(today.getFullYear(), m - 1, d)
    if (next < todayMidnight) next = new Date(today.getFullYear() + 1, m - 1, d)
    return Math.round((next.getTime() - todayMidnight.getTime()) / 86400000)
  }

  const fetchBirthdays = async (myTeacherId: string) => {
    const [{ data: consultUsers }, { data: chatUsers }] = await Promise.all([
      supabase.from("consultations").select("user_id").eq("teacher_id", myTeacherId),
      supabase.from("chat_sessions").select("user_id").eq("teacher_id", myTeacherId),
    ])
    const userIds = Array.from(new Set([
      ...(consultUsers ?? []).map((r: any) => r.user_id),
      ...(chatUsers ?? []).map((r: any) => r.user_id),
    ]))

    if (userIds.length === 0) { setLoadingBirthdays(false); return }

    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, birth_date, users(handle_name)")
      .in("user_id", userIds)
      .not("birth_date", "is", null)

    const mapped: Birthday[] = (profiles ?? []).map((p: any) => ({
      user_id: p.user_id,
      handle_name: p.users?.handle_name ?? "-",
      birth_date: p.birth_date,
      daysUntil: daysUntilNextBirthday(p.birth_date),
    }))

    mapped.sort((a, b) => a.daysUntil - b.daysUntil)
    setBirthdays(mapped.slice(0, 20))
    setLoadingBirthdays(false)
  }

  const fetchUnrepliedReviews = async (myTeacherId: string) => {
    const { count } = await supabase
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", myTeacherId)
      .eq("is_replied", false)

    setUnrepliedReviewCount(count ?? 0)

    const { data } = await supabase
      .from("reviews")
      .select("id, user_id, satisfaction, comment, created_at, users(handle_name)")
      .eq("teacher_id", myTeacherId)
      .eq("is_replied", false)
      .order("created_at", { ascending: false })
      .limit(20)

    const mapped: UnrepliedReview[] = (data ?? []).map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      handle_name: r.users?.handle_name ?? "-",
      satisfaction: r.satisfaction,
      comment: r.comment,
      created_at: r.created_at,
    }))
    setUnrepliedReviews(mapped)
    setLoadingReviews(false)
  }

  const fetchYesterdaySummary = async (myTeacherId: string) => {
    const { data, error } = await supabase
      .rpc("get_yesterday_summary", { p_teacher_id: myTeacherId })
      .single()
    if (!error && data) {
      setYesterdaySummary(data as YesterdaySummary)
    }
    setLoadingSummary(false)
  }

  const fetchMonthSummary = async (myTeacherId: string) => {
    const { data, error } = await supabase
      .rpc("get_month_summary", { p_teacher_id: myTeacherId })
      .single()
    if (!error && data) {
      setMonthSummary(data as MonthSummary)
    }
  }

  const fetchMonthShopSummary = async (myTeacherId: string) => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const { data } = await supabase
      .from("shop_orders")
      .select("total_price")
      .eq("teacher_id", myTeacherId)
      .in("status", ["paid", "shipped"])
      .gte("paid_at", monthStart)

    const rows = data ?? []
    setMonthShopSummary({
      revenue_jpy: rows.reduce((sum: number, r: any) => sum + (r.total_price ?? 0), 0),
      order_count: rows.length,
    })
  }

  const fetchPendingShopOrders = async (myTeacherId: string) => {
    const { data } = await supabase
      .from("shop_orders")
      .select("id, quantity, total_price, recipient_name, created_at, shop_products(name)")
      .eq("teacher_id", myTeacherId)
      .eq("status", "paid")
      .order("paid_at", { ascending: true })
      .limit(20)

    const mapped: PendingShopOrder[] = (data ?? []).map((o: any) => ({
      id: o.id,
      quantity: o.quantity,
      total_price: o.total_price,
      recipient_name: o.recipient_name,
      created_at: o.created_at,
      product_name: o.shop_products?.name ?? "-",
    }))
    setPendingShopOrders(mapped)
    setLoadingShopOrders(false)
  }

  const formatDate = (s: string | null) => {
    if (!s) return "-"
    const d = new Date(s)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
  }

  const formatBirthDate = (s: string) => {
    const [y, m, d] = s.split("-").map(Number)
    return `${y}年${m}月${d}日`
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">ダッシュボード</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-2">
        {teacherName ? `ようこそ！${teacherName}先生！龍月花管理画面へ！` : "ようこそ、龍月花管理画面へ！"}
      </p>
      {(monthSummary || monthShopSummary) && (
        <div className="text-sm text-gray-500 mb-6 space-y-1">
          {monthSummary && (
            <>
              <p>
                {new Date().getMonth() + 1}月のトラカ売上：
                <span className="font-medium text-gray-700">{monthSummary.revenue_jpy.toLocaleString()}円</span>
              </p>
              <p>
                {new Date().getMonth() + 1}月の消費トラカ：
                <span className="font-medium text-gray-700">{monthSummary.consumed_points.toLocaleString()}トラカ</span>
                <span className="text-xs text-gray-400 ml-1">
                  （電話{monthSummary.consumed_points_call.toLocaleString()} / メール{monthSummary.consumed_points_mail.toLocaleString()} / チャット{monthSummary.consumed_points_chat.toLocaleString()}）
                </span>
              </p>
            </>
          )}
          {monthShopSummary && (
            <p>
              {new Date().getMonth() + 1}月のショップ売上：
              <span className="font-medium text-gray-700">{monthShopSummary.revenue_jpy.toLocaleString()}円</span>
              <span className="text-xs text-gray-400 ml-1">
                （注文{monthShopSummary.order_count.toLocaleString()}件）
              </span>
            </p>
          )}
          {monthSummary && monthShopSummary && (
            <p>
              {new Date().getMonth() + 1}月の総売上：
              <span className="font-bold text-gray-800">
                {(monthSummary.revenue_jpy + monthShopSummary.revenue_jpy).toLocaleString()}円
              </span>
            </p>
          )}
        </div>
      )}

      {/* アクセス・ログイン（月ごと） */}
      <div className="border rounded-lg bg-white overflow-hidden max-w-4xl mb-4">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h2 className="font-bold text-sm">{new Date().getMonth() + 1}月のアクセス・ログイン</h2>
        </div>
        {(loadingSiteStats || loadingAccessStats) ? (
          <div className="p-4 text-sm text-gray-400">読み込み中...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 divide-x border-b">
              <StatTile label="新規ログイン数" value={siteLoginStats?.new_users ?? null} unit="人" sub="今月はじめてログイン" />
              <StatTile label="今月ログインした人数" value={siteLoginStats?.logged_in_users ?? null} unit="人" sub="今月1回以上ログイン" />
              <StatTile label="全体ログイン数（累計）" value={siteLoginStats?.total_users ?? null} unit="人" sub="これまでの登録者合計" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x">
              <StatTile label="TOPページ 訪問者数" value={accessStats?.top.visitors ?? null} unit="人" />
              <StatTile label="TOPページ 閲覧数" value={accessStats?.top.pageviews ?? null} unit="PV" />
              <StatTile label="サイト全体 訪問者数" value={accessStats?.site.visitors ?? null} unit="人" />
              <StatTile label="サイト全体 閲覧数" value={accessStats?.site.pageviews ?? null} unit="PV" />
            </div>
            <p className="px-4 py-2 text-xs text-gray-400 border-t">
              ※アクセス数はVercel Analytics（計測開始日以降・本番のみ）。ログイン人数はSupabase認証の記録です。
            </p>
          </>
        )}
      </div>

      {/* 過去の月ごとの記録（毎月末に自動保存） */}
      <div className="border rounded-lg bg-white overflow-hidden max-w-4xl mb-4">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h2 className="font-bold text-sm">月ごとの記録</h2>
        </div>
        {monthlyStats.length === 0 ? (
          <div className="p-4 text-sm text-gray-400">毎月末の夜に自動で保存されます（まだ記録はありません）</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="text-left font-normal px-4 py-2">月</th>
                  <th className="text-right font-normal px-3 py-2">新規ログイン</th>
                  <th className="text-right font-normal px-3 py-2">ログインした人</th>
                  <th className="text-right font-normal px-3 py-2">累計登録者</th>
                  <th className="text-right font-normal px-3 py-2">TOP訪問者</th>
                  <th className="text-right font-normal px-3 py-2">TOP閲覧</th>
                  <th className="text-right font-normal px-3 py-2">全体訪問者</th>
                  <th className="text-right font-normal px-4 py-2">全体閲覧</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {monthlyStats.map(s => {
                  const [yy, mm] = s.month.split("-")
                  const num = (v: number | null) => (v === null ? "-" : v.toLocaleString())
                  return (
                    <tr key={s.month}>
                      <td className="px-4 py-2 whitespace-nowrap">{yy}年{Number(mm)}月</td>
                      <td className="px-3 py-2 text-right">{num(s.new_users)}</td>
                      <td className="px-3 py-2 text-right">{num(s.logged_in_users)}</td>
                      <td className="px-3 py-2 text-right">{num(s.total_users)}</td>
                      <td className="px-3 py-2 text-right">{num(s.top_visitors)}</td>
                      <td className="px-3 py-2 text-right">{num(s.top_pageviews)}</td>
                      <td className="px-3 py-2 text-right">{num(s.site_visitors)}</td>
                      <td className="px-4 py-2 text-right">{num(s.site_pageviews)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="px-4 py-2 text-xs text-gray-400 border-t">
          ※各月の最終日の夜に保存した数字です。アクセス数は計測開始日（11/9）以降の分です。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">

        {/* お知らせ */}
        <div className="border rounded-lg bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-bold text-sm">お知らせ</h2>
            {unreadAnnouncementCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                未読 {unreadAnnouncementCount}件
              </span>
            )}
          </div>

          {loadingAnnouncements ? (
            <div className="p-4 text-sm text-gray-400">読み込み中...</div>
          ) : announcements.length === 0 ? (
            <div className="p-4 text-sm text-gray-400">お知らせはありません</div>
          ) : (
            <div className="divide-y max-h-56 overflow-y-auto">
              {announcements.map(a => (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50"
                  onClick={() => markAnnouncementRead(a)}
                >
                  <div className="min-w-0 flex items-center gap-2">
                    {!a.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    )}
                    <span className="text-xs text-gray-400 flex-shrink-0">{TEACHER_MAP[a.teacher_id] ?? "-"}</span>
                    <p className={`text-sm truncate ${a.isRead ? "text-gray-600" : "font-medium"}`}>{a.title}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-3">{formatDate(a.created_at)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="px-4 py-2 border-t">
            <button
              onClick={() => router.push(`/admin/announcements`)}
              className="text-sm text-teal-600 hover:text-teal-700"
            >
              一覧へ →
            </button>
          </div>
        </div>

        {/* ニュース管理 */}
        <div className="border rounded-lg bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-bold text-sm">ニュース管理</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {newsItems.length}件
            </span>
          </div>

          {loadingNews ? (
            <div className="p-4 text-sm text-gray-400">読み込み中...</div>
          ) : newsItems.length === 0 ? (
            <div className="p-4 text-sm text-gray-400">ニュースはありません</div>
          ) : (
            <div className="divide-y max-h-56 overflow-y-auto">
              {newsItems.map(n => (
                <div
                  key={n.id}
                  className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/admin/news`)}
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${n.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {n.is_published ? "公開中" : "非公開"}
                    </span>
                    {n.is_important && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex-shrink-0">
                        重要
                      </span>
                    )}
                    <p className="text-sm truncate">{n.title}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-3">{formatDate(n.created_at)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="px-4 py-2 border-t">
            <button
              onClick={() => router.push(`/admin/news`)}
              className="text-sm text-teal-600 hover:text-teal-700"
            >
              一覧へ →
            </button>
          </div>
        </div>

        {/* 誕生日 */}
        <div className="border rounded-lg bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-bold text-sm">誕生日</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {birthdays.length}人
            </span>
          </div>

          {loadingBirthdays ? (
            <div className="p-4 text-sm text-gray-400">読み込み中...</div>
          ) : birthdays.length === 0 ? (
            <div className="p-4 text-sm text-gray-400">誕生日の登録があるユーザーがいません</div>
          ) : (
            <div className="divide-y max-h-56 overflow-y-auto">
              {birthdays.map(b => (
                <div
                  key={b.user_id}
                  className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/admin/users/${b.user_id}`)}
                >
                  <div className="min-w-0 flex items-center gap-2">
                    {b.daysUntil === 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 flex-shrink-0">
                        本日🎂
                      </span>
                    )}
                    <p className="text-sm truncate">{b.handle_name}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-3">{formatBirthDate(b.birth_date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ユーザーレビュー */}
        <div className="border rounded-lg bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-bold text-sm">ユーザーレビュー</h2>
            {unrepliedReviewCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                未返信 {unrepliedReviewCount}件
              </span>
            )}
          </div>

          {loadingReviews ? (
            <div className="p-4 text-sm text-gray-400">読み込み中...</div>
          ) : unrepliedReviews.length === 0 ? (
            <div className="p-4 text-sm text-gray-400">未返信のレビューはありません</div>
          ) : (
            <div className="divide-y max-h-56 overflow-y-auto">
              {unrepliedReviews.map(r => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/admin/reviews`)}
                >
                  <div className="min-w-0 flex items-center gap-2">
                    {r.satisfaction != null && (
                      <span className="text-xs text-amber-500 flex-shrink-0">★{r.satisfaction}</span>
                    )}
                    <p className="text-sm truncate">{r.handle_name}：{r.comment}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-3">{formatDate(r.created_at)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="px-4 py-2 border-t">
            <button
              onClick={() => router.push(`/admin/reviews`)}
              className="text-sm text-teal-600 hover:text-teal-700"
            >
              一覧へ →
            </button>
          </div>
        </div>

        {/* フォローメールへの返信 */}
        <div className="border rounded-lg bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-bold text-sm">フォローメールへの返信</h2>
            {unreadReplyCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                未読 {unreadReplyCount}件
              </span>
            )}
          </div>

          {loadingReplies ? (
            <div className="p-4 text-sm text-gray-400">読み込み中...</div>
          ) : unreadReplies.length === 0 ? (
            <div className="p-4 text-sm text-gray-400">未読の返信はありません</div>
          ) : (
            <div className="divide-y max-h-56 overflow-y-auto">
              {unreadReplies.map(r => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/admin/follow-mails/user/${r.user_id}?teacherId=${teacherId}`)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.handle_name}</p>
                    <p className="text-xs text-gray-500 truncate max-w-xs">{r.user_reply}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-3">{formatDate(r.user_replied_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ショップ注文（未発送） */}
        <div className="border rounded-lg bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-bold text-sm">ショップ注文（未発送）</h2>
            {pendingShopOrders.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                {pendingShopOrders.length}件
              </span>
            )}
          </div>

          {loadingShopOrders ? (
            <div className="p-4 text-sm text-gray-400">読み込み中...</div>
          ) : pendingShopOrders.length === 0 ? (
            <div className="p-4 text-sm text-gray-400">未発送の注文はありません</div>
          ) : (
            <div className="divide-y max-h-56 overflow-y-auto">
              {pendingShopOrders.map(o => (
                <div
                  key={o.id}
                  className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/admin/shop`)}
                >
                  <div className="min-w-0">
                    <p className="text-sm truncate">{o.product_name} × {o.quantity}</p>
                    <p className="text-xs text-gray-400 truncate">{o.recipient_name} 様　¥{o.total_price.toLocaleString()}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-3">{formatDate(o.created_at)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="px-4 py-2 border-t">
            <button
              onClick={() => router.push(`/admin/shop`)}
              className="text-sm text-teal-600 hover:text-teal-700"
            >
              ショップ管理へ →
            </button>
          </div>
        </div>

        {/* 前日成果 */}
        <div className="border rounded-lg bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-bold text-sm">前日成果</h2>
          </div>

          {loadingSummary ? (
            <div className="p-4 text-sm text-gray-400">読み込み中...</div>
          ) : !yesterdaySummary ? (
            <div className="p-4 text-sm text-gray-400">取得できませんでした</div>
          ) : (
            <div className="divide-y">
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-gray-600">鑑定回数</span>
                <span className="text-sm font-medium">
                  {yesterdaySummary.consultation_count + yesterdaySummary.chat_count} 回
                  <span className="text-xs text-gray-400 ml-1">
                    （通話・メール{yesterdaySummary.consultation_count} / チャット{yesterdaySummary.chat_count}）
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-gray-600">消費トラカ</span>
                <span className="text-sm font-medium">{yesterdaySummary.consumed_points.toLocaleString()} トラカ</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-gray-600">売上金額</span>
                <span className="text-sm font-medium">{yesterdaySummary.revenue_jpy.toLocaleString()} 円</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-gray-600">通話分数</span>
                <span className="text-sm font-medium">
                  合計{yesterdaySummary.total_call_minutes}分
                  <span className="text-xs text-gray-400 ml-1">
                    （平均{Math.round(yesterdaySummary.avg_call_minutes)}分）
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
