import { createRequire } from 'node:module';  
const require = createRequire(import.meta.url);  
const { fileURLToPath } = require('node:url');
import { defineConfig } from 'vite';  
import vue from '@vitejs/plugin-vue';  
import AutoImport from 'unplugin-auto-import/vite';  
import Components from 'unplugin-vue-components/vite';  
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';  
import ElementPlus from 'unplugin-element-plus/vite';  

// https://vite.dev/config/  
export default defineConfig({  
  plugins: [  
    vue(),  
    ElementPlus({  
      useSource: true,  
    }),  
    AutoImport({  
      resolvers: [ElementPlusResolver({ importStyle: 'sass' })],  
    }),  
    Components({  
      resolvers: [ElementPlusResolver({ importStyle: 'sass' })],  
    }),  
  ],  
  resolve: {  
    alias: {  
      '@': fileURLToPath(new URL('./src', import.meta.url)),  
    },  
  },
  css: {  
    preprocessorOptions: {  
      scss: {  
        additionalData: `  
        @use "@/assets/index.css" as *;`,  
      },  
    },  
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/yonghu': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/user': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:8080')
  }
});