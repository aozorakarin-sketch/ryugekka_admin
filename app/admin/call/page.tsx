"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

const APP_ID = "8a10ad2855b44c9aa6cbed991ea48d86"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string; channel: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林", channel: "karin" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月", channel: "katsuki" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮", channel: "renren" },
}

type Recording = {
  id: string
  recording_url: string
  created_at: string
  recording_duration: number
}

type WaitingEntry = {
  id: string
  user_id: string
  status: string
  requested_at: string
  agora_channel: string
}

type Toast = {
  id: number
  message: string
  waitingEntryId: string
  userId: string
}

export default function CallPage() {
  const [status, setStatus] = useState<"idle" | "calling" | "connected">("idle")
  const [muted, setMuted] = useState(false)
  const [speaker, setSpeaker] = useState(true)
  const [callTime, setCallTime] = useState(0)
  const [teacher, setTeacher] = useState<{ id: string; name: string; channel: string } | null>(null)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [uploading, setUploading] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [waitingCount, setWaitingCount] = useState(0)
  const [waitingList, setWaitingList] = useState<WaitingEntry[]>([])
  const [currentQueueId, setCurrentQueueId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastIdRef = useRef(0)

  const clientRef = useRef<any>(null)
  const localTrackRef = useRef<any>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const notificationRef = useRef<HTMLAudioElement | null>(null)
  const teacherRef = useRef<{ id: string; name: string; channel: string } | null>(null)

  useEffect(() => {
    initTeacher()
    return () => { stopTimer() }
  }, [])

  const initTeacher = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return
    const t = EMAIL_TO_TEACHER[user.email]
    if (t) {
      setTeacher(t)
      teacherRef.current = t
      fetchRecordings(t.id)
      fetchWaitingList(t.id)
      subscribeWaitingQueue(t.id)
    }
  }

  // ---- 通知音を鳴らす ----
  const playNotification = () => {
    try {
      const audio = new Audio("/sounds/notification.mp3")
      audio.play().catch(err => console.error("通知音エラー:", err))
      notificationRef.current = audio
    } catch (err) {
      console.error("通知音エラー:", err)
    }
  }

  // ---- トースト表示 ----
  const addToast = (message: string, waitingEntryId: string, userId: string) => {
    const id = ++toastIdRef.current
    setToasts(prev => [...prev, { id, message, waitingEntryId, userId }])
    // 30秒後に自動削除
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 30000)
  }

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  // ---- Supabase Realtime 購読 ----
  const subscribeWaitingQueue = (teacherId: string) => {
    const channel = supabase
      .channel("admin_waiting_queue")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "waiting_queue",
          filter: `teacher_id=eq.${teacherId}`,
        },
        (payload) => {
          // 新しいお客様が来た！
          playNotification()
          const entry = payload.new as WaitingEntry
          addToast("📞 新しいお客様が来ました！", entry.id, entry.user_id)
          fetchWaitingList(teacherId)
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "waiting_queue",
          filter: `teacher_id=eq.${teacherId}`,
        },
        () => {
          fetchWaitingList(teacherId)
        }
      )
      .subscribe()

    return channel
  }

  const fetchWaitingList = async (teacherId: string) => {
    const { data } = await supabase
      .from("waiting_queue")
      .select("id, user_id, status, requested_at, agora_channel")
      .eq("teacher_id", teacherId)
      .eq("status", "waiting")
      .order("requested_at", { ascending: true })
    setWaitingList(data ?? [])
    setWaitingCount(data?.length ?? 0)
  }

  // ---- 待機開始（お客様に着信音を鳴らす） ----
  const startWaiting = async (entryId: string, toastId?: number) => {
    await supabase
      .from("waiting_queue")
      .update({ status: "calling" })
      .eq("id", entryId)

    // トーストを閉じる
    if (toastId !== undefined) removeToast(toastId)

    // 待機リスト更新
    if (teacherRef.current) fetchWaitingList(teacherRef.current.id)
  }

  const fetchWaitingCount = async (teacherId: string) => {
    const { count } = await supabase
      .from("waiting_queue")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", teacherId)
      .eq("status", "waiting")
    setWaitingCount(count ?? 0)
  }

  const markQueueInCall = async (teacherId: string) => {
    const { data } = await supabase
      .from("waiting_queue")
      .select("id")
      .eq("teacher_id", teacherId)
      .eq("status", "in_call")
      .order("requested_at", { ascending: true })
      .limit(1)
      .single()

    if (data?.id) {
      setCurrentQueueId(data.id)
    }
  }

  const markQueueCompleted = async () => {
    if (!currentQueueId) return
    await supabase
      .from("waiting_queue")
      .update({
        status: "completed",
        call_ended_at: new Date().toISOString(),
      })
      .eq("id", currentQueueId)
    setCurrentQueueId(null)
    if (teacher) fetchWaitingList(teacher.id)
  }

  const fetchRecordings = async (teacherId: string) => {
    const { data } = await supabase
      .from("call_recordings")
      .select("id, recording_url, created_at, recording_duration")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false })
      .limit(20)
    setRecordings(data ?? [])
  }

  const getToken = async (channelName: string) => {
    const res = await fetch("/api/agora-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelName, uid: 0 }),
    })
    const data = await res.json()
    return data.token
  }

  const startTimer = () => {
    setCallTime(0)
    timerRef.current = setInterval(() => setCallTime(t => t + 1), 1000)
  }

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0")
    const s = (sec % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  const formatDate = (s: string) => {
    const d = new Date(s)
    return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`
  }

  const formatTimeAgo = (s: string) => {
    const diff = Math.floor((Date.now() - new Date(s).getTime()) / 1000)
    if (diff < 60) return `${diff}秒前`
    return `${Math.floor(diff / 60)}分前`
  }

  const startCall = async () => {
    if (!teacher) return
    try {
      setStatus("calling")
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default
      const token = await getToken(teacher.channel)
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
      clientRef.current = client

      client.on("user-published", async (user: any, mediaType: "audio" | "video") => {
        await client.subscribe(user, mediaType)
        if (mediaType === "audio") {
          user.audioTrack.play()
          setStatus("connected")
          startTimer()
          await markQueueInCall(teacher.id)
        }
      })

      await client.join(APP_ID, teacher.channel, token, null)
      const localTrack = await AgoraRTC.createMicrophoneAudioTrack()
      localTrackRef.current = localTrack
      await client.publish([localTrack])

      const stream = new MediaStream([localTrack.getMediaStreamTrack()])
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.start()
      recorderRef.current = recorder

      setStatus("connected")
      startTimer()
    } catch (err: any) {
      console.error(err)
      setStatus("idle")
      alert("通話開始エラー: " + err.message)
    }
  }

  const endCall = async () => {
    const duration = callTime
    stopTimer()
    await markQueueCompleted()

    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop()
      recorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        await uploadRecording(blob, duration)
      }
    }

    if (localTrackRef.current) { localTrackRef.current.close(); localTrackRef.current = null }
    if (clientRef.current) { await clientRef.current.leave(); clientRef.current = null }
    setStatus("idle")
    setCallTime(0)
    setMuted(false)
  }

  const uploadRecording = async (blob: Blob, duration: number) => {
    if (!teacher) return
    setUploading(true)
    try {
      const fileName = `${teacher.id}/${new Date().toISOString().replace(/[:.]/g, "-")}.webm`
      const { error } = await supabase.storage
        .from("recordings")
        .upload(fileName, blob, { contentType: "audio/webm" })
      if (error) throw error

      await supabase.from("call_recordings").insert({
        teacher_id: teacher.id,
        recording_url: fileName,
        recording_duration: duration,
        created_at: new Date().toISOString(),
        data_source: "ryugekka",
      })
      await fetchRecordings(teacher.id)
    } catch (err) {
      console.error("アップロードエラー:", err)
    }
    setUploading(false)
  }

  const getSignedUrl = async (filePath: string) => {
    const { data } = await supabase.storage
      .from("recordings")
      .createSignedUrl(filePath, 3600)
    return data?.signedUrl
  }

  const togglePlay = async (rec: Recording) => {
    if (playingId === rec.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }
    const url = await getSignedUrl(rec.recording_url)
    if (!url) return
    if (audioRef.current) audioRef.current.pause()
    const audio = new Audio(url)
    audio.onended = () => setPlayingId(null)
    audio.play()
    audioRef.current = audio
    setPlayingId(rec.id)
  }

  const downloadRecording = async (rec: Recording) => {
    const url = await getSignedUrl(rec.recording_url)
    if (!url) return
    const a = document.createElement("a")
    a.href = url
    a.download = `通話録音_${rec.created_at.slice(0, 16).replace("T", "_")}.webm`
    a.click()
  }

  const toggleMute = () => {
    if (localTrackRef.current) {
      localTrackRef.current.setEnabled(muted)
      setMuted(!muted)
    }
  }

  return (
    <div className="p-4 max-w-2xl relative">

      {/* ========== トースト通知 ========== */}
      <div style={{
        position: "fixed", top: 20, right: 20, zIndex: 9999,
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        {toasts.map(toast => (
          <div key={toast.id} style={{
            background: "#fff", borderRadius: 16,
            boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
            border: "1px solid #e0f0e8",
            padding: "16px 20px", minWidth: 280, maxWidth: 340,
            animation: "slideIn 0.3s ease",
          }}>
            <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1a3a2a", marginBottom: 12 }}>
              {toast.message}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => startWaiting(toast.waitingEntryId, toast.id)}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 10,
                  background: "#10b981", border: "none",
                  color: "#fff", fontWeight: 700, fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                📞 待機開始
              </button>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  padding: "8px 14px", borderRadius: 10,
                  background: "#f3f4f6", border: "none",
                  color: "#6b7280", fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                後で
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <h1 className="text-xl font-bold mb-2">通話</h1>

      {/* 待機人数表示 */}
      {waitingCount > 0 && (
        <div className="mb-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          現在 <span className="font-bold">{waitingCount}人</span> が待機中です
        </div>
      )}

      {/* 通話カード */}
      <div className="bg-white border rounded-2xl p-8 text-center shadow-sm mb-6">
        <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center text-3xl mx-auto mb-4">🔮</div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">{teacher?.name ?? "読み込み中..."}</h2>
        {status !== "idle" && (
          <p className="text-2xl font-mono text-teal-600 mb-2">{formatTime(callTime)}</p>
        )}
        <p className="text-sm text-gray-500 mb-6">
          {status === "idle" && "待機中"}
          {status === "calling" && "接続中..."}
          {status === "connected" && "通話中"}
        </p>

        {status === "idle" ? (
          <button onClick={startCall}
            className="w-16 h-16 rounded-full bg-teal-500 hover:bg-teal-600 text-white text-2xl mx-auto flex items-center justify-center shadow-lg">
            📞
          </button>
        ) : (
          <div className="flex items-center justify-center gap-6">
            <button onClick={toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow ${muted ? "bg-red-100 text-red-500" : "bg-gray-100 text-gray-600"}`}>
              {muted ? "🔇" : "🎤"}
            </button>
            <button onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white text-2xl flex items-center justify-center shadow-lg">
              📵
            </button>
            <button onClick={() => setSpeaker(!speaker)}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow ${speaker ? "bg-teal-100 text-teal-600" : "bg-gray-100 text-gray-600"}`}>
              {speaker ? "🔊" : "🔈"}
            </button>
          </div>
        )}
        {uploading && <p className="text-xs text-gray-400 mt-4">録音をアップロード中...</p>}
      </div>

      {/* 待機列リスト */}
      {waitingList.length > 0 && (
        <div className="mb-6">
          <h2 className="font-bold text-gray-700 mb-3">待機中のお客様</h2>
          <div className="space-y-2">
            {waitingList.map((entry, index) => (
              <div key={entry.id} className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-sm font-bold text-teal-600 shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 font-medium">お客様</p>
                  <p className="text-xs text-gray-400">{formatTimeAgo(entry.requested_at)}</p>
                </div>
                <button
                  onClick={() => startWaiting(entry.id)}
                  className="text-sm bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-bold shrink-0"
                >
                  待機開始
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 録音履歴 */}
      <div>
        <h2 className="font-bold text-gray-700 mb-3">録音履歴</h2>
        {recordings.length === 0 && <p className="text-gray-400 text-sm">録音はまだありません</p>}
        <div className="space-y-2">
          {recordings.map(rec => (
            <div key={rec.id} className="bg-white border rounded-lg px-4 py-3 flex items-center gap-3">
              <button onClick={() => togglePlay(rec)}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 ${playingId === rec.id ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                {playingId === rec.id ? "⏸" : "▶"}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">{formatDate(rec.created_at)}</p>
                <p className="text-xs text-gray-400">{formatTime(rec.recording_duration)}</p>
              </div>
              <button onClick={() => downloadRecording(rec)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded shrink-0">
                ⬇ DL
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
