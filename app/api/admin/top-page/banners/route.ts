import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 他の app/api/admin/... ルートと同じパターン：service_role キーで管理用クライアントを作成
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: ?type=top|carousel でバナー一覧取得
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type"); // 'top' | 'carousel' | null

  let query = supabase
    .from("site_banners")
    .select("*")
    .order("display_order", { ascending: true });

  if (type === "top" || type === "carousel") {
    query = query.eq("banner_type", type);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ banners: data });
}

// POST: 新規バナー登録
export async function POST(req: NextRequest) {
  const body = await req.json();

  const { banner_type, image_url, link_url, display_order, is_active } = body;

  if (!banner_type || !image_url) {
    return NextResponse.json(
      { error: "banner_type と image_url は必須です" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("site_banners")
    .insert({
      banner_type,
      image_url,
      link_url: link_url ?? null,
      display_order: display_order ?? 0,
      is_active: is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ banner: data });
}

// PATCH: 並び替え・有効/無効切り替え・差し替え
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id は必須です" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("site_banners")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ banner: data });
}

// DELETE: ?id=xxx でバナー削除
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id は必須です" }, { status: 400 });
  }

  const { error } = await supabase.from("site_banners").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
