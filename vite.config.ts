import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'crypto';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    root: path.resolve(__dirname, 'www/static/src'),
    base: '/static/dist/',

    plugins: [
        react(),
        {
            name: 'admin-asset-version',
            generateBundle(_, bundle) {
                const hash = createHash('sha256');
                for (const output of Object.values(bundle)) {
                    hash.update(output.type === 'asset' ? output.source : output.code);
                }
                this.emitFile({
                    type: 'asset',
                    fileName: 'assets/admin.version',
                    source: hash.digest('hex').slice(0, 16),
                });
            },
        },
    ],

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
    },

    build: {
        outDir: path.resolve(__dirname, 'www/static/dist'),
        emptyOutDir: true,
        cssCodeSplit: false,
        rollupOptions: {
            input: {
                admin: path.resolve(__dirname, 'www/static/src/index.html'),
            },
            output: {
                entryFileNames: 'assets/[name].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames(assetInfo) {
                    return assetInfo.names.some(name => name.endsWith('.css'))
                        ? 'assets/admin.css'
                        : 'assets/[name]-[hash][extname]';
                },
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
