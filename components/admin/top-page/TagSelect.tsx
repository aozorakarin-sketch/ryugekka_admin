"use client";

export const SPECIALTY_TAGS = [
  "恋愛",
  "結婚",
  "復縁",
  "仕事",
  "人間関係",
  "金運",
  "健康",
  "家庭",
  "相性",
] as const;

type TagSelectProps = {
  selected: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
};

export function TagSelect({ selected, onChange, disabled }: TagSelectProps) {
  const toggle = (tag: string) => {
    if (disabled) return;
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {SPECIALTY_TAGS.map((tag) => {
        const active = selected.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            disabled={disabled}
            onClick={() => toggle(tag)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              active
                ? "bg-rose-500 text-white border-rose-500"
                : "bg-white text-gray-600 border-gray-300 hover:border-rose-300"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
