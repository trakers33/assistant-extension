import { resolve } from 'node:path';
import { withPageConfig } from '@extension/vite-config';

const rootDir = resolve(import.meta.dirname);
const srcDir = resolve(rootDir, 'src');
const outDir = resolve(rootDir, '..', '..','..', 'dist');
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
            fileName: 'inline.googlemeet',
            formats: ['iife'],
            entry: resolve(srcDir, 'index.js'),
        },
        outDir: resolve(outDir, 'inlines', 'googlemeet'),
    },
});
