/** @type {import('next').NextConfig} */
const nextConfig = {
  // Deaktiviert die Debug-Indikatoren vollständig
  devIndicators: {
    buildActivity: false,
    staticPageGeneration: false,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;