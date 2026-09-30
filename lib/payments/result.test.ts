import { describe, expect, it } from "vitest";

import {
  gatewayMessage,
  isAbandoned,
  PENDING_PURCHASE_TIMEOUT_MS,
  purchaseResult,
} from "./result";

const now = new Date("2026-09-30T12:00:00Z");
const recent = new Date(now.getTime() - 60_000);
const old = new Date(now.getTime() - PENDING_PURCHASE_TIMEOUT_MS - 1);

describe("purchaseResult", () => {
  it.each([
    [{ status: "paid", failureReason: null, createdAt: recent }, false, "paid"],
    [
      { status: "failed", failureReason: "canceled", createdAt: recent },
      false,
      "declined",
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

describe("isAbandoned", () => {
  it("solo las compras pendientes de hace más de 10 minutos", () => {
    expect(isAbandoned({ status: "pending", createdAt: old }, now)).toBe(true);
    expect(isAbandoned({ status: "pending", createdAt: recent }, now)).toBe(
      false,
    );
    expect(isAbandoned({ status: "failed", createdAt: old }, now)).toBe(false);
  });
});

describe("gatewayMessage", () => {
  it("lee el motivo de la respuesta de la pasarela", () => {
    expect(gatewayMessage({ message: " Transacción rechazada " })).toBe(
      "Transacción rechazada",
    );
  });

  it.each([null, "texto", {}, { message: "" }, { message: 3 }])(
    "sin motivo en %o",
    (confirmation) => {
      expect(gatewayMessage(confirmation)).toBeUndefined();
    },
  );
});
