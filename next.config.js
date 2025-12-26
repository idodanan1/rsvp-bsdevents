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
  webpack: (config, { isServer }) => {
    // ב-Build של Render אין צורך ב-watchOptions מורכבים.
    // אם בכל זאת רוצים להתעלם מתבניות מסוימות בפורמט תקין:
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/node_modules/**',
        '**/AppData/**',
        '**/Microsoft/Office/**',
        '**/.git/**'
      ],
    };
    
    return config;
  },
}

module.exports = nextConfig
