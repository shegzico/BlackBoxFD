import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['iconsax-react'],
  async headers() {
    return [
      {
        // Allow the tracking pages to be embedded in iframes on any website
        source: '/track/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
        ],
      },
    ];
  },
};

export default nextConfig;
