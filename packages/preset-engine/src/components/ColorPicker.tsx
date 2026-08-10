import { useCallback } from "react";

/**
 * A label + text input for OKLCH color values.
 * The text input accepts oklch() strings directly.
 */
export function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <div className="flex items-center gap-2 py-1">
      <label className="w-40 shrink-0 text-xs text-muted-foreground">
        {label}
      </label>
      <input
        type="text"
        className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs font-mono"
        value={value}
        onChange={handleTextChange}
      />
    </div>
  );
}
