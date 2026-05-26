import { defineConfig } from 'vite';

const githubPagesBase = '/ai-3d-runner/';

export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? githubPagesBase : '/',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
}));
