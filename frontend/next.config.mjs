/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for WASM support (ZK proof generation)
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
};

export default nextConfig;
