import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  // Load environment variables based on mode
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    base: './',
    
    plugins: [],
    
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@systems': fileURLToPath(new URL('./src/systems', import.meta.url)),
        '@assets': fileURLToPath(new URL('./public', import.meta.url)),
      },
    },
    
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode === 'development' || mode === 'analyze',
      minify: mode === 'production' ? 'esbuild' : false,
      target: 'esnext',
      
      // Optimize bundle size
      rollupOptions: {
        output: {
          manualChunks: {
            three: ['three'],
            vendor: ['gsap', 'lil-gui'],
            physics: ['three-mesh-bvh'],
          },
          assetFileNames: (assetInfo) => {
            if (assetInfo.name.endsWith('.glb')) {
              return 'assets/models/[name][extname]';
            }
            if (assetInfo.name.endsWith('.mp3') || assetInfo.name.endsWith('.wav')) {
              return 'assets/audio/[name][extname]';
            }
            if (assetInfo.name.endsWith('.png') || assetInfo.name.endsWith('.jpg')) {
              return 'assets/images/[name][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
      
      // Performance optimizations
      chunkSizeWarningLimit: 1500,
      cssCodeSplit: true,
      assetsInlineLimit: 4096,
    },
    
    server: {
      port: parseInt(env.VITE_PORT) || 3000,
      host: true,
      open: true,
      cors: true,
      fs: {
        strict: true,
      },
    },
    
    preview: {
      port: 4173,
      host: true,
    },
    
    optimizeDeps: {
      include: ['three', 'gsap', 'lil-gui', 'three-mesh-bvh'],
      exclude: [],
    },
    
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    
    define: {
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '1.0.0'),
      __APP_NAME__: JSON.stringify(env.VITE_APP_NAME || 'Three.js FPS Game'),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    
    // Security headers for production
    headers: mode === 'production' ? {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    } : {},
  };
});
