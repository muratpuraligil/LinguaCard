
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Göreli yol (relative path) kullanımı:
  // Repo isminiz 'LinguaCard_repo' veya sadece 'LinguaCard' olsa bile çalışmasını sağlar.
  base: './', 
  server: {
    host: true, // Sabit dinleme: hem localhost hem de yerel ağ (mobil telefon için)
    port: 5173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY || '')
  }
});
