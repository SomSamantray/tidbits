import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root: this machine has an unrelated package-lock.json
  // in the parent ~/ directory that would otherwise confuse root inference.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
