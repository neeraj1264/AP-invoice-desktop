import commonjs from '@rollup/plugin-commonjs';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    commonjs(),  // Ensure compatibility with CommonJS modules
  ],
  server: {
    host: true,  // Allow access from other devices (mobile) on the same network
    port: 3001,  // Specify the port if needed
  },
});
