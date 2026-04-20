"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

const EMAIL_TO_TEACHER: Record<string, { id: string; name: string }> = {
  "aozora.karin@gmail.com": { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "青空花林" },
  "tomo517ko@gmail.com": { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "椎名架月" },
  "bazvideo412@gmail.com": { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "雲龍蓮" },
}

type BlogPost = {
  id: string
  title: string
  status: string
  tags: string[]
  published_at: string | null
  created_at: string
}

export default function BlogPage() {
  const router = useRouter()
  const [teacher, setTeacher] = useState<{ id: string; name: string } | null>(null)
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return
    const t = EMAIL_TO_TEACHER[user.email]
    if (!t) return
    setTeacher(t)
    await fetchPosts(t.id)
  }

  const fetchPosts = async (teacherId: string) => {
    setLoading(true)
    const { data } = await supabase
      .from("blog_posts")
      .select("id, title, status, tags, published_at, created_at")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false })
    setPosts(data ?? [])
    setLoading(false)
  }

  const deletePost = async (id: string) => {
    if (!confirm("削除しますか？")) return
    await supabase.from("blog_posts").delete().eq("id", id)
    if (teacher) fetchPosts(teacher.id)
  }

  const formatDate = (s: string | null) => {
    if (!s) return "-"
    const d = new Date(s)
    return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`
  }

  if (loading) return <div className="p-6">読み込み中...</div>

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">ブログ管理 <span className="text-gray-400 text-base font-normal">{posts.length}件</span></h1>
        <button
          onClick={() => router.push("/admin/blog/edit")}
          className="bg-teal-500 hover:bg-teal-600 text-white text-sm px-4 py-2 rounded"
        >
          ＋ 新規作成
        </button>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        {posts.length === 0 && (
          <p className="text-gray-400 text-sm p-6">ブログ記事はまだありません</p>
        )}
        {posts.map((post, i) => (
          <div key={post.id} className={`flex items-center gap-4 px-4 py-3 ${i !== 0 ? "border-t" : ""}`}>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">{post.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400">{formatDate(post.published_at || post.created_at)}</span>
                {post.tags?.length > 0 && (
                  <span className="text-xs text-gray-400">{post.tags[0]}</span>
                )}
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
              post.status === "published" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"
            }`}>
              {post.status === "published" ? "公開中" : "非公開"}
            </span>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => router.push(`/admin/blog/edit?id=${post.id}`)}
                className="text-sm bg-blue-500 text-white px-3 py-1 rounded"
              >編集</button>
              <button
                onClick={() => deletePost(post.id)}
                className="text-sm bg-red-500 text-white px-3 py-1 rounded"
              >削除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}