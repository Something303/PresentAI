/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
    ],
  },
  webpack: (config) => {
    // Handle PDF.js worker
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
