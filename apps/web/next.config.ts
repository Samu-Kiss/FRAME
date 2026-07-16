import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@frame/validators"],
  webpack: (config) => {
    // Workspace packages use NodeNext-style ".js" specifiers for ".ts"
    // sources; webpack needs the alias to resolve them.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    }
    return config
  },
}

export default nextConfig
