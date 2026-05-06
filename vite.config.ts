import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    root: path.resolve(__dirname, 'www/static/src'),
    base: '/static/js/',

    plugins: [
        react({
            babel: {
                plugins: [
                    // On-demand import of antd components and styles
                    ['import', { libraryName: 'antd', libraryDirectory: 'lib', style: true }],
                ],
            },
        }),
    ],

    resolve: {
        alias: {
            // Workaround for antd v3 icon bundle size: https://github.com/ant-design/ant-design/issues/12011
            '@ant-design/icons/lib/dist': path.resolve(__dirname, 'www/static/src/icons.js'),
        },
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
    },

    build: {
        outDir: path.resolve(__dirname, 'www/static/js'),
        emptyOutDir: true,
        rollupOptions: {
            output: {
                // Use fixed filenames (no content hash) for compatibility with server-side template
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                assetFileNames: '[name][extname]',
                manualChunks: {
                    vendor: ['react', 'react-dom', 'mobx', 'mobx-react'],
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
