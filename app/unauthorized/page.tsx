export default function UnauthorizedPage() {
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
      </div>
    </div>
  )
}