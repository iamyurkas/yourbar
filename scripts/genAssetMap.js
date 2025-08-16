const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '..', 'assets');
function walk(dir) {
  return fs.readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return fs.statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const files = walk(base).filter((f) => /\.(png|jpe?g)$/i.test(f));
let out = 'export const ASSET_MAP = {\n';
for (const f of files) {
  const rel = path.relative(path.join(__dirname, '..'), f).replace(/\\/g, '/');
  out += `  '${rel}': require('../${rel}'),\n`;
}
out += '};\n';
fs.writeFileSync(path.join(__dirname, 'assetMap.js'), out);
