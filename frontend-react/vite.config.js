import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import fs from 'fs';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, '../localhost-key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '../localhost.pem')),
    },
    host: '192.168.0.104', // Listen on all network interfaces
    port: 3000,      // Specify the port
  },
})
