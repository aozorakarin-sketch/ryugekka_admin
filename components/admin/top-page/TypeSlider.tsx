"use client";

type TypeSliderProps = {
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: number | null; // 1〜5
  onChange: (value: number) => void;
  disabled?: boolean;
};

export function TypeSlider({
  label,
  leftLabel,
  rightLabel,
  value,
  onChange,
  disabled,
}: TypeSliderProps) {
  const current = value ?? 3;

  return (
    <div className="py-3">
      <div className="text-sm font-medium text-gray-700 mb-2">{label}</div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 w-24 text-right shrink-0">
          {leftLabel}
        </span>
        <div className="flex-1 flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => onChange(n)}
              className={`h-6 w-6 rounded-full border transition-colors ${
                current === n
                  ? "bg-rose-500 border-rose-500"
                  : "bg-white border-gray-300 hover:border-rose-300"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              aria-label={`${label} ${n}`}
            />
          ))}
        </div>
        <span className="text-xs text-gray-500 w-24 shrink-0">{rightLabel}</span>
      </div>
    </div>
  );
}
