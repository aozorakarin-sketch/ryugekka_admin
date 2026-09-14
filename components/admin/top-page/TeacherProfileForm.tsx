"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { TypeSlider } from "./TypeSlider";
import { TagSelect } from "./TagSelect";

type SnsLink = { platform: string; url: string };

type TeacherProfile = {
  teacher_id: string;
  profile_icon_url: string | null;
  catchphrase: string | null;
  type_talking_style: number | null;
  type_wording: number | null;
  type_result_delivery: number | null;
  sample_audio_url: string | null;
  teacher_message: string | null;
  specialties: string[];
  divination_method: string | null;
  consultation_topics: string | null;
  gender: string | null;
  reading_experience: string | null;
  my_boom: string | null;
  recommended_book: string | null;
  recommended_movie: string | null;
  sns_links: SnsLink[];
};

function emptyProfile(teacherId: string): TeacherProfile {
  return {
    teacher_id: teacherId,
    profile_icon_url: null,
    catchphrase: null,
    type_talking_style: null,
    type_wording: null,
    type_result_delivery: null,
    sample_audio_url: null,
    teacher_message: null,
    specialties: [],
    divination_method: null,
    consultation_topics: null,
    gender: null,
    reading_experience: null,
    my_boom: null,
    recommended_book: null,
    recommended_movie: null,
    sns_links: [],
  };
}

async function uploadFile(file: File, pathPrefix: string): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${pathPrefix}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("top-page").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("top-page").getPublicUrl(path);
  return data.publicUrl;
}

export function TeacherProfileForm({
  teacherId,
  teacherName,
  canEdit,
}: {
  teacherId: string;
  teacherName: string;
  canEdit: boolean;
}) {
  const [profile, setProfile] = useState<TeacherProfile>(emptyProfile(teacherId));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetch(
        `/api/admin/top-page/teacher?teacher_id=${teacherId}`
      );
      const { profile: loaded } = await res.json();
      setProfile(loaded ?? emptyProfile(teacherId));
      setLoading(false);
    };
    load();
  }, [teacherId]);

  const update = <K extends keyof TeacherProfile>(
    key: K,
    value: TeacherProfile[K]
  ) => setProfile((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/top-page/teacher", {
        method: "PUT",
        body: JSON.stringify(profile),
      });
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  };

  const handleIconUpload = async (file: File) => {
    setUploadingIcon(true);
    try {
      const url = await uploadFile(file, `icon/${teacherId}`);
      update("profile_icon_url", url);
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleAudioUpload = async (file: File) => {
    setUploadingAudio(true);
    try {
      const url = await uploadFile(file, `audio/${teacherId}`);
      update("sample_audio_url", url);
    } finally {
      setUploadingAudio(false);
    }
  };

  const addSnsLink = () =>
    update("sns_links", [...profile.sns_links, { platform: "", url: "" }]);

  const updateSnsLink = (index: number, field: keyof SnsLink, value: string) => {
    const next = [...profile.sns_links];
    next[index] = { ...next[index], [field]: value };
    update("sns_links", next);
  };

  const removeSnsLink = (index: number) =>
    update(
      "sns_links",
      profile.sns_links.filter((_, i) => i !== index)
    );

  if (loading) {
    return <div className="text-sm text-gray-400">読み込み中...</div>;
  }

  const fieldDisabled = !canEdit || saving;

  return (
    <div className="space-y-8">
      {!canEdit && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          {teacherName}先生の情報は閲覧のみです。編集は担当の先生本人のみ行えます。
        </div>
      )}

      {/* プロフィールアイコン */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-2">
          プロフィールアイコン登録
        </h3>
        <div className="flex items-center gap-4">
          {profile.profile_icon_url && (
            <img
              src={profile.profile_icon_url}
              alt={teacherName}
              className="w-20 h-20 rounded-full object-cover border border-gray-200"
            />
          )}
          <label
            className={`inline-flex items-center px-4 py-2 rounded border border-gray-300 text-sm text-gray-700 ${
              fieldDisabled ? "opacity-50" : "cursor-pointer hover:bg-gray-50"
            }`}
          >
            {uploadingIcon ? "アップロード中..." : "画像を選択"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={fieldDisabled || uploadingIcon}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleIconUpload(file);
              }}
            />
          </label>
        </div>
      </section>

      {/* キャッチコピー */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-2">キャッチコピー</h3>
        <input
          type="text"
          value={profile.catchphrase ?? ""}
          disabled={fieldDisabled}
          onChange={(e) => update("catchphrase", e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-50"
          placeholder="例：あなたの心にそっと寄り添う鑑定を"
        />
      </section>

      {/* タイプ表 */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-2">タイプ表</h3>
        <div className="divide-y divide-gray-100 border border-gray-200 rounded px-4">
          <TypeSlider
            label="話し方"
            leftLabel="穏やか"
            rightLabel="テンポが良い"
            value={profile.type_talking_style}
            disabled={fieldDisabled}
            onChange={(v) => update("type_talking_style", v)}
          />
          <TypeSlider
            label="言葉遣い"
            leftLabel="ていねい"
            rightLabel="フレンドリー"
            value={profile.type_wording}
            disabled={fieldDisabled}
            onChange={(v) => update("type_wording", v)}
          />
          <TypeSlider
            label="結果の伝え方"
            leftLabel="ソフトに伝える"
            rightLabel="ストレートに伝える"
            value={profile.type_result_delivery}
            disabled={fieldDisabled}
            onChange={(v) => update("type_result_delivery", v)}
          />
        </div>
      </section>

      {/* サンプル音声 */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-2">サンプル音声</h3>
        <div className="flex items-center gap-4">
          {profile.sample_audio_url && (
            <audio controls src={profile.sample_audio_url} className="h-10" />
          )}
          <label
            className={`inline-flex items-center px-4 py-2 rounded border border-gray-300 text-sm text-gray-700 ${
              fieldDisabled ? "opacity-50" : "cursor-pointer hover:bg-gray-50"
            }`}
          >
            {uploadingAudio ? "アップロード中..." : "音声ファイルを選択"}
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              disabled={fieldDisabled || uploadingAudio}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAudioUpload(file);
              }}
            />
          </label>
        </div>
      </section>

      {/* 占い師からのメッセージ */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-2">
          占い師からのメッセージ
        </h3>
        <textarea
          value={profile.teacher_message ?? ""}
          disabled={fieldDisabled}
          onChange={(e) => update("teacher_message", e.target.value)}
          rows={4}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm disabled:bg-gray-50"
        />
      </section>

      {/* 得意な鑑定 */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-2">得意な鑑定</h3>
        <TagSelect
          selected={profile.specialties}
          disabled={fieldDisabled}
          onChange={(tags) => update("specialties", tags)}
        />
      </section>

      {/* プロフィール項目群 */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-3">プロフィール</h3>
        <div className="grid grid-cols-2 gap-4">
          <ProfileTextField
            label="占術"
            value={profile.divination_method}
            disabled={fieldDisabled}
            onChange={(v) => update("divination_method", v)}
          />
          <ProfileTextField
            label="相談内容"
            value={profile.consultation_topics}
            disabled={fieldDisabled}
            onChange={(v) => update("consultation_topics", v)}
          />
          <ProfileTextField
            label="性別"
            value={profile.gender}
            disabled={fieldDisabled}
            onChange={(v) => update("gender", v)}
          />
          <ProfileTextField
            label="鑑定歴"
            value={profile.reading_experience}
            disabled={fieldDisabled}
            onChange={(v) => update("reading_experience", v)}
          />
          <ProfileTextField
            label="マイブーム"
            value={profile.my_boom}
            disabled={fieldDisabled}
            onChange={(v) => update("my_boom", v)}
          />
          <ProfileTextField
            label="お勧めの本"
            value={profile.recommended_book}
            disabled={fieldDisabled}
            onChange={(v) => update("recommended_book", v)}
          />
          <ProfileTextField
            label="お勧めの映画"
            value={profile.recommended_movie}
            disabled={fieldDisabled}
            onChange={(v) => update("recommended_movie", v)}
          />
        </div>
      </section>

      {/* SNSリンク登録 */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-2">SNSリンク登録</h3>
        <div className="space-y-2">
          {profile.sns_links.map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="プラットフォーム名（例：Instagram）"
                value={link.platform}
                disabled={fieldDisabled}
                onChange={(e) => updateSnsLink(i, "platform", e.target.value)}
                className="w-40 border border-gray-300 rounded px-2 py-1.5 text-sm disabled:bg-gray-50"
              />
              <input
                type="text"
                placeholder="URL"
                value={link.url}
                disabled={fieldDisabled}
                onChange={(e) => updateSnsLink(i, "url", e.target.value)}
                className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm disabled:bg-gray-50"
              />
              {canEdit && (
                <button
                  type="button"
                  onClick={() => removeSnsLink(i)}
                  className="text-xs text-red-500 hover:text-red-700 shrink-0"
                >
                  削除
                </button>
              )}
            </div>
          ))}
          {canEdit && (
            <button
              type="button"
              onClick={addSnsLink}
              className="text-sm text-rose-600 hover:text-rose-800"
            >
              ＋ SNSリンクを追加
            </button>
          )}
        </div>
      </section>

      {canEdit && (
        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-rose-500 text-white text-sm rounded hover:bg-rose-600 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存する"}
          </button>
          {savedAt && (
            <span className="text-xs text-gray-500">
              {savedAt.toLocaleTimeString("ja-JP")} に保存しました
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileTextField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string | null;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type="text"
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm disabled:bg-gray-50"
      />
    </div>
  );
}
