import { defineConfig } from 'vite'

const base = process.env.BASE_PATH ?? '/ifc-geometry-playground/'

export default defineConfig({
  base,
})
