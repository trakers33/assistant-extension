import { resolve } from 'node:path';
import { withPageConfig } from '@extension/vite-config';

const rootDir = resolve(import.meta.dirname);
const srcDir = resolve(rootDir, 'src');

export default withPageConfig({
    resolve: {
        alias: {
            '@src': srcDir,
        },
    },
    publicDir: resolve(rootDir, 'public'),
    build: {
        lib: {
            name: 'ContentRuntimeScript',
            fileName: 'inline.injector',
            formats: ['iife'],
            entry: resolve(srcDir, 'index.js'),
        },
        outDir: resolve(rootDir, '..', '..', 'dist', 'inlinescripts', 'injector'),
    },
});
