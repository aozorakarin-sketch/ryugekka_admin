"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮" },
}

type WaitingEntry = {
  id: string
  estimated_wait_min: number
  requested_at: string
  data_source: string
}

export default function WaitingPage() {
  const [teacher, setTeacher] = useState<{ id: string; name: string } | null>(null)
  const [entries, setEntries] = useState<WaitingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<WaitingEntry | null>(null)
  const [waitMin, setWaitMin] = useState(10)
  const [saving, setSaving] = useState(false)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return
    const t = EMAIL_TO_TEACHER[user.email]
    if (!t) return
    setTeacher(t)
    await fetchEntries(t.id)
  }

  const fetchEntries = async (teacherId: string) => {
    setLoading(true)
    const { data } = await supabase
      .from("waiting_queue")
      .select("id, estimated_wait_min, requested_at, data_source")
      .eq("teacher_id", teacherId)
      .eq("status", "waiting")
      .order("requested_at", { ascending: true })
    setEntries(data ?? [])
    setLoading(false)
  }

  const openCreate = () => {
    if (entries.length >= 5) {
      alert("待機列は最大5人までです")
      return
    }
    setEditTarget(null)
    setWaitMin(10)
    setShowModal(true)
  }

  const openEdit = (e: WaitingEntry) => {
    setEditTarget(e)
    setWaitMin(e.estimated_wait_min)
    setShowModal(true)
  }

  const save = async () => {
    if (!teacher) return
    if (waitMin < 5) {
      alert("5分以上で設定してください")
      return
    }
    setSaving(true)
    if (editTarget) {
      await supabase
        .from("waiting_queue")
        .update({ estimated_wait_min: waitMin })
        .eq("id", editTarget.id)
    } else {
      await supabase.from("waiting_queue").insert({
        teacher_id: teacher.id,
        status: "waiting",
        requested_at: new Date().toISOString(),
        estimated_wait_min: waitMin,
        data_source: "dummy",
      })
    }
    setSaving(false)
    setShowModal(false)
    fetchEntries(teacher.id)
  }

  const deleteEntry = async (id: string) => {
    if (!confirm("この待機者を削除しますか？")) return
    await supabase.from("waiting_queue").delete().eq("id", id)
    if (teacher) fetchEntries(teacher.id)
  }

  const deleteAll = async () => {
    if (!teacher) return
    if (!confirm("全員削除しますか？")) return
    await supabase
      .from("waiting_queue")
      .delete()
      .eq("teacher_id", teacher.id)
      .eq("status", "waiting")
      .eq("data_source", "dummy")
    fetchEntries(teacher.id)
  }

  const totalWait = entries.reduce((sum, e) => sum + e.estimated_wait_min, 0)

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">待機列管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            現在 <span className="font-bold text-teal-600">{entries.length}人</span> 待機中
            　合計待機時間 <span className="font-bold text-teal-600">{totalWait}分</span>
          </p>
        </div>
        <div className="flex gap-2">
          {entries.length > 0 && (
            <button
              onClick={deleteAll}
              className="text-sm bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              全員削除
            </button>
          )}
          <button
            onClick={openCreate}
            className="text-sm bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded"
          >
            ＋ 追加
          </button>
        </div>
      </div>

      {entries.length === 0 && (
        <p className="text-gray-400 text-sm">待機中のお客様はいません</p>
      )}

      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div key={entry.id} className="border rounded p-4 bg-white flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-gray-300">{index + 1}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    entry.data_source === "dummy"
                      ? "bg-gray-100 text-gray-500"
                      : "bg-green-100 text-green-600"
                  }`}>
                    {entry.data_source === "dummy" ? "ダミー" : "リアル"}
                  </span>
                  <span className="font-medium text-gray-700">{entry.estimated_wait_min}分待ち</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {entry.data_source === "dummy" && (
                <>
                  <button
                    onClick={() => openEdit(entry)}
                    className="text-sm bg-blue-500 text-white px-3 py-1 rounded"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="text-sm bg-red-500 text-white px-3 py-1 rounded"
                  >
                    削除
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4">{editTarget ? "待機時間を編集" : "待機者を追加"}</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">待機時間（分）</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setWaitMin(m => Math.max(5, m - 5))}
                  className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 text-lg font-bold"
                >－</button>
                <span className="text-3xl font-bold w-16 text-center">{waitMin}</span>
                <button
                  onClick={() => setWaitMin(m => m + 5)}
                  className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 text-lg font-bold"
                >＋</button>
              </div>
              <p className="text-xs text-gray-400 mt-2">5分単位で設定（最低5分）</p>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setShowModal(false)} className="bg-gray-400 text-white text-sm px-4 py-2 rounded">閉じる</button>
              <button onClick={save} disabled={saving} className="bg-teal-500 hover:bg-teal-600 text-white text-sm px-4 py-2 rounded">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}