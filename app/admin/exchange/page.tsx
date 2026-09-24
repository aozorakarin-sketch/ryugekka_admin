"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ItemsSection } from "@/components/admin/exchange/ItemsSection";
import { ExchangeOrdersSection } from "@/components/admin/exchange/ExchangeOrdersSection";

// ★得トラカ交換所の管理（ショップ管理と同じ作り：先生タブ＋特典／申込）
const TEACHERS = [
  { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "龍（雲龍蓮）", token: "龍得トラカ", email: "bazvideo412@gmail.com" },
  { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "月（椎名架月）", token: "月得トラカ", email: "tomo517ko@gmail.com" },
  { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "花（青空花林）", token: "花得トラカ", email: "aozora.karin@gmail.com" },
] as const;

export default function ExchangeManagementPage() {
  const [activeTeacher, setActiveTeacher] = useState<string>(TEACHERS[0].id);
  const [subTab, setSubTab] = useState<"items" | "orders">("items");
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentEmail(user?.email ?? null);
      // ログインした先生のタブを最初に開く
      const mine = TEACHERS.find(t => t.email === user?.email);
      if (mine) setActiveTeacher(mine.id);
    });
  }, []);

  const teacher = TEACHERS.find(t => t.id === activeTeacher)!;
  const canEdit = teacher.email === currentEmail;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-gray-800 mb-1">得トラカ交換所</h1>
      <p className="text-sm text-gray-500 mb-6">
        お客さんがランク特典でもらった得トラカと交換できる特典を管理します。電話クーポンは交換するとすぐお客さんに届き、グッズは申込一覧から発送します。
      </p>

      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {TEACHERS.map((t) => (
          <button key={t.id} onClick={() => setActiveTeacher(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTeacher === t.id ? "border-rose-500 text-rose-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {t.name}
          </button>
        ))}
      </div>

      <div className="flex gap-1 mb-6">
        <button onClick={() => setSubTab("items")}
          className={`px-3 py-1.5 text-xs rounded-full ${subTab === "items" ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-600"}`}>特典</button>
        <button onClick={() => setSubTab("orders")}
          className={`px-3 py-1.5 text-xs rounded-full ${subTab === "orders" ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-600"}`}>交換申込</button>
      </div>

      {!canEdit && (
        <p className="text-xs text-amber-600 mb-3">※このタブは閲覧のみです（担当の先生のみ編集できます）</p>
      )}

      {subTab === "items" ? (
        <ItemsSection teacherId={activeTeacher} canEdit={canEdit} tokenLabel={teacher.token} />
      ) : (
        <ExchangeOrdersSection teacherId={activeTeacher} canEdit={canEdit} tokenLabel={teacher.token} />
      )}
    </div>
  );
}
