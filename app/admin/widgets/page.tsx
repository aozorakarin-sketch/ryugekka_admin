'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

const TEACHER_IDS: Record<string, string> = {
  ryu: '3ba85bb9-9065-461b-b76b-cc488d4c0c3b',
  tsuki: '17cf0ca1-7526-466e-a644-9d3efefa4091',
  hana: 'cd2c4101-2e24-4ae2-8d6a-507a943904af',
};
const TEACHER_NAMES: Record<string, string> = { ryu: '雲龍蓮', tsuki: '椎名架月', hana: '青空花林' };

interface BlogRow {
  id: string;
  title: string;
  created_at: string;
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function EmbedBlogWidget() {
  const supabase = createClient();
  const params = useParams();
  const key = params?.teacherKey as string;
  const [posts, setPosts] = useState<BlogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const teacherId = TEACHER_IDS[key];
    if (!teacherId) { setLoading(false); return; }
    supabase
      .from('blog_posts')
      .select('id, title, created_at')
      .eq('teacher_id', teacherId)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(3)
      .then(({ data }) => { setPosts((data as BlogRow[]) ?? []); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const name = TEACHER_NAMES[key];
  if (!name) return null;

  return (
    <div className="ebw">
      <style>{`
        .ebw{
          --gold:#d8b878; --gold-bright:#f3d99a; --text:#ece8dd; --text-dim:#b9b3a4; --panel:rgba(8,11,22,0.72);
          font-family:"Noto Sans JP", sans-serif; background:#05060d; color:var(--text); padding:4px;
        }
        .ebw-frame{background:var(--panel); border:1px solid rgba(216,184,120,0.25); border-radius:6px; padding:20px 22px 16px;}
        .ebw-frame h3{font-family:"Shippori Mincho",serif; font-size:15px; letter-spacing:0.1em; color:var(--gold); margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(216,184,120,0.22); display:flex; justify-content:space-between; align-items:center;}
        .ebw-frame h3 a{font-family:"Noto Sans JP",sans-serif; font-size:11px; letter-spacing:0.04em; color:var(--gold-bright); font-weight:400; text-decoration:none;}
        .ebw-item{display:flex; justify-content:space-between; gap:16px; font-size:13px; color:var(--text-dim); padding:10px 0; border-bottom:1px dashed rgba(255,255,255,0.08); text-decoration:none;}
        .ebw-item:hover{color:var(--text);}
        .ebw-item .d{font-size:11px; color:var(--text-dim); flex-shrink:0;}
        .ebw-empty{font-size:13px; color:var(--text-dim);}
      `}</style>
      <div className="ebw-frame">
        <h3>
          <span>{name}のブログ</span>
          <a href={`https://ryugekka.vercel.app/blog/${key}`} target="_blank" rel="noopener noreferrer">一覧を見る →</a>
        </h3>
        {loading && <div className="ebw-empty">読み込み中...</div>}
        {!loading && posts.length === 0 && <div className="ebw-empty">まだブログ記事がありません</div>}
        {posts.map(p => (
          <a className="ebw-item" key={p.id} href={`https://ryugekka.vercel.app/blog/${key}`} target="_blank" rel="noopener noreferrer">
            <span>{p.title}</span>
            <span className="d">{formatShortDate(p.created_at)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
