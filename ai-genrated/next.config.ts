import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mysql2", "mongodb"],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
