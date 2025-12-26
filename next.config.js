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
    // Ignore files outside project root and OneDrive/Office files
    const projectRoot = process.cwd();
    
    config.watchOptions = {
      ...config.watchOptions,
      ignored: (path) => {
        // Normalize path separators
        const normalizedPath = path.replace(/\\/g, '/');
        
        // Ignore files outside project root
        if (!normalizedPath.startsWith(projectRoot.replace(/\\/g, '/'))) {
          return true;
        }
        
        // Ignore specific patterns
        const ignorePatterns = [
          'node_modules',
          'AppData',
          'SolutionPackages',
          'PackageResources',
          'Microsoft/Office',
        ];
        
        return ignorePatterns.some(pattern => normalizedPath.includes(pattern));
      },
    };
    return config;
  },
}

module.exports = nextConfig

