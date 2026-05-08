import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { consultation_id } = await req.json()
    if (!consultation_id) {
      return NextResponse.json({ error: 'consultation_id が必要です' }, { status: 400 })
    }

    // call_recordings から recording_url と teacher_id を取得
    const { data: recording, error: recError } = await supabase
      .from('call_recordings')
      .select('id, recording_url, teacher_id')
      .eq('consultation_id', consultation_id)
      .maybeSingle()

    if (recError || !recording) {
      return NextResponse.json({ error: '録音データが見つかりません' }, { status: 404 })
    }

    // teachers から openai_api_key を取得
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('openai_api_key')
      .eq('id', recording.teacher_id)
      .single()

    if (teacherError || !teacher?.openai_api_key) {
      return NextResponse.json({ error: 'OpenAI APIキーが設定されていません' }, { status: 400 })
    }

    // recordings バケットからファイルをダウンロード
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('recordings')
      .download(recording.recording_url)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'ファイル取得失敗: ' + downloadError?.message }, { status: 500 })
    }

    // Whisper に送信
    const fd = new FormData()
    const fileName = recording.recording_url.split('/').pop() || 'audio.webm'
    fd.append('file', fileData, fileName)
    fd.append('model', 'whisper-1')
    fd.append('language', 'ja')

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacher.openai_api_key}` },
      body: fd,
    })

    if (!whisperRes.ok) {
      const errText = await whisperRes.text()
      return NextResponse.json({ error: `Whisper失敗: ${errText}` }, { status: 500 })
    }

    const whisperData = await whisperRes.json()
    const transcript = whisperData.text

    // call_recordings の transcript に保存
    const { error: updateError } = await supabase
      .from('call_recordings')
      .update({ transcript, updated_at: new Date().toISOString() })
      .eq('id', recording.id)

    if (updateError) {
      return NextResponse.json({ error: '保存失敗: ' + updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, transcript })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
