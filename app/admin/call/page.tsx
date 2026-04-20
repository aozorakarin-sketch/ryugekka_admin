"use client"

import { useEffect, useRef, useState } from "react"

const APP_ID = "8a10ad2855b44c9aa6cbed991ea48d86"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string; channel: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林", channel: "karin" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月", channel: "katsuki" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮", channel: "renren" },
}

export default function CallPage() {
  const [status, setStatus] = useState<"idle" | "calling" | "connected">("idle")
  const [muted, setMuted] = useState(false)
  const [speaker, setSpeaker] = useState(true)
  const [callTime, setCallTime] = useState(0)
  const [teacher, setTeacher] = useState<{ name: string; channel: string } | null>(null)

  const clientRef = useRef<any>(null)
  const localTrackRef = useRef<any>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    // ログイン中の先生を取得
    import("@/lib/supabaseClient").then(({ supabase }) => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user?.email) return
        const t = EMAIL_TO_TEACHER[user.email]
        if (t) setTeacher(t)
      })
    })
    return () => {
      stopTimer()
    }
  }, [])

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
    timerRef.current = setInterval(() => {
      setCallTime(t => t + 1)
    }, 1000)
  }

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0")
    const s = (sec % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  const startCall = async () => {
    if (!teacher) return
    try {
      setStatus("calling")
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default
      const token = await getToken(teacher.channel)

      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
      clientRef.current = client

      client.on("user-published", async (user: any, mediaType: string) => {
        await client.subscribe(user, mediaType)
        if (mediaType === "audio") {
          user.audioTrack.play()
          setStatus("connected")
          startTimer()
        }
      })

      await client.join(APP_ID, teacher.channel, token, null)
      const localTrack = await AgoraRTC.createMicrophoneAudioTrack()
      localTrackRef.current = localTrack
      await client.publish([localTrack])

      // 録音開始
      const stream = new MediaStream([localTrack.getMediaStreamTrack()])
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
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
    stopTimer()

    // 録音停止・ダウンロード
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop()
      recorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `通話録音_${new Date().toISOString().slice(0, 16).replace("T", "_")}.webm`
        a.click()
        URL.revokeObjectURL(url)
      }
    }

    if (localTrackRef.current) {
      localTrackRef.current.close()
      localTrackRef.current = null
    }
    if (clientRef.current) {
      await clientRef.current.leave()
      clientRef.current = null
    }
    setStatus("idle")
    setCallTime(0)
    setMuted(false)
  }

  const toggleMute = () => {
    if (localTrackRef.current) {
      localTrackRef.current.setEnabled(muted)
      setMuted(!muted)
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-6">通話</h1>

      <div className="bg-white border rounded-2xl p-8 text-center shadow-sm">
        {/* 先生名 */}
        <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center text-3xl mx-auto mb-4">
          🔮
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">{teacher?.name ?? "読み込み中..."}</h2>

        {/* 通話時間 */}
        {status !== "idle" && (
          <p className="text-2xl font-mono text-teal-600 mb-4">{formatTime(callTime)}</p>
        )}

        {/* ステータス */}
        <p className="text-sm text-gray-500 mb-8">
          {status === "idle" && "待機中"}
          {status === "calling" && "接続中..."}
          {status === "connected" && "通話中"}
        </p>

        {/* 通話ボタン */}
        {status === "idle" ? (
          <button
            onClick={startCall}
            className="w-16 h-16 rounded-full bg-teal-500 hover:bg-teal-600 text-white text-2xl mx-auto flex items-center justify-center shadow-lg"
          >
            📞
          </button>
        ) : (
          <div className="flex items-center justify-center gap-6">
            {/* ミュート */}
            <button
              onClick={toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow ${
                muted ? "bg-red-100 text-red-500" : "bg-gray-100 text-gray-600"
              }`}
            >
              {muted ? "🔇" : "🎤"}
            </button>

            {/* 終話 */}
            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white text-2xl flex items-center justify-center shadow-lg"
            >
              📵
            </button>

            {/* スピーカー */}
            <button
              onClick={() => setSpeaker(!speaker)}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow ${
                speaker ? "bg-teal-100 text-teal-600" : "bg-gray-100 text-gray-600"
              }`}
            >
              {speaker ? "🔊" : "🔈"}
            </button>
          </div>
        )}
      </div>

      {/* 録音について */}
      {status === "idle" && (
        <p className="text-xs text-gray-400 text-center mt-4">
          通話終了時に録音ファイルが自動保存されます
        </p>
      )}
    </div>
  )
}