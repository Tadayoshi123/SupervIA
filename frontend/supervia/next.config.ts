import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    // Accélère les builds Docker et évite de casser le build sur des détails stylistiques
    ignoreDuringBuilds: true,
  },
  // Conserver la vérification TypeScript (rapidement et sûr). Si besoin d'alléger encore, on peut ignorer.
  // typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
