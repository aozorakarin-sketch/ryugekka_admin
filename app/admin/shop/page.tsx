"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ProductsSection } from "@/components/admin/shop/ProductsSection";
import { OrdersSection } from "@/components/admin/shop/OrdersSection";

const TEACHERS = [
  { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "龍（雲龍蓮）", email: "bazvideo412@gmail.com" },
  { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "月（椎名架月）", email: "tomo517ko@gmail.com" },
  { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "花（青空花林）", email: "aozora.karin@gmail.com" },
] as const;

export default function ShopManagementPage() {
  const [activeTeacher, setActiveTeacher] = useState<string>(TEACHERS[0].id);
  const [subTab, setSubTab] = useState<"products" | "orders">("products");
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentEmail(user?.email ?? null);
    });
  }, []);

  const canEdit = TEACHERS.find(t => t.id === activeTeacher)?.email === currentEmail;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-gray-800 mb-1">ショップ管理</h1>
      <p className="text-sm text-gray-500 mb-6">
        商品登録（写真・商品名・価格・在庫）と、注文の配送状況を管理します。決済はPayPalで直接行われます。
      </p>

      {/* 先生タブ */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {TEACHERS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTeacher(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTeacher === t.id ? "border-rose-500 text-rose-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* 商品／注文サブタブ */}
      <div className="flex gap-1 mb-6">
        <button
          onClick={() => setSubTab("products")}
          className={`px-3 py-1.5 text-xs rounded-full ${subTab === "products" ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-600"}`}
        >
          商品
        </button>
        <button
          onClick={() => setSubTab("orders")}
          className={`px-3 py-1.5 text-xs rounded-full ${subTab === "orders" ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-600"}`}
        >
          注文
        </button>
      </div>

      {!canEdit && subTab === "products" && (
        <p className="text-xs text-amber-600 mb-3">※このタブは閲覧のみです（担当の先生のみ編集できます）</p>
      )}

      {subTab === "products" ? (
        <ProductsSection teacherId={activeTeacher} canEdit={canEdit} />
      ) : (
        <OrdersSection teacherId={activeTeacher} />
      )}
    </div>
  );
}
