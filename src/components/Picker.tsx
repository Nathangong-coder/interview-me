"use client";

import { useState } from "react";
import type { Option } from "@/lib/catalog";

const CUSTOM = "__custom__";

/** Dropdown of known options, with a "Custom…" escape hatch that reveals a text box. */
export function Picker({
  value,
  options,
  onChange,
  customLabel = "Custom…",
  customPlaceholder,
}: {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  customLabel?: string;
  customPlaceholder?: string;
}) {
  const known = options.some((o) => o.id === value);
  const [customMode, setCustomMode] = useState(!known && value !== "");
  const showCustom = customMode || (!known && value !== "") || options.length === 0;

  return (
    <div className="space-y-2">
      {options.length > 0 && (
        <select
          className="input"
          value={showCustom ? CUSTOM : value}
          onChange={(e) => {
            if (e.target.value === CUSTOM) {
              setCustomMode(true);
            } else {
              setCustomMode(false);
              onChange(e.target.value);
            }
          }}
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
          <option value={CUSTOM}>{customLabel}</option>
        </select>
      )}
      {showCustom && (
        <input
          className="input font-mono"
          value={value}
          placeholder={customPlaceholder}
          onChange={(e) => onChange(e.target.value.trim())}
        />
      )}
    </div>
  );
}
