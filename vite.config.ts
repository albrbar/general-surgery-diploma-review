import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/general-surgery-diploma-review/' : '/',
  plugins: [react()],
  server: {
    allowedHosts: ['.manus.computer', '.manuspre.computer', 'localhost'],
  },
}));
