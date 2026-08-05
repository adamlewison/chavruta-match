"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SLOTS_PER_DAY,
  DAYS_PER_WEEK,
  DAY_NAMES,
  slotIndex,
  getBit,
  totalHours,
  formatSlotTime,
  emptyBitmap,
  weekdayEvenings,
  sundayMornings,
} from "@/lib/availability";

interface AvailabilityPickerProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export function AvailabilityPicker({
  value,
  onChange,
  readOnly = false,
  compact = false,
}: AvailabilityPickerProps) {
  const [isPainting, setIsPainting] = useState(false);
  const [paintValue, setPaintValue] = useState(true);

  const setSlot = (day: number, slot: number, val: boolean) => {
    if (readOnly) return;
    const idx = slotIndex(day, slot);
    const arr = value.split("");
    arr[idx] = val ? "1" : "0";
    onChange(arr.join(""));
  };

  const handlePointerDown = (day: number, slot: number) => {
    if (readOnly) return;
    const idx = slotIndex(day, slot);
    const newVal = value[idx] !== "1";
    setPaintValue(newVal);
    setIsPainting(true);
    setSlot(day, slot, newVal);
    try { navigator.vibrate?.(10); } catch {}
  };

  const handlePointerEnter = (day: number, slot: number) => {
    if (!isPainting || readOnly) return;
    setSlot(day, slot, paintValue);
  };

  const handlePointerUp = () => {
    setIsPainting(false);
  };

  // Only show 6am-midnight by default, or all hours in expanded mode
  const startSlot = compact ? 12 : 0; // 6am = slot 12
  const endSlot = compact ? SLOTS_PER_DAY : SLOTS_PER_DAY;
  const visibleSlots = [];
  for (let s = startSlot; s < endSlot; s++) {
    visibleSlots.push(s);
  }

  const hours = totalHours(value);

  return (
    <div
      className="select-none"
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-sm font-medium">
            {hours} hours/week selected
          </span>
          <div className="flex gap-1 ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange(weekdayEvenings())}
            >
              Weekday evenings
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange(sundayMornings())}
            >
              Sunday mornings
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange(emptyBitmap())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="grid min-w-[400px]" style={{ gridTemplateColumns: `3rem repeat(${DAYS_PER_WEEK}, 1fr)` }}>
          {/* Header row */}
          <div />
          {DAY_NAMES.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground pb-1"
            >
              {day}
            </div>
          ))}

          {/* Time slots */}
          {visibleSlots.map((slot) => (
            <div key={slot} className="contents">
              {/* Time label - show every 2 slots (every hour) */}
              <div className="flex items-center justify-end pr-2 text-xs text-muted-foreground h-3">
                {slot % 2 === 0 ? formatSlotTime(slot) : ""}
              </div>

              {/* Day cells */}
              {Array.from({ length: DAYS_PER_WEEK }, (_, day) => {
                const active = getBit(value, slotIndex(day, slot));
                return (
                  <div
                    key={`${day}-${slot}`}
                    className={cn(
                      "h-3 border-r border-b border-border/40 transition-colors",
                      slot % 2 === 0 && "border-t border-t-border/20",
                      active
                        ? "bg-primary/80 hover:bg-primary/90"
                        : "bg-transparent hover:bg-muted",
                      !readOnly && "cursor-pointer"
                    )}
                    onPointerDown={() => handlePointerDown(day, slot)}
                    onPointerEnter={() => handlePointerEnter(day, slot)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Mini version for cards - shows colored blocks */
export function AvailabilityMini({ bitmap }: { bitmap: string }) {
  const hours = totalHours(bitmap);

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-px">
        {DAY_NAMES.map((day, dayIdx) => {
          let daySlots = 0;
          for (let s = 0; s < SLOTS_PER_DAY; s++) {
            if (getBit(bitmap, slotIndex(dayIdx, s))) daySlots++;
          }
          const intensity = Math.min(daySlots / 10, 1);
          return (
            <div
              key={day}
              className="w-3 h-6 rounded-sm"
              style={{
                backgroundColor:
                  intensity > 0
                    ? `oklch(0.55 0.15 35 / ${0.2 + intensity * 0.8})`
                    : "var(--muted)",
              }}
              title={`${day}: ${(daySlots * 0.5).toFixed(1)}h`}
            />
          );
        })}
      </div>
      <span className="text-xs text-muted-foreground">{hours}h/wk</span>
    </div>
  );
}
