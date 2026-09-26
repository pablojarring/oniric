import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/auth/actions";

export function GoogleButton({ next }: { next?: string }) {
  const t = useTranslations("Auth");

  return (
    <form action={signInWithGoogle}>
      {next && <input type="hidden" name="next" value={next} />}
      <Button type="submit" variant="outline" className="w-full">
        {t("continueWithGoogle")}
      </Button>
    </form>
  );
}
