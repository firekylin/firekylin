import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@admin': path.resolve(__dirname, 'www/static/src'),
        },
    },
    test: {
        environment: 'jsdom',
        setupFiles: ['./www/static/src/test/setup.ts'],
        include: ['www/static/src/**/*.test.{ts,tsx}'],
        clearMocks: true,
    },
});
