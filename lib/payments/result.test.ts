import { describe, expect, it } from "vitest";

import { PENDING_PURCHASE_TIMEOUT_MS, purchaseResult } from "./result";

const now = new Date("2026-09-30T12:00:00Z");
const recent = new Date(now.getTime() - 60_000);
const old = new Date(now.getTime() - PENDING_PURCHASE_TIMEOUT_MS - 1);

describe("purchaseResult", () => {
  it.each([
    [{ status: "paid", failureReason: null, createdAt: recent }, false, "paid"],
    [
      { status: "failed", failureReason: "canceled", createdAt: recent },
      false,
      "canceled",
    ],
    [
      { status: "failed", failureReason: "amount_mismatch", createdAt: recent },
      false,
      "failed",
    ],
    [
      { status: "pending", failureReason: null, createdAt: recent },
      false,
      "pending",
    ],
    [
      { status: "pending", failureReason: null, createdAt: recent },
      true,
      "canceled",
    ],
    [
      { status: "pending", failureReason: null, createdAt: old },
      false,
      "failed",
    ],
  ] as const)("%o (cancelado: %s) → %s", (purchase, canceled, expected) => {
    expect(purchaseResult(purchase, { canceled, now })).toBe(expected);
  });
});
