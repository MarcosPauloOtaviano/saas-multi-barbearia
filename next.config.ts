import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Endereço curto de divulgação da Stilo Sampa. O endereço multiestabelecimento
  // /b/:slug continua sendo a rota canônica para todas as barbearias.
  async rewrites() {
    return [
      { source: "/stilo-sampa", destination: "/b/stilo-sampa" },
      { source: "/stilo-sampa/:path*", destination: "/b/stilo-sampa/:path*" },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/barber-media/**",
      },
    ],
  },
};

export default nextConfig;
