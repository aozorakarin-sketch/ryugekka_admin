"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// 有料メニュー管理（花／龍／月プレミアムメニュー）
// 先生サイトの有料メニューを登録し、APIキーを発行する画面

const TEACHERS = [
  { id: "3ba85bb9-9065-461b-b76b-cc488d4c0c3b", name: "龍（雲龍蓮）", slug: "ryu", label: "龍プレミアムメニュー", email: "bazvideo412@gmail.com" },
  { id: "17cf0ca1-7526-466e-a644-9d3efefa4091", name: "月（椎名架月）", slug: "tsuki", label: "月プレミアムメニュー", email: "tomo517ko@gmail.com" },
  { id: "cd2c4101-2e24-4ae2-8d6a-507a943904af", name: "花（青空花林）", slug: "hana", label: "花プレミアムメニュー", email: "aozora.karin@gmail.com" },
] as const;

type Teacher = (typeof TEACHERS)[number];

const USER_SITE = "https://ryugekka.vercel.app";
const FUNCTIONS_BASE = "https://wdntqfavisojsawpnehc.supabase.co/functions/v1";

type Menu = {
  id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price: number;
  endpoint_url: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
};

type LpImage = { id: string; image_url: string; display_order: number; created_at: string };

// ページ構成（LP画像とメニューを1本の並びで管理）
type Block =
  | { kind: "lp"; id: string; display_order: number; created_at: string; lp: LpImage }
  | { kind: "menu"; id: string; display_order: number; created_at: string; menu: Menu };

type KeyInfo = { key_prefix: string; created_at: string; rotated_at: string | null } | null;

type FormState = {
  id: string | null;
  title: string;
  description: string;
  image_url: string;
  price: string;
  endpoint_url: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  id: null, title: "", description: "", image_url: "", price: "", endpoint_url: "", is_active: true,
};

// ログイン情報つきで管理APIを呼ぶ
async function adminFetch(url: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

async function uploadImage(file: File, prefix = "premium-menu"): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("top-page").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("top-page").getPublicUrl(path);
  return data.publicUrl;
}

function formatDate(s: string | null | undefined) {
  if (!s) return "";
  return new Date(s).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function PremiumMenusPage() {
  const [activeId, setActiveId] = useState<string>(TEACHERS[0].id);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentEmail(user?.email ?? null));
  }, []);

  const teacher = TEACHERS.find((t) => t.id === activeId)!;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-gray-800 mb-1">有料メニュー管理</h1>
      <p className="text-sm text-gray-500 mb-6">
        先生サイトの有料メニューを登録し、龍月花のトラカで決済できるようにします
      </p>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TEACHERS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveId(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeId === t.id
                ? "border-rose-500 text-rose-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <TeacherPanel key={teacher.id} teacher={teacher} canEdit={currentEmail === teacher.email} />
    </div>
  );
}

function TeacherPanel({ teacher, canEdit }: { teacher: Teacher; canEdit: boolean }) {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [lpImages, setLpImages] = useState<LpImage[]>([]);
  const [lpUploading, setLpUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [keyInfo, setKeyInfo] = useState<KeyInfo>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const listUrl = `${USER_SITE}/premium/${teacher.slug}`;

  const load = async () => {
    setLoading(true);
    const [mRes, kRes, lRes] = await Promise.all([
      adminFetch(`/api/admin/premium-menus?teacher_id=${teacher.id}`),
      adminFetch(`/api/admin/premium-menus/api-key?teacher_id=${teacher.id}`),
      adminFetch(`/api/admin/premium-menus/lp-images?teacher_id=${teacher.id}`),
    ]);
    const mJson = await mRes.json().catch(() => ({}));
    const kJson = await kRes.json().catch(() => ({}));
    const lJson = await lRes.json().catch(() => ({}));
    setMenus(mJson.menus ?? []);
    setKeyInfo(kJson.key ?? null);
    setLpImages(lJson.images ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacher.id]);

  const flash = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 3000);
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    flash("コピーしました");
  };

  // --- APIキー ---
  const issueKey = async () => {
    if (keyInfo && !confirm("再発行すると、今のキーはすぐに使えなくなります。先生サイトの設定も差し替えが必要です。再発行しますか？")) return;
    const res = await adminFetch("/api/admin/premium-menus/api-key", {
      method: "POST",
      body: JSON.stringify({ teacher_id: teacher.id }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return alert(json.error ?? "発行に失敗しました");
    setNewKey(json.api_key);
    await load();
  };

  // --- メニュー ---
  const openNew = () => setForm({ ...EMPTY_FORM });
  const openEdit = (m: Menu) =>
    setForm({
      id: m.id,
      title: m.title,
      description: m.description ?? "",
      image_url: m.image_url ?? "",
      price: String(m.price),
      endpoint_url: m.endpoint_url,
      is_active: m.is_active,
    });

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        image_url: form.image_url || null,
        price: Number(form.price),
        endpoint_url: form.endpoint_url,
        is_active: form.is_active,
      };
      const res = form.id
        ? await adminFetch("/api/admin/premium-menus", { method: "PATCH", body: JSON.stringify({ id: form.id, ...payload }) })
        : await adminFetch("/api/admin/premium-menus", {
            method: "POST",
            body: JSON.stringify({ teacher_id: teacher.id, display_order: nextOrder(), ...payload }),
          });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return alert(json.error ?? "保存に失敗しました");
      setForm(null);
      flash("保存しました");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: Menu) => {
    if (!confirm(`「${m.title}」を削除しますか？`)) return;
    const res = await adminFetch(`/api/admin/premium-menus?id=${m.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return alert(json.error ?? "削除に失敗しました");
    if (json.unpublished) alert("申し込み履歴があるため、削除せず非公開にしました");
    await load();
  };

  const toggleActive = async (m: Menu) => {
    await adminFetch("/api/admin/premium-menus", {
      method: "PATCH",
      body: JSON.stringify({ id: m.id, is_active: !m.is_active }),
    });
    await load();
  };

  // --- ページ構成の並び替え（LP画像・メニュー共通） ---
  const blocks: Block[] = [
    ...lpImages.map((lp) => ({ kind: "lp" as const, id: lp.id, display_order: lp.display_order, created_at: lp.created_at, lp })),
    ...menus.map((menu) => ({ kind: "menu" as const, id: menu.id, display_order: menu.display_order, created_at: menu.created_at, menu })),
  ].sort((x, y) => x.display_order - y.display_order || x.created_at.localeCompare(y.created_at));

  // 新しく追加するものは一番下へ
  const nextOrder = () => (blocks.length ? Math.max(...blocks.map((b) => b.display_order)) + 1 : 0);

  const moveBlock = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    // 全体を 0,1,2… で振り直し、番号が変わったものだけ保存する
    await Promise.all(
      next.map((blk, i) => {
        if (blk.display_order === i) return null;
        const url = blk.kind === "lp" ? "/api/admin/premium-menus/lp-images" : "/api/admin/premium-menus";
        return adminFetch(url, { method: "PATCH", body: JSON.stringify({ id: blk.id, display_order: i }) });
      })
    );
    await load();
  };

  // --- LP画像 ---
  const lpAdd = async (files: FileList) => {
    setLpUploading(true);
    try {
      let order = nextOrder();
      // 選んだ順番のまま、下に追加していく
      for (const file of Array.from(files)) {
        const url = await uploadImage(file, "premium-lp");
        const res = await adminFetch("/api/admin/premium-menus/lp-images", {
          method: "POST",
          body: JSON.stringify({ teacher_id: teacher.id, image_url: url, display_order: order++ }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          alert(json.error ?? "追加に失敗しました");
          break;
        }
      }
      await load();
    } catch {
      alert("画像のアップロードに失敗しました");
    } finally {
      setLpUploading(false);
    }
  };

  const lpReplace = async (id: string, file: File) => {
    setLpUploading(true);
    try {
      const url = await uploadImage(file, "premium-lp");
      await adminFetch("/api/admin/premium-menus/lp-images", { method: "PATCH", body: JSON.stringify({ id, image_url: url }) });
      await load();
    } catch {
      alert("画像のアップロードに失敗しました");
    } finally {
      setLpUploading(false);
    }
  };

  const lpDelete = async (id: string) => {
    if (!confirm("このLP画像を削除しますか？")) return;
    await adminFetch(`/api/admin/premium-menus/lp-images?id=${id}`, { method: "DELETE" });
    await load();
  };

  const handleImage = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setForm((f) => (f ? { ...f, image_url: url } : f));
    } catch {
      alert("画像のアップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="text-sm text-gray-400">読み込み中...</div>;

  return (
    <div className="space-y-8">
      {message && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded bg-gray-800 text-white text-sm shadow">{message}</div>
      )}

      {!canEdit && (
        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-3 py-2">
          閲覧のみです。登録・編集・APIキーの発行は担当の先生のみ行えます。
        </p>
      )}

      {/* 一覧ページURL */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-2">{teacher.label}の一覧ページ</h3>
        <p className="text-xs text-gray-500 mb-3">
          トップページ管理のバナーのリンク先などに貼って使います（ログインしたお客さんだけが見られます）
        </p>
        <CopyRow value={listUrl} onCopy={copy} />
      </section>

      {/* 先生サイト連携 */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-2">先生サイト連携</h3>
        <p className="text-xs text-gray-500 mb-3">
          先生サイト側に渡す情報です。「連携仕様書（先生サイト向け）」と一緒に渡してください。
        </p>

        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-600 mb-1">照会APIのURL（RYUGEKKA_VERIFY_URL）</div>
            <CopyRow value={`${FUNCTIONS_BASE}/premium-verify`} onCopy={copy} />
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">決済APIのURL（RYUGEKKA_COMPLETE_URL）</div>
            <CopyRow value={`${FUNCTIONS_BASE}/premium-complete`} onCopy={copy} />
          </div>

          <div className="p-4 border border-gray-200 rounded">
            <div className="text-xs text-gray-600 mb-2">APIキー（RYUGEKKA_PREMIUM_API_KEY）</div>
            {keyInfo ? (
              <div className="text-sm text-gray-700">
                <span className="font-mono">{keyInfo.key_prefix}…</span>
                <span className="text-xs text-gray-500 ml-3">
                  発行：{formatDate(keyInfo.rotated_at ?? keyInfo.created_at)}
                </span>
              </div>
            ) : (
              <div className="text-sm text-gray-500">まだ発行されていません</div>
            )}

            {newKey && (
              <div className="mt-3 p-3 rounded bg-amber-50 border border-amber-300">
                <div className="text-xs text-amber-800 font-semibold mb-2">
                  このキーは今だけ表示されます。必ずコピーして先生サイトの環境変数に設定してください。
                </div>
                <CopyRow value={newKey} onCopy={copy} mono />
                <button type="button" onClick={() => setNewKey(null)} className="mt-2 text-xs text-gray-500 hover:text-gray-700">
                  コピーしたので閉じる
                </button>
              </div>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={issueKey}
                className="mt-3 px-4 py-2 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
              >
                {keyInfo ? "再発行する" : "発行する"}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ページ構成（LP画像とメニューを自由な順番で並べる） */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-2">ページ構成</h3>
        <p className="text-xs text-gray-500 mb-3">
          一覧ページの説明文の下に、上から順に表示されます。LP画像とメニューは ↑↓ で自由に入れ替えられます
          <br />
          LP画像は横幅1080px前後の縦長画像がおすすめ。続けて並べたLP画像はすき間なくつながって見えます
        </p>

        <div className="space-y-2">
          {blocks.length === 0 && <div className="text-sm text-gray-400">まだ何もありません</div>}

          {blocks.map((blk, index) => (
            <div
              key={`${blk.kind}-${blk.id}`}
              className={`flex items-center gap-3 p-3 border rounded ${
                blk.kind === "lp"
                  ? "border-amber-200 bg-amber-50/40"
                  : blk.menu.is_active ? "border-gray-200" : "border-gray-200 bg-gray-50 opacity-70"
              }`}
            >
              {canEdit && (
                <div className="flex flex-col gap-1 shrink-0">
                  <button type="button" onClick={() => moveBlock(index, "up")} disabled={index === 0}
                    className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-xs text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50">↑</button>
                  <button type="button" onClick={() => moveBlock(index, "down")} disabled={index === blocks.length - 1}
                    className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-xs text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50">↓</button>
                </div>
              )}

              {blk.kind === "lp" ? (
                <>
                  <img src={blk.lp.image_url} alt="" className="w-24 h-32 object-cover object-top rounded border border-gray-200 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="inline-block text-[10px] font-semibold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">LP画像</span>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">
                        {lpUploading ? "アップロード中..." : "差し替える"}
                        <input type="file" accept="image/*" className="hidden" disabled={lpUploading}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) lpReplace(blk.lp.id, f); e.target.value = ""; }} />
                      </label>
                      <button type="button" onClick={() => lpDelete(blk.lp.id)} className="text-xs text-red-500 hover:text-red-700">削除</button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {blk.menu.image_url ? (
                    <img src={blk.menu.image_url} alt="" className="w-24 h-16 object-cover rounded shrink-0" />
                  ) : (
                    <div className="w-24 h-16 rounded bg-gray-100 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="inline-block text-[10px] font-semibold text-rose-700 bg-rose-100 rounded px-1.5 py-0.5 mb-1">メニュー</span>
                    <div className="text-sm font-medium text-gray-800 truncate">{blk.menu.title}</div>
                    <div className="text-xs text-gray-500">
                      {blk.menu.price.toLocaleString()}トラカ
                      <span className="ml-2">{blk.menu.is_active ? "公開中" : "非公開"}</span>
                    </div>
                    <div className="text-xs text-gray-400 truncate">{blk.menu.endpoint_url}</div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-3 shrink-0">
                      <button type="button" onClick={() => toggleActive(blk.menu)} className="text-xs text-gray-600 hover:text-gray-800">
                        {blk.menu.is_active ? "非公開にする" : "公開する"}
                      </button>
                      <button type="button" onClick={() => openEdit(blk.menu)} className="text-xs text-blue-600 hover:text-blue-800">編集</button>
                      <button type="button" onClick={() => remove(blk.menu)} className="text-xs text-red-500 hover:text-red-700">削除</button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {canEdit && !form && (
            <div className="flex gap-2 pt-1">
              <label className="inline-flex items-center px-4 py-2 rounded border border-amber-300 text-sm text-amber-800 cursor-pointer hover:bg-amber-50">
                {lpUploading ? "アップロード中..." : "＋ LP画像を追加"}
                <input type="file" accept="image/*" multiple className="hidden" disabled={lpUploading}
                  onChange={(e) => { const fs = e.target.files; if (fs && fs.length) lpAdd(fs); e.target.value = ""; }} />
              </label>
              <button type="button" onClick={openNew}
                className="inline-flex items-center px-4 py-2 rounded border border-rose-300 text-sm text-rose-700 hover:bg-rose-50">
                ＋ メニューを追加
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 登録・編集フォーム */}
      {canEdit && form && (
        <section className="p-4 border border-rose-200 rounded bg-rose-50/30">
          <h3 className="text-base font-semibold text-gray-800 mb-4">{form.id ? "メニューを編集" : "メニューを追加"}</h3>

          <div className="space-y-4">
            <Field label="メニュー名（必須）">
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5" />
            </Field>

            <Field label="説明文">
              <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5" />
            </Field>

            <Field label="トラカ価格（必須・1トラカ＝1円）">
              <input type="number" min={1} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-40 text-sm border border-gray-300 rounded px-2 py-1.5" />
            </Field>

            <Field label="送信先URL（必須・先生サイトのPOST受け口）">
              <input type="text" placeholder="https://unryuren.site/api/premium/entry" value={form.endpoint_url}
                onChange={(e) => setForm({ ...form, endpoint_url: e.target.value })}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5" />
            </Field>

            <Field label="画像（任意）">
              <div className="flex items-center gap-3">
                {form.image_url && <img src={form.image_url} alt="" className="w-32 h-20 object-cover rounded border border-gray-200" />}
                <label className="inline-flex items-center px-3 py-1.5 rounded border border-gray-300 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                  {uploading ? "アップロード中..." : form.image_url ? "差し替える" : "画像を選択"}
                  <input type="file" accept="image/*" className="hidden" disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f); }} />
                </label>
                {form.image_url && (
                  <button type="button" onClick={() => setForm({ ...form, image_url: "" })} className="text-xs text-red-500 hover:text-red-700">
                    画像を外す
                  </button>
                )}
              </div>
            </Field>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              公開する
            </label>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={save} disabled={saving || uploading}
                className="px-4 py-2 rounded bg-rose-500 text-white text-sm hover:bg-rose-600 disabled:opacity-50">
                {saving ? "保存中..." : "保存する"}
              </button>
              <button type="button" onClick={() => setForm(null)} className="px-4 py-2 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                キャンセル
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      {children}
    </div>
  );
}

function CopyRow({ value, onCopy, mono }: { value: string; onCopy: (v: string) => void; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <input readOnly value={value}
        className={`flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 bg-gray-50 ${mono ? "font-mono" : ""}`} />
      <button type="button" onClick={() => onCopy(value)}
        className="px-3 py-1.5 rounded bg-teal-500 text-white text-sm hover:bg-teal-600 shrink-0">
        コピー
      </button>
    </div>
  );
}
