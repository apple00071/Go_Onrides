/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['dohiiawnnantusgsddzw.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dohiiawnnantusgsddzw.supabase.co',
        port: '',
        pathname: '/storage/v1/object/sign/**',
      },
    ],
  },
  // Configure webpack to handle the Node.js APIs used by Supabase
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `process` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        process: false,
      };
    }
    return config;
  },
  // Configure for Edge Runtime compatibility
  experimental: {
    // Let Next.js handle the external packages automatically
    // This will be the default in future versions
    serverComponentsExternalPackages: [],
  },
  // Transpile only the necessary packages
  transpilePackages: [],
  // Disable the Edge Runtime for API routes that use Node.js APIs
  // This is needed for Supabase Auth Helpers
  // If you're using API routes that need Node.js APIs, you can add them here
  // or create a separate config for those routes
  // See: https://nextjs.org/docs/api-reference/next.config.js/headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'x-middleware-ssr',
            value: '1',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
