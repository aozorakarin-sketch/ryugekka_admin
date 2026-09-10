'use client'

import { useEffect, useState, useCallback } from 'react'

interface TeacherStat {
  teacherId: string
  teacherName: string
  revenueJpy: number
  revenueJpyUnknownCount: number
  purchaseCount: number
  pointsUsed: { call: number; chat: number; mail: number; other: number; total: number }
}

interface SalesResponse {
  period: { from: string; to: string }
  totalRevenueJpy: number
  totalPointsUsed: number
  teachers: TeacherStat[]
}

interface MonthBucket {
  month: string
  totalRevenueJpy: number
  totalPointsUsed: number
  teachers: TeacherStat[]
}

interface MonthlyResponse {
  year: number
  months: MonthBucket[]
}

const TEACHER_TABS: { id: string; label: string }[] = [
  { id: 'all', label: '全員' },
  { id: 'cd2c4101-2e24-4ae2-8d6a-507a943904af', label: '青空花林' },
  { id: '17cf0ca1-7526-466e-a644-9d3efefa4091', label: '椎名架月' },
  { id: '3ba85bb9-9065-461b-b76b-cc488d4c0c3b', label: '雲龍蓮' },
]

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

const RYU_TEACHER_ID = '3ba85bb9-9065-461b-b76b-cc488d4c0c3b'
const TSUKI_TEACHER_ID = '17cf0ca1-7526-466e-a644-9d3efefa4091'
const SHARE_RATE = 0.05 // 5%

function getTeacherRevenue(bucket: MonthBucket, teacherId: string): number {
  return bucket.teachers.find(t => t.teacherId === teacherId)?.revenueJpy ?? 0
}

// monthKey（'YYYY-MM'）の翌月・指定日を計算する
// 例: '2026-01' + day=10 → 2026年2月10日（Dateのmonth引数が0始まりなので、
//     monthKeyの月番号をそのまま渡すと自動的に「翌月」になる）
function nextMonthDate(monthKey: string, day: number): Date {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(y, m, day)
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10)
}

function startOfThisMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export default function SalesDashboardPage() {
  const [fromDate, setFromDate] = useState(() => toDateInputValue(startOfThisMonth()))
  const [toDate, setToDate] = useState(() => toDateInputValue(new Date()))
  const [data, setData] = useState<SalesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all')

  const [viewMode, setViewMode] = useState<'period' | 'monthly'>('period')
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR)
  const [monthlyData, setMonthlyData] = useState<MonthlyResponse | null>(null)
  const [monthlyLoading, setMonthlyLoading] = useState(false)
  const [monthlyError, setMonthlyError] = useState<string | null>(null)

  const fetchMonthly = useCallback(async () => {
    setMonthlyLoading(true)
    setMonthlyError(null)
    try {
      const res = await fetch(`/api/admin/sales/monthly?year=${selectedYear}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '取得に失敗しました')
      setMonthlyData(json)
    } catch (err: any) {
      setMonthlyError(err.message)
    } finally {
      setMonthlyLoading(false)
    }
  }, [selectedYear])

  useEffect(() => {
    if (viewMode === 'monthly') fetchMonthly()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedYear])

  const fetchSales = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // toDateは「その日の終わりまで」を含めるため、翌日0時を渡す
      const toExclusive = new Date(toDate)
      toExclusive.setDate(toExclusive.getDate() + 1)

      const params = new URLSearchParams({
        from: new Date(fromDate).toISOString(),
        to: toExclusive.toISOString(),
      })

      const res = await fetch(`/api/admin/sales?${params.toString()}`)
      const json = await res.json()

      if (!res.ok) throw new Error(json.error ?? '取得に失敗しました')
      setData(json)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate])

  useEffect(() => {
    fetchSales()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const yen = (n: number) => `¥${n.toLocaleString()}`
  const pt = (n: number) => `${n.toLocaleString()}トラカ`

  // 選択中の先生でフィルタ（'all'なら全員）
  const filteredTeachers = Array.isArray(data?.teachers)
    ? selectedTeacherId === 'all'
      ? data!.teachers
      : data!.teachers.filter(t => t.teacherId === selectedTeacherId)
    : []
  const filteredTotalRevenueJpy = filteredTeachers.reduce((sum, t) => sum + t.revenueJpy, 0)
  const filteredTotalPointsUsed = filteredTeachers.reduce((sum, t) => sum + t.pointsUsed.total, 0)

  // 月別データも同じ先生選択タブでフィルタする
  // ※ APIのレスポンス形が想定と異なっていても画面ごと落ちないよう、防御的にデフォルト値を用意する
  function monthStat(bucket: MonthBucket) {
    const teachers = Array.isArray(bucket?.teachers) ? bucket.teachers : []
    const list = selectedTeacherId === 'all'
      ? teachers
      : teachers.filter(t => t.teacherId === selectedTeacherId)
    return {
      revenueJpy: list.reduce((sum, t) => sum + (t.revenueJpy ?? 0), 0),
      pointsUsed: list.reduce((sum, t) => sum + (t.pointsUsed?.total ?? 0), 0),
    }
  }

  const monthlyMonths = Array.isArray(monthlyData?.months) ? monthlyData!.months : []

  const yearTotalRevenueJpy = monthlyMonths.reduce((sum, m) => sum + monthStat(m).revenueJpy, 0)
  const yearTotalPointsUsed = monthlyMonths.reduce((sum, m) => sum + monthStat(m).pointsUsed, 0)
  const monthlyMaxRevenue = Math.max(1, ...monthlyMonths.map(m => monthStat(m).revenueJpy))

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1000 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 20 }}>売上管理</h1>

      {/* 表示モード切替 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([
          { id: 'period', label: '期間で見る' },
          { id: 'monthly', label: '月ごとに見る' },
        ] as const).map(m => (
          <button
            key={m.id}
            onClick={() => setViewMode(m.id)}
            style={{
              padding: '6px 16px', borderRadius: 6,
              border: `1px solid ${viewMode === m.id ? '#2d6a8f' : '#ccc'}`,
              background: viewMode === m.id ? '#e8f2fa' : '#fff',
              color: viewMode === m.id ? '#2d6a8f' : '#666',
              fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* 期間選択 */}
      {viewMode === 'period' && (
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', marginBottom: 4 }}>開始日</label>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 6 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', marginBottom: 4 }}>終了日</label>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 6 }}
          />
        </div>
        <button
          onClick={fetchSales}
          disabled={loading}
          style={{
            padding: '8px 20px', borderRadius: 6, border: 'none',
            background: loading ? '#ccc' : '#2d6a8f', color: '#fff',
            fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '集計中…' : '更新'}
        </button>
      </div>
      )}

      {/* 先生選択タブ */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {TEACHER_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedTeacherId(tab.id)}
            style={{
              padding: '6px 18px', borderRadius: 20,
              border: `1px solid ${selectedTeacherId === tab.id ? '#2d6a8f' : '#ccc'}`,
              background: selectedTeacherId === tab.id ? '#2d6a8f' : '#fff',
              color: selectedTeacherId === tab.id ? '#fff' : '#333',
              fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {viewMode === 'period' && error && (
        <div style={{
          background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 8,
          padding: '10px 16px', marginBottom: 20, color: '#c0392b', fontSize: '0.85rem',
        }}>
          {error}
        </div>
      )}

      {viewMode === 'period' && data && (
        <>
          {/* 合計サマリー（先生選択タブの結果を反映） */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            <div style={{ background: '#f0f7ff', borderRadius: 10, padding: '16px 24px', flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>期間合計 決済額</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2d6a8f' }}>{yen(filteredTotalRevenueJpy)}</div>
            </div>
            <div style={{ background: '#f5f5f5', borderRadius: 10, padding: '16px 24px', flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>期間合計 トラカ消費</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{pt(filteredTotalPointsUsed)}</div>
            </div>
          </div>

          {/* 先生別テーブル */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'right' }}>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>先生</th>
                <th style={{ padding: '8px 4px' }}>決済額</th>
                <th style={{ padding: '8px 4px' }}>購入件数</th>
                <th style={{ padding: '8px 4px' }}>通話</th>
                <th style={{ padding: '8px 4px' }}>チャット</th>
                <th style={{ padding: '8px 4px' }}>メール</th>
                <th style={{ padding: '8px 4px' }}>その他</th>
                <th style={{ padding: '8px 4px' }}>合計消費</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.map(t => (
                <tr key={t.teacherId} style={{ borderBottom: '1px solid #eee', textAlign: 'right' }}>
                  <td style={{ textAlign: 'left', padding: '10px 4px', fontWeight: 600 }}>{t.teacherName}</td>
                  <td style={{ padding: '10px 4px' }}>
                    {yen(t.revenueJpy)}
                    {t.revenueJpyUnknownCount > 0 && (
                      <div style={{ fontSize: '0.7rem', color: '#c0392b' }}>
                        ※金額不明分 {t.revenueJpyUnknownCount}件（対象外）
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 4px' }}>{t.purchaseCount.toLocaleString()}件</td>
                  <td style={{ padding: '10px 4px' }}>{pt(t.pointsUsed.call)}</td>
                  <td style={{ padding: '10px 4px' }}>{pt(t.pointsUsed.chat)}</td>
                  <td style={{ padding: '10px 4px' }}>{pt(t.pointsUsed.mail)}</td>
                  <td style={{ padding: '10px 4px' }}>{pt(t.pointsUsed.other)}</td>
                  <td style={{ padding: '10px 4px', fontWeight: 700 }}>{pt(t.pointsUsed.total)}</td>
                </tr>
              ))}
              {filteredTeachers.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: '#999' }}>この期間のデータはありません</td></tr>
              )}
            </tbody>
          </table>

          <p style={{ fontSize: '0.75rem', color: '#999', marginTop: 16 }}>
            ※決済額は今後の購入分から記録されるようになったため、それ以前の購入は集計に含まれません。<br />
            ※通話／チャット／メールの分類は取引履歴のメモ文言から判定した推定値です。
          </p>
        </>
      )}

      {viewMode === 'monthly' && (
        <>
          {/* 年選択 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {YEAR_OPTIONS.map(y => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                style={{
                  padding: '6px 16px', borderRadius: 6,
                  border: `1px solid ${selectedYear === y ? '#2d6a8f' : '#ccc'}`,
                  background: selectedYear === y ? '#2d6a8f' : '#fff',
                  color: selectedYear === y ? '#fff' : '#333',
                  fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                }}
              >
                {y}年
              </button>
            ))}
          </div>

          {monthlyError && (
            <div style={{
              background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 8,
              padding: '10px 16px', marginBottom: 20, color: '#c0392b', fontSize: '0.85rem',
            }}>
              {monthlyError}
            </div>
          )}

          {monthlyLoading && <p style={{ color: '#999' }}>集計中…</p>}

          {monthlyData && !Array.isArray(monthlyData.months) && (
            <div style={{
              background: '#fff8e0', border: '1px solid #f0d080', borderRadius: 8,
              padding: '10px 16px', marginBottom: 20, color: '#8a6d1e', fontSize: '0.85rem',
            }}>
              集計データの形式が想定と異なります（デバッグ用: {JSON.stringify(monthlyData).slice(0, 200)}）
            </div>
          )}

          {monthlyData && Array.isArray(monthlyData.months) && (
            <>
              {/* 年間サマリー */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                <div style={{ background: '#f0f7ff', borderRadius: 10, padding: '16px 24px', flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>{selectedYear}年 合計 決済額</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2d6a8f' }}>{yen(yearTotalRevenueJpy)}</div>
                </div>
                <div style={{ background: '#f5f5f5', borderRadius: 10, padding: '16px 24px', flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>{selectedYear}年 合計 トラカ消費</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{pt(yearTotalPointsUsed)}</div>
                </div>
              </div>

              {/* 月別テーブル（簡易バー付き） */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'right' }}>
                    <th style={{ textAlign: 'left', padding: '8px 4px' }}>月</th>
                    <th style={{ padding: '8px 4px' }}>決済額</th>
                    <th style={{ padding: '8px 4px', width: '30%' }}></th>
                    <th style={{ padding: '8px 4px' }}>トラカ消費</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyMonths.map(bucket => {
                    const s = monthStat(bucket)
                    const barWidth = Math.round((s.revenueJpy / monthlyMaxRevenue) * 100)
                    return (
                      <tr key={bucket.month} style={{ borderBottom: '1px solid #eee', textAlign: 'right' }}>
                        <td style={{ textAlign: 'left', padding: '8px 4px', fontWeight: 600 }}>
                          {parseInt(bucket.month.split('-')[1], 10)}月
                        </td>
                        <td style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>{yen(s.revenueJpy)}</td>
                        <td style={{ padding: '8px 4px' }}>
                          <div style={{ background: '#e8f2fa', borderRadius: 4, height: 10, width: '100%' }}>
                            <div style={{
                              background: '#2d6a8f', borderRadius: 4, height: 10,
                              width: `${barWidth}%`, transition: 'width 0.2s',
                            }} />
                          </div>
                        </td>
                        <td style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>{pt(s.pointsUsed)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <p style={{ fontSize: '0.75rem', color: '#999', marginTop: 16 }}>
                ※決済額は今後の購入分から記録されるようになったため、それ以前の月は0円表示になります。
              </p>

              {/* 振込精算（月末締め・決済額の5%） */}
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: 36, marginBottom: 4 }}>振込精算</h2>
              <p style={{ fontSize: '0.75rem', color: '#999', marginBottom: 16 }}>
                月末締め。雲龍蓮・架月ちゃんは決済額の5%を翌月10日までにあなたへ、
                あなたは全員合計の決済額の5%を翌月15日までに虎へ振り込む想定の計算です。
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'right' }}>
                    <th style={{ textAlign: 'left', padding: '8px 4px' }}>対象月</th>
                    <th style={{ padding: '8px 4px' }}>雲龍蓮→あなた</th>
                    <th style={{ padding: '8px 4px' }}>架月→あなた</th>
                    <th style={{ padding: '8px 4px' }}>期限</th>
                    <th style={{ padding: '8px 4px' }}>あなた→虎</th>
                    <th style={{ padding: '8px 4px' }}>期限</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyMonths.map(bucket => {
                    const ryuTransfer = Math.round(getTeacherRevenue(bucket, RYU_TEACHER_ID) * SHARE_RATE)
                    const tsukiTransfer = Math.round(getTeacherRevenue(bucket, TSUKI_TEACHER_ID) * SHARE_RATE)
                    const toraTransfer = Math.round(bucket.totalRevenueJpy * SHARE_RATE)
                    const dueToYou = formatDate(nextMonthDate(bucket.month, 10))
                    const dueToTora = formatDate(nextMonthDate(bucket.month, 15))
                    const isAllZero = ryuTransfer === 0 && tsukiTransfer === 0 && toraTransfer === 0

                    return (
                      <tr key={bucket.month} style={{
                        borderBottom: '1px solid #eee', textAlign: 'right',
                        opacity: isAllZero ? 0.4 : 1,
                      }}>
                        <td style={{ textAlign: 'left', padding: '8px 4px', fontWeight: 600 }}>
                          {parseInt(bucket.month.split('-')[1], 10)}月分
                        </td>
                        <td style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>{yen(ryuTransfer)}</td>
                        <td style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>{yen(tsukiTransfer)}</td>
                        <td style={{ padding: '8px 4px', whiteSpace: 'nowrap', color: '#666', fontSize: '0.8rem' }}>{dueToYou}</td>
                        <td style={{ padding: '8px 4px', whiteSpace: 'nowrap' }}>{yen(toraTransfer)}</td>
                        <td style={{ padding: '8px 4px', whiteSpace: 'nowrap', color: '#666', fontSize: '0.8rem' }}>{dueToTora}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <p style={{ fontSize: '0.75rem', color: '#999', marginTop: 12 }}>
                ※「あなた→虎」は雲龍蓮・架月・花林の合計決済額（あなた自身の分も含む）の5%です。<br />
                ※振込先口座はこの画面では管理していません（別途、雲龍蓮・架月ちゃんへお伝えしているものをご利用ください）。
              </p>
            </>
          )}
        </>
      )}
    </div>
  )
}
