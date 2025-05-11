// next.config.js
const nextConfig = {
  output: "standalone", // or remove 'output' entirely
  reactStrictMode: true,
  experimental: {
    appDir: true,
  },
};

module.exports = nextConfig;
