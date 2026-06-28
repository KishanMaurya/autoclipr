import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  webpack(config, { isServer }) {
    if (!isServer) {
      // @ffmpeg/ffmpeg's bundled worker does import(coreURL) at runtime.
      // Webpack converts that to __webpack_require__(url) which can't handle
      // absolute URLs. This tells webpack to emit native import(url) instead.
      const existingExternals = Array.isArray(config.externals)
        ? config.externals
        : config.externals
        ? [config.externals]
        : [];
      config.externals = [
        ...existingExternals,
        ({ request }: { request?: string }, callback: Function) => {
          if (request && /^https?:\/\//.test(request)) {
            return callback(null, `promise import(${JSON.stringify(request)})`);
          }
          callback();
        },
      ];
    }
    return config;
  },
  async headers() {
    return [
      {
        // Required for ffmpeg.wasm SharedArrayBuffer on all routes
        // (chunks served from /_next/static/ also need these headers)
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // credentialless allows cross-origin assets (images/fonts) without
          // requiring them to set CORP headers — safer than require-corp globally
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Google often requests /favicon.ico directly — serve the current brand icon.
      { source: "/favicon.ico", destination: "/icon", permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "yt3.ggpht.com" },
      { protocol: "https", hostname: "yt3.googleusercontent.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
};

export default nextConfig;
