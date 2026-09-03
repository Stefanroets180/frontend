/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['127.0.0.1', '192.168.137.1', '10.0.0.100'],
  // Disable Next.js built-in web vitals to prevent startTime error
  experimental: {
    instrumentationHook: false,
  },
  // Disable web vitals reporting
  webVitalsAttributionCollected: false,
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    return [
      {
        source: '/uploads/:path*',
        destination: `${apiUrl}/uploads/:path*`,
      },
    ]
  },
}

export default nextConfig
