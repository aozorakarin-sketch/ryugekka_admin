"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { BannerSection } from "@/components/admin/top-page/BannerSection";
import { TeacherProfileForm } from "@/components/admin/top-page/TeacherProfileForm";

// PROJECT_CONTEXT.md の先生一覧より
const TEACHERS = [
  { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "龍（雲龍蓮）", email: "bazvideo412@gmail.com" },
  { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "月（椎名架月）", email: "tomo517ko@gmail.com" },
  { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "花（青空花林）", email: "aozora.karin@gmail.com" },
] as const;

type TabId = "operation" | (typeof TEACHERS)[number]["id"];

export default function TopPageManagement() {
  const [activeTab, setActiveTab] = useState<TabId>("operation");
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  useEffect(() => {
    // ログイン中の先生のメールアドレスを取得し、担当タブの編集可否を判定する
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentEmail(user?.email ?? null);
    };
    loadUser();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-gray-800 mb-1">トップページ管理</h1>
      <p className="text-sm text-gray-500 mb-6">
        ユーザーサイトのトップページに表示するバナー・先生プロフィールを登録します
      </p>

      {/* タブ */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        <TabButton
          active={activeTab === "operation"}
          onClick={() => setActiveTab("operation")}
        >
          運営
        </TabButton>
        {TEACHERS.map((t) => (
          <TabButton
            key={t.id}
            active={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
          >
            {t.name}
          </TabButton>
        ))}
      </div>

      {/* コンテンツ */}
      {activeTab === "operation" && <BannerSection />}

      {TEACHERS.map(
        (t) =>
          activeTab === t.id && (
            <TeacherProfileForm
              key={t.id}
              teacherId={t.id}
              teacherName={t.name}
              canEdit={currentEmail === t.email}
            />
          )
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-rose-500 text-rose-600"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}
