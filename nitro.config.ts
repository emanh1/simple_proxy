import { resolve } from 'node:path';
//https://nitro.unjs.io/config
export default defineNitroConfig({
  compatibilityDate: '2025-06-16',
  srcDir: "server",
  alias: {
    '@': resolve(__dirname, 'server'),
  }
});
