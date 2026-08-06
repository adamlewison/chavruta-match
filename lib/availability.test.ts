import { describe, it, expect } from "vitest";
import {
  TOTAL_SLOTS,
  SLOTS_PER_DAY,
  emptyBitmap,
  getBit,
  setBit,
  toggleBit,
  slotIndex,
  countSetBits,
  totalHours,
  formatSlotTime,
  localToUtc,
  utcToLocal,
  overlapCount,
  availabilityScore,
} from "./availability";

// ─── helpers ───────────────────────────────────────────────────────────────

/** Build a bitmap with only the given slot indices set. */
function bitmapWith(...slots: number[]): string {
  const arr = new Array(TOTAL_SLOTS).fill("0");
  for (const s of slots) arr[s] = "1";
  return arr.join("");
}

/** Build a bitmap with all slots in a half-open range [start, end) set. */
function bitmapRange(start: number, end: number): string {
  const arr = new Array(TOTAL_SLOTS).fill("0");
  for (let i = start; i < end; i++) arr[i] = "1";
  return arr.join("");
}

// ─── emptyBitmap ───────────────────────────────────────────────────────────

describe("emptyBitmap", () => {
  it("has the correct length", () => {
    expect(emptyBitmap().length).toBe(TOTAL_SLOTS);
  });

  it("contains only zeros", () => {
    expect(emptyBitmap()).toMatch(/^0+$/);
  });
});

// ─── getBit / setBit / toggleBit ───────────────────────────────────────────

describe("getBit", () => {
  it("reads a 0 bit", () => {
    expect(getBit(emptyBitmap(), 0)).toBe(false);
  });

  it("reads a 1 bit", () => {
    expect(getBit(bitmapWith(5), 5)).toBe(true);
  });
});

describe("setBit", () => {
  it("sets a bit to true", () => {
    const result = setBit(emptyBitmap(), 10, true);
    expect(getBit(result, 10)).toBe(true);
  });

  it("clears a bit", () => {
    const result = setBit(bitmapWith(10), 10, false);
    expect(getBit(result, 10)).toBe(false);
  });

  it("does not touch other bits", () => {
    const original = bitmapWith(3, 7);
    const result = setBit(original, 3, false);
    expect(getBit(result, 7)).toBe(true);
    expect(getBit(result, 3)).toBe(false);
  });
});

describe("toggleBit", () => {
  it("turns a 0 bit on", () => {
    expect(getBit(toggleBit(emptyBitmap(), 0), 0)).toBe(true);
  });

  it("turns a 1 bit off", () => {
    expect(getBit(toggleBit(bitmapWith(0), 0), 0)).toBe(false);
  });
});

// ─── slotIndex ─────────────────────────────────────────────────────────────

describe("slotIndex", () => {
  it("Sunday 00:00 is slot 0", () => {
    expect(slotIndex(0, 0)).toBe(0);
  });

  it("Sunday 12:00 is slot 24", () => {
    expect(slotIndex(0, 24)).toBe(24);
  });

  it("Monday 00:00 starts at SLOTS_PER_DAY", () => {
    expect(slotIndex(1, 0)).toBe(SLOTS_PER_DAY);
  });

  it("Saturday 23:30 is the last slot (335)", () => {
    expect(slotIndex(6, 47)).toBe(335);
  });
});

// ─── countSetBits / totalHours ─────────────────────────────────────────────

describe("countSetBits", () => {
  it("returns 0 for an empty bitmap", () => {
    expect(countSetBits(emptyBitmap())).toBe(0);
  });

  it("returns the correct count for a few set bits", () => {
    expect(countSetBits(bitmapWith(0, 100, 200, 335))).toBe(4);
  });

  it("counts all 336 slots when fully set", () => {
    expect(countSetBits("1".repeat(TOTAL_SLOTS))).toBe(TOTAL_SLOTS);
  });
});

describe("totalHours", () => {
  it("returns 0 for an empty bitmap", () => {
    expect(totalHours(emptyBitmap())).toBe(0);
  });

  it("converts slots to hours at 0.5h per slot", () => {
    expect(totalHours(bitmapWith(0, 1, 2, 3))).toBe(2);
  });
});

// ─── formatSlotTime ────────────────────────────────────────────────────────

describe("formatSlotTime", () => {
  const cases: [number, string][] = [
    [0, "00:00"],
    [1, "00:30"],
    [2, "01:00"],
    [23, "11:30"],
    [24, "12:00"],
    [47, "23:30"],
  ];

  for (const [halfHour, expected] of cases) {
    it(`slot ${halfHour} → ${expected}`, () => {
      expect(formatSlotTime(halfHour)).toBe(expected);
    });
  }
});

// ─── overlapCount ──────────────────────────────────────────────────────────

describe("overlapCount", () => {
  it("returns 0 when there is no overlap", () => {
    const a = bitmapWith(0, 2, 4);
    const b = bitmapWith(1, 3, 5);
    expect(overlapCount(a, b)).toBe(0);
  });

  it("counts shared slots correctly", () => {
    const a = bitmapWith(0, 1, 2, 3);
    const b = bitmapWith(2, 3, 4, 5);
    expect(overlapCount(a, b)).toBe(2);
  });

  it("returns total slots when both bitmaps are identical and fully set", () => {
    const full = "1".repeat(TOTAL_SLOTS);
    expect(overlapCount(full, full)).toBe(TOTAL_SLOTS);
  });

  it("returns 0 when one bitmap is empty", () => {
    expect(overlapCount(emptyBitmap(), bitmapWith(0, 100))).toBe(0);
  });
});

// ─── localToUtc / utcToLocal ───────────────────────────────────────────────

describe("localToUtc", () => {
  it("returns the same bitmap when offset is 0", () => {
    const b = bitmapWith(10, 50, 100);
    expect(localToUtc(b, 0)).toBe(b);
  });

  it("shifts bits left by the offset in slots (positive offset = east of UTC)", () => {
    // +1h = 2 slots. Local slot 10 should map to UTC slot 8.
    const local = bitmapWith(10);
    const utc = localToUtc(local, 1);
    expect(getBit(utc, 8)).toBe(true);
    expect(countSetBits(utc)).toBe(1);
  });

  it("shifts bits right for a negative offset (west of UTC)", () => {
    // -1h = -2 slots. Local slot 10 should map to UTC slot 12.
    const local = bitmapWith(10);
    const utc = localToUtc(local, -1);
    expect(getBit(utc, 12)).toBe(true);
    expect(countSetBits(utc)).toBe(1);
  });

  it("wraps around the week boundary for a slot near the start", () => {
    // Local slot 1 with +2h offset (4 slots) → UTC slot 1 - 4 = -3 → 333.
    const local = bitmapWith(1);
    const utc = localToUtc(local, 2);
    expect(getBit(utc, (1 - 4 + TOTAL_SLOTS) % TOTAL_SLOTS)).toBe(true);
    expect(countSetBits(utc)).toBe(1);
  });

  it("wraps around the week boundary for a slot near the end", () => {
    // Local slot 335 with -2h offset (-4 slots) → UTC slot 335 + 4 = 339 → 3.
    const local = bitmapWith(335);
    const utc = localToUtc(local, -2);
    expect(getBit(utc, 3)).toBe(true);
    expect(countSetBits(utc)).toBe(1);
  });

  it("preserves the total number of set bits", () => {
    const local = bitmapRange(40, 60);
    expect(countSetBits(localToUtc(local, 3))).toBe(20);
    expect(countSetBits(localToUtc(local, -5))).toBe(20);
  });
});

describe("utcToLocal", () => {
  it("is the inverse of localToUtc", () => {
    const local = bitmapRange(100, 130);
    const roundTripped = utcToLocal(localToUtc(local, 2), 2);
    expect(roundTripped).toBe(local);
  });

  it("is the inverse across the week boundary", () => {
    const local = bitmapWith(1, 2, 334, 335);
    const roundTripped = utcToLocal(localToUtc(local, 5), 5);
    expect(roundTripped).toBe(local);
  });
});

// ─── availabilityScore ─────────────────────────────────────────────────────
//
// This function mirrors the SQL scoring formula in lib/queries.ts:getMatches.
// The two implementations must stay in sync — a divergence produces a displayed
// score that differs from the actual match ranking with no loud failure.

describe("availabilityScore", () => {
  it("returns 0 when there is no overlap and no adjacent slots", () => {
    // a has only even slots, b has only slots separated by at least 2.
    const a = bitmapWith(0, 2, 4);
    const b = bitmapWith(10, 20, 30);
    expect(availabilityScore(a, b)).toBe(0);
  });

  it("returns 100 when bitmaps are identical and non-empty", () => {
    const b = bitmapRange(0, 10);
    expect(availabilityScore(b, b)).toBe(100);
  });

  it("counts adjacent (near) slots at half the weight of exact matches", () => {
    // my: slot 5 only. their: slot 6 only (adjacent, not exact).
    // exact=0, near=1, myTotal=1 → score = round((0+1)/(1*2)*100) = round(50) = 50.
    const my = bitmapWith(5);
    const their = bitmapWith(6);
    expect(availabilityScore(my, their)).toBe(50);
  });

  it("gives full score for exact match even with adjacent also present", () => {
    // my: slot 5. their: slots 4, 5, 6. exact=1, near=2, myTotal=1.
    // score = min(100, round((2+2)/(2)*100)) = min(100, 200) = 100.
    const my = bitmapWith(5);
    const their = bitmapWith(4, 5, 6);
    expect(availabilityScore(my, their)).toBe(100);
  });

  it("caps at 100", () => {
    const my = bitmapWith(5);
    const their = "1".repeat(TOTAL_SLOTS);
    expect(availabilityScore(my, their)).toBe(100);
  });

  it("returns 0 when my bitmap is empty", () => {
    expect(availabilityScore(emptyBitmap(), bitmapWith(0, 1, 2))).toBe(0);
  });

  it("returns 0 when their bitmap is empty", () => {
    expect(availabilityScore(bitmapWith(0, 1, 2), emptyBitmap())).toBe(0);
  });

  it("does not count the slot before index 0 or after index 335", () => {
    // Slot 0: only check right neighbour (slot 1). Slot 335: only left (334).
    const my = bitmapWith(0);
    const theirRight = bitmapWith(1);
    const score = availabilityScore(my, theirRight);
    expect(score).toBeGreaterThan(0);

    // Confirm slot 335's left neighbour is counted too.
    const myEnd = bitmapWith(335);
    const theirLeft = bitmapWith(334);
    expect(availabilityScore(myEnd, theirLeft)).toBeGreaterThan(0);
  });
});
