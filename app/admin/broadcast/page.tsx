"use client";

import { useState, useEffect, useCallback } from "react";

const SENDERS = [
  { key: "info", label: "運営（info@）" },
  { key: "ryu", label: "龍（雲龍蓮）" },
  { key: "tsuki", label: "月（椎名架月）" },
  { key: "hana", label: "花（青空花林）" },
] as const;

export default function BroadcastPage() {
  const [sender, setSender] = useState<string>("info");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [error, setError] = useState("");

  const fetchCount = useCallback(async (s: string) => {
    setCountLoading(true);
    setCount(null);
    try {
      const res = await fetch(`/api/admin/broadcast?sender=${s}`);
      const data = await res.json();
      setCount(data.count ?? 0);
    } catch {
      setCount(null);
    } finally {
      setCountLoading(false);
    }
  }, []);

  useEffect(() => { fetchCount(sender); }, [sender, fetchCount]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError("件名・本文を入力してください");
      return;
    }
    const label = SENDERS.find(s => s.key === sender)?.label ?? sender;
    if (!confirm(`${label}から${count ?? "?"}名に送信します。よろしいですか？`)) return;

    setError("");
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender, subject, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "送信失敗");
      setResult(data);
      setSubject("");
      setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-gray-800 mb-1">一斉送信</h1>
      <p className="text-sm text-gray-500 mb-6">
        運営(info)は全ユーザーへ、龍・月・花はそれぞれ鑑定履歴があるユーザーへメールを一斉送信します。
      </p>

      {/* 送信元 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">送信元</label>
        <select
          value={sender}
          onChange={(e) => setSender(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        >
          {SENDERS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {countLoading ? "対象人数を確認中..." : count !== null ? `対象：${count}名` : "対象人数を取得できませんでした"}
        </p>
      </div>

      {/* 件名 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">件名</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="例：【龍月花】メンテナンスのお知らせ"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        />
      </div>

      {/* 本文 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">本文</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          placeholder="本文を入力してください（改行はそのまま反映されます）"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-y"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded px-3 py-2 mb-4">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-teal-50 border border-teal-200 text-teal-700 text-sm rounded px-3 py-2 mb-4">
          送信完了：成功 {result.sent}件 / 失敗 {result.failed}件（対象 {result.total}件）
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={sending || count === 0}
        className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded"
      >
        {sending ? "送信中..." : "一斉送信する"}
      </button>
    </div>
  );
}
