import { NextRequest, NextResponse } from "next/server"
import { RtcTokenBuilder, RtcRole } from "agora-token"

const AGORA_CONFIGS: Record<string, { appId: string; certificate: string }> = {
  karin: {
    appId: "8a10ad2855b44c9aa6cbed991ea48d86",
    certificate: "c8d2d8eba6dd49358fa590ce415478f9",
  },
  katsuki: {
    appId: "46a0dadc9bb54e7d8d2f151e14e626ab",
    certificate: "ef42b9883c5e499b89a6ad4c55a1fcb0",
  },
  renren: {
    appId: "", // 雲龍蓮のApp IDが来たら追加
    certificate: "", // 雲龍蓮のCertificateが来たら追加
  },
}

export async function POST(req: NextRequest) {
  const { channelName, uid } = await req.json()
  if (!channelName) {
    return NextResponse.json({ error: "channelName is required" }, { status: 400 })
  }

  const config = AGORA_CONFIGS[channelName]
  if (!config || !config.appId) {
    return NextResponse.json({ error: "unknown channel" }, { status: 400 })
  }

  const expirationInSeconds = 3600
  const currentTimestamp = Math.floor(Date.now() / 1000)
  const privilegeExpiredTs = currentTimestamp + expirationInSeconds

  const token = RtcTokenBuilder.buildTokenWithUid(
    config.appId,
    config.certificate,
    channelName,
    uid ?? 0,
    RtcRole.PUBLISHER,
    privilegeExpiredTs,
    privilegeExpiredTs
  )

  return NextResponse.json({ token })
}