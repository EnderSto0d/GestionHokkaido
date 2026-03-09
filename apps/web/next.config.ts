import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Activer React strict mode pour détecter les problèmes tôt
  reactStrictMode: true,

  // Configuration des images distantes (avatars Discord, assets Supabase Storage)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "/avatars/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
