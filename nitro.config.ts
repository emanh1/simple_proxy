import { resolve } from 'node:path';
import pkg from './package.json';
//https://nitro.unjs.io/config
export default defineNitroConfig({
  compatibilityDate: '2025-06-16',
  srcDir: "server",
  runtimeConfig: {
    version: pkg.version
  },
  alias: {
    '@': resolve(__dirname, 'server'),
  }
});
