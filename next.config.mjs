/** @type {import('next').NextConfig} */
const nextConfig = {
  // Deaktiviert die Debug-Indikatoren vollständig
  devIndicators: {
    buildActivity: false,
    staticPageGeneration: false,
  },
  
  // Sicherheits-Header
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

  // NEU: Erzwingt Weiterleitung auf www.convee.de
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'convee.de',
          },
        ],
        destination: 'https://www.convee.de/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;