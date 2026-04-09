import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
    root: '.',
    appType: 'mpa',
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: path.resolve(import.meta.dirname, 'index.html'),
                app: path.resolve(import.meta.dirname, 'app/index.html'),
            },
        },
    },
    plugins: [
        {
            name: 'spa-fallback',
            configureServer(server) {
                server.middlewares.use((req, _res, next) => {
                    const pathname = req.url?.split('?')[0] ?? '';
                    if (
                        pathname.startsWith('/app') &&
                        !pathname.includes('.')
                    ) {
                        req.url = '/app/index.html';
                    }
                    next();
                });
            },
        },
        react(),
        tailwindcss(),
    ],
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
