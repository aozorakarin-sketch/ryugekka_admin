"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Product = {
  id: string;
  teacher_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stock: number;
  is_active: boolean;
};

async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `products/${crypto.randomUUID()}.${ext}`;
  // TODO: 'shop' バケットが未作成の場合はSupabase Dashboardで先に作成してください（Public bucket ON）
  const { error } = await supabase.storage.from("shop").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("shop").getPublicUrl(path);
  return data.publicUrl;
}

export function ProductsSection({ teacherId, canEdit }: { teacherId: string; canEdit: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/shop/products?teacher_id=${teacherId}`);
    const { products } = await res.json();
    setProducts(products ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [teacherId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditTarget(null);
    setName("");
    setDescription("");
    setPrice("");
    setStock("");
    setImageUrl("");
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditTarget(p);
    setName(p.name);
    setDescription(p.description ?? "");
    setPrice(String(p.price));
    setStock(String(p.stock));
    setImageUrl(p.image_url ?? "");
    setShowModal(true);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setImageUrl(url);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!name.trim() || !price) { alert("商品名と価格を入力してください"); return; }
    setSaving(true);
    const payload = {
      teacher_id: teacherId,
      name,
      description,
      price: Number(price),
      stock: Number(stock || 0),
      image_url: imageUrl || null,
    };
    if (editTarget) {
      await fetch("/api/admin/shop/products", {
        method: "PATCH",
        body: JSON.stringify({ id: editTarget.id, ...payload }),
      });
    } else {
      await fetch("/api/admin/shop/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    setShowModal(false);
    load();
  };

  const toggleActive = async (p: Product) => {
    await fetch("/api/admin/shop/products", {
      method: "PATCH",
      body: JSON.stringify({ id: p.id, is_active: !p.is_active }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/admin/shop/products?id=${id}`, { method: "DELETE" });
    load();
  };

  if (loading) return <div className="text-sm text-gray-400">読み込み中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">商品一覧 <span className="text-gray-400 font-normal">{products.length}件</span></h3>
        {canEdit && (
          <button onClick={openCreate} className="bg-teal-500 hover:bg-teal-600 text-white text-sm px-4 py-2 rounded">
            ＋ 商品を追加
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {products.map((p) => (
          <div key={p.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="w-full h-32 object-cover" />
            ) : (
              <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-xs text-gray-400">画像なし</div>
            )}
            <div className="p-3">
              <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
              <p className="text-sm text-gray-600">¥{p.price.toLocaleString()}</p>
              <p className={`text-xs ${p.stock === 0 ? "text-red-500" : "text-gray-500"}`}>
                在庫：{p.stock === 0 ? "売り切れ" : `${p.stock}点`}
              </p>
              <p className={`text-xs mt-1 ${p.is_active ? "text-green-600" : "text-gray-400"}`}>
                {p.is_active ? "公開中" : "非公開"}
              </p>
              {canEdit && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => openEdit(p)} className="text-xs bg-blue-500 text-white px-2 py-1 rounded">編集</button>
                  <button onClick={() => toggleActive(p)} className="text-xs bg-orange-400 text-white px-2 py-1 rounded">
                    {p.is_active ? "非公開に" : "公開に"}
                  </button>
                  <button onClick={() => remove(p.id)} className="text-xs bg-red-500 text-white px-2 py-1 rounded">削除</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editTarget ? "商品を編集" : "商品を追加"}</h2>

            <div className="mb-3">
              <label className="text-xs text-gray-500 block mb-1">商品画像</label>
              <div className="flex items-center gap-3">
                {imageUrl && <img src={imageUrl} alt="" className="w-16 h-16 object-cover rounded border" />}
                <label className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded cursor-pointer">
                  {uploading ? "アップロード中..." : imageUrl ? "差し替える" : "画像を選択"}
                  <input type="file" accept="image/*" className="hidden" disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                </label>
              </div>
            </div>

            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="商品名"
              className="w-full border rounded px-3 py-2 text-sm mb-3" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="商品説明"
              rows={3} className="w-full border rounded px-3 py-2 text-sm mb-3" />
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">価格（円）</label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">在庫数</label>
                <input type="number" value={stock} onChange={e => setStock(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setShowModal(false)} className="bg-gray-400 text-white text-sm px-4 py-2 rounded">閉じる</button>
              <button onClick={save} disabled={saving} className="bg-teal-500 hover:bg-teal-600 text-white text-sm px-4 py-2 rounded disabled:opacity-50">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
