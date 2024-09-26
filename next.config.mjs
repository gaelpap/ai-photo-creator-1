/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... other configurations ...
  async rewrites() {
    return [
      {
        source: '/api/translate',
        destination: 'https://translate.googleapis.com/translate_a/single',
      },
    ]
  },
}

export default nextConfig
