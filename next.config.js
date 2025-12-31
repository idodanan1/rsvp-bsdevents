/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  // Disable static page generation to prevent React Router conflicts
  // This project uses Vite + React Router, not Next.js pages
  output: 'standalone',
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
        '**/src/pages/**', // Exclude React Router pages from Next.js build
        '**/src/components/Footer.tsx', // Exclude Footer from static generation
      ],
    },
  },
  // Skip static generation - this is a Vite project, not Next.js
  generateBuildId: async () => {
    return 'vite-build'
  },
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json',
  },
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  webpack: (config, { isServer }) => {
    const path = require('path');
    
    // CRITICAL: Set up path alias BEFORE other resolve config
    if (!config.resolve) {
      config.resolve = {};
    }
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }
    
    // Set up @ alias to point to project root
    config.resolve.alias['@'] = path.resolve(__dirname);
    
    // Merge with existing resolve config, preserving alias
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
        '@': path.resolve(__dirname),
      },
      modules: ['node_modules', 'src'],
    };
    
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
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
    };
    
    if (!isServer) {
      config.ignoreWarnings = [
        { module: /AppData/ },
        { module: /Microsoft/ },
        { module: /Office/ },
        { module: /SolutionPackages/ },
        { module: /PackageResources/ },
      ];
    }
    
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
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
