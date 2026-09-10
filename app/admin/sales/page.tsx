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

const TEACHER_TABS: { id: string; label: string }[] = [
  { id: 'all', label: '全員' },
  { id: 'cd2c4101-2e24-4ae2-8d6a-507a943904af', label: '青空花林' },
  { id: '17cf0ca1-7526-466e-a644-9d3efefa4091', label: '椎名架月' },
  { id: '3ba85bb9-9065-461b-b76b-cc488d4c0c3b', label: '雲龍蓮' },
]

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
  const filteredTeachers = data
    ? selectedTeacherId === 'all'
      ? data.teachers
      : data.teachers.filter(t => t.teacherId === selectedTeacherId)
    : []
  const filteredTotalRevenueJpy = filteredTeachers.reduce((sum, t) => sum + t.revenueJpy, 0)
  const filteredTotalPointsUsed = filteredTeachers.reduce((sum, t) => sum + t.pointsUsed.total, 0)

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1000 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 20 }}>売上管理</h1>

      {/* 期間選択 */}
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

      {error && (
        <div style={{
          background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 8,
          padding: '10px 16px', marginBottom: 20, color: '#c0392b', fontSize: '0.85rem',
        }}>
          {error}
        </div>
      )}

      {data && (
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
    </div>
  )
}
