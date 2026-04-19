"use client"

import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function UnauthorizedPage() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          アクセス権限がありません
        </h1>
        <p className="text-gray-600">このシステムは龍月花の鑑定師専用です。</p>
        <a href="/login" className="mt-4 inline-block text-amber-600 underline">
          ログイン画面へ戻る
        </a>
        <br />
        <button
          onClick={handleLogout}
          className="mt-4 inline-block bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
        >
          Googleアカウントをログアウト
        </button>
      </div>
    </div>
  )
}