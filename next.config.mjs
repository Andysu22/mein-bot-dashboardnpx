/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY', // Niemand darf deine Seite in einem iFrame anzeigen
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff', // Verhindert, dass Browser MIME-Types raten
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin', // Datenschutz
          },
        ],
      },
    ];
  },
};

export default nextConfig;