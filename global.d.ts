import type { Locale } from "@/i18n/config";
import type messages from "@/messages/es.json";

// Tipado estricto de claves de traducción: `es` es la fuente de verdad.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
