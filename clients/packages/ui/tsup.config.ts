import { defineConfig, Options } from 'tsup'

export const options: Options = {
  entry: ['./src', '!./src/**/*.stories.*'],
  format: ['cjs', 'esm'],
  minify: true,
  dts: true,
  bundle: true,
  external: [
    'next',
    'next/image',
    'next/link',
    'next/navigation',
    '@polar-sh/client',
  ],
}

export default defineConfig(options)
