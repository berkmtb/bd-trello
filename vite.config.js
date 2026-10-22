import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` → normal multi-file build for Vercel.
// `npm run build:demo` → one self-contained HTML file in demo (local-only) mode.
export default defineConfig(({ mode }) => ({
  plugins: mode === 'demo' ? [react(), viteSingleFile()] : [react()],
  define: mode === 'demo' ? { 'import.meta.env.VITE_FORCE_DEMO': JSON.stringify('1') } : {},
  build: { outDir: mode === 'demo' ? 'dist-demo' : 'dist' },
}));
