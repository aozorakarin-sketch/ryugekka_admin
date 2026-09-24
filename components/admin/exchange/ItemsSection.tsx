"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { authFetch } from "./authFetch";

type ItemType = "coupon" | "goods" | "digital";

type Item = {
  id: string;
  teacher_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  required_tokens: number;
  item_type: ItemType;
  coupon_spec: { discount_rate?: number; valid_days?: number } | null;
  digital_url: string | null;
  digital_file_path: string | null;
  digital_file_name: string | null;
  with_message: boolean;
  stock: number | null;
  is_default: boolean;
  is_published: boolean;
  sort_order: number;
};

// 画像はショップと同じ「shop」バケット（公開）に exchange/ フォルダで保存
async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `exchange/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("shop").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("shop").getPublicUrl(path);
  return data.publicUrl;
}

// デジタル特典のファイルは、ショップのデジタル商品と同じ非公開バケット「shop-digital」に保存（公開URLは作らない）
async function uploadDigitalFile(file: File): Promise<{ path: string; name: string }> {
  const ext = file.name.split(".").pop();
  const path = `exchange/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("shop-digital").upload(path, file);
  if (error) throw error;
  return { path, name: file.name };
}

const TYPE_LABEL: Record<string, string> = { coupon: "🎟 電話クーポン", goods: "📦 グッズ", digital: "📄 デジタル" };

export function ItemsSection({ teacherId, canEdit, tokenLabel }: { teacherId: string; canEdit: boolean; tokenLabel: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Item | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [itemType, setItemType] = useState<ItemType>("coupon");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [requiredTokens, setRequiredTokens] = useState("");
  const [discountRate, setDiscountRate] = useState("");
  const [validDays, setValidDays] = useState("30");
  const [stock, setStock] = useState("");
  const [withMessage, setWithMessage] = useState(false);
  const [sortOrder, setSortOrder] = useState("0");
  const [digitalKind, setDigitalKind] = useState<"video" | "file">("video");
  const [digitalUrl, setDigitalUrl] = useState("");
  const [digitalFilePath, setDigitalFilePath] = useState("");
  const [digitalFileName, setDigitalFileName] = useState("");
  const [fileUploading, setFileUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await authFetch(`/api/admin/exchange/items?teacher_id=${teacherId}`);
    const { items } = await res.json();
    setItems(items ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [teacherId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditTarget(null);
    setItemType("coupon"); setName(""); setDescription(""); setImageUrl("");
    setRequiredTokens(""); setDiscountRate(""); setValidDays("30"); setStock("");
    setWithMessage(false); setSortOrder(String(items.length + 1));
    setDigitalKind("video"); setDigitalUrl(""); setDigitalFilePath(""); setDigitalFileName("");
    setShowModal(true);
  };

  const openEdit = (it: Item) => {
    setEditTarget(it);
    setItemType(it.item_type);
    setName(it.name); setDescription(it.description ?? ""); setImageUrl(it.image_url ?? "");
    setRequiredTokens(String(it.required_tokens));
    setDiscountRate(String(it.coupon_spec?.discount_rate ?? ""));
    setValidDays(String(it.coupon_spec?.valid_days ?? 30));
    setStock(it.stock === null ? "" : String(it.stock));
    setWithMessage(it.with_message); setSortOrder(String(it.sort_order));
    setDigitalKind(it.digital_file_path ? "file" : "video");
    setDigitalUrl(it.digital_url ?? ""); setDigitalFilePath(it.digital_file_path ?? ""); setDigitalFileName(it.digital_file_name ?? "");
    setShowModal(true);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try { setImageUrl(await uploadImage(file)); }
    catch (err) { console.error("画像アップロードエラー:", err); alert("画像のアップロードに失敗しました"); }
    finally { setUploading(false); }
  };

  const handleDigitalFileUpload = async (file: File) => {
    setFileUploading(true);
    try {
      const { path, name } = await uploadDigitalFile(file);
      setDigitalFilePath(path); setDigitalFileName(name);
    } catch (err) {
      console.error("ファイルアップロードエラー:", err);
      alert("ファイルのアップロードに失敗しました");
    } finally { setFileUploading(false); }
  };

  const save = async () => {
    if (!name.trim()) { alert("商品名を入力してください"); return; }
    const tokens = Number(requiredTokens);
    if (!tokens || tokens <= 0) { alert("必要な得トラカ数を入力してください"); return; }
    const isCoupon = itemType === "coupon";
    const rate = Number(discountRate);
    if (isCoupon && (!rate || rate < 1 || rate > 100)) { alert("割引率は1〜100で入力してください"); return; }
    const isDigital = itemType === "digital";
    if (isDigital && digitalKind === "video" && !digitalUrl.trim()) { alert("動画のURLを入力してください"); return; }
    if (isDigital && digitalKind === "file" && !digitalFilePath) { alert("ファイルをアップロードしてください"); return; }
    const isGoods = itemType === "goods";

    setSaving(true);
    const payload = {
      teacher_id: teacherId,
      item_type: itemType,
      name: name.trim(),
      description: description || null,
      image_url: imageUrl || null,
      required_tokens: tokens,
      coupon_spec: isCoupon ? { discount_rate: rate, valid_days: Number(validDays || 30) } : null,
      // 在庫を持つのはグッズだけ（空欄なら無制限）。クーポン・デジタルは無制限
      stock: !isGoods || stock === "" ? null : Number(stock),
      with_message: isGoods ? withMessage : false,
      // デジタルは「動画URL」か「ファイル」のどちらか一方だけを保存
      digital_url: isDigital && digitalKind === "video" ? digitalUrl.trim() : null,
      digital_file_path: isDigital && digitalKind === "file" ? digitalFilePath : null,
      digital_file_name: isDigital && digitalKind === "file" ? digitalFileName : null,
      sort_order: Number(sortOrder || 0),
    };
    const res = editTarget
      ? await authFetch("/api/admin/exchange/items", { method: "PATCH", body: JSON.stringify({ id: editTarget.id, ...payload }) })
      : await authFetch("/api/admin/exchange/items", { method: "POST", body: JSON.stringify(payload) });
    setSaving(false);
    if (!res.ok) { const { error } = await res.json(); alert(error ?? "保存に失敗しました"); return; }
    setShowModal(false);
    load();
  };

  const togglePublished = async (it: Item) => {
    await authFetch("/api/admin/exchange/items", { method: "PATCH", body: JSON.stringify({ id: it.id, is_published: !it.is_published }) });
    load();
  };

  const remove = async (it: Item) => {
    if (!confirm(`「${it.name}」を削除しますか？`)) return;
    const res = await authFetch(`/api/admin/exchange/items?id=${it.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.unpublished) alert("すでに交換された商品なので、削除ではなく非公開にしました");
    load();
  };

  if (loading) return <div className="text-sm text-gray-400">読み込み中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">特典一覧 <span className="text-gray-400 font-normal">{items.length}件</span></h3>
        {canEdit && (
          <button onClick={openCreate} className="bg-teal-500 hover:bg-teal-600 text-white text-sm px-4 py-2 rounded">＋ 特典を追加</button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {items.map((it) => (
          <div key={it.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {it.image_url ? (
              <img src={it.image_url} alt={it.name} className="w-full h-32 object-cover" />
            ) : (
              <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-xs text-gray-400">画像なし</div>
            )}
            <div className="p-3">
              <div className="flex gap-1 mb-1">
                <span className="text-[10px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{TYPE_LABEL[it.item_type]}</span>
                {it.is_default && <span className="text-[10px] text-white bg-rose-400 px-2 py-0.5 rounded-full">標準</span>}
              </div>
              <p className="text-sm font-medium text-gray-800 truncate">{it.name}</p>
              <p className="text-sm text-gray-600">{it.required_tokens.toLocaleString()} {tokenLabel}</p>
              {it.item_type === "coupon" && (
                <p className="text-xs text-gray-500">{it.coupon_spec?.discount_rate}%OFF・交換から{it.coupon_spec?.valid_days ?? 30}日有効</p>
              )}
              {it.item_type === "digital" && (
                <p className="text-xs text-gray-500 truncate">{it.digital_file_path ? `ファイル：${it.digital_file_name ?? ""}` : "動画URL"}</p>
              )}
              {it.item_type === "goods" && (
                <p className={`text-xs ${it.stock === 0 ? "text-red-500" : "text-gray-500"}`}>
                  在庫：{it.stock === null ? "制限なし" : it.stock === 0 ? "在庫切れ" : `${it.stock}点`}
                  {it.with_message && "・ひと言付き"}
                </p>
              )}
              <p className={`text-xs mt-1 ${it.is_published ? "text-green-600" : "text-gray-400"}`}>{it.is_published ? "公開中" : "非公開"}</p>
              {canEdit && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => openEdit(it)} className="text-xs bg-blue-500 text-white px-2 py-1 rounded">編集</button>
                  <button onClick={() => togglePublished(it)} className="text-xs bg-orange-400 text-white px-2 py-1 rounded">{it.is_published ? "非公開に" : "公開に"}</button>
                  <button onClick={() => remove(it)} className="text-xs bg-red-500 text-white px-2 py-1 rounded">削除</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editTarget ? "特典を編集" : "特典を追加"}</h2>

            <div className="mb-4">
              <label className="text-xs text-gray-500 block mb-1">種類</label>
              <div className="flex gap-2">
                {(["coupon", "digital", "goods"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setItemType(t)}
                    className={`flex-1 text-sm px-2 py-2 rounded border ${itemType === t ? "bg-teal-500 text-white border-teal-500" : "bg-white text-gray-600 border-gray-300"}`}>
                    {TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                {itemType === "coupon" ? "交換するとお客さんに電話鑑定用の%OFFクーポンが届きます"
                  : itemType === "digital" ? "交換したお客さんだけが、交換所の「交換した特典」から見たりダウンロードしたりできます"
                  : "交換されると申込一覧に発送先が届きます。発送したら「発送済み」にしてください"}
              </p>
            </div>

            <div className="mb-3">
              <label className="text-xs text-gray-500 block mb-1">画像（任意）</label>
              <div className="flex items-center gap-3">
                {imageUrl && <img src={imageUrl} alt="" className="w-16 h-16 object-cover rounded border" />}
                <label className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded cursor-pointer">
                  {uploading ? "アップロード中..." : imageUrl ? "差し替える" : "画像を選択"}
                  <input type="file" accept="image/*" className="hidden" disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                </label>
                {imageUrl && <button type="button" onClick={() => setImageUrl("")} className="text-xs text-gray-400 underline">外す</button>}
              </div>
            </div>

            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="特典名"
              className="w-full border rounded px-3 py-2 text-sm mb-3" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="説明文"
              rows={3} className="w-full border rounded px-3 py-2 text-sm mb-3" />

            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">必要な{tokenLabel}</label>
                <input type="number" value={requiredTokens} onChange={e => setRequiredTokens(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div className="w-24">
                <label className="text-xs text-gray-500 block mb-1">並び順</label>
                <input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>

            {itemType === "digital" && (
              <div className="mb-4">
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => setDigitalKind("video")}
                    className={`flex-1 text-xs px-2 py-1.5 rounded border ${digitalKind === "video" ? "bg-purple-500 text-white border-purple-500" : "bg-white text-gray-600 border-gray-300"}`}>📹 動画URL</button>
                  <button type="button" onClick={() => setDigitalKind("file")}
                    className={`flex-1 text-xs px-2 py-1.5 rounded border ${digitalKind === "file" ? "bg-indigo-500 text-white border-indigo-500" : "bg-white text-gray-600 border-gray-300"}`}>📄 ファイル</button>
                </div>
                {digitalKind === "video" ? (
                  <>
                    <input type="text" value={digitalUrl} onChange={e => setDigitalUrl(e.target.value)} placeholder="https://youtu.be/...（限定公開など）"
                      className="w-full border rounded px-3 py-2 text-sm" />
                    <p className="text-[11px] text-gray-400 mt-1">交換したお客さんにだけ表示されます</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      {digitalFileName && <span className="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded truncate max-w-[160px]">{digitalFileName}</span>}
                      <label className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded cursor-pointer">
                        {fileUploading ? "アップロード中..." : digitalFileName ? "差し替える" : "ファイルを選択（PDF・MP3・画像など）"}
                        <input type="file" className="hidden" disabled={fileUploading}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDigitalFileUpload(f); }} />
                      </label>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">交換したお客さんに、10分だけ有効なダウンロードURLが発行されます</p>
                  </>
                )}
              </div>
            )}

            {itemType === "digital" ? null : itemType === "coupon" ? (
              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">割引率（%OFF）</label>
                  <input type="number" value={discountRate} onChange={e => setDiscountRate(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">有効日数（交換日から）</label>
                  <input type="number" value={validDays} onChange={e => setValidDays(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <label className="text-xs text-gray-500 block mb-1">在庫数（空欄なら制限なし）</label>
                <input type="number" value={stock} onChange={e => setStock(e.target.value)} className="w-full border rounded px-3 py-2 text-sm mb-3" />
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={withMessage} onChange={e => setWithMessage(e.target.checked)} />
                  先生からのひと言を添える（交換されたら申込一覧で入力）
                </label>
              </div>
            )}

            <div className="flex justify-between">
              <button onClick={() => setShowModal(false)} className="bg-gray-400 text-white text-sm px-4 py-2 rounded">閉じる</button>
              <button onClick={save} disabled={saving || uploading || fileUploading} className="bg-teal-500 hover:bg-teal-600 text-white text-sm px-4 py-2 rounded disabled:opacity-50">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
