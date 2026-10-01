import type { TemplatePrices } from "./service";

/**
 * Cuántos anuncios de cada plantilla alcanzan con un saldo, con los precios
 * actuales (en su formato más usado). Se muestra al recargar y en el inicio.
 */
export function creditsYield(
  prices: TemplatePrices,
  credits: number,
): { whatsapp: number; promo: number; images: number } {
  const per = (price: number | undefined) =>
    Math.floor(Math.max(credits, 0) / Math.max(price ?? 0, 1));
  return {
    whatsapp: per(prices.whatsappStatus["9:16"]),
    promo: per(prices.promoInstagram["9:16"]),
    images: per(prices.dailyOffer["1:1"]),
  };
}
