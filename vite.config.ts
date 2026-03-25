import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // GitHub Pages 같은 subpath 배포 시 `.env.production`에
  // VITE_BASE_PATH=/your-repo-name/ 형태로 설정해서 사용하세요.
  const basePath = env.VITE_BASE_PATH || '/';

  return {
    base: basePath,
    plugins: [react(), cesium()],
  };
});
