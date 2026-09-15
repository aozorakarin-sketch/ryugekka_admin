"use client";

import { useState } from "react";

const SITE_URL = "https://ryugekka.vercel.app";

const TEACHERS = [
  { key: "ryu", name: "龍（雲龍蓮）" },
  { key: "tsuki", name: "月（椎名架月）" },
  { key: "hana", name: "花（青空花林）" },
] as const;

type WidgetDef = {
  id: string;
  label: string;
  description: string;
  needsTeacher: boolean;
  path: (teacherKey: string) => string;
  width: number;
  height: number;
};

const WIDGETS: WidgetDef[] = [
  {
    id: "news",
    label: "News（What's New）",
    description: "サイト全体のお知らせ最新20件を表示（先生共通・1つだけ）",
    needsTeacher: false,
    path: () => "/embed/news",
    width: 400,
    height: 420,
  },
  {
    id: "profile",
    label: "プロフィール画像",
    description: "先生のアイコン画像と名前のみのシンプル表示",
    needsTeacher: true,
    path: (k) => `/embed/profile/${k}`,
    width: 200,
    height: 220,
  },
  {
    id: "teacher-card",
    label: "占い師カード",
    description: "トップページの3人ボックスと同じ、写真・評価・料金・CTA付きカード",
    needsTeacher: true,
    path: (k) => `/embed/teacher-card/${k}`,
    width: 320,
    height: 460,
  },
  {
    id: "reviews",
    label: "口コミ",
    description: "ベストレビュー1件＋最新3件を表示",
    needsTeacher: true,
    path: (k) => `/embed/reviews/${k}`,
    width: 400,
    height: 420,
  },
  {
    id: "whisper",
    label: "つぶやき",
    description: "最新のつぶやき1件を表示",
    needsTeacher: true,
    path: (k) => `/embed/whisper/${k}`,
    width: 400,
    height: 140,
  },
  {
    id: "blog",
    label: "ブログ",
    description: "最新のブログ記事3件＋一覧へのリンクを表示",
    needsTeacher: true,
    path: (k) => `/embed/blog/${k}`,
    width: 400,
    height: 280,
  },
];

function buildIframeTag(src: string, width: number, height: number) {
  return `<iframe src="${src}" width="${width}" height="${height}" style="border:none;" loading="lazy"></iframe>`;
}

export default function WidgetsPage() {
  const [teacherByWidget, setTeacherByWidget] = useState<Record<string, string>>(
    Object.fromEntries(WIDGETS.filter((w) => w.needsTeacher).map((w) => [w.id, "ryu"]))
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-gray-800 mb-1">ウィジェット</h1>
      <p className="text-sm text-gray-500 mb-6">
        LP（ランディングページ）などの外部サイトに埋め込める、龍月花のウィジェットです。
        下の埋め込みタグをコピーして、iframeとして貼り付けてください。
      </p>

      <div className="space-y-6">
        {WIDGETS.map((w) => {
          const teacherKey = teacherByWidget[w.id] ?? "ryu";
          const src = `${SITE_URL}${w.path(teacherKey)}`;
          const tag = buildIframeTag(src, w.width, w.height);
          return (
            <div key={w.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-semibold text-gray-800">{w.label}</h2>
                {w.needsTeacher && (
                  <select
                    value={teacherKey}
                    onChange={(e) =>
                      setTeacherByWidget((prev) => ({ ...prev, [w.id]: e.target.value }))
                    }
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    {TEACHERS.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-3">{w.description}</p>
              <p className="text-xs text-gray-400 mb-2">
                推奨サイズ：{w.width}×{w.height}px（幅は自由に調整可）
              </p>
              <div className="flex items-start gap-2">
                <textarea
                  readOnly
                  value={tag}
                  rows={2}
                  className="flex-1 text-xs font-mono border border-gray-300 rounded px-2 py-1.5 bg-gray-50 resize-none"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={() => handleCopy(w.id, tag)}
                  className="shrink-0 text-xs bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded"
                >
                  {copiedId === w.id ? "コピーしました" : "コピー"}
                </button>
              </div>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-800"
              >
                プレビューを開く →
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
