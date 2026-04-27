// app/admin/fortune-requests/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type FortuneRequest = {
  id: string;
  user_name: string;
  user_email: string;
  category: string;
  consultation: string;
  result: string;
  status: string;
  send_at: string;
  sent_at: string | null;
  created_at: string;
  retry_count: number;
  error_message: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "⏳ 送信待ち",
  reviewing: "👀 確認中",
  sent: "✅ 送信済み",
  error: "❌ エラー",
};

export default function FortuneRequestsPage() {
  const [requests, setRequests] = useState<FortuneRequest[]>([]);
  const [selected, setSelected] = useState<FortuneRequest | null>(null);
  const [editResult, setEditResult] = useState("");
  const [loading, setLoading] = useState(true);
 // const supabase = createClient();

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    const { data } = await supabase
      .from("fortune_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setRequests(data || []);
    setLoading(false);
  }

  async function handleSendNow(id: string) {
    if (!confirm("今すぐ送信しますか？")) return;
    await supabase
      .from("fortune_requests")
      .update({ send_at: new Date().toISOString() })
      .eq("id", id);
    alert("送信キューに入れました。次の定期実行（〜5分）で送信されます。");
    loadRequests();
  }

  async function handleSaveEdit(id: string) {
    await supabase
      .from("fortune_requests")
      .update({ result: editResult, status: "pending" })
      .eq("id", id);
    alert("鑑定文を保存しました");
    setSelected(null);
    loadRequests();
  }

  return (
    <div style={{ padding: "24px" }}>
      <h1>📮 メール鑑定 依頼一覧</h1>

      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              {["受付日時", "名前", "カテゴリ", "ステータス", "送信予定", "操作"].map((h) => (
                <th key={h} style={{ padding: "10px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "10px" }}>{new Date(r.created_at).toLocaleString("ja-JP")}</td>
                <td style={{ padding: "10px" }}>{r.user_name}</td>
                <td style={{ padding: "10px" }}>{r.category}</td>
                <td style={{ padding: "10px" }}>{STATUS_LABELS[r.status] || r.status}</td>
                <td style={{ padding: "10px" }}>
                  {r.send_at ? new Date(r.send_at).toLocaleString("ja-JP") : "-"}
                </td>
                <td style={{ padding: "10px", display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => { setSelected(r); setEditResult(r.result); }}
                    style={{ padding: "4px 10px", borderRadius: "4px", border: "1px solid #ccc", cursor: "pointer" }}
                  >
                    確認・編集
                  </button>
                  {r.status === "pending" && (
                    <button
                      onClick={() => handleSendNow(r.id)}
                      style={{ padding: "4px 10px", borderRadius: "4px", background: "#7c3aed", color: "white", border: "none", cursor: "pointer" }}
                    >
                      今すぐ送信
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* 鑑定文確認・編集モーダル */}
      {selected && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
        }}>
          <div style={{
            background: "white", borderRadius: "12px", padding: "24px",
            width: "90%", maxWidth: "700px", maxHeight: "90vh", overflow: "auto",
          }}>
            <h2>{selected.user_name}さん / {selected.category}</h2>
            <p style={{ fontSize: "13px", color: "#666" }}>相談内容: {selected.consultation.substring(0, 100)}...</p>

            <h3>鑑定文（編集可能）</h3>
            <textarea
              value={editResult}
              onChange={(e) => setEditResult(e.target.value)}
              rows={20}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px", boxSizing: "border-box" }}
            />

            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <button
                onClick={() => handleSaveEdit(selected.id)}
                style={{ padding: "10px 20px", background: "#7c3aed", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}
              >
                保存して送信キューへ
              </button>
              <button
                onClick={() => setSelected(null)}
                style={{ padding: "10px 20px", border: "1px solid #ccc", borderRadius: "8px", cursor: "pointer" }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

