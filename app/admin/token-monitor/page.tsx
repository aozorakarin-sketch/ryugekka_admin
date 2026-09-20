'use client'

import { useEffect, useState, useCallback } from 'react'

interface TeacherBalance {
  key: string
  name: string
  paidUnused: number
  holders: number
  balanceTotal: number
}

interface MonitorResponse {
  updatedAt: string
  teachers: TeacherBalance[]
  totalPaidUnused: number
  totalBalance: number
}

// 資金決済法の基準（円）
const CAUTION = 7_000_000     // 注意
const START = 9_000_000       // 保全手続き開始（社内基準）
const LEGAL = 10_000_000      // 届出対象（法定基準）

const REFRESH_MS = 30_000     // 30秒ごとに自動更新

function getStatus(amount: number) {
  if (amount >= LEGAL) return { label: '届出対象', color: '#c2185b', bg: '#fde4ee' }
  if (amount >= START) return { label: '保全手続き開始', color: '#d9480f', bg: '#ffe8d9' }
  if (amount >= CAUTION) return { label: '注意', color: '#b7791f', bg: '#fff4d6' }
  return { label: '通常運営', color: '#2a8f5a', bg: '#e6f6ec' }
}

export default function TokenMonitorPage() {
  const [data, setData] = useState<MonitorResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/token-monitor', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '取得に失敗しました')
      setData(json)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, REFRESH_MS)
    return () => clearInterval(timer)
  }, [fetchData])

  const yen = (n: number) => `¥${n.toLocaleString()}`
  const pt = (n: number) => `${n.toLocaleString()}トラカ`

  const total = data?.totalPaidUnused ?? 0
  const status = getStatus(total)
  const barPercent = Math.min(100, (total / LEGAL) * 100)
  const updatedStr = data ? new Date(data.updatedAt).toLocaleString('ja-JP') : ''

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1000 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 }}>トラカ監視</h1>
      <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: 20 }}>
        有償トラカ（購入・サブスクで実際に支払われた分）の未使用残高です。共通トラカ・手動付与・お得分は含みません。
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            padding: '8px 20px', borderRadius: 6, border: 'none',
            background: loading ? '#ccc' : '#2d6a8f', color: '#fff',
            fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '集計中…' : '更新'}
        </button>
        {data && (
          <span style={{ fontSize: '0.75rem', color: '#999' }}>
            最終更新 {updatedStr}（30秒ごとに自動更新）
          </span>
        )}
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
          {/* 合計サマリー */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            <div style={{ background: status.bg, borderRadius: 10, padding: '16px 24px', flex: 2 }}>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>有償トラカ 未使用残高（3人合計）</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: status.color }}>{yen(total)}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: status.color, marginTop: 4 }}>
                ステータス：{status.label}
              </div>
            </div>
            <div style={{ background: '#f5f5f5', borderRadius: 10, padding: '16px 24px', flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>全残高（無償含む・参考）</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{pt(data.totalBalance)}</div>
            </div>
          </div>

          {/* 基準ゲージ */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ position: 'relative', height: 14, background: '#eee', borderRadius: 7 }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: 14, borderRadius: 7,
                width: `${barPercent}%`, background: status.color, transition: 'width 0.3s',
              }} />
              <div style={{ position: 'absolute', left: '70%', top: -2, height: 18, borderLeft: '2px solid #b7791f' }} />
              <div style={{ position: 'absolute', left: '90%', top: -2, height: 18, borderLeft: '2px solid #d9480f' }} />
            </div>
            <div style={{ position: 'relative', height: 36, fontSize: '0.7rem', color: '#666', marginTop: 6 }}>
              <span style={{ position: 'absolute', left: 0 }}>0円</span>
              <span style={{ position: 'absolute', left: '70%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                700万円<br />注意
              </span>
              <span style={{ position: 'absolute', left: '90%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                900万円<br />保全開始（社内）
              </span>
              <span style={{ position: 'absolute', right: 0, textAlign: 'right' }}>
                1,000万円<br />届出（法定）
              </span>
            </div>
          </div>

          {/* 先生別テーブル */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'right' }}>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>先生</th>
                <th style={{ padding: '8px 4px' }}>有償 未使用残高</th>
                <th style={{ padding: '8px 4px' }}>ステータス</th>
                <th style={{ padding: '8px 4px' }}>有償残高あり人数</th>
                <th style={{ padding: '8px 4px' }}>全残高（無償含む）</th>
              </tr>
            </thead>
            <tbody>
              {data.teachers.map(t => {
                const s = getStatus(t.paidUnused)
                return (
                  <tr key={t.key} style={{ borderBottom: '1px solid #eee', textAlign: 'right' }}>
                    <td style={{ textAlign: 'left', padding: '10px 4px', fontWeight: 600 }}>{t.name}</td>
                    <td style={{ padding: '10px 4px', fontWeight: 700 }}>{yen(t.paidUnused)}</td>
                    <td style={{ padding: '10px 4px' }}>
                      <span style={{
                        background: s.bg, color: s.color, fontWeight: 600,
                        fontSize: '0.75rem', padding: '2px 10px', borderRadius: 10,
                      }}>
                        {s.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 4px' }}>{t.holders.toLocaleString()}人</td>
                    <td style={{ padding: '10px 4px', color: '#666' }}>{pt(t.balanceTotal)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <p style={{ fontSize: '0.75rem', color: '#999', marginTop: 16 }}>
            ※有償残高は、ユーザーごとに「有償の付与累計」と「現在の残高」の小さい方で計算しています（無償分から先に使われたものとみなすため、やや多めに出る安全側の計算です）。<br />
            ※金額が記録される前のテスト購入・テストサブスクは有償に含めていません。<br />
            ※1トラカ＝1円で換算しています。
          </p>
        </>
      )}
    </div>
  )
}
