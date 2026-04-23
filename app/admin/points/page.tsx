'use client'
import { useState, useCallback } from 'react'

type PointType = 'ryu' | 'tsuki' | 'hana'

interface User {
  id: string
  name: string
  email: string
  balance: { ryu: number; tsuki: number; hana: number }
}

const POINT_CONFIG: Record<PointType, { label: string; emoji: string }> = {
  ryu:   { label: '龍ポイント', emoji: '🐉' },
  tsuki: { label: '月ポイント', emoji: '🌙' },
  hana:  { label: '花ポイント', emoji: '🌸' },
}

export default function AdminPointsPage() {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [selected, setSelected] = useState<User | null>(null)
  const [pointType, setPointType] = useState<PointType>('hana')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null)

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (searchTimer) clearTimeout(searchTimer)
    if (!val) { setUsers([]); return }
    setSearchTimer(setTimeout(async () => {
      const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(val)}`)
      const data = await res.json()
      setUsers(data.users || [])
    }, 300))
  }

  const handleSelect = (u: User) => {
    setSelected(u)
    setQuery(u.name)
    setUsers([])
    setResult(null)
  }

  const handleGrant = async () => {
    if (!selected || !amount) return
    const num = parseInt(amount, 10)
    if (isNaN(num) || num === 0) return

    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/points/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selected.id,
          point_type: pointType,
          amount: num,
          reason,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setResult({
          success: true,
          message: `✅ ${POINT_CONFIG[pointType].emoji} ${data.balance.toLocaleString()}pt（${num > 0 ? '+' : ''}${num.toLocaleString()}pt）`,
        })
        // 残高をその場で更新
        setSelected(prev => prev ? {
          ...prev,
          balance: { ...prev.balance, [pointType]: data.balance }
        } : null)
        setAmount('')
        setReason('')
      } else {
        setResult({ success: false, message: `❌ ${data.error}` })
      }
    } catch {
      setResult({ success: false, message: '❌ 通信エラー' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">💰 ポイント手動付与</h1>

      {/* ユーザー検索 */}
      <div className="relative">
        <label className="block text-sm font-medium mb-1">ユーザー検索</label>
        <input
          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="名前またはメールアドレス"
          value={query}
          onChange={handleQueryChange}
        />
        {users.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
            {users.map(u => (
              <li
                key={u.id}
                className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                onClick={() => handleSelect(u)}
              >
                <span className="font-medium">{u.name}</span>
                <span className="text-gray-400 ml-2 text-xs">{u.email}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 選択ユーザーの残高 */}
      {selected && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-1">
          <p className="font-semibold text-sm">{selected.name}</p>
          <p className="text-xs text-gray-400">{selected.email}</p>
          <div className="flex gap-4 mt-2 text-sm">
            <span className="text-purple-600">🐉 {selected.balance.ryu.toLocaleString()}pt</span>
            <span className="text-yellow-600">🌙 {selected.balance.tsuki.toLocaleString()}pt</span>
            <span className="text-pink-600">🌸 {selected.balance.hana.toLocaleString()}pt</span>
          </div>
        </div>
      )}

      {/* ポイント種別 */}
      <div>
        <label className="block text-sm font-medium mb-1">ポイント種別</label>
        <div className="flex gap-2">
          {(['ryu', 'tsuki', 'hana'] as PointType[]).map(pt => (
            <button
              key={pt}
              onClick={() => setPointType(pt)}
              className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors
                ${pointType === pt ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              {POINT_CONFIG[pt].emoji} {POINT_CONFIG[pt].label}
            </button>
          ))}
        </div>
      </div>

      {/* 付与量 */}
      <div>
        <label className="block text-sm font-medium mb-1">付与量（マイナスで減算）</label>
        <input
          type="number"
          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="例: 1000 または -500"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
      </div>

      {/* 理由 */}
      <div>
        <label className="block text-sm font-medium mb-1">理由（任意）</label>
        <input
          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="例: キャンペーン付与、誤課金返金 等"
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
      </div>

      {/* 実行ボタン */}
      <button
        onClick={handleGrant}
        disabled={!selected || !amount || loading}
        className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500
          disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
      >
        {loading ? '処理中...' : `${POINT_CONFIG[pointType].emoji} ポイントを付与する`}
      </button>

      {/* 結果 */}
      {result && (
        <div className={`p-4 rounded-xl text-center font-medium
          ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {result.message}
        </div>
      )}
    </div>
  )
}