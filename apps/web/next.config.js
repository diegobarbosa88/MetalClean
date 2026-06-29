/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@metalclean/types', '@metalclean/validators'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'media.metalclean.pt' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: [],
  },
}

module.exports = nextConfig
