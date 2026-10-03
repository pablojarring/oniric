import { LoaderCircleIcon } from "lucide-react";

/** Aviso de que el director creativo está trabajando. */
export function Thinking({ label }: { label: string }) {
  return (
    <p
      role="status"
      className="flex items-center gap-2 text-sm text-muted-foreground"
    >
      <LoaderCircleIcon aria-hidden className="size-4 animate-spin" />
      {label}
    </p>
  );
}
