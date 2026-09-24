"use client";

import { useEffect, useState } from "react";
import { authFetch } from "./authFetch";

type Order = {
  id: string;
  handle_name: string;
  tokens_spent: number;
  status: "received" | "shipped" | "done";
  recipient_name: string | null;
  postal_code: string | null;
  address: string | null;
  phone: string | null;
  teacher_message: string | null;
  created_at: string;
  shipped_at: string | null;
  exchange_items: { name: string; item_type: string; with_message: boolean } | null;
};

const STATUS_LABEL: Record<string, string> = { received: "発送待ち", shipped: "発送済み", done: "完了" };

function formatDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function ExchangeOrdersSection({ teacherId, canEdit, tokenLabel }: { teacherId: string; canEdit: boolean; tokenLabel: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageDraft, setMessageDraft] = useState<Record<string, string>>({});
  const [onlyPending, setOnlyPending] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await authFetch(`/api/admin/exchange/orders?teacher_id=${teacherId}`);
    const { orders } = await res.json();
    setOrders(orders ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [teacherId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveMessage = async (o: Order) => {
    await authFetch("/api/admin/exchange/orders", { method: "PATCH", body: JSON.stringify({ id: o.id, teacher_message: messageDraft[o.id] ?? o.teacher_message ?? "" }) });
    load();
  };

  const markShipped = async (o: Order) => {
    if (!confirm("発送済みにしますか？")) return;
    await authFetch("/api/admin/exchange/orders", {
      method: "PATCH",
      body: JSON.stringify({ id: o.id, status: "shipped", ...(o.exchange_items?.with_message ? { teacher_message: messageDraft[o.id] ?? o.teacher_message ?? "" } : {}) }),
    });
    load();
  };

  if (loading) return <div className="text-sm text-gray-400">読み込み中...</div>;

  const visible = onlyPending ? orders.filter(o => o.status === "received") : orders;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">交換申込 <span className="text-gray-400 font-normal">{visible.length}件</span></h3>
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={onlyPending} onChange={e => setOnlyPending(e.target.checked)} />
          発送待ちだけ表示
        </label>
      </div>

      {visible.length === 0 && <p className="text-sm text-gray-400">{onlyPending ? "発送待ちの申込はありません" : "まだ交換はありません"}</p>}

      <div className="space-y-3">
        {visible.map((o) => {
          const isGoods = o.exchange_items?.item_type === "goods";
          return (
            <div key={o.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  o.status === "received" ? "bg-orange-100 text-orange-700" : o.status === "shipped" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}>{STATUS_LABEL[o.status] ?? o.status}</span>
                <span className="text-xs text-gray-400">{formatDate(o.created_at)}</span>
              </div>

              <p className="text-sm font-medium text-gray-800 mb-1">
                {o.exchange_items?.name ?? "特典情報なし"}　<span className="text-gray-500">{o.tokens_spent.toLocaleString()} {tokenLabel}</span>
              </p>
              <p className="text-xs text-gray-500 mb-2">お客さん：{o.handle_name || "（名前未設定）"}</p>

              {isGoods && (
                <div className="text-xs text-gray-600 leading-relaxed mb-2">
                  <p>お届け先：{o.recipient_name} 様</p>
                  <p>〒{o.postal_code}　{o.address}</p>
                  <p>TEL：{o.phone}</p>
                </div>
              )}

              {isGoods && o.exchange_items?.with_message && (
                <div className="mb-2">
                  <label className="text-xs text-gray-500 block mb-1">先生からのひと言（同封・お届け用）</label>
                  <textarea
                    rows={2}
                    disabled={!canEdit}
                    value={messageDraft[o.id] ?? o.teacher_message ?? ""}
                    onChange={e => setMessageDraft(prev => ({ ...prev, [o.id]: e.target.value }))}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                  />
                  {canEdit && (
                    <button onClick={() => saveMessage(o)} className="text-xs text-teal-600 underline mt-1">ひと言を保存</button>
                  )}
                </div>
              )}

              {canEdit && isGoods && o.status === "received" && (
                <button onClick={() => markShipped(o)} className="text-xs bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded">発送済みにする</button>
              )}
              {o.status === "shipped" && o.shipped_at && (
                <p className="text-xs text-gray-500 mt-1">発送日：{formatDate(o.shipped_at)}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
