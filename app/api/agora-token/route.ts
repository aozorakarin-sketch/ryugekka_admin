import { NextRequest, NextResponse } from "next/server"
import { RtcTokenBuilder, RtcRole } from "agora-token"

const APP_ID = "8a10ad2855b44c9aa6cbed991ea48d86"
const APP_CERTIFICATE = "c8d2d8eba6dd49358fa590ce415478f9"

export async function POST(req: NextRequest) {
  const { channelName, uid } = await req.json()
  if (!channelName) {
    return NextResponse.json({ error: "channelName is required" }, { status: 400 })
  }

  const expirationInSeconds = 3600 // 1時間
  const currentTimestamp = Math.floor(Date.now() / 1000)
  const privilegeExpiredTs = currentTimestamp + expirationInSeconds

  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid ?? 0,
    RtcRole.PUBLISHER,
    privilegeExpiredTs,
    privilegeExpiredTs
  )

  return NextResponse.json({ token })
}