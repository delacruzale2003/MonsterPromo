import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import legacy from '@vitejs/plugin-legacy' // 👈 Importamos esto

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // 👈 Esto genera código antiguo compatible con iPhone 11 / iOS 12+
    legacy({
      targets: ['defaults', 'not IE 11', 'ios >= 12'], 
    }),
  ],
  server: {
    host: true, // Para probar en tu red Wi-Fi
  },
  build: {
    target: 'es2015', // Asegura compatibilidad base
    cssTarget: 'chrome61', // 👈 IMPORTANTE: Esto asegura que el CSS de Tailwind 4 sea compatible con móviles de hace 5-6 años
  }
})