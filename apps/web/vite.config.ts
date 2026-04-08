import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
    root: '.',
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: path.resolve(import.meta.dirname, 'index.html'),
                parseboard: path.resolve(
                    import.meta.dirname,
                    'parseboard/index.html'
                ),
            },
        },
    },
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@client': path.resolve(import.meta.dirname, './src'),
        },
    },
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:4000',
            },
        },
    },
});
