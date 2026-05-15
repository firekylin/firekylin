import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    root: path.resolve(__dirname, 'www/static/src'),
    base: '/static/dist/',

    plugins: [react()],

    resolve: {},

    css: {
        preprocessorOptions: {
            less: {
                javascriptEnabled: true,
            },
        },
    },

    define: {
        'process.env.basename': JSON.stringify('/admin'),
        'process.env.environment': JSON.stringify(mode === 'production' ? 'production' : 'dev'),
        // Polyfill Node.js `global` for browser ESM (used by react-codemirror2)
        global: 'globalThis',
    },

    build: {
        outDir: path.resolve(__dirname, 'www/static/dist'),
        emptyOutDir: true,
        manifest: true,
        rollupOptions: {
            input: {
                admin: path.resolve(__dirname, 'www/static/src/index.html'),
            },
            output: {
                manualChunks(id) {
                    return /node_modules\/(react|react-dom|mobx|mobx-react)\//.test(id) ? 'vendor' : undefined;
                },
            },
        },
    },

    server: {
        port: 3000,
        proxy: {
            // Proxy API and static asset requests to ThinkJS backend during development
            '/admin/api': {
                target: 'http://localhost:8360',
                changeOrigin: true,
            },
        },
    },
}));
