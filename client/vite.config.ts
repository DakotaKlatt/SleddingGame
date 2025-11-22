import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 8080,
    proxy: {
      '/api': 'http://localhost:3000',
      '/assets': 'http://localhost:3000',
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  }
});

