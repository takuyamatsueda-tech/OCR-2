import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// 💡 修正点 1: リポジトリ名を定義
const repoName = 'OCR-2'; // ★★★ あなたのリポジトリ名に変更してください ★★★

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
        // 💡 修正点 2: base パスを追加
        base: `/${repoName}/`, // GitHub Pagesのサブディレクトリに対応

        server: {
            port: 3000,
            host: '0.0.0.0',
        },
        plugins: [react()],
        define: {
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            }
        }
    };
});
