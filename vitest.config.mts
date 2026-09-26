import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"],
    projects: [
      {
        extends: true,
        test: {
          // Lógica de servidor y utilidades.
          name: "unit",
          environment: "node",
          include: ["**/*.test.ts"],
          exclude: [
            ...configDefaults.exclude,
            "e2e/**",
            "**/*.integration.test.ts",
          ],
        },
      },
      {
        extends: true,
        test: {
          // Contra el Postgres real de Supabase local (`pnpm test:integration`).
          name: "integration",
          environment: "node",
          include: ["**/*.integration.test.ts"],
          setupFiles: ["./test/integration-setup.ts"],
          testTimeout: 30_000,
        },
      },
      {
        extends: true,
        test: {
          // Componentes de React.
          name: "dom",
          environment: "jsdom",
          include: ["**/*.test.tsx"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
