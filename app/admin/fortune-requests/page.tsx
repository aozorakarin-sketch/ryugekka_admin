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

const STATUS_EMOJI: Record<string, string> = {
  pending: "⏳",
  reviewing: "👀",
  sent: "✅",
  error: "❌",
};

export default function FortuneRequestsPage() {
  const [requests, setRequests] = useState<FortuneRequest[]>([]);
  const [selected, setSelected] = useState<FortuneRequest | null>(null);
  const [editResult, setEditResult] = useState("");
  const [loading, setLoading] = useState(true);

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
    // send_atを1分前に設定することで次のCron実行で即送信される
    await supabase
      .from("fortune_requests")
      .update({
        send_at: new Date(Date.now() - 60000).toISOString(),
        status: "pending",
      })
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

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  }

  return (
    <div style={{ padding: "24px" }}>
      <h1 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
        <span>📮</span> メール鑑定 依頼一覧
      </h1>

      {loading ? (
        <p>読み込み中...</p>
      ) : requests.length === 0 ? (
        <p style={{ color: "#888" }}>まだ依頼がありません</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              {["受付日時", "名前", "カテゴリ", "ステータス", "送信予定", "操作"].map((h) => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "12px" }}>{formatDate(r.created_at)}</td>
                <td style={{ padding: "12px", fontWeight: "500" }}>{r.user_name}</td>
                <td style={{ padding: "12px" }}>{r.category}</td>
                <td style={{ padding: "12px" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    padding: "2px 10px", borderRadius: "20px", fontSize: "12px",
                    background: r.status === "sent" ? "#dcfce7" : r.status === "error" ? "#fee2e2" : "#fef9c3",
                    color: r.status === "sent" ? "#166534" : r.status === "error" ? "#991b1b" : "#854d0e",
                  }}>
                    {STATUS_EMOJI[r.status] || "⏳"} {r.status === "sent" ? "送信済み" : r.status === "error" ? "エラー" : "送信待ち"}
                  </span>
                </td>
                <td style={{ padding: "12px", color: "#666", fontSize: "13px" }}>
                  {r.send_at ? formatDate(r.send_at) : "-"}
                </td>
                <td style={{ padding: "12px" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => { setSelected(r); setEditResult(r.result); }}
                      style={{ padding: "5px 12px", borderRadius: "6px", border: "1px solid #d1d5db", cursor: "pointer", fontSize: "13px", background: "white" }}
                    >
                      確認・編集
                    </button>
                    {r.status !== "sent" && (
                      <button
                        onClick={() => handleSendNow(r.id)}
                        style={{ padding: "5px 12px", borderRadius: "6px", background: "#7c3aed", color: "white", border: "none", cursor: "pointer", fontSize: "13px" }}
                      >
                        今すぐ送信
                      </button>
                    )}
                  </div>
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
            width: "90%", maxWidth: "720px", maxHeight: "90vh", overflow: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "4px" }}>
              {selected.user_name}さん / {selected.category}
            </h2>
            <p style={{ fontSize: "13px", color: "#666", marginBottom: "16px" }}>
              相談内容: {selected.consultation.substring(0, 120)}...
            </p>

            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>鑑定文（編集可能）</h3>
            <textarea
              value={editResult}
              onChange={(e) => setEditResult(e.target.value)}
              rows={20}
              style={{
                width: "100%", padding: "12px", borderRadius: "8px",
                border: "1px solid #d1d5db", fontSize: "14px",
                boxSizing: "border-box", lineHeight: "1.8", resize: "vertical",
              }}
            />

            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <button
                onClick={() => handleSaveEdit(selected.id)}
                style={{ padding: "10px 20px", background: "#7c3aed", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "500" }}
              >
                保存して送信キューへ
              </button>
              <button
                onClick={() => { if (!confirm("今すぐ送信しますか？")) return; handleSendNow(selected.id); setSelected(null); }}
                style={{ padding: "10px 20px", background: "#059669", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "500" }}
              >
                今すぐ送信
              </button>
              <button
                onClick={() => setSelected(null)}
                style={{ padding: "10px 20px", border: "1px solid #d1d5db", borderRadius: "8px", cursor: "pointer", background: "white" }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
