import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        // Change this line to be more inclusive
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;