import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const teacherId = req.nextUrl.searchParams.get('teacher_id');
  let query = supabase
    .from('shop_orders')
    .select('*, shop_products(name, image_url)')
    .order('created_at', { ascending: false });
  if (teacherId) query = query.eq('teacher_id', teacherId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, status, tracking_number } = body;
  if (!id) return NextResponse.json({ error: 'idが必要です' }, { status: 400 });

  const fields: Record<string, unknown> = {};
  if (status) {
    fields.status = status;
    if (status === 'shipped') fields.shipped_at = new Date().toISOString();
  }
  if (tracking_number !== undefined) fields.tracking_number = tracking_number;

  const { error } = await supabase.from('shop_orders').update(fields).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
