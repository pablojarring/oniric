import { useTranslations } from "next-intl";

import { FieldSeparator } from "@/components/ui/field";

export function OrSeparator() {
  const t = useTranslations("Auth");
  return <FieldSeparator>{t("or")}</FieldSeparator>;
}
