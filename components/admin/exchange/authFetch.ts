import { supabase } from "@/lib/supabaseClient";

// ★得トラカ交換所の管理用API（/api/admin/exchange/...）を、ログイン情報つきで呼ぶ
export async function authFetch(url: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    },
  });
}
