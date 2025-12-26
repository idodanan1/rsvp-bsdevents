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
  // Exclude OneDrive and Office files from build
  webpack: (config, { isServer }) => {
    // Ignore files outside project root
    const projectRoot = process.cwd();
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/node_modules/**',
        '**/AppData/**',
        '**/OneDrive/**',
        '**/SolutionPackages/**',
        '**/Office/**',
        '**/Microsoft/**',
        '**/PackageResources/**',
        (path) => {
          // Only process files within project root
          return !path.startsWith(projectRoot);
        },
      ],
    };
    return config;
  },
}

module.exports = nextConfig

