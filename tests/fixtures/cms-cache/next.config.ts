import path from 'node:path';

const config = {
  experimental: { cpus: 1 },
  webpack(config: { resolve: { alias: Record<string, string> } }) {
    config.resolve.alias['@'] = path.resolve(process.cwd(), 'src');
    return config;
  },
};

export default config;
