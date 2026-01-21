/** @type {import('next').NextConfig} */
const nextConfig = {
  // Acknowledge Turbopack (default in Next.js 16) while keeping webpack config
  turbopack: {},

  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }

    if (isServer) {
      config.externals = config.externals || []
      config.externals.push({
        pg: 'commonjs pg',
        'pg-native': 'commonjs pg-native',
      })
    }

    return config
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },

  serverExternalPackages: ['pg'],

  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
    ],
  },


}

export default nextConfig
