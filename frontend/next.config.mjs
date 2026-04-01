/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK || 'testnet',
    NEXT_PUBLIC_SDK_ENDPOINT: process.env.NEXT_PUBLIC_SDK_ENDPOINT || '',
  },
};

export default nextConfig;
