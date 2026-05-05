"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { formatJST } from "@/lib/utils"

const APP_ID = "8a10ad2855b44c9aa6cbed991ea48d86"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string; channel: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林", channel: "karin" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月", channel: "katsuki" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮", channel: "renren" },
  "ohayo0840ohayo@gmail.com": { id: "e482fff7-25db-483d-8d68-46a893403be3", name: "宝明里茉", channel: "rioma" },
}

type WaitingEntry = {
  id: string
  user_id: string
  status: string
  requested_at: string
  agora_channel: string
}

type Recording = {
  id: string
  recording_url: string
  created_at: string
  recording_duration: number
}

const toUtcDate = (s: string) => new Date(s.endsWith('Z') ? s : s + 'Z')

export default function CallPage() {
  const [status, setStatus] = useState<"idle" | "calling" | "connected">("idle")
  const [muted, setMuted] = useState(false)
  const [callTime, setCallTime] = useState(0)
  const [teacher, setTeacher] = useState<{ id: string; name: string; channel: string } | null>(null)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [uploading, setUploading] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [waitingCount, setWaitingCount] = useState(0)
  const [waitingList, setWaitingList] = useState<WaitingEntry[]>([])
  const [currentQueueId, setCurrentQueueId] = useState<string | null>(null)
  const [callingEntryId, setCallingEntryId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<{ message: string; type: 'normal' | 'warning' }[]>([])

  const clientRef = useRef<any>(null)
  const localTrackRef = useRef<any>(null)
  const remoteTrackRef = useRef<any>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const callRingRef = useRef<HTMLAudioElement | null>(null)
  const teacherRef = useRef<{ id: string; name: string; channel: string } | null>(null)
  const callingEntryIdRef = useRef<string | null>(null)
  const statusRef = useRef<"idle" | "calling" | "connected">("idle")
  const callTimeRef = useRef<number>(0)

  useEffect(() => {
    initTeacher()
    return () => {
      stopTimer()
      stopCallRing()
      if (audioContextRef.current) audioContextRef.current.close()
    }
  }, [])

  const updateStatus = (s: "idle" | "calling" | "connected") => {
    setStatus(s)
    statusRef.current = s
  }

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

  const playNotification = () => {
    try {
      const audio = new Audio("/sounds/notification.mp3")
      audio.play().catch(err => console.error("通知音エラー:", err))
    } catch (err) {
      console.error("通知音エラー:", err)
    }
  }

  const playCallRing = () => {
    const audio = new Audio("/sounds/call_ring.mp3")
    audio.loop = true
    audio.play().catch(err => console.error("呼び出し音エラー:", err))
    callRingRef.current = audio
  }

  const stopCallRing = () => {
    if (callRingRef.current) {
      callRingRef.current.pause()
      callRingRef.current.currentTime = 0
      callRingRef.current = null
    }
  }

  const addToast = (message: string, type: 'normal' | 'warning' = 'normal') => {
    setToasts(prev => [...prev, { message, type }])
    setTimeout(() => { setToasts(prev => prev.slice(1)) }, 6000)
  }

  const startMixedRecording = (localTrack: any, remoteTrack: any) => {
    try {
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const destination = audioContext.createMediaStreamDestination()

      const localStream = new MediaStream([localTrack.getMediaStreamTrack()])
      const localSource = audioContext.createMediaStreamSource(localStream)
      localSource.connect(destination)

      if (remoteTrack) {
        const remoteStream = new MediaStream([remoteTrack.getMediaStreamTrack()])
        const remoteSource = audioContext.createMediaStreamSource(remoteStream)
        remoteSource.connect(destination)
      }

      const recorder = new MediaRecorder(destination.stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.start()
      recorderRef.current = recorder
    } catch (err) {
      console.error("録音開始エラー:", err)
    }
  }

  const joinAgora = async () => {
    if (!teacherRef.current) return
    try {
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default
      const token = await getToken(teacherRef.current.channel)
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
      clientRef.current = client

      client.on("user-published", async (remoteUser: any, mediaType: "audio" | "video") => {
        await client.subscribe(remoteUser, mediaType)
        if (mediaType === "audio") {
          remoteUser.audioTrack.play()
          remoteTrackRef.current = remoteUser.audioTrack
          if (localTrackRef.current) {
            startMixedRecording(localTrackRef.current, remoteUser.audioTrack)
          }
        }
      })

      client.on("user-left", async () => { await endCall() })

      await client.join(APP_ID, teacherRef.current.channel, token, null)
      const localTrack = await AgoraRTC.createMicrophoneAudioTrack()
      localTrackRef.current = localTrack
      await client.publish([localTrack])

    } catch (err: any) {
      console.error(err)
      updateStatus("idle")
      stopCallRing()
      callingEntryIdRef.current = null
      setCallingEntryId(null)
      alert("通話開始エラー: " + err.message)
    }
  }

  const subscribeWaitingQueue = (teacherId: string) => {
    supabase
      .channel("admin_waiting_queue")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "waiting_queue",
        filter: `teacher_id=eq.${teacherId}`,
      }, () => {
        playNotification()
        addToast("📞 新しいお客様が来ました！")
        fetchWaitingList(teacherId)
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "waiting_queue",
        filter: `teacher_id=eq.${teacherId}`,
      }, async (payload) => {
        const newStatus = payload.new.status
        const entryId = payload.new.id
        const endReason = payload.new.end_reason

        if (newStatus === "in_call" && entryId === callingEntryIdRef.current && statusRef.current === "calling") {
          stopCallRing()
          updateStatus("connected")
          setCurrentQueueId(entryId)
          await new Promise(resolve => setTimeout(resolve, 500))
          await joinAgora()
          startTimer()
        }

        if (newStatus === "cancelled" && entryId === callingEntryIdRef.current) {
          stopCallRing()
          updateStatus("idle")
          callingEntryIdRef.current = null
          setCallingEntryId(null)
        }

        if (newStatus === "completed" && endReason === "point_exhausted") {
          addToast("⚠️ お客様のポイント不足で切電されました", "warning")
          await endCall()
        }

        fetchWaitingList(teacherId)
      })
      .subscribe()
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

  const startCallToCustomer = async (entryId: string) => {
    if (!teacherRef.current) return
    await supabase.from("waiting_queue").update({ status: "calling" }).eq("id", entryId)
    callingEntryIdRef.current = entryId
    setCallingEntryId(entryId)
    updateStatus("calling")
    playCallRing()
  }

  const endCall = async () => {
    const duration = callTimeRef.current
    stopTimer()
    stopCallRing()

    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop()
      recorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        await uploadRecording(blob, duration)
      }
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (localTrackRef.current) { localTrackRef.current.close(); localTrackRef.current = null }
    if (clientRef.current) { await clientRef.current.leave(); clientRef.current = null }
    remoteTrackRef.current = null

    const queueId = currentQueueId || callingEntryIdRef.current
    if (queueId && teacherRef.current) {
      const { data: existing } = await supabase
        .from("waiting_queue")
        .select("end_reason, user_id, call_started_at")
        .eq("id", queueId)
        .single()

      if (existing?.end_reason !== "point_exhausted") {
        await supabase.from("waiting_queue")
          .update({ status: "completed", call_ended_at: new Date().toISOString() })
          .eq("id", queueId)
      }

      // consultationsテーブルに記録
      if (existing?.user_id) {
        const now = new Date()
        // ★ UTC確定: 末尾にZを付けてブラウザのタイムゾーン誤解釈を防ぐ
        const startedAt = existing.call_started_at
          ? toUtcDate(existing.call_started_at)
          : new Date(now.getTime() - duration * 1000)

        // ユーザー名を取得
        const { data: userData } = await supabase
          .from("users")
          .select("handle_name")
          .eq("id", existing.user_id)
          .single()

        const { error: insertError } = await supabase.from("consultations").insert({
          user_id: existing.user_id,
          teacher_id: teacherRef.current.id,
          started_at: startedAt.toISOString(),
          ended_at: now.toISOString(),
          call_duration: Math.max(1, Math.floor(duration / 60)),
          price: 0,
          user_name: userData?.handle_name ?? null,
          teacher_name: teacherRef.current.name,
          data_source: "ryugekka",
        })

        if (insertError) {
          console.error("consultations INSERT エラー:", insertError)
        }
      }

      setCurrentQueueId(null)
    }

    callingEntryIdRef.current = null
    setCallingEntryId(null)
    updateStatus("idle")
    setCallTime(0)
    callTimeRef.current = 0
    setMuted(false)

    if (teacherRef.current) fetchWaitingList(teacherRef.current.id)
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
    callTimeRef.current = 0
    setCallTime(0)
    timerRef.current = setInterval(() => {
      callTimeRef.current += 1
      setCallTime(t => t + 1)
    }, 1000)
  }

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0")
    const s = (sec % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  const formatTimeAgo = (s: string) => {
    const diff = Math.floor((Date.now() - new Date(s).getTime()) / 1000)
    if (diff < 60) return `${diff}秒前`
    return `${Math.floor(diff / 60)}分前`
  }

  const uploadRecording = async (blob: Blob, duration: number) => {
    if (!teacher) return
    setUploading(true)
    try {
      const fileName = `${teacher.id}/${new Date().toISOString().replace(/[:.]/g, "-")}.webm`
      const { error } = await supabase.storage.from("recordings").upload(fileName, blob, { contentType: "audio/webm" })
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
    const { data } = await supabase.storage.from("recordings").createSignedUrl(filePath, 3600)
    return data?.signedUrl
  }

  const togglePlay = async (rec: Recording) => {
    if (playingId === rec.id) { audioRef.current?.pause(); setPlayingId(null); return }
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
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const toggleMute = () => {
    if (localTrackRef.current) {
      localTrackRef.current.setEnabled(muted)
      setMuted(!muted)
    }
  }

  return (
    <div className="p-4 max-w-2xl relative">
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map((toast, i) => (
          <div key={i} style={{
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            border: toast.type === 'warning' ? "1px solid #ffcccc" : "1px solid #d1fae5",
            padding: "12px 16px",
            fontSize: "0.9rem",
            fontWeight: 600,
            color: toast.type === 'warning' ? "#c0392b" : "#065f46",
          }}>{toast.message}</div>
        ))}
      </div>

      <h1 className="text-xl font-bold mb-2">通話</h1>

      {waitingCount > 0 && (
        <div className="mb-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          現在 <span className="font-bold">{waitingCount}人</span> が待機中です
        </div>
      )}

      <div className="bg-white border rounded-2xl p-8 text-center shadow-sm mb-6">
        <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center text-3xl mx-auto mb-4">🔮</div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">{teacher?.name ?? "読み込み中..."}</h2>
        {status !== "idle" && <p className="text-2xl font-mono text-teal-600 mb-2">{formatTime(callTime)}</p>}
        <p className="text-sm text-gray-500 mb-6">
          {status === "idle" && "待機中"}
          {status === "calling" && "呼び出し中..."}
          {status === "connected" && "通話中"}
        </p>

        {status === "idle" && waitingList.length === 0 && (
          <p className="text-sm text-gray-400">待機中のお客様はいません</p>
        )}

        {status !== "idle" && (
          <div className="flex items-center justify-center gap-6">
            <button onClick={toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow ${muted ? "bg-red-100 text-red-500" : "bg-gray-100 text-gray-600"}`}>
              {muted ? "🔇" : "🎤"}
            </button>
            <button onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white text-2xl flex items-center justify-center shadow-lg">
              📵
            </button>
          </div>
        )}

        {uploading && <p className="text-xs text-gray-400 mt-4">録音をアップロード中...</p>}
      </div>

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
                {status === "idle" && (
                  <button onClick={() => startCallToCustomer(entry.id)}
                    className="text-sm bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-bold shrink-0">
                    📞 通話開始
                  </button>
                )}
                {callingEntryId === entry.id && status === "calling" && (
                  <span className="text-sm text-teal-600 font-bold shrink-0 animate-pulse">呼び出し中...</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
                <p className="text-sm text-gray-700">{formatJST(rec.created_at)}</p>
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
