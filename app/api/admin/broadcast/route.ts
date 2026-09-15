import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PROJECT_CONTEXT.md の先生一覧より
const TEACHER_IDS: Record<string, string> = {
  ryu: '3ba85bb9-9065-461b-b76b-cc488d4c0c3b',
  tsuki: '17cf0ca1-7526-466e-a644-9d3efefa4091',
  hana: 'cd2c4101-2e24-4ae2-8d6a-507a943904af',
};

const SENDER_CONFIG: Record<string, { apiKeyEnv: string; from: string }> = {
  info: { apiKeyEnv: 'RESEND_API_KEY_KARIN', from: 'info@ryugekka.com' },
  ryu: { apiKeyEnv: 'RESEND_API_KEY_RYU', from: 'ryu@ryugekka.com' },
  tsuki: { apiKeyEnv: 'RESEND_API_KEY_TSUKI', from: 'tsuki@ryugekka.com' },
  hana: { apiKeyEnv: 'RESEND_API_KEY_KARIN', from: 'hana@ryugekka.com' },
};

interface TargetUser {
  id: string;
  email: string;
  handle_name: string | null;
}

// 送信対象ユーザーを取得
async function getTargetUsers(sender: string): Promise<TargetUser[]> {
  if (sender === 'info') {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, handle_name');
    if (error) throw error;
    return (data ?? []).filter(u => !!u.email);
  }

  const teacherId = TEACHER_IDS[sender];
  if (!teacherId) return [];

  // その先生と鑑定履歴があるユーザーIDを抽出（重複除去）
  const { data: consultationRows, error: cErr } = await supabase
    .from('consultations')
    .select('user_id')
    .eq('teacher_id', teacherId);
  if (cErr) throw cErr;

  const userIds = Array.from(new Set((consultationRows ?? []).map(r => r.user_id).filter(Boolean)));
  if (userIds.length === 0) return [];

  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('id, email, handle_name')
    .in('id', userIds);
  if (uErr) throw uErr;

  return (users ?? []).filter(u => !!u.email);
}

function buildEmailHtml(name: string | null, subject: string, body: string) {
  const bodyHtml = body
    .split('\n')
    .map(line => `<p style="margin:0 0 0.8em; line-height:1.8;">${line || '&nbsp;'}</p>`)
    .join('');
  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #3a2c20;">
      <div style="background: #faf8f5; border-bottom: 3px solid #b87c4f; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 1.3rem; color: #b87c4f; letter-spacing: 2px;">龍月花</h1>
        <p style="margin: 4px 0 0; font-size: 0.8rem; color: #9b8b7a;">三人の鑑定士</p>
      </div>
      <div style="padding: 28px 24px;">
        ${name ? `<p style="margin:0 0 16px;">${name} 様</p>` : ''}
        ${bodyHtml}
      </div>
      <div style="background: #faf8f5; padding: 16px 24px; text-align: center; font-size: 0.75rem; color: #9b8b7a;">
        龍月花 占いポータル
      </div>
    </div>
  `;
}

// 対象人数の確認
export async function GET(req: NextRequest) {
  try {
    const sender = req.nextUrl.searchParams.get('sender') ?? '';
    if (!SENDER_CONFIG[sender]) {
      return NextResponse.json({ error: '送信元が不正です' }, { status: 400 });
    }
    const targets = await getTargetUsers(sender);
    return NextResponse.json({ count: targets.length });
  } catch (err) {
    console.error('Broadcast count error:', err);
    return NextResponse.json({ error: '対象人数の取得に失敗しました' }, { status: 500 });
  }
}

// 一斉送信の実行
export async function POST(req: NextRequest) {
  try {
    const { sender, subject, body } = await req.json();

    if (!SENDER_CONFIG[sender]) {
      return NextResponse.json({ error: '送信元が不正です' }, { status: 400 });
    }
    if (!subject?.trim() || !body?.trim()) {
      return NextResponse.json({ error: '件名・本文を入力してください' }, { status: 400 });
    }

    const config = SENDER_CONFIG[sender];
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) {
      return NextResponse.json({ error: `${config.apiKeyEnv} が未設定です` }, { status: 500 });
    }
    const resend = new Resend(apiKey);

    const targets = await getTargetUsers(sender);
    if (targets.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, total: 0 });
    }

    let sent = 0;
    let failed = 0;

    // Resendのレート制限に配慮し、10件ずつまとめて送信
    const chunkSize = 10;
    for (let i = 0; i < targets.length; i += chunkSize) {
      const chunk = targets.slice(i, i + chunkSize);
      const results = await Promise.allSettled(
        chunk.map(u =>
          resend.emails.send({
            from: config.from,
            to: u.email,
            subject,
            html: buildEmailHtml(u.handle_name, subject, body),
          })
        )
      );
      results.forEach(r => { if (r.status === 'fulfilled') sent++; else failed++; });
    }

    return NextResponse.json({ sent, failed, total: targets.length });
  } catch (err) {
    console.error('Broadcast send error:', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
