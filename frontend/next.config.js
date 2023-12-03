/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = {
  images: {
    domains: ['localhost', 'extension.unh.edu', 'img1.cgtrader.com', 'api', 'api:8000'],
  },
  webpack: (config, options) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };

    return config;
  },
}