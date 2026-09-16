import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const teacherId = req.nextUrl.searchParams.get('teacher_id');
  let query = supabase.from('shop_products').select('*').order('display_order', { ascending: true });
  if (teacherId) query = query.eq('teacher_id', teacherId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { teacher_id, name, description, price, image_url, stock, product_type, digital_video_url } = body;
  if (!teacher_id || !name || price == null) {
    return NextResponse.json({ error: 'パラメータが不足しています' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('shop_products')
    .insert({
      teacher_id,
      name,
      description: description ?? null,
      price,
      image_url: image_url ?? null,
      stock: stock ?? 0,
      product_type: product_type ?? 'physical',
      digital_video_url: digital_video_url ?? null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: 'idが必要です' }, { status: 400 });
  const { error } = await supabase
    .from('shop_products')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'idが必要です' }, { status: 400 });
  const { error } = await supabase.from('shop_products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
