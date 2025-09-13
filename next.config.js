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
}

module.exports = nextConfig
