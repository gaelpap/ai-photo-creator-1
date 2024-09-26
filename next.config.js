/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  swcMinify: true,
  env: {
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_FAL_KEY: process.env.NEXT_PUBLIC_FAL_KEY,
  },
  publicRuntimeConfig: {
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_FAL_KEY: process.env.NEXT_PUBLIC_FAL_KEY,
  },
  images: {
    domains: ['fal.media'], // Add the domain of your image URLs
  },
}

module.exports = nextConfig