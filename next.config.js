/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config, { isServer }) => {
    // Suppress the warning about critical dependency
    config.module.exprContextCritical = false;
    return config;
  },
  images: {
    domains: ['dohiiawnnantusgsddzw.supabase.co']
  }
};

module.exports = nextConfig; 