import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // El asistente pyme envía la foto del producto (hasta 8 MiB, ver
      // lib/uploads/images.ts) más los textos. Debe quedar por debajo de
      // `proxyClientMaxBodySize` (10 MB por defecto), porque proxy.ts también
      // recibe el cuerpo.
      bodySizeLimit: "9mb",
    },
  },
};

export default withNextIntl(nextConfig);
