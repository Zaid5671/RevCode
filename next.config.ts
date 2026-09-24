import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Google profile photos, shown in the header (the only remote images RevCode loads).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
