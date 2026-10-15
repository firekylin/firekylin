import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    root: path.resolve(__dirname, 'www/static/src'),
    // Production assets are served by ThinkJS under /static/dist. In dev the
    // admin router itself owns /admin, so Vite must serve from the origin root.
    base: mode === 'production' ? '/static/dist/' : '/',

    plugins: [react()],

    resolve: {
        alias: {
            '@admin': path.resolve(__dirname, 'www/static/src'),
        },
        // Router context is identified by object identity. Keep React and
        // React Router singletons even when pnpm symlinks and lazy chunks
        // expose more than one resolution path during production builds.
        dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
    },

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
        cssCodeSplit: false,
        manifest: true,
        rollupOptions: {
            input: {
                admin: path.resolve(__dirname, 'www/static/src/index.html'),
            },
            output: {
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash][extname]',
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
