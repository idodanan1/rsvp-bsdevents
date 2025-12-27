/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Optimize build to reduce memory usage
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  webpack: (config, { isServer }) => {
    // Exclude AppData and other system directories from compilation
    config.resolve = {
      ...config.resolve,
      modules: ['node_modules', 'src'],
    };
    
    // Ignore system directories during build
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/node_modules/**',
        '**/AppData/**',
        '**/Microsoft/**',
        '**/.git/**',
        '**/.next/**',
        '**/dist/**',
      ],
    };
    
    // Exclude AppData from module resolution
    config.module = {
      ...config.module,
      rules: [
        ...config.module.rules,
        {
          test: /\.tsx?$/,
          exclude: [
            /node_modules/,
            /AppData/,
            /Microsoft/,
            /\.next/,
            /dist/,
          ],
        },
      ],
    };
    
    // Optimize memory usage during build
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Create a separate chunk for vendor code
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
          },
        },
      };
    }
    
    return config;
  },
}

module.exports = nextConfig
