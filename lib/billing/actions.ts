"use server";

import { getDb } from "@/db";
import { requireOrganization } from "@/lib/auth/session";

import { getBalance } from "./wallet";

/** Créditos disponibles de la organización, para el saldo del encabezado. */
export async function getAvailableCredits(): Promise<number> {
  const { organization } = await requireOrganization();
  const balance = await getBalance(getDb(), organization.id);
  return balance.available;
}
