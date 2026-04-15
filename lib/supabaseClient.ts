import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// デバッグ用（ビルド時に値が取れてるか確認）
if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is missing!')
}
if (!supabaseAnonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing!')
}

export const supabase = createClient(
  supabaseUrl || 'https://wdntqfavisojsawpnehc.supabase.co',
  supabaseAnonKey || 'sb_publishable_EGX8V2_k8KTLNCGP8iRBkA_Zcllbp0F'
)