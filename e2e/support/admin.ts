import { execFileSync } from "node:child_process";

/** Da acceso al panel de admin con el script `pnpm admin:grant`. */
export function grantPlatformAdmin(email: string) {
  execFileSync("pnpm", ["exec", "tsx", "scripts/admin-grant.ts", email], {
    stdio: "pipe",
    // En Windows `pnpm` es un .cmd y solo se ejecuta a través de la shell.
    shell: process.platform === "win32",
  });
}
