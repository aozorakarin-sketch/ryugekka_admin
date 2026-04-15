import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 dark:from-gray-900 dark:to-gray-800">
      {/* ヘッダー */}
      <header className="border-b border-amber-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-amber-800 dark:text-amber-400">
            🌸 龍月花
          </h1>
          <Button variant="outline" asChild>
            <a href="/login">ログイン</a>
          </Button>
        </div>
      </header>

      {/* メイン */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
            三人の鑑定士が集う場所
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            龍・月・花 — それぞれの視点で、あなたの運命を照らします
          </p>
        </div>

        {/* 占い師カード */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { name: "🐉 雲龍蓮", desc: "龍の如く、力強い導き" },
            { name: "🌙 椎名架月", desc: "月の光、静かな洞察" },
            { name: "🌸 青空花林", desc: "花の如く、優しい癒し" }
          ].map((teacher) => (
            <div key={teacher.name} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
              <h3 className="text-xl font-semibold mb-2">{teacher.name}</h3>
              <p className="text-gray-500 dark:text-gray-400">{teacher.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}