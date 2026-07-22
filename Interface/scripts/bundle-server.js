// eslint-disable-next-line import/no-extraneous-dependencies
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const entryPoint = path.join(__dirname, '../src/server/server.js');
const outFile = path.join(__dirname, '../dist/server.js');

// External native modules that should NOT be bundled
const externalModules = [
  // TODO[Alex]: Add here your native dependencies, for example:
  // 'bcrypt-native',
  // 'sqlite3'
];

esbuild.build({
  entryPoints: [entryPoint],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: outFile,
  external: externalModules,
  minify: true,
  sourcemap: false,
  banner: {
    js: `/* Peak Expert Web Server - Bundled ${new Date().toISOString()} */`,
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  // Keep require() working for dynamic imports
  keepNames: true,
}).then(() => {
  console.log('Server bundled successfully');
  console.log(`Output: ${outFile}`);

  // Show bundle size
  const stats = fs.statSync(outFile);
  const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`Bundle size: ${sizeInMB} MB`);
}).catch((error) => {
  console.error('Bundling failed:', error);
  process.exit(1);
});
