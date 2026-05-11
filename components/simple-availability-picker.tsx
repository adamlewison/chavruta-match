"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  DAY_NAMES_FULL,
  emptyBitmap,
  slotIndex,
  SLOTS_PER_DAY,
} from "@/lib/availability";

interface SimpleAvailabilityPickerProps {
  onChange: (bitmap: string) => void;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const min = i % 2 === 0 ? "00" : "30";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const period = hour < 12 ? "AM" : "PM";
  return {
    value: i,
    label: `${displayHour}:${min} ${period}`,
  };
});

const DURATION_OPTIONS = [
  { value: 1, label: "30 minutes" },
  { value: 2, label: "1 hour" },
  { value: 3, label: "1.5 hours" },
  { value: 4, label: "2 hours" },
  { value: 6, label: "3 hours" },
  { value: 8, label: "4 hours" },
];

export function SimpleAvailabilityPicker({
  onChange,
}: SimpleAvailabilityPickerProps) {
  const [selectedDays, setSelectedDays] = useState<boolean[]>(
    new Array(7).fill(false),
  );
  const [startTime, setStartTime] = useState<number>(36); // 6:00 PM default
  const [duration, setDuration] = useState<number>(2); // 1 hour default
  const currentStartOption = TIME_OPTIONS.find(
    (option) => option.value === startTime,
  );
  const currentDurationOption = DURATION_OPTIONS.find(
    (option) => option.value === duration,
  );

  useEffect(() => {
    // Convert simple selections to bitmap
    const bitmap = emptyBitmap().split("");

    selectedDays.forEach((isSelected, dayIndex) => {
      if (isSelected) {
        // Paint slots from startTime to startTime + duration
        for (
          let slot = startTime;
          slot < startTime + duration && slot < SLOTS_PER_DAY;
          slot++
        ) {
          const index = slotIndex(dayIndex, slot);
          bitmap[index] = "1";
        }
      }
    });

    onChange(bitmap.join(""));
  }, [selectedDays, startTime, duration, onChange]);

  const toggleDay = (dayIndex: number) => {
    const newDays = [...selectedDays];
    newDays[dayIndex] = !newDays[dayIndex];
    setSelectedDays(newDays);
  };

  const selectedCount = selectedDays.filter(Boolean).length;
  const totalHours = (selectedCount * duration * 0.5).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Which days are you available?</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DAY_NAMES_FULL.map((day, index) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(index)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition",
                selectedDays[index]
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-background hover:border-primary",
              )}
            >
              <Checkbox
                checked={selectedDays[index]}
                onCheckedChange={() => toggleDay(index)}
                className="pointer-events-none"
              />
              {day}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p className="font-medium text-muted-foreground">Session window</p>
          <p className="text-xs">
            We use this slot for every day you select above.
          </p>
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="start-time">Start time</Label>
            <Select
              value={startTime.toString()}
              onValueChange={(value) => value && setStartTime(parseInt(value))}
            >
              <SelectTrigger id="start-time" className="w-full">
                <SelectValue>
                  {currentStartOption?.label ?? "Start time"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value.toString()}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="duration">Duration</Label>
            <Select
              value={duration.toString()}
              onValueChange={(value) => value && setDuration(parseInt(value))}
            >
              <SelectTrigger id="duration" className="w-full">
                <SelectValue>
                  {currentDurationOption?.label ?? "Duration"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value.toString()}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-sm font-medium text-primary">
            {totalHours} hours per week
          </p>
          <p className="text-xs text-muted-foreground">
            {selectedCount} {selectedCount === 1 ? "day" : "days"} selected
          </p>
        </div>
      )}
    </div>
  );
}
