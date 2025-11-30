import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// Fix: Import fileURLToPath for ES module compatibility with path operations
import { fileURLToPath } from 'url';

export default defineConfig(({ mode }) => {
    // Load environment variables from .env file
    const env = loadEnv(mode, '.', '');

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: ['imagine-vla9.onrender.com'] // Adjust this for your deployment host
      },
        
      plugins: [react()],
      define: {
        // Expose environment variables to the client-side code
        // IMPORTANT: For security, only expose variables prefixed with VITE_ for client-side use
        // However, the current project explicitly asks for process.env.API_KEY, so we bridge it.
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.'),
        }
      }
    };
});