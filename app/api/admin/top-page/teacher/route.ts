import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 他の app/api/admin/... ルートと同じパターン：service_role キーで管理用クライアントを作成
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ログイン中ユーザーのメールアドレスをCookieセッションから取得
// （lib/salesAggregation.ts の requireTeacherAuth と同様のパターン）
async function getCurrentUserEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // route handler内では書き込み不要
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  return user?.email ?? null;
}

// GET: ?teacher_id=xxx でプロフィール取得（未登録なら null を返す）
export async function GET(req: NextRequest) {
  const teacherId = req.nextUrl.searchParams.get("teacher_id");

  if (!teacherId) {
    return NextResponse.json({ error: "teacher_id は必須です" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("teacher_top_profile")
    .select("*")
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile: data });
}

// PUT: プロフィールをupsert（担当先生本人のみ許可）
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { teacher_id, ...profileFields } = body;

  if (!teacher_id) {
    return NextResponse.json({ error: "teacher_id は必須です" }, { status: 400 });
  }

  // 本人確認：ログイン中のメールアドレスが teacher_id の先生と一致するか
  const email = await getCurrentUserEmail();
  if (!email) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { data: teacher } = await supabaseAdmin
    .from("teachers")
    .select("id")
    .eq("email", email)
    .single();

  if (!teacher || teacher.id !== teacher_id) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("teacher_top_profile")
    .upsert({ teacher_id, ...profileFields }, { onConflict: "teacher_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile: data });
}
