/**
 * Availability model: 336-bit weekly bitmap of 30-minute slots.
 * 7 days x 48 slots = 336 bits per tentacle.
 *
 * Bit ordering:
 * - Bit 0 = Sunday 00:00-00:30
 * - Bit 1 = Sunday 00:30-01:00
 * - ...
 * - Bit 47 = Sunday 23:30-00:00 (Mon)
 * - Bit 48 = Monday 00:00-00:30
 * - ...
 * - Bit 335 = Saturday 23:30-00:00 (Sun)
 */

export const SLOTS_PER_DAY = 48;
export const DAYS_PER_WEEK = 7;
export const TOTAL_SLOTS = SLOTS_PER_DAY * DAYS_PER_WEEK; // 336

export const DAY_NAMES = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export const DAY_NAMES_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function emptyBitmap(): string {
  return "0".repeat(TOTAL_SLOTS);
}

export function getBit(bitmap: string, index: number): boolean {
  return bitmap[index] === "1";
}

export function setBit(bitmap: string, index: number, value: boolean): string {
  const arr = bitmap.split("");
  arr[index] = value ? "1" : "0";
  return arr.join("");
}

export function toggleBit(bitmap: string, index: number): string {
  return setBit(bitmap, index, !getBit(bitmap, index));
}

export function slotIndex(day: number, halfHour: number): number {
  return day * SLOTS_PER_DAY + halfHour;
}

export function countSetBits(bitmap: string): number {
  let count = 0;
  for (const ch of bitmap) {
    if (ch === "1") count++;
  }
  return count;
}

export function totalHours(bitmap: string): number {
  return countSetBits(bitmap) * 0.5;
}

export function formatSlotTime(halfHour: number): string {
  const hour = Math.floor(halfHour / 2);
  const min = halfHour % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${min}`;
}

/**
 * Convert local bitmap to UTC by shifting bits based on timezone offset.
 * For Europe/London: offset is 0 in winter, +1 in summer (BST).
 */
export function localToUtc(bitmap: string, offsetHours: number): string {
  const shiftSlots = offsetHours * 2;
  if (shiftSlots === 0) return bitmap;

  const arr = bitmap.split("");
  const result = new Array(TOTAL_SLOTS).fill("0");

  for (let i = 0; i < TOTAL_SLOTS; i++) {
    if (arr[i] === "1") {
      const utcIndex = ((i - shiftSlots) % TOTAL_SLOTS + TOTAL_SLOTS) % TOTAL_SLOTS;
      result[utcIndex] = "1";
    }
  }

  return result.join("");
}

export function utcToLocal(bitmap: string, offsetHours: number): string {
  return localToUtc(bitmap, -offsetHours);
}

/**
 * Get the current UTC offset for a timezone.
 */
export function getTimezoneOffsetHours(timezone: string): number {
  const now = new Date();
  const utcDate = new Date(
    now.toLocaleString("en-US", { timeZone: "UTC" })
  );
  const tzDate = new Date(
    now.toLocaleString("en-US", { timeZone: timezone })
  );
  return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
}

// Presets
export function weekdayEvenings(): string {
  const bitmap = emptyBitmap().split("");
  // Mon-Thu (days 1-4), 19:00-22:00 (slots 38-43)
  for (let day = 1; day <= 4; day++) {
    for (let slot = 38; slot <= 43; slot++) {
      bitmap[slotIndex(day, slot)] = "1";
    }
  }
  return bitmap.join("");
}

export function sundayMornings(): string {
  const bitmap = emptyBitmap().split("");
  // Sunday (day 0), 08:00-12:00 (slots 16-23)
  for (let slot = 16; slot <= 23; slot++) {
    bitmap[slotIndex(0, slot)] = "1";
  }
  return bitmap.join("");
}

/**
 * Compute overlap count between two bitmaps.
 */
export function overlapCount(a: string, b: string): number {
  let count = 0;
  for (let i = 0; i < TOTAL_SLOTS; i++) {
    if (a[i] === "1" && b[i] === "1") count++;
  }
  return count;
}

/**
 * Compute availability compatibility score (0-100) between two UTC bitmaps.
 * Mirrors the SQL scoring formula used in getMatches.
 */
export function availabilityScore(myUtc: string, theirUtc: string): number {
  let exact = 0;
  let near = 0;

  for (let i = 0; i < TOTAL_SLOTS; i++) {
    if (myUtc[i] === "1" && theirUtc[i] === "1") exact++;
  }

  for (let i = 0; i < TOTAL_SLOTS; i++) {
    if (myUtc[i] === "1") {
      if (i > 0 && theirUtc[i - 1] === "1") near++;
      if (i < TOTAL_SLOTS - 1 && theirUtc[i + 1] === "1") near++;
    }
  }

  const myTotal = countSetBits(myUtc);
  return Math.min(100, Math.round(((2 * exact + near) / Math.max(myTotal * 2, 1)) * 100));
}
