"use client";

import { useEffect, useState } from "react";

type Order = {
  id: string;
  quantity: number;
  total_price: number;
  recipient_name: string;
  postal_code: string;
  address: string;
  phone: string;
  status: string;
  tracking_number: string | null;
  created_at: string;
  shop_products: { name: string; image_url: string | null } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "未決済",
  paid: "支払い済み（未発送）",
  shipped: "発送済み",
  cancelled: "キャンセル",
};

function formatDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function OrdersSection({ teacherId }: { teacherId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingDraft, setTrackingDraft] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/shop/orders?teacher_id=${teacherId}`);
    const { orders } = await res.json();
    setOrders(orders ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [teacherId]); // eslint-disable-line react-hooks/exhaustive-deps

  const markShipped = async (id: string) => {
    const tracking_number = trackingDraft[id] ?? "";
    await fetch("/api/admin/shop/orders", {
      method: "PATCH",
      body: JSON.stringify({ id, status: "shipped", tracking_number }),
    });
    load();
  };

  if (loading) return <div className="text-sm text-gray-400">読み込み中...</div>;

  const visibleOrders = orders.filter(o => o.status !== "pending");

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-800 mb-4">
        注文一覧 <span className="text-gray-400 font-normal">{visibleOrders.length}件</span>
      </h3>

      {visibleOrders.length === 0 && <p className="text-sm text-gray-400">まだ注文はありません</p>}

      <div className="space-y-3">
        {visibleOrders.map((o) => (
          <div key={o.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                o.status === "shipped" ? "bg-green-100 text-green-700" :
                o.status === "paid" ? "bg-orange-100 text-orange-700" :
                "bg-gray-100 text-gray-500"
              }`}>
                {STATUS_LABEL[o.status] ?? o.status}
              </span>
              <span className="text-xs text-gray-400">{formatDate(o.created_at)}</span>
            </div>

            <p className="text-sm font-medium text-gray-800 mb-1">
              {o.shop_products?.name ?? "商品情報なし"} × {o.quantity}　
              <span className="text-gray-500">¥{o.total_price.toLocaleString()}</span>
            </p>

            <div className="text-xs text-gray-600 leading-relaxed mb-2">
              <p>お届け先：{o.recipient_name} 様</p>
              <p>〒{o.postal_code}　{o.address}</p>
              <p>TEL：{o.phone}</p>
            </div>

            {o.status === "paid" && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  placeholder="追跡番号（任意）"
                  value={trackingDraft[o.id] ?? ""}
                  onChange={(e) => setTrackingDraft((prev) => ({ ...prev, [o.id]: e.target.value }))}
                  className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5"
                />
                <button
                  onClick={() => markShipped(o.id)}
                  className="text-xs bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded shrink-0"
                >
                  発送済みにする
                </button>
              </div>
            )}

            {o.status === "shipped" && o.tracking_number && (
              <p className="text-xs text-gray-500 mt-1">追跡番号：{o.tracking_number}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
