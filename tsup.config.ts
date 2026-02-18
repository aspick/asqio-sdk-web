import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  // tsup 内部の postcssPlugin は loader[".css"] の値を cssLoader として使う。
  // local-css を指定することで postcssPlugin が esbuild に local-css ローダーで
  // CSS を返し、CSS Modules のクラス名マッピングが正しく生成される。
  loader: { '.css': 'local-css' },
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js',
    };
  },
});
