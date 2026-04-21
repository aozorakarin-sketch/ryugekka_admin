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
  const [currentQueueId, setCurrentQueueId] = useState<string | null>(null)

  const clientRef = useRef<any>(null)
  const localTrackRef = useRef<any>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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
      fetchRecordings(t.id)
      fetchWaitingCount(t.id)
    }
  }

  const fetchWaitingCount = async (teacherId: string) => {
    const { count } = await supabase
      .from("waiting_queue")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", teacherId)
      .eq("status", "waiting")
    setWaitingCount(count ?? 0)
  }

  // 通話開始時：先頭の待機レコードをin_callに更新
  const markQueueInCall = async (teacherId: string) => {
    const { data } = await supabase
      .from("waiting_queue")
      .select("id")
      .eq("teacher_id", teacherId)
      .eq("status", "waiting")
      .order("requested_at", { ascending: true })
      .limit(1)
      .single()

    if (data?.id) {
      await supabase
        .from("waiting_queue")
        .update({
          status: "in_call",
          call_started_at: new Date().toISOString(),
        })
        .eq("id", data.id)
      setCurrentQueueId(data.id)
    }
  }

  // 通話終了時：in_callレコードをcompletedに更新
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
    if (teacher) fetchWaitingCount(teacher.id)
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
          // 待機列を in_call に更新
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

    // 待機列を completed に更新
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
      alert("録音のアップロードに失敗しました")
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
    <div className="p-4 max-w-2xl">
      <h1 className="text-xl font-bold mb-2">通話</h1>

      {/* 待機人数表示 */}
      {waitingCount > 0 && (
        <div className="mb-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          現在 <span className="font-bold">{waitingCount}人</span> が待機中です
        </div>
      )}

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

