import { execFileSync } from "node:child_process";

/** Acredita créditos a la organización del usuario con el script de desarrollo. */
export function grantCredits(email: string, credits: number) {
  execFileSync(
    "pnpm",
    ["exec", "tsx", "scripts/grant-credits.ts", email, String(credits)],
    {
      stdio: "pipe",
      // En Windows `pnpm` es un .cmd y solo se ejecuta a través de la shell.
      shell: process.platform === "win32",
    },
  );
}
