"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import ConsultationModal from "@/components/ConsultationModal"

const TEACHER_MAP: Record<string, string> = {
  "e482fff7-25db-483d-8d68-46a893403be3": "宝明里茉",
  "3ba85bb9-9065-461b-b76b-cc488d4c0c3b": "雲龍蓮",
  "17cf0ca1-7526-466e-a644-9d3efefa4091": "椎名架月",
  "cd2c4101-2e24-4ae2-8d6a-507a943904af": "青空花林",
}

const SLUG_TO_TEACHER_ID: Record<string, string> = {
  hana: "cd2c4101-2e24-4ae2-8d6a-507a943904af",
  ryu: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b",
  tsuki: "17cf0ca1-7526-466e-a644-9d3efefa4091",
}

const TEACHER_ID_TO_SLUG: Record<string, string> = {
  "cd2c4101-2e24-4ae2-8d6a-507a943904af": "hana",
  "3ba85bb9-9065-461b-b76b-cc488d4c0c3b": "ryu",
  "17cf0ca1-7526-466e-a644-9d3efefa4091": "tsuki",
}

const CATEGORY_OPTIONS = [
  { value: "", label: "-" },
  { value: "love", label: "恋愛" },
  { value: "work", label: "仕事" },
  { value: "relationship", label: "人間関係" },
  { value: "spiritual", label: "スピリチュアル" },
  { value: "orther", label: "その他" },
]

const CATEGORY_CHILD_OPTIONS: Record<string, { value: string; label: string }[]> = {
  love: [
    { value: "片思い", label: "片思い" },
    { value: "両想い", label: "両想い" },
    { value: "復縁", label: "復縁" },
    { value: "不倫", label: "不倫" },
    { value: "W不倫", label: "W不倫" },
    { value: "浮気", label: "浮気" },
    { value: "結婚", label: "結婚" },
    { value: "離婚", label: "離婚" },
  ],
  work: [
    { value: "転職", label: "転職" },
    { value: "適職", label: "適職" },
    { value: "就職", label: "就職" },
    { value: "出世", label: "出世" },
  ],
  relationship: [
    { value: "職場", label: "職場" },
    { value: "夫婦", label: "夫婦" },
    { value: "親子", label: "親子" },
    { value: "兄弟・姉妹", label: "兄弟・姉妹" },
    { value: "親族", label: "親族" },
    { value: "育児", label: "育児" },
    { value: "シングルマザー", label: "シングルマザー" },
  ],
  spiritual: [
    { value: "開運", label: "開運" },
    { value: "夢占い", label: "夢占い" },
    { value: "霊的問題", label: "霊的問題" },
    { value: "ヒーリング", label: "ヒーリング" },
  ],
  orther: [
    { value: "引っ越し", label: "引っ越し" },
    { value: "姓名判断", label: "姓名判断" },
    { value: "吉方位", label: "吉方位" },
    { value: "ペット", label: "ペット" },
  ],
}

const WORRY_OPTIONS = [
  { value: "", label: "-" },
  { value: "間もなく解決", label: "間もなく解決" },
  { value: "時間をかけて解決", label: "時間をかけて解決" },
  { value: "解決不可", label: "解決不可" },
]

const MARRIAGE_OPTIONS = [
  { value: "", label: "-" },
  { value: "未婚", label: "未婚" },
  { value: "結婚", label: "結婚" },
  { value: "離婚", label: "離婚" },
]

const CHILD_OPTIONS = [
  { value: "", label: "-" },
  { value: "有", label: "有" },
  { value: "無", label: "無" },
]

const WORK_OPTIONS = [
  { value: "", label: "-" },
  { value: "接客業", label: "接客業" },
  { value: "経営者", label: "経営者" },
  { value: "会社員", label: "会社員" },
  { value: "公務員", label: "公務員" },
  { value: "個人事業主", label: "個人事業主" },
  { value: "会社役員", label: "会社役員" },
  { value: "自由業", label: "自由業" },
  { value: "専業主婦・主夫", label: "専業主婦・主夫" },
  { value: "学生", label: "学生" },
  { value: "アルバイト/パート", label: "アルバイト/パート" },
  { value: "無職", label: "無職" },
  { value: "その他", label: "その他" },
]

const SALARY_OPTIONS = [
  { value: "", label: "-" },
  { value: "200万円未満", label: "200万円未満" },
  { value: "200万円～400万円", label: "200万円～400万円" },
  { value: "400万円～600万円", label: "400万円～600万円" },
  { value: "600万円～800万円", label: "600万円～800万円" },
  { value: "800万円～1,000万円", label: "800万円～1,000万円" },
  { value: "1,000万円以上", label: "1,000万円以上" },
]

type Consultation = {
  id: string
  started_at: string
  ended_at: string
  teacher_id: string
  call_duration: number
  price: number
  recording_url: string | null
  signed_url: string | null
  data_source: string | null
}

type Memo = {
  id: string | null
  memo: string
  category: string
  category_child: string
  worry_status: string
  marriage: string
  child: string
  work: string
  salary: string
  partner: string
}

type UserProfile = {
  birth_date: string
  gender: string
}

function SourceBadge({ dataSource }: { dataSource: string | null }) {
  if (dataSource === "mail") return <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs font-medium">メール</span>
  if (dataSource === "ryugekka") return <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">電話</span>
  if (dataSource === "chat") return <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">チャット</span>
  if (dataSource === "minden") return <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">みんでん</span>
  return <span className="text-gray-400 text-xs">-</span>
}

export default function UserDetailPage() {
  const { id, teacherSlug } = useParams() as { id: string; teacherSlug: string }
  const pageTeacherId = SLUG_TO_TEACHER_ID[teacherSlug] ?? null

  const [handleName, setHandleName] = useState("")
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [memo, setMemo] = useState<Memo>({
    id: null, memo: "", category: "", category_child: "",
    worry_status: "", marriage: "", child: "", work: "", salary: "", partner: ""
  })
  const [profile, setProfile] = useState<UserProfile>({ birth_date: "", gender: "" })
  const [followMailCount, setFollowMailCount] = useState(0)
  const [followMailLastAt, setFollowMailLastAt] = useState<string | null>(null)
  const [reviewCount, setReviewCount] = useState(0)
  const [reviewLastAt, setReviewLastAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  const [myTeacherId, setMyTeacherId] = useState<string | null>(null)
  const [userPoints, setUserPoints] = useState<{ teacher_id: string; points: number }[]>([])
  const [hasApiKey, setHasApiKey] = useState(false)
  const [hasGeminiKey, setHasGeminiKey] = useState(false)
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null)

  // ログイン先生がページの先生と同じなら編集可
  const canEdit = !!myTeacherId && myTeacherId === pageTeacherId

  useEffect(() => {
    fetchAll()
  }, [id, teacherSlug])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (user?.email) {
      const { data: teacher } = await supabase
        .from("teachers")
        .select("id, openai_api_key, gemini_api_key")
        .eq("email", user.email)
        .single()
      setMyTeacherId(teacher?.id ?? null)
      setHasApiKey(!!teacher?.openai_api_key)
      setHasGeminiKey(!!teacher?.gemini_api_key)
    }

    // ユーザー名
    const { data: userData } = await supabase
      .from("users")
      .select("handle_name")
      .eq("id", id)
      .single()
    setHandleName(userData?.handle_name ?? "-")

    // 先生の料金マップ
    const { data: teachersData } = await supabase
      .from("teachers")
      .select("id, price_per_min")
    const priceMap: Record<string, number> = {}
    teachersData?.forEach(t => { priceMap[t.id] = t.price_per_min ?? 0 })

    // 鑑定履歴（このページの先生分のみ）
    if (pageTeacherId) {
      const { data: cons } = await supabase
        .from("consultations")
        .select(`id, started_at, ended_at, teacher_id, call_duration, price, data_source, call_recordings(recording_url)`)
        .eq("user_id", id)
        .eq("teacher_id", pageTeacherId)
        .order("started_at", { ascending: false })

      const consultationListRaw = (cons ?? []).map((c: any) => ({
        ...c,
        recording_url: c.call_recordings?.[0]?.recording_url ?? null,
        signed_url: null as string | null,
        price: (c.price != null && c.price > 0)
          ? c.price
          : (c.call_duration ?? 0) * (priceMap[c.teacher_id] ?? 0),
        data_source: c.data_source ?? null,
      }))

      const consultationList = await Promise.all(
        consultationListRaw.map(async (c) => {
          if (!c.recording_url) return c
          const { data } = await supabase.storage
            .from("recordings")
            .createSignedUrl(c.recording_url, 60 * 60)
          return { ...c, signed_url: data?.signedUrl ?? null }
        })
      )
      setConsultations(consultationList)

      // teacher_memos（このページの先生分のみ）
      const { data: memoDataList } = await supabase
        .from("teacher_memos")
        .select("*")
        .eq("user_id", id)
        .eq("teacher_id", pageTeacherId)
        .order("created_at", { ascending: false })
        .limit(1)
      const memoData = memoDataList?.[0] ?? null
      if (memoData) {
        setMemo({
          id: memoData.id,
          memo: memoData.memo ?? "",
          category: memoData.category ?? "",
          category_child: memoData.category_child ?? "",
          worry_status: memoData.worry_status ?? "",
          marriage: memoData.marriage ?? "",
          child: memoData.child ?? "",
          work: memoData.work ?? "",
          salary: memoData.salary ?? "",
          partner: memoData.partner ?? "",
        })
      }

      // フォローメール（このページの先生分のみ）
      const { count: fCount, data: fData } = await supabase
        .from("follow_mails")
        .select("sent_at", { count: "exact" })
        .eq("user_id", id)
        .eq("teacher_id", pageTeacherId)
        .eq("is_draft", false)
        .order("sent_at", { ascending: false })
        .limit(1)
      setFollowMailCount(fCount ?? 0)
      setFollowMailLastAt(fData?.[0]?.sent_at ?? null)

      // レビュー（このページの先生分のみ）
      const { count: rCount, data: rData } = await supabase
        .from("reviews")
        .select("created_at", { count: "exact" })
        .eq("user_id", id)
        .eq("teacher_id", pageTeacherId)
        .order("created_at", { ascending: false })
        .limit(1)
      setReviewCount(rCount ?? 0)
      setReviewLastAt(rData?.[0]?.created_at ?? null)
    }

    // user_profiles
    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("birth_date, gender")
      .eq("user_id", id)
      .maybeSingle()
    if (profileData) {
      setProfile({
        birth_date: profileData.birth_date ?? "",
        gender: profileData.gender ?? "",
      })
    }

    // user_points（全先生分）
    const { data: pointsData } = await supabase
      .from("user_points")
      .select("teacher_id, points")
      .eq("user_id", id)
    setUserPoints(pointsData ?? [])

    setLoading(false)
  }

  const saveMemo = async () => {
    if (!canEdit || !pageTeacherId) return
    setSaving(true)
    if (memo.id) {
      await supabase.from("teacher_memos").update({
        memo: memo.memo,
        category: memo.category,
        category_child: memo.category_child,
        worry_status: memo.worry_status,
        marriage: memo.marriage,
        child: memo.child,
        work: memo.work,
        salary: memo.salary,
        partner: memo.partner,
        updated_at: new Date().toISOString(),
      }).eq("id", memo.id)
    } else {
      await supabase.from("teacher_memos").insert({
        user_id: id,
        teacher_id: pageTeacherId,
        memo: memo.memo,
        category: memo.category,
        category_child: memo.category_child,
        worry_status: memo.worry_status,
        marriage: memo.marriage,
        child: memo.child,
        work: memo.work,
        salary: memo.salary,
        partner: memo.partner,
        data_source: "google",
      })
    }
    setSaving(false)
    fetchAll()
  }

  const saveProfile = async () => {
    if (!canEdit) return
    setSavingProfile(true)
    const { data: existing } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("user_id", id)
      .maybeSingle()

    if (existing) {
      await supabase.from("user_profiles").update({
        birth_date: profile.birth_date || null,
        gender: profile.gender || null,
        updated_at: new Date().toISOString(),
      }).eq("user_id", id)
    } else {
      await supabase.from("user_profiles").insert({
        user_id: id,
        birth_date: profile.birth_date || null,
        gender: profile.gender || null,
        data_source: "google",
      })
    }
    setSavingProfile(false)
  }

  const totalMinutes = consultations.reduce((s, c) => s + (c.call_duration ?? 0), 0)
  const totalConsumedPt = consultations.reduce((s, c) => s + (c.price ?? 0), 0)
  const avgMinutes = consultations.length > 0 ? (totalMinutes / consultations.length).toFixed(1) : "0"
  const firstAt = consultations.length > 0 ? consultations[consultations.length - 1].started_at : null
  const lastAt = consultations.length > 0 ? consultations[0].started_at : null

  const formatDate = (s: string | null) => {
    if (!s) return "-"
    const d = new Date(s)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
  }

  const buildFileName = (started_at: string) => {
    const d = new Date(started_at)
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    const h = String(d.getHours()).padStart(2, "0")
    const min = String(d.getMinutes()).padStart(2, "0")
    return `${handleName}_${y}${mo}${day}_${h}${min}.webm`
  }

  const handleDownload = async (signedUrl: string, started_at: string) => {
    const res = await fetch(signedUrl)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = buildFileName(started_at)
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectClass = (disabled: boolean) =>
    `w-full border rounded px-2 py-1 mt-1 text-sm ${disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white"}`

  if (loading) return <div className="p-6">読み込み中...</div>

  const pageTeacherName = TEACHER_MAP[pageTeacherId ?? ""] ?? "-"

  return (
    <>
    <div className="p-6 flex gap-6">
      <div className="w-64 shrink-0">
        <div className="border rounded-lg p-4 bg-white">
          <h2 className="font-bold text-lg mb-1">{handleName}</h2>
          <div className="text-xs text-gray-500 mb-1">{pageTeacherName}の担当</div>
          <a href={`/admin/users/${id}`} className="text-xs text-gray-400 hover:underline">← 先生一覧に戻る</a>

          {!canEdit && (
            <div className="mt-2 text-xs text-amber-600 bg-amber-50 rounded p-2">
              閲覧のみ（担当外）
            </div>
          )}

          <div className="mt-4 space-y-3 text-sm">
            <div className="bg-pink-50 rounded p-3">
              <div className="font-medium text-pink-800 mb-2">鑑定</div>
              <div className="space-y-1 text-gray-700">
                <div className="flex justify-between"><span>回数</span><span className="bg-blue-100 text-blue-800 px-2 rounded-full text-xs font-medium">{consultations.length}回</span></div>
                <div className="flex justify-between"><span>合計分数</span><span>{totalMinutes}分</span></div>
                <div className="flex justify-between"><span>平均分数</span><span>{avgMinutes}分</span></div>
                <div className="flex justify-between"><span>消費pt合計</span><span className="font-bold text-pink-700">{totalConsumedPt.toLocaleString()}pt</span></div>
                <div className="flex justify-between"><span>最終日時</span><span className="text-xs">{formatDate(lastAt)}</span></div>
                <div className="flex justify-between"><span>初回日時</span><span className="text-xs">{formatDate(firstAt)}</span></div>
              </div>
            </div>

            <div className="bg-green-50 rounded p-3">
              <div className="font-medium text-green-800 mb-2">保有ポイント</div>
              <div className="space-y-1 text-gray-700">
                {userPoints.length === 0 && <div className="text-xs text-gray-400">ポイントなし</div>}
                {userPoints.map(up => (
                  <div key={up.teacher_id} className="flex justify-between">
                    <span className="text-xs">{TEACHER_MAP[up.teacher_id] ?? up.teacher_id}</span>
                    <span className="font-bold text-green-700">{up.points.toLocaleString()}pt</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-purple-50 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-purple-800">プロフィール</div>
                <button
                  onClick={saveProfile}
                  disabled={savingProfile || !canEdit}
                  className={`text-xs px-2 py-0.5 rounded text-white ${canEdit ? "bg-purple-500 hover:bg-purple-600" : "bg-gray-300 cursor-not-allowed"}`}
                >
                  {savingProfile ? "保存中..." : "保存"}
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <label className="text-xs text-gray-500">誕生日</label>
                  <input
                    type="date"
                    className={`w-full border rounded px-2 py-1 mt-1 text-xs ${canEdit ? "bg-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                    value={profile.birth_date}
                    onChange={e => canEdit && setProfile({...profile, birth_date: e.target.value})}
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">性別</label>
                  <select
                    className={`w-full border rounded px-2 py-1 mt-1 text-xs ${canEdit ? "bg-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                    value={profile.gender}
                    onChange={e => canEdit && setProfile({...profile, gender: e.target.value})}
                    disabled={!canEdit}
                  >
                    <option value="">-</option>
                    <option value="女性">女性</option>
                    <option value="男性">男性</option>
                    <option value="その他">その他</option>
                    <option value="回答しない">回答しない</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-yellow-800">フォローメール</div>
                <div className="flex gap-1">
                  <a href={`/admin/follow-mails/user/${id}`} className="text-xs bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-0.5 rounded">一覧</a>
                  {canEdit ? (
                    <a href={`/admin/follow-mails/new/${id}`} className="text-xs bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-0.5 rounded">作成</a>
                  ) : (
                    <span className="text-xs bg-gray-300 text-white px-2 py-0.5 rounded cursor-not-allowed">作成</span>
                  )}
                </div>
              </div>
              <div className="space-y-1 text-gray-700">
                <div className="flex justify-between"><span>送信数</span><span>{followMailCount}件</span></div>
                <div className="flex justify-between"><span>最終日時</span><span className="text-xs">{formatDate(followMailLastAt)}</span></div>
              </div>
            </div>

            <div className="bg-blue-50 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-blue-800">レビュー</div>
                <a href={`/admin/reviews/user/${id}`} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-0.5 rounded">一覧</a>
              </div>
              <div className="space-y-1 text-gray-700">
                <div className="flex justify-between"><span>件数</span><span>{reviewCount}件</span></div>
                <div className="flex justify-between"><span>最終日時</span><span className="text-xs">{formatDate(reviewLastAt)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6">
        <div className="border rounded-lg p-4 bg-white">
          <h3 className="font-bold mb-3">鑑定履歴（{consultations.length}回）</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">開始日時</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">先生</th>
                  <th className="text-center px-3 py-2 font-medium whitespace-nowrap">種別</th>
                  <th className="text-center px-3 py-2 font-medium whitespace-nowrap">分数</th>
                  <th className="text-center px-3 py-2 font-medium whitespace-nowrap">消費pt</th>
                  <th className="text-center px-3 py-2 font-medium whitespace-nowrap">音声</th>
                  <th className="text-center px-3 py-2 font-medium whitespace-nowrap">鑑定メモ</th>
                </tr>
              </thead>
              <tbody>
                {consultations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-gray-400 text-sm">
                      鑑定履歴がありません
                    </td>
                  </tr>
                ) : (
                  consultations.map((c, i) => (
                    <tr key={c.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(c.started_at)}</td>
                      <td className="px-3 py-2 text-xs">{TEACHER_MAP[c.teacher_id] ?? "-"}</td>
                      <td className="px-3 py-2 text-center"><SourceBadge dataSource={c.data_source} /></td>
                      <td className="px-3 py-2 text-center">{c.call_duration}分</td>
                      <td className="px-3 py-2 text-center">{(c.price ?? 0).toLocaleString()}pt</td>
                      <td className="px-3 py-2 text-center">
                        {c.signed_url
                          ? <span className="text-xs text-teal-600 font-medium">🎵 あり</span>
                          : <span className="text-gray-400 text-xs">-</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => setSelectedConsultation(c)}
                          className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-2 py-0.5 rounded"
                        >入</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">ユーザーメモ</h3>
            <button
              onClick={saveMemo}
              disabled={saving || !canEdit}
              className={`text-sm px-4 py-1.5 rounded text-white ${canEdit ? "bg-teal-500 hover:bg-teal-600" : "bg-gray-300 cursor-not-allowed"}`}
            >
              {saving ? "保存中..." : "更新"}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
            <div>
              <label className="text-xs text-gray-500">相談ジャンル</label>
              <select className={selectClass(!canEdit)} value={memo.category} onChange={e => canEdit && setMemo({...memo, category: e.target.value, category_child: ""})} disabled={!canEdit}>
                {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">詳細ジャンル</label>
              <select className={selectClass(!canEdit)} value={memo.category_child} onChange={e => canEdit && setMemo({...memo, category_child: e.target.value})} disabled={!canEdit}>
                <option value="">-</option>
                {(CATEGORY_CHILD_OPTIONS[memo.category] ?? []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">悩みの状況</label>
              <select className={selectClass(!canEdit)} value={memo.worry_status} onChange={e => canEdit && setMemo({...memo, worry_status: e.target.value})} disabled={!canEdit}>
                {WORRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">婚姻状況</label>
              <select className={selectClass(!canEdit)} value={memo.marriage} onChange={e => canEdit && setMemo({...memo, marriage: e.target.value})} disabled={!canEdit}>
                {MARRIAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">お子様</label>
              <select className={selectClass(!canEdit)} value={memo.child} onChange={e => canEdit && setMemo({...memo, child: e.target.value})} disabled={!canEdit}>
                {CHILD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">職業</label>
              <select className={selectClass(!canEdit)} value={memo.work} onChange={e => canEdit && setMemo({...memo, work: e.target.value})} disabled={!canEdit}>
                {WORK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">年収</label>
              <select className={selectClass(!canEdit)} value={memo.salary} onChange={e => canEdit && setMemo({...memo, salary: e.target.value})} disabled={!canEdit}>
                {SALARY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className="text-xs text-gray-500">お相手の情報</label>
            <input
              className={`w-full border rounded px-2 py-1 mt-1 text-sm ${canEdit ? "bg-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
              value={memo.partner}
              onChange={e => canEdit && setMemo({...memo, partner: e.target.value})}
              disabled={!canEdit}
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">メモ</label>
            <textarea
              className={`w-full border rounded px-2 py-1 mt-1 text-sm ${canEdit ? "bg-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
              style={{ height: "600px" }}
              value={memo.memo}
              onChange={e => canEdit && setMemo({...memo, memo: e.target.value})}
              disabled={!canEdit}
            />
          </div>
        </div>
      </div>
    </div>

    {selectedConsultation && (
      <ConsultationModal
        consultation={selectedConsultation}
        userName={handleName}
        teacherName={TEACHER_MAP[selectedConsultation.teacher_id] ?? "-"}
        userId={String(id)}
        hasApiKey={hasApiKey}
        hasGeminiKey={hasGeminiKey}
        onClose={() => setSelectedConsultation(null)}
      />
    )}
    </>
  )
}
