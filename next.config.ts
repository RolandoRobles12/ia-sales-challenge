
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: {
    allowedDevOrigins: [
      'https://6000-firebase-studio-1758743579469.cluster-c72u3gwiofapkvxrcwjq5zllcu.cloudworkstations.dev',
      'https://6000-firebase-ia-sales-challenge-1759256229531.cluster-c72u3gwiofapkvxrcwjq5zllcu.cloudworkstations.dev',
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.crunchbase.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
