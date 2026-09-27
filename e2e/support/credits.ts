import { execFileSync } from "node:child_process";

/** Acredita créditos a la organización del usuario con el script de desarrollo. */
export function grantCredits(email: string, credits: number) {
  execFileSync(
    "pnpm",
    ["exec", "tsx", "scripts/grant-credits.ts", email, String(credits)],
    { stdio: "pipe" },
  );
}
