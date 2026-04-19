"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

const TEACHER_MAP: Record<string, string> = {
  "e482fff7-25db-483d-8d68-46a893403be3": "宝明里茉",
  "3ba85bb9-9065-461b-b76b-cc488d4c0c3b": "雲龍蓮",
  "17cf0ca1-7526-466e-a644-9d3efefa4091": "椎名架月",
  "cd2c4101-2e24-4ae2-8d6a-507a943904af": "青空花林",
}

const MINDEN_TEACHER_ID = "e482fff7-25db-483d-8d68-46a893403be3"

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

export default function UserDetailPage() {
  const { id } = useParams()
  const [handleName, setHandleName] = useState("")
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [memo, setMemo] = useState<Memo>({
    id: null, memo: "", category: "", category_child: "",
    worry_status: "", marriage: "", child: "", work: "", salary: "", partner: ""
  })
  const [profile, setProfile] = useState<UserProfile>({ birth_date: "", gender: "" })
  const [followMailCount, setFollowMailCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [id])

  const fetchAll = async () => {
    const { data: user } = await supabase
      .from("users")
      .select("handle_name")
      .eq("id", id)
      .single()
    setHandleName(user?.handle_name ?? "-")

    const { data: cons } = await supabase
      .from("consultations")
      .select(`id, started_at, ended_at, teacher_id, call_duration, price, call_recordings(recording_url)`)
      .eq("user_id", id)
      .order("started_at", { ascending: false })
    setConsultations((cons ?? []).map((c: any) => ({
      ...c,
      recording_url: c.call_recordings?.[0]?.recording_url ?? null,
    })))

    const { data: memoDataList } = await supabase
      .from("teacher_memos")
      .select("*")
      .eq("user_id", id)
      .eq("teacher_id", MINDEN_TEACHER_ID)
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

    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("birth_date, gender")
      .eq("user_id", id)
      .single()
    if (profileData) {
      setProfile({
        birth_date: profileData.birth_date ?? "",
        gender: profileData.gender ?? "",
      })
    }

    const { count } = await supabase
      .from("follow_mails")
      .select("*", { count: "exact", head: true })
      .eq("user_id", id)
      .eq("is_draft", false)
    setFollowMailCount(count ?? 0)

    setLoading(false)
  }

  const saveMemo = async () => {
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
        teacher_id: MINDEN_TEACHER_ID,
        memo: memo.memo,
        category: memo.category,
        category_child: memo.category_child,
        worry_status: memo.worry_status,
        marriage: memo.marriage,
        child: memo.child,
        work: memo.work,
        salary: memo.salary,
        partner: memo.partner,
        data_source: "minden",
      })
    }
    setSaving(false)
    fetchAll()
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    const { data: existing } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("user_id", id)
      .single()

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
        data_source: "minden",
      })
    }
    setSavingProfile(false)
  }

  const totalMinutes = consultations.reduce((s, c) => s + (c.call_duration ?? 0), 0)
  const avgMinutes = consultations.length > 0 ? (totalMinutes / consultations.length).toFixed(1) : "0"
  const firstAt = consultations.length > 0 ? consultations[consultations.length - 1].started_at : null
  const lastAt = consultations.length > 0 ? consultations[0].started_at : null

  const formatDate = (s: string | null) => {
    if (!s) return "-"
    const d = new Date(s)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
  }

  const selectClass = "w-full border rounded px-2 py-1 mt-1 text-sm bg-white"

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-6 flex gap-6">
      <div className="w-64 shrink-0">
        <div className="border rounded-lg p-4 bg-white">
          <h2 className="font-bold text-lg mb-1">{handleName}</h2>
          <a href="/admin/users" className="text-xs text-gray-400 hover:underline">← 一覧に戻る</a>
          <div className="mt-4 space-y-3 text-sm">
            <div className="bg-pink-50 rounded p-3">
              <div className="font-medium text-pink-800 mb-2">鑑定</div>
              <div className="space-y-1 text-gray-700">
                <div className="flex justify-between"><span>回数</span><span className="bg-blue-100 text-blue-800 px-2 rounded-full text-xs font-medium">{consultations.length}回</span></div>
                <div className="flex justify-between"><span>合計分数</span><span>{totalMinutes}分</span></div>
                <div className="flex justify-between"><span>平均分数</span><span>{avgMinutes}分</span></div>
                <div className="flex justify-between"><span>最終日時</span><span className="text-xs">{formatDate(lastAt)}</span></div>
                <div className="flex justify-between"><span>初回日時</span><span className="text-xs">{formatDate(firstAt)}</span></div>
              </div>
            </div>

            <div className="bg-purple-50 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-purple-800">プロフィール</div>
                <button
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="text-xs bg-purple-500 hover:bg-purple-600 text-white px-2 py-0.5 rounded"
                >
                  {savingProfile ? "保存中..." : "保存"}
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <label className="text-xs text-gray-500">誕生日</label>
                  <input
                    type="date"
                    className="w-full border rounded px-2 py-1 mt-1 text-xs bg-white"
                    value={profile.birth_date}
                    onChange={e => setProfile({...profile, birth_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">性別</label>
                  <select
                    className="w-full border rounded px-2 py-1 mt-1 text-xs bg-white"
                    value={profile.gender}
                    onChange={e => setProfile({...profile, gender: e.target.value})}
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
<a
                  href={`/admin/follow-mails/new/${id}`}
                  className="text-xs bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-0.5 rounded"
                >
                  作成
                </a>
              </div>
              <div className="flex justify-between text-gray-700"><span>送信数</span><span>{followMailCount}件</span></div>
            </div>

            <div className="bg-blue-50 rounded p-3">
              <div className="font-medium text-blue-800 mb-2">レビュー</div>
              <div className="flex justify-between text-gray-700"><span>送信回数</span><span>-件</span></div>
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
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">終了日時</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">先生</th>
                  <th className="text-center px-3 py-2 font-medium whitespace-nowrap">分数</th>
                  <th className="text-center px-3 py-2 font-medium whitespace-nowrap">報酬</th>
                  <th className="text-center px-3 py-2 font-medium whitespace-nowrap">音声</th>
                  <th className="text-center px-3 py-2 font-medium whitespace-nowrap">鑑定メモ</th>
                </tr>
              </thead>
              <tbody>
                {consultations.map((c, i) => (
                  <tr key={c.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(c.started_at)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(c.ended_at)}</td>
                    <td className="px-3 py-2 text-xs">{TEACHER_MAP[c.teacher_id] ?? "-"}</td>
                    <td className="px-3 py-2 text-center">{c.call_duration}分</td>
                    <td className="px-3 py-2 text-center">{c.price.toLocaleString()}円</td>
                    <td className="px-3 py-2 text-center">
                      {c.recording_url
                        ? <a href={c.recording_url} target="_blank" className="text-blue-600 hover:underline text-xs">再生</a>
                        : <span className="text-gray-400 text-xs">-</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-2 py-0.5 rounded">入</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">ユーザーメモ</h3>
            <button onClick={saveMemo} disabled={saving} className="text-sm bg-teal-500 hover:bg-teal-600 text-white px-4 py-1.5 rounded">
              {saving ? "保存中..." : "更新"}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
            <div>
              <label className="text-xs text-gray-500">相談ジャンル</label>
              <select className={selectClass} value={memo.category} onChange={e => setMemo({...memo, category: e.target.value, category_child: ""})}>
                {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">詳細ジャンル</label>
              <select className={selectClass} value={memo.category_child} onChange={e => setMemo({...memo, category_child: e.target.value})}>
                <option value="">-</option>
                {(CATEGORY_CHILD_OPTIONS[memo.category] ?? []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">悩みの状況</label>
              <select className={selectClass} value={memo.worry_status} onChange={e => setMemo({...memo, worry_status: e.target.value})}>
                {WORRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">婚姻状況</label>
              <select className={selectClass} value={memo.marriage} onChange={e => setMemo({...memo, marriage: e.target.value})}>
                {MARRIAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">お子様</label>
              <select className={selectClass} value={memo.child} onChange={e => setMemo({...memo, child: e.target.value})}>
                {CHILD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">職業</label>
              <select className={selectClass} value={memo.work} onChange={e => setMemo({...memo, work: e.target.value})}>
                {WORK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">年収</label>
              <select className={selectClass} value={memo.salary} onChange={e => setMemo({...memo, salary: e.target.value})}>
                {SALARY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className="text-xs text-gray-500">お相手の情報</label>
            <input className="w-full border rounded px-2 py-1 mt-1 text-sm" value={memo.partner} onChange={e => setMemo({...memo, partner: e.target.value})} />
          </div>

          <div>
            <label className="text-xs text-gray-500">メモ</label>
            <textarea
              className="w-full border rounded px-2 py-1 mt-1 text-sm"
              style={{ height: "600px" }}
              value={memo.memo}
              onChange={e => setMemo({...memo, memo: e.target.value})}
            />
          </div>
        </div>
      </div>
    </div>
  )
}