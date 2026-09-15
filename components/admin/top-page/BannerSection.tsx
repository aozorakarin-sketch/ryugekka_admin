"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Banner = {
  id: string;
  banner_type: "top" | "carousel";
  image_url: string;
  link_url: string | null;
  display_order: number;
  is_active: boolean;
};

async function uploadImage(file: File, pathPrefix: string): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${pathPrefix}/${crypto.randomUUID()}.${ext}`;

  // TODO: 'top-page' バケットが未作成の場合はSupabase Dashboardで先に作成してください
  const { error } = await supabase.storage.from("top-page").upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage.from("top-page").getPublicUrl(path);
  return data.publicUrl;
}

export function BannerSection() {
  const [topBanner, setTopBanner] = useState<Banner | null>(null);
  const [carouselBanners, setCarouselBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/top-page/banners");
    const { banners } = await res.json();
    setTopBanner(
      (banners as Banner[]).find((b) => b.banner_type === "top") ?? null
    );
    setCarouselBanners(
      (banners as Banner[])
        .filter((b) => b.banner_type === "carousel")
        .sort((a, b) => a.display_order - b.display_order)
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleTopBannerUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadImage(file, "top-banner");
      if (topBanner) {
        await fetch("/api/admin/top-page/banners", {
          method: "PATCH",
          body: JSON.stringify({ id: topBanner.id, image_url: url }),
        });
      } else {
        await fetch("/api/admin/top-page/banners", {
          method: "POST",
          body: JSON.stringify({ banner_type: "top", image_url: url }),
        });
      }
      await load();
    } finally {
      setUploading(false);
    }
  };

  const handleCarouselAdd = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadImage(file, "carousel-banner");
      await fetch("/api/admin/top-page/banners", {
        method: "POST",
        body: JSON.stringify({
          banner_type: "carousel",
          image_url: url,
          display_order: carouselBanners.length,
        }),
      });
      await load();
    } finally {
      setUploading(false);
    }
  };

  const handleCarouselDelete = async (id: string) => {
    await fetch(`/api/admin/top-page/banners?id=${id}`, { method: "DELETE" });
    await load();
  };

  const handleCarouselReplace = async (id: string, file: File) => {
    setUploading(true);
    try {
      const url = await uploadImage(file, "carousel-banner");
      await fetch("/api/admin/top-page/banners", {
        method: "PATCH",
        body: JSON.stringify({ id, image_url: url }),
      });
      await load();
    } finally {
      setUploading(false);
    }
  };

  const handleCarouselReorder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= carouselBanners.length) return;
    const current = carouselBanners[index];
    const target = carouselBanners[targetIndex];
    await Promise.all([
      fetch("/api/admin/top-page/banners", {
        method: "PATCH",
        body: JSON.stringify({ id: current.id, display_order: target.display_order }),
      }),
      fetch("/api/admin/top-page/banners", {
        method: "PATCH",
        body: JSON.stringify({ id: target.id, display_order: current.display_order }),
      }),
    ]);
    await load();
  };

  const handleCarouselLinkChange = async (id: string, link_url: string) => {
    await fetch("/api/admin/top-page/banners", {
      method: "PATCH",
      body: JSON.stringify({ id, link_url }),
    });
  };

  if (loading) {
    return <div className="text-sm text-gray-400">読み込み中...</div>;
  }

  return (
    <div className="space-y-8">
      {/* トップバナー */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-2">
          トップバナー登録
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          サイト最上部に表示するメインバナー（1枚）
        </p>
        <div className="flex items-start gap-4">
          {topBanner && (
            <img
              src={topBanner.image_url}
              alt="トップバナー"
              className="w-64 h-32 object-cover rounded border border-gray-200"
            />
          )}
          <label className="inline-flex items-center px-4 py-2 rounded border border-gray-300 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
            {uploading ? "アップロード中..." : topBanner ? "差し替える" : "画像を選択"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleTopBannerUpload(file);
              }}
            />
          </label>
        </div>
      </div>

      {/* コロコロバナー */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-2">
          コロコロバナー登録
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          サイト内で順番に切り替わるバナー（複数登録可）
        </p>
        <div className="space-y-3">
          {carouselBanners.map((banner, index) => (
            <div
              key={banner.id}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded"
            >
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCarouselReorder(index, "up")}
                  disabled={index === 0}
                  className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-xs text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleCarouselReorder(index, "down")}
                  disabled={index === carouselBanners.length - 1}
                  className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-xs text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  ↓
                </button>
              </div>
              <img
                src={banner.image_url}
                alt=""
                className="w-32 h-16 object-cover rounded shrink-0"
              />
              <input
                type="text"
                placeholder="リンク先URL（任意）"
                defaultValue={banner.link_url ?? ""}
                onBlur={(e) => handleCarouselLinkChange(banner.id, e.target.value)}
                className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5"
              />
              <label className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer shrink-0">
                {uploading ? "アップロード中..." : "差し替える"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCarouselReplace(banner.id, file);
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => handleCarouselDelete(banner.id)}
                className="text-xs text-red-500 hover:text-red-700 shrink-0"
              >
                削除
              </button>
            </div>
          ))}
          <label className="inline-flex items-center px-4 py-2 rounded border border-gray-300 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
            {uploading ? "アップロード中..." : "＋ バナーを追加"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCarouselAdd(file);
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
