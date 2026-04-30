"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type FortuneRequest = {
  id: string;
  user_name: string;
  user_email: string;
  category: string;
  consultation: string;
  result: string | null;
  status: string;
  send_at: string | null;
  sent_at: string | null;
  created_at: string;
  retry_count: number;
  retry_after: string | null;
  error_message: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; emoji: string; bg: string; color: string }> = {
  queued:  { label: "受付済み",  emoji: "📥", bg: "#e0f2fe", color: "#0369a1" },
  retry:   { label: "再試行待ち", emoji: "🔄", bg: "#fef3c7", color: "#92400e" },
  pending: { label: "送信待ち",  emoji: "⏳", bg: "#fef9c3", color: "#854d0e" },
  sent:    { label: "送信済み",  emoji: "✅", bg: "#dcfce7", color: "#166534" },
  error:   { label: "エラー",    emoji: "❌", bg: "#fee2e2", color: "#991b1b" },
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
    if (!confirm("今すぐ送信キューに入れますか？")) return;
    // pending + send_atを過去にすることで次のcronで即送信
    await supabase
      .from("fortune_requests")
      .update({
        status: "pending",
        send_at: new Date(Date.now() - 60000).toISOString(),
        retry_after: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    alert("送信キューに入れました。次の定期実行（〜5分）で送信されます。");
    loadRequests();
  }

  async function handleRetryGeminiNow(id: string) {
    if (!confirm("Gemini再試行を今すぐ実行しますか？")) return;
    // retry_afterを過去にすることで次のcronでGemini再試行
    await supabase
      .from("fortune_requests")
      .update({
        status: "retry",
        retry_after: new Date(Date.now() - 60000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    alert("次の定期実行（〜5分）でGemini再試行します。");
    loadRequests();
  }

  async function handleSaveEdit(id: string) {
    await supabase
      .from("fortune_requests")
      .update({
        result: editResult,
        status: "pending",
        send_at: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    alert("鑑定文を保存しました（5時間後に送信されます）");
    setSelected(null);
    loadRequests();
  }

  async function handleSaveAndSendNow(id: string) {
    await supabase
      .from("fortune_requests")
      .update({
        result: editResult,
        status: "pending",
        send_at: new Date(Date.now() - 60000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    alert("保存して送信キューに入れました。次の定期実行（〜5分）で送信されます。");
    setSelected(null);
    loadRequests();
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  }

  function getStatusConfig(status: string) {
    return STATUS_CONFIG[status] ?? { label: status, emoji: "❓", bg: "#f3f4f6", color: "#374151" };
  }

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>📮</span> メール鑑定 依頼一覧
        </h1>
        <button
          onClick={loadRequests}
          style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid #d1d5db", cursor: "pointer", fontSize: "13px", background: "white" }}
        >
          🔄 更新
        </button>
      </div>

      {loading ? (
        <p>読み込み中...</p>
      ) : requests.length === 0 ? (
        <p style={{ color: "#888" }}>まだ依頼がありません</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              {["受付日時", "名前", "カテゴリ", "ステータス", "送信予定 / retry予定", "リトライ", "操作"].map((h) => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const sc = getStatusConfig(r.status);
              return (
                <tr key={r.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "12px", whiteSpace: "nowrap" }}>{formatDate(r.created_at)}</td>
                  <td style={{ padding: "12px", fontWeight: "500" }}>{r.user_name}</td>
                  <td style={{ padding: "12px" }}>{r.category}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      padding: "2px 10px", borderRadius: "20px", fontSize: "12px",
                      background: sc.bg, color: sc.color,
                    }}>
                      {sc.emoji} {sc.label}
                    </span>
                    {r.error_message && (
                      <div style={{ fontSize: "11px", color: "#ef4444", marginTop: "4px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.error_message}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "12px", color: "#666", fontSize: "13px", whiteSpace: "nowrap" }}>
                    {r.status === "retry"
                      ? (r.retry_after ? `🔄 ${formatDate(r.retry_after)}` : "-")
                      : formatDate(r.send_at)
                    }
                  </td>
                  <td style={{ padding: "12px", textAlign: "center", fontSize: "13px", color: "#888" }}>
                    {r.retry_count > 0 ? `${r.retry_count}回` : "-"}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        onClick={() => { setSelected(r); setEditResult(r.result ?? ""); }}
                        style={{ padding: "5px 12px", borderRadius: "6px", border: "1px solid #d1d5db", cursor: "pointer", fontSize: "13px", background: "white" }}
                      >
                        確認・編集
                      </button>
                      {/* resultがあってまだ未送信 → 今すぐ送信 */}
                      {r.result && r.status !== "sent" && (
                        <button
                          onClick={() => handleSendNow(r.id)}
                          style={{ padding: "5px 12px", borderRadius: "6px", background: "#7c3aed", color: "white", border: "none", cursor: "pointer", fontSize: "13px" }}
                        >
                          今すぐ送信
                        </button>
                      )}
                      {/* resultがない（Gemini未生成）→ Gemini再試行 */}
                      {!r.result && r.status !== "sent" && (
                        <button
                          onClick={() => handleRetryGeminiNow(r.id)}
                          style={{ padding: "5px 12px", borderRadius: "6px", background: "#0891b2", color: "white", border: "none", cursor: "pointer", fontSize: "13px" }}
                        >
                          Gemini再試行
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
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
            <p style={{ fontSize: "13px", color: "#666", marginBottom: "4px" }}>
              📧 {selected.user_email}
            </p>
            <p style={{ fontSize: "13px", color: "#666", marginBottom: "16px" }}>
              相談内容: {selected.consultation.substring(0, 150)}{selected.consultation.length > 150 ? "…" : ""}
            </p>

            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>
              鑑定文（編集可能）
              {!selected.result && <span style={{ color: "#ef4444", fontWeight: "400", marginLeft: "8px", fontSize: "13px" }}>※ Gemini未生成（手動入力可）</span>}
            </h3>
            <textarea
              value={editResult}
              onChange={(e) => setEditResult(e.target.value)}
              rows={20}
              placeholder="鑑定文を入力してください..."
              style={{
                width: "100%", padding: "12px", borderRadius: "8px",
                border: "1px solid #d1d5db", fontSize: "14px",
                boxSizing: "border-box", lineHeight: "1.8", resize: "vertical",
              }}
            />

            <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
              <button
                onClick={() => handleSaveEdit(selected.id)}
                style={{ padding: "10px 20px", background: "#7c3aed", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "500" }}
              >
                保存（5時間後に送信）
              </button>
              <button
                onClick={() => handleSaveAndSendNow(selected.id)}
                style={{ padding: "10px 20px", background: "#059669", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "500" }}
              >
                保存して今すぐ送信
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
