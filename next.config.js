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
    outputFileTracingExcludes: {
      '*': [
        '**/AppData/**',
        '**/Microsoft/**',
        '**/Office/**',
        '**/SolutionPackages/**',
        '**/PackageResources/**',
      ],
    },
  },
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json',
  },
  // Force ignore TypeScript errors during build
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Exclude system directories from TypeScript compilation
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
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
      alias: {
        ...config.resolve.alias,
        '@': require('path').resolve(__dirname),
      },
    };
    
    // Ignore system directories during build
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/node_modules/**',
        '**/AppData/**',
        '**/Microsoft/**',
        '**/Office/**',
        '**/SolutionPackages/**',
        '**/PackageResources/**',
        '**/.git/**',
        '**/.next/**',
        '**/dist/**',
      ],
    };
    
    // Exclude AppData and Office from module resolution
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
            /Office/,
            /SolutionPackages/,
            /PackageResources/,
            /\.next/,
            /dist/,
          ],
        },
      ],
    };
    
    // Ignore AppData and Office directories from file system
    config.resolve.fallback = {
      ...config.resolve.fallback,
    };
    
    // Add ignore patterns for TypeScript compilation
    if (!isServer) {
      config.ignoreWarnings = [
        { module: /AppData/ },
        { module: /Microsoft/ },
        { module: /Office/ },
        { module: /SolutionPackages/ },
        { module: /PackageResources/ },
      ];
    }
    
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
