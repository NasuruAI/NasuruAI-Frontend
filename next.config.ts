import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL("https://res.cloudinary.com/odpip1h9/image/upload/f_auto,q_auto/edu_logo"),
    ],
  },
};

export default nextConfig;
