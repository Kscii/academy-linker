import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_DEV_API_TARGET ?? 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: 'localhost',
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              const sc = proxyRes.headers['set-cookie'];
              if (sc) {
                proxyRes.headers['set-cookie'] = sc.map((c) =>
                  c.replace(/;\s*Secure/gi, '')
                );
              }
            });
          },
        },
      },
    },
  }
})
