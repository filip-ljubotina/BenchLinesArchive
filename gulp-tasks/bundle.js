const rollup = require("rollup");
const rollupCommonJs = require("@rollup/plugin-commonjs");
const rollupTypeScript = require("@rollup/plugin-typescript");
const {default: rollupNodeResolve} = require("@rollup/plugin-node-resolve");
const {terser: rollupTerser} = require("rollup-plugin-terser");
const {default: rollupGzip} = require("rollup-plugin-gzip");
const nodePolyfills = require("rollup-plugin-polyfill-node");
const fs = require("fs");

async function bundle() {
  const bundle = await rollup.rollup({
    input: './src/lib/index.ts',
    plugins: [
      rollupNodeResolve({ 
        browser: true,
        preferBuiltins: false 
      }),
      rollupCommonJs(),
      nodePolyfills(),
      rollupTypeScript({ tsconfig: './tsconfig.json' }),
    ]
  });

  const minPlugins = [rollupTerser()];
  const gZipPlugins = [rollupTerser(), rollupGzip()];

  function writeLib(format) {
    const location = `./dist/library/${format}`;
    const config = [
      { extension: 'js', plugins: [] },
      { extension: 'min.js', plugins: minPlugins },
      { extension: 'min.js', plugins: gZipPlugins },
    ];
    return config.map((conf) => bundle.write({
      file:`${location}/spcd3.${conf.extension}`,
      format,
      name: 'spcd3',
      plugins: conf.plugins,
      sourcemap: true,
      inlineDynamicImports: true,
    }).then(() => {
      const fileData = fs.readFileSync(`${location}/spcd3.${conf.extension}`, 'utf8');
      const formatString = format === 'iife' ? 'IIFE' : format === 'esm' ? 'ESM' : format === 'cjs' ? 'CommonJS' : '';
      const dataWithHeaderLine = `// SPCD3 version 1.0.0 ${formatString}\n` + fileData;
      fs.writeFileSync(`${location}/spcd3.${conf.extension}`, dataWithHeaderLine, 'utf8');
    }))
  }

  return Promise.all([
      ...writeLib('esm'),
      ...writeLib('iife'),
      ...writeLib('cjs')])
}

module.exports = {bundle}